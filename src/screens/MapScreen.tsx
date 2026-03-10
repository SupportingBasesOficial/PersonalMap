import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import DirectionCone from "../components/DirectionCone";
import { useNavigationState } from "../hooks/useNavigationState";

export default function MapScreen() {
  const [followUser, setFollowUser] = useState(true);
  const { coordinate, cameraHeading, markerHeadingRelative } = useNavigationState({ followUser });

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        onPanDrag={() => setFollowUser(false)}
        camera={
          followUser
            ? {
                center: coordinate,
                heading: cameraHeading,
                pitch: 0,
                zoom: 18,
              }
            : undefined
        }
      >
        <Marker
          coordinate={coordinate}
          rotation={markerHeadingRelative}
          anchor={{ x: 0.5, y: 0.5 }}
          centerOffset={{ x: 0, y: 0 }}
          tracksViewChanges={false}
          flat
        >
          <View style={styles.markerWrapper}>
            <DirectionCone />

            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </View>
        </Marker>
      </MapView>

      <Pressable
        style={[styles.recenterButton, followUser ? styles.recenterButtonActive : null]}
        onPress={() => setFollowUser(true)}
      >
        <MaterialIcons name="my-location" size={24} color={followUser ? "#FFFFFF" : "#1B4332"} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
