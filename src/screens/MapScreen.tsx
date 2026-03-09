import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Marker, Region, LatLng } from "react-native-maps";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import Speedometer from "../components/Speedometer";
import DirectionCone from "../components/DirectionCone";

const START_MOVING_SPEED_KMH = 6;
const STOP_MOVING_SPEED_KMH = 2;
const REGION_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };
const DEFAULT_REGION: Region = {
        latitude: -23.55052,
        longitude: -46.633308,
        ...REGION_DELTA,
};

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

function angularDistance(a: number, b: number) {
        return Math.abs(((a - b + 540) % 360) - 180);
}

function approximateDistanceMeters(a: LatLng, b: LatLng) {
        const metersPerDegreeLat = 111_320;
        const metersPerDegreeLng = 111_320 * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
        const dLat = (a.latitude - b.latitude) * metersPerDegreeLat;
        const dLng = (a.longitude - b.longitude) * metersPerDegreeLng;
        return Math.sqrt(dLat * dLat + dLng * dLng);
}

function getStationaryJitterThresholdMeters(accuracy: number | null) {
        const base = 2.5;

        if (accuracy === null || !Number.isFinite(accuracy)) {
                return base;
        }

        return Math.max(base, accuracy * 0.25);
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

function getCoordinateSmoothingAlpha(speedKmh: number) {
        if (speedKmh === 0) {
                return 0.2;
        }

        if (speedKmh < 15) {
                return 0.4;
        }

        if (speedKmh < 40) {
                return 0.58;
        }

        return 0.72;
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
        const [initialRegion, setInitialRegion] = useState<Region>(DEFAULT_REGION);
        const [speedKmh, setSpeedKmh] = useState(0);
        const [isMoving, setIsMoving] = useState(false);
        const [isFollowingUser, setIsFollowingUser] = useState(true);
        const [compassHeading, setCompassHeading] = useState(0);
        const [courseHeading, setCourseHeading] = useState<number | null>(null);
        const [displayHeading, setDisplayHeading] = useState(0);
        const mapRef = useRef<MapView | null>(null);
        const smoothedCoordinateRef = useRef<LatLng | null>(null);
        const smoothedHeadingRef = useRef<number | null>(null);
        const hasFirstFixRef = useRef(false);
        const isMovingRef = useRef(false);
        const lastCameraCenterRef = useRef<LatLng | null>(null);
        const lastCameraHeadingRef = useRef<number | null>(null);
        const lastCameraUpdateAtRef = useRef(0);

        useEffect(() => {
                let locationSubscription: Location.LocationSubscription | null = null;
                let headingSubscription: Location.LocationSubscription | null = null;

                (async () => {
                        const { status } = await Location.requestForegroundPermissionsAsync();

                        if (status !== "granted") {
                                console.log("Permissao de localizacao negada");
                                return;
                        }

                        headingSubscription = await Location.watchHeadingAsync((headingData) => {
                                const headingValue = headingData.trueHeading >= 0
                                        ? headingData.trueHeading
                                        : headingData.magHeading;

                                if (Number.isFinite(headingValue)) {
                                        setCompassHeading(normalizeHeading(headingValue));
                                }
                        });

                        // Bootstrap with best effort current position so map/user marker appears quickly.
                        const bootstrapLocation = await Location.getCurrentPositionAsync({
                                accuracy: Location.Accuracy.Balanced,
                        }).catch(() => null);

                        if (bootstrapLocation) {
                                const bootstrapCoordinate: LatLng = {
                                        latitude: bootstrapLocation.coords.latitude,
                                        longitude: bootstrapLocation.coords.longitude,
                                };

                                const hasValidBootstrap = Number.isFinite(bootstrapCoordinate.latitude)
                                        && Number.isFinite(bootstrapCoordinate.longitude)
                                        && Math.abs(bootstrapCoordinate.latitude) <= 90
                                        && Math.abs(bootstrapCoordinate.longitude) <= 180;

                                if (hasValidBootstrap) {
                                        smoothedCoordinateRef.current = bootstrapCoordinate;
                                        hasFirstFixRef.current = true;
                                        setUserCoordinate(bootstrapCoordinate);
                                        setInitialRegion({ ...bootstrapCoordinate, ...REGION_DELTA });
                                }
                        }

                        locationSubscription = await Location.watchPositionAsync({
                                accuracy: Location.Accuracy.BestForNavigation,
                                timeInterval: 500,
                                distanceInterval: 0.5,
                        }, (location) => {
                                const latitude = location.coords.latitude;
                                const longitude = location.coords.longitude;

                                const isValidLatitude = Number.isFinite(latitude) && Math.abs(latitude) <= 90;
                                const isValidLongitude = Number.isFinite(longitude) && Math.abs(longitude) <= 180;
                                const speedMps = location.coords.speed ?? 0;
                                const rawKmh = speedMps * 3.6;

                                // Hysteresis prevents rapid moving/stopped toggling near low speed.
                                const wasMoving = isMovingRef.current;
                                const nextIsMoving = wasMoving
                                        ? rawKmh > STOP_MOVING_SPEED_KMH
                                        : rawKmh >= START_MOVING_SPEED_KMH;

                                if (nextIsMoving !== wasMoving) {
                                        isMovingRef.current = nextIsMoving;
                                        setIsMoving(nextIsMoving);
                                }

                                const kmh = nextIsMoving ? rawKmh : 0;

                                const accuracy = location.coords.accuracy;
                                const maxAccuracyMeters = getAcceptedAccuracyMeters(kmh);
                                const isAcceptedAccuracy = accuracy === null || (Number.isFinite(accuracy) && accuracy <= maxAccuracyMeters);

                                const rawCoordinate: LatLng = { latitude, longitude };

                                // Never block first visible location; strict filtering starts after bootstrap.
                                if (!hasFirstFixRef.current) {
                                        smoothedCoordinateRef.current = rawCoordinate;
                                        hasFirstFixRef.current = true;
                                        setUserCoordinate(rawCoordinate);
                                        setInitialRegion({ ...rawCoordinate, ...REGION_DELTA });
                                }

                                if (!isValidLatitude || !isValidLongitude || !isAcceptedAccuracy) {
                                        return;
                                }

                                const previousCoordinate = smoothedCoordinateRef.current;
                                if (!nextIsMoving && previousCoordinate) {
                                        const distanceFromPrevious = approximateDistanceMeters(rawCoordinate, previousCoordinate);
                                        const stationaryJitterThreshold = getStationaryJitterThresholdMeters(accuracy);

                                        // Freeze micro-jitter while stationary to keep the blue dot visually stable.
                                        if (distanceFromPrevious < stationaryJitterThreshold) {
                                                setSpeedKmh(0);
                                                return;
                                        }
                                }

                                const smoothingAlpha = getCoordinateSmoothingAlpha(kmh);
                                const nextCoordinate = smoothCoordinate(smoothedCoordinateRef.current, rawCoordinate, smoothingAlpha);
                                smoothedCoordinateRef.current = nextCoordinate;

                                const gpsHeading = location.coords.heading;
                                const hasGpsHeading = Number.isFinite(gpsHeading) && gpsHeading !== null && gpsHeading >= 0;

                                if (nextIsMoving && hasGpsHeading) {
                                        setCourseHeading(normalizeHeading(gpsHeading));
                                } else {
                                        setCourseHeading(null);
                                }

                                const nextRegion: Region = { ...nextCoordinate, ...REGION_DELTA };

                                setUserCoordinate(nextCoordinate);
                                setInitialRegion(nextRegion);
                                setSpeedKmh(kmh);
                        });
                })();

                return () => {
                        if (locationSubscription) {
                                locationSubscription.remove();
                        }

                        if (headingSubscription) {
                                headingSubscription.remove();
                        }
                };
        }, []);

        useEffect(() => {
                if (!userCoordinate || !mapRef.current || !isFollowingUser) {
                        return;
                }

                const now = Date.now();
                const previousCenter = lastCameraCenterRef.current;
                const previousHeading = lastCameraHeadingRef.current;
                const movedMeters = previousCenter ? approximateDistanceMeters(userCoordinate, previousCenter) : Infinity;
                const headingDelta = previousHeading === null ? Infinity : angularDistance(displayHeading, previousHeading);
                const elapsedSinceLastCameraUpdate = now - lastCameraUpdateAtRef.current;
                const shouldUpdateForMovement = movedMeters >= 0.8;
                const shouldUpdateForHeading = isMoving && headingDelta >= 5 && elapsedSinceLastCameraUpdate >= 200;

                if (!shouldUpdateForMovement && !shouldUpdateForHeading) {
                        return;
                }

                const duration = speedKmh >= 35 ? 120 : speedKmh >= 12 ? 180 : 260;

                const cameraHeading = isMoving ? displayHeading : (lastCameraHeadingRef.current ?? displayHeading);

                mapRef.current.animateCamera(
                        {
                                center: userCoordinate,
                                heading: cameraHeading,
                        },
                        { duration }
                );

                lastCameraCenterRef.current = userCoordinate;
                lastCameraHeadingRef.current = cameraHeading;
                lastCameraUpdateAtRef.current = now;
        }, [userCoordinate, displayHeading, isFollowingUser, speedKmh, isMoving]);

        const isStationary = !isMoving;

        useEffect(() => {
                const sourceHeading = isStationary || courseHeading === null ? compassHeading : courseHeading;
                const previousHeading = smoothedHeadingRef.current;
                const headingDelta = previousHeading === null ? 0 : angularDistance(sourceHeading, previousHeading);

                // When standing still, magnetometer spikes are common. Add dead-zone and stronger damping.
                if (isStationary && previousHeading !== null && headingDelta < 1.5) {
                        setDisplayHeading(previousHeading);
                        return;
                }

                const alpha = isStationary
                        ? (headingDelta > 35 ? 0.03 : 0.08)
                        : 0.32;
                const nextHeading = smoothHeading(previousHeading, sourceHeading, alpha);

                smoothedHeadingRef.current = nextHeading;
                setDisplayHeading(nextHeading);
        }, [compassHeading, courseHeading, isStationary]);

        const handleRecenterPress = () => {
                        if (!userCoordinate || !mapRef.current) return;

                        setIsFollowingUser(true);
                        mapRef.current.animateToRegion({ ...userCoordinate, ...REGION_DELTA }, 600);
        };

        const coneHeading = isFollowingUser ? 0 : displayHeading;

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
                                                        <DirectionCone heading={coneHeading} />

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
                width: 64,
                height: 64,
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
        },
        userDotOuter: {
                position: "absolute",
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