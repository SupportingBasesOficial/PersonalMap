import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Marker, Region, LatLng } from "react-native-maps";
import * as Location from "expo-location";
import { Magnetometer, Accelerometer } from "expo-sensors";
import { MaterialIcons } from "@expo/vector-icons";
import Speedometer from "../components/Speedometer";
import DirectionCone from "../components/DirectionCone";

const MIN_MOVING_SPEED_KMH = 3;
const REGION_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

function normalizeHeading(value: number) {
        const normalized = value % 360;
        return normalized < 0 ? normalized + 360 : normalized;
}

function smoothHeading(previous: number | null, next: number, alpha: number) {
        if (previous === null) {
                return normalizeHeading(next);
        }

        const delta = ((next - previous + 540) % 360) - 180;
        return normalizeHeading(previous + delta * alpha);
}

function getAcceptedAccuracyMeters(speedKmh: number) {
        if (speedKmh === 0) {
                return 20;
        }

        if (speedKmh < 20) {
                return 30;
        }

        if (speedKmh < 60) {
                return 45;
        }

        return 65;
}

function smoothCoordinate(previous: LatLng | null, next: LatLng, alpha: number): LatLng {
        if (!previous) {
                return next;
        }

        return {
                latitude: previous.latitude + (next.latitude - previous.latitude) * alpha,
                longitude: previous.longitude + (next.longitude - previous.longitude) * alpha,
        };
}

export default function MapScreen() {
        const [userCoordinate, setUserCoordinate] = useState<LatLng | null>(null);
        const [initialRegion, setInitialRegion] = useState<Region | null>(null);
        const [speedKmh, setSpeedKmh] = useState(0);
        const [isFollowingUser, setIsFollowingUser] = useState(true);
        const [compassHeading, setCompassHeading] = useState(0);
        const [courseHeading, setCourseHeading] = useState<number | null>(null);
        const [displayHeading, setDisplayHeading] = useState(0);
        const mapRef = useRef<MapView | null>(null);
        const accelData = useRef({ x: 0, y: 0, z: 0 });
        const smoothedCoordinateRef = useRef<LatLng | null>(null);
        const smoothedHeadingRef = useRef<number | null>(null);

        useEffect(() => {
                Accelerometer.setUpdateInterval(100);

                const sub = Accelerometer.addListener((data) => {
                        accelData.current = data;
                });

                return () => sub.remove();
        }, []);

        useEffect(() => {
                Magnetometer.setUpdateInterval(100);

                const sub = Magnetometer.addListener((data) => {
                        const { x, y } = data;
                        const { x: ax, y: ay, z: az } = accelData.current;

                        const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
                        const roll = Math.atan2(ay, az);

                        const xh = x * Math.cos(pitch) + y * Math.sin(roll) * Math.sin(pitch);
                        const yh = y * Math.cos(roll);

                        let heading = Math.atan2(yh, xh) * (180 / Math.PI);

                        if (heading < 0) heading += 360;

                        setCompassHeading(heading);
                });

                return () => sub.remove();
        }, []);

        useEffect(() => {
                let locationSubscription: Location.LocationSubscription | null = null;

                (async () => {
                        const { status } = await Location.requestForegroundPermissionsAsync();

                        if (status !== "granted") {
                                console.log("Permissao de localizacao negada");
                                return;
                        }

                        locationSubscription = await Location.watchPositionAsync({
                                accuracy: Location.Accuracy.High,
                                timeInterval: 1000,
                                distanceInterval: 1,
                        }, (location) => {
                                const latitude = location.coords.latitude;
                                const longitude = location.coords.longitude;

                                const isValidLatitude = Number.isFinite(latitude) && Math.abs(latitude) <= 90;
                                const isValidLongitude = Number.isFinite(longitude) && Math.abs(longitude) <= 180;
                                const speedMps = location.coords.speed ?? 0;
                                let kmh = speedMps * 3.6;

                                // Treat very low speed as stopped to avoid noisy speed/heading flips.
                                if (kmh < MIN_MOVING_SPEED_KMH) {
                                        kmh = 0;
                                }

                                const accuracy = location.coords.accuracy ?? Infinity;
                                const maxAccuracyMeters = getAcceptedAccuracyMeters(kmh);
                                const isAcceptedAccuracy = Number.isFinite(accuracy) && accuracy <= maxAccuracyMeters;

                                if (!isValidLatitude || !isValidLongitude || !isAcceptedAccuracy) {
                                        return;
                                }

                                const rawCoordinate: LatLng = { latitude, longitude };

                                const smoothingAlpha = kmh === 0 ? 0.2 : 0.35;
                                const nextCoordinate = smoothCoordinate(smoothedCoordinateRef.current, rawCoordinate, smoothingAlpha);
                                smoothedCoordinateRef.current = nextCoordinate;

                                const gpsHeading = location.coords.heading;
                                const hasGpsHeading = Number.isFinite(gpsHeading) && gpsHeading !== null && gpsHeading >= 0;

                                if (kmh > 0 && hasGpsHeading) {
                                        setCourseHeading(normalizeHeading(gpsHeading));
                                } else if (kmh === 0) {
                                        setCourseHeading(null);
                                }

                                const nextRegion: Region = { ...nextCoordinate, ...REGION_DELTA };

                                setUserCoordinate(nextCoordinate);
                                setInitialRegion((currentInitialRegion) => currentInitialRegion ?? nextRegion);
                                setSpeedKmh(kmh);
                        });
                })();

                return () => {
                        if (locationSubscription) {
                                locationSubscription.remove();
                        }
                };
        }, []);

        useEffect(() => {
                if (!userCoordinate || !mapRef.current || !isFollowingUser) {
                        return;
                }

                mapRef.current.animateCamera({ center: userCoordinate }, { duration: 450 });
        }, [userCoordinate, isFollowingUser]);

        const isStationary = speedKmh < MIN_MOVING_SPEED_KMH;

        useEffect(() => {
                const sourceHeading = isStationary || courseHeading === null ? compassHeading : courseHeading;
                const alpha = isStationary ? 0.14 : 0.32;
                const nextHeading = smoothHeading(smoothedHeadingRef.current, sourceHeading, alpha);

                smoothedHeadingRef.current = nextHeading;
                setDisplayHeading(nextHeading);
        }, [compassHeading, courseHeading, isStationary]);

        if (!initialRegion) return <View style={styles.container} />;

        const handleRecenterPress = () => {
                        if (!userCoordinate || !mapRef.current) return;

                        setIsFollowingUser(true);
                        mapRef.current.animateToRegion({ ...userCoordinate, ...REGION_DELTA }, 600);
        };

        return (
                <View style={styles.container}>
                        <MapView
                                ref={mapRef}
                                style={styles.map}
                                initialRegion={initialRegion}
                                onPanDrag={() => setIsFollowingUser(false)}
                        >
                                {userCoordinate ? (
                                        <Marker
                                                coordinate={userCoordinate}
                                                anchor={{ x: 0.5, y: 0.5 }}
                                                centerOffset={{ x: 0, y: 0 }}
                                                tracksViewChanges={false}
                                        >
                                                <View style={styles.markerWrapper}>
                                                        <DirectionCone heading={displayHeading} />

                                                        <View style={styles.userDotOuter}>
                                                                <View style={styles.userDotInner} />
                                                        </View>
                                                </View>
                                        </Marker>
                                ) : null}
                        </MapView>

                        <Speedometer speedKmh={speedKmh} />

                        <Pressable
                                style={[styles.recenterButton, isFollowingUser ? styles.recenterButtonActive : null]}
                                onPress={handleRecenterPress}
                        >
                                <MaterialIcons name="my-location" size={24} color={isFollowingUser ? "#FFFFFF" : "#1B4332"} />
                        </Pressable>
                </View>
        );
}

const styles = StyleSheet.create({
        container: {
                flex: 1
        },
        map: {
                flex: 1
        },
        recenterButton: {
                position: "absolute",
                right: 20,
                bottom: 24,
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 6,
        },
        recenterButtonActive: {
                backgroundColor: "#1B4332",
        },
        markerWrapper: {
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
        },
        userDotOuter: {
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#FFFFFF",
                borderWidth: 3,
                borderColor: "#2563EB",
                alignItems: "center",
                justifyContent: "center",
        },
        userDotInner: {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#2563EB",
        },
});