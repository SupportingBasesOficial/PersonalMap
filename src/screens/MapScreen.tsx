import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Magnetometer, Accelerometer } from "expo-sensors";
import { MaterialIcons } from "@expo/vector-icons";
import Speedometer from "../components/Speedometer";
import DirectionCone from "../components/DirectionCone";

export default function MapScreen() {
        const [userRegion, setUserRegion] = useState<Region | null>(null);
        const [initialRegion, setInitialRegion] = useState<Region | null>(null);
        const [speedKmh, setSpeedKmh] = useState(0);
        const [heading, setHeading] = useState(0);
        const mapRef = useRef<MapView | null>(null);
        const accelData = useRef({ x: 0, y: 0, z: 0 });

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

                        setHeading(heading);
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

        const userLocation = userRegion
                ? { latitude: userRegion.latitude, longitude: userRegion.longitude }
                : null;

        return (
                <View style={styles.container}>
                        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
                                {userLocation ? (
                                        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
                                                <View style={styles.markerContainer}>
                                                        {speedKmh === 0 && <DirectionCone heading={heading} />}

                                                        <View style={styles.userDotOuter}>
                                                                <View style={styles.userDotInner} />
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
        markerContainer: {
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
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