import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { MaterialIcons } from "@expo/vector-icons";
import Speedometer from "../components/Speedometer";
import DirectionCone from "../components/DirectionCone";

function getMovementMode(speed: number) {
        if (speed < 5) return "idle";
        if (speed < 10) return "run";
        if (speed < 25) return "bike";
        if (speed < 150) return "car";
        return "plane";
}

export default function MapScreen() {
        const [userRegion, setUserRegion] = useState<Region | null>(null);
        const [initialRegion, setInitialRegion] = useState<Region | null>(null);
        const [speedKmh, setSpeedKmh] = useState(0);
        const [heading, setHeading] = useState(0);
        const [showDirectionCone, setShowDirectionCone] = useState(true);
        const [movementMode, setMovementMode] = useState("idle");
        const mapRef = useRef<MapView | null>(null);
        const speedRef = useRef(0);

        useEffect(() => {
                Magnetometer.setUpdateInterval(150);

                const subscription = Magnetometer.addListener((data) => {
                        const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
                        const normalizedAngle = angle >= 0 ? angle : angle + 360;
                        const headingFromNorth = (450 - normalizedAngle) % 360;

                        setHeading((previousHeading) => {
                                const delta = ((headingFromNorth - previousHeading + 540) % 360) - 180;
                                return (previousHeading + delta * 0.2 + 360) % 360;
                        });
                });

                return () => subscription.remove();
        }, []);

        useEffect(() => {
                // Hysteresis prevents cone blinking near the threshold.
                if (showDirectionCone && speedKmh > 6) {
                        setShowDirectionCone(false);
                } else if (!showDirectionCone && speedKmh < 4) {
                        setShowDirectionCone(true);
                }
        }, [showDirectionCone, speedKmh]);

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
                                const nextRegion: Region = {
                                        latitude: location.coords.latitude,
                                        longitude: location.coords.longitude,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                };

                                setUserRegion(nextRegion);
                                setInitialRegion((currentInitialRegion) => currentInitialRegion ?? nextRegion);
                                const speedMps = location.coords.speed ?? 0;
                                const rawKmh = Math.max(0, speedMps * 3.6);
                                const smoothedKmh = speedRef.current * 0.7 + rawKmh * 0.3;
                                const stableKmh = smoothedKmh < 3 ? 0 : smoothedKmh;

                                speedRef.current = stableKmh;
                                setSpeedKmh(stableKmh);
                                setMovementMode(getMovementMode(stableKmh));
                        });
                })();

                return () => {
                        if (locationSubscription) {
                                locationSubscription.remove();
                        }
                };
        }, []);

        if (!initialRegion) return <View style={styles.container} />;

        const handleRecenterPress = () => {
                        if (!userRegion || !mapRef.current) return;

                        mapRef.current.animateToRegion(userRegion, 600);
        };

        const userCoordinate = userRegion
                ? { latitude: userRegion.latitude, longitude: userRegion.longitude }
                : null;

        return (
                <View style={styles.container}>
                        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
                                {userCoordinate && showDirectionCone ? (
                                        <Marker coordinate={userCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
                                                <DirectionCone heading={heading} />
                                        </Marker>
                                ) : null}

                                {userCoordinate ? (
                                        <Marker coordinate={userCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
                                                <View style={styles.markerContainer}>
                                                        {movementMode === "idle" ? (
                                                                <View style={styles.idleDot} />
                                                        ) : (
                                                                <MaterialIcons
                                                                        name={
                                                                                movementMode === "run"
                                                                                        ? "directions-run"
                                                                                        : movementMode === "bike"
                                                                                                ? "directions-bike"
                                                                                                : movementMode === "car"
                                                                                                        ? "directions-car"
                                                                                                        : "flight"
                                                                        }
                                                                        size={20}
                                                                        color="#FFFFFF"
                                                                />
                                                        )}
                                                </View>
                                        </Marker>
                                ) : null}
                        </MapView>

                        <Speedometer speedKmh={speedKmh} />

                        <Pressable style={styles.recenterButton} onPress={handleRecenterPress}>
                                <MaterialIcons name="my-location" size={24} color="#1B4332" />
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
        markerContainer: {
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "rgba(27,67,50,0.9)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#FFFFFF",
        },
        idleDot: {
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#3B82F6",
        },
});