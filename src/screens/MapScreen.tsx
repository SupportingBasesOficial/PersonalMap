import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import Speedometer from "../components/Speedometer";

export default function MapScreen() {
        const [userRegion, setUserRegion] = useState<Region | null>(null);
        const [initialRegion, setInitialRegion] = useState<Region | null>(null);
        const [speedKmh, setSpeedKmh] = useState(0);
        const mapRef = useRef<MapView | null>(null);

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
                                const kmh = speedMps * 3.6;
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

        return (
                <View style={styles.container}>
                        <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
                                {userRegion ? <Marker coordinate={userRegion} /> : null}
                        </MapView>

                        <Pressable style={styles.recenterButton} onPress={handleRecenterPress}>
                                <MaterialIcons name="my-location" size={24} color="#1B4332" />
                        </Pressable>

                        <Speedometer speedKmh={speedKmh} />
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
        }
});