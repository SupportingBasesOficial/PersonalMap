import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import { MaterialIcons } from "@expo/vector-icons";
import Speedometer from "../components/Speedometer";
import DirectionCone from "../components/DirectionCone";

export default function MapScreen() {
        const [userRegion, setUserRegion] = useState<Region | null>(null);
        const [initialRegion, setInitialRegion] = useState<Region | null>(null);
        const [speedKmh, setSpeedKmh] = useState(0);
        const [heading, setHeading] = useState(0);
        const mapRef = useRef<MapView | null>(null);

        useEffect(() => {
                let lastHeading = 0;

                Magnetometer.setUpdateInterval(100);

                const subscription = Magnetometer.addListener((data) => {
                        let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
                        let nextHeading = (angle + 360) % 360;

                        // simple smoothing
                        const smoothed = lastHeading * 0.7 + nextHeading * 0.3;
                        lastHeading = smoothed;

                        setHeading(smoothed);
                });

                return () => subscription.remove();
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
                                const nextRegion: Region = {
                                        latitude: location.coords.latitude,
                                        longitude: location.coords.longitude,
                                        latitudeDelta: 0.01,
                                        longitudeDelta: 0.01,
                                };

                                setUserRegion(nextRegion);
                                setInitialRegion((currentInitialRegion) => currentInitialRegion ?? nextRegion);
                                const speedMps = location.coords.speed ?? 0;
                                let kmh = speedMps * 3.6;

                                if (kmh < 3) {
                                        kmh = 0;
                                }

                                setSpeedKmh(kmh);
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
                                {userCoordinate ? (
                                        <Marker coordinate={userCoordinate} anchor={{ x: 0.5, y: 0.5 }}>
                                                <View style={styles.userMarkerWrapper}>
                                                        {speedKmh === 0 ? <DirectionCone heading={heading} /> : null}

                                                        <View style={styles.userMarkerOuter}>
                                                                <View style={styles.userMarkerInner} />
                                                        </View>
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
        userMarkerWrapper: {
                width: 60,
                height: 60,
                alignItems: "center",
                justifyContent: "center",
        },
        userMarkerOuter: {
                position: "absolute",
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "#1D4ED8",
        },
        userMarkerInner: {
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#2563EB",
        },
});