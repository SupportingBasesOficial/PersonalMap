import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import DirectionCone from "../components/DirectionCone";
import { useNavigationState } from "../hooks/useNavigationState";

function angleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function approximateDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  const dLat = (a.latitude - b.latitude) * metersPerDegreeLat;
  const dLng = (a.longitude - b.longitude) * metersPerDegreeLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

const HEADING_UPDATE_THRESHOLD = 2;
const MOVEMENT_UPDATE_THRESHOLD_METERS = 0.8;

export default function MapScreen() {
  const [followUser, setFollowUser] = useState(true);
  const nav = useNavigationState({ followUser });
  const [camera, setCamera] = useState({
    center: nav.coordinate,
    heading: nav.cameraHeading,
    zoom: 18,
    pitch: 0,
  });
  const lastCameraCenterRef = useRef(nav.coordinate);
  const lastCameraHeadingRef = useRef(nav.cameraHeading);

  useEffect(() => {
    if (!followUser) {
      return;
    }

    const movedMeters = approximateDistanceMeters(nav.coordinate, lastCameraCenterRef.current);
    const headingDiff = Math.abs(angleDelta(lastCameraHeadingRef.current, nav.cameraHeading));
    const shouldUpdateCamera =
      movedMeters > MOVEMENT_UPDATE_THRESHOLD_METERS || headingDiff > HEADING_UPDATE_THRESHOLD;

    if (!shouldUpdateCamera) {
      return;
    }

    lastCameraCenterRef.current = nav.coordinate;
    lastCameraHeadingRef.current = nav.cameraHeading;

    setCamera({
      center: nav.coordinate,
      heading: nav.cameraHeading,
      zoom: 18,
      pitch: 0,
    });
  }, [followUser, nav.cameraHeading, nav.coordinate]);

  const handleRecenter = () => {
    setFollowUser(true);
    lastCameraCenterRef.current = nav.coordinate;
    lastCameraHeadingRef.current = nav.cameraHeading;
    setCamera({
      center: nav.coordinate,
      heading: nav.cameraHeading,
      zoom: 18,
      pitch: 0,
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        onPanDrag={() => setFollowUser(false)}
        camera={camera}
      >
        <Marker
          coordinate={nav.coordinate}
          rotation={nav.markerHeadingRelative}
          anchor={{ x: 0.5, y: 0.5 }}
          centerOffset={{ x: 0, y: 0 }}
          tracksViewChanges={false}
          flat
        >
          <View style={styles.markerWrapper}>
            <DirectionCone heading={0} />

            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </View>
        </Marker>
      </MapView>

      <Pressable
        style={[styles.recenterButton, followUser ? styles.recenterButtonActive : null]}
        onPress={handleRecenter}
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
