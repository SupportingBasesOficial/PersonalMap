import React, { useEffect, useState } from "react"
import { StyleSheet, View } from "react-native"
import MapView, { Marker, Region } from "react-native-maps"
import * as Location from "expo-location"

export default function MapScreen() {
  const [region, setRegion] = useState<Region | null>(null)

  useEffect(() => {
    const loadLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") return

      const loc = await Location.getCurrentPositionAsync({})
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      })
    }

    void loadLocation()
  }, [])

  if (!region) {
    return <View style={styles.container} />
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        <Marker
          coordinate={{
            latitude: region.latitude,
            longitude: region.longitude
          }}
        />
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    width: "100%",
    height: "100%"
  }
})