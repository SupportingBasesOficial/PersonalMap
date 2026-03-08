import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";

export default function MapScreen() {
      const [region, setRegion] = useState<Region | null>(null);

        useEffect(() => {
                (async () => {
                          const { status } = await Location.requestForegroundPermissionsAsync();

                                if (status !== "granted") {
                                            console.log("Permissão de localização negada");
                                                    return;
                                }

                                      const location = await Location.getCurrentPositionAsync({});

                                            setRegion({
                                                        latitude: location.coords.latitude,
                                                                longitude: location.coords.longitude,
                                                                        latitudeDelta: 0.01,
                                                                                longitudeDelta: 0.01,
                                            });
                })();
        }, []);

          if (!region) return <View style={styles.container} />;

            return (
                    <MapView style={styles.map} region={region}>
                          <Marker coordinate={region} />
                              </MapView>
            );
}

const styles = StyleSheet.create({
      container: {
            flex: 1,
      },
        map: {
                flex: 1,
        },
});