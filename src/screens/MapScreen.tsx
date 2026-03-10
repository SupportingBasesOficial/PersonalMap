import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type LatLng } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import DirectionCone from "../components/DirectionCone";
import UserDot from "../components/UserDot";
import { useUserLocation } from "../hooks/useUserLocation";

const DEFAULT_COORDINATE: LatLng = {
  latitude: -23.55052,
  longitude: -46.633308,
};

const MIN_CAMERA_MOVE_METERS = 1;
const MIN_CAMERA_HEADING_DELTA_DEGREES = 3;

function approximateDistanceMeters(a: LatLng, b: LatLng) {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos(((a.latitude + b.latitude) / 2) * (Math.PI / 180));
  const dLat = (a.latitude - b.latitude) * metersPerDegreeLat;
  const dLng = (a.longitude - b.longitude) * metersPerDegreeLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function angleDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

export default function MapScreen() {
  const location = useUserLocation();
  const [followUser, setFollowUser] = useState(true);
  const mapRef = useRef<MapView | null>(null);
  const lastCameraCenterRef = useRef<LatLng>(DEFAULT_COORDINATE);
  const lastCameraHeadingRef = useRef(0);

  useEffect(() => {
    if (!followUser || location.status !== "ready" || !location.coordinate) {
      return;
    }

    const movedMeters = approximateDistanceMeters(location.coordinate, lastCameraCenterRef.current);
    const headingDelta = Math.abs(angleDelta(location.heading, lastCameraHeadingRef.current));

    if (movedMeters < MIN_CAMERA_MOVE_METERS && headingDelta < MIN_CAMERA_HEADING_DELTA_DEGREES) {
      return;
    }

    lastCameraCenterRef.current = location.coordinate;
    lastCameraHeadingRef.current = location.heading;
    mapRef.current?.animateCamera(
      {
        center: location.coordinate,
        heading: location.heading,
        pitch: 0,
        zoom: 18,
      },
      { duration: 180 }
    );
  }, [followUser, location.coordinate, location.heading, location.status]);

  const handleRecenter = () => {
    if (location.status !== "ready" || !location.coordinate) {
      return;
    }

    setFollowUser(true);
    lastCameraCenterRef.current = location.coordinate;
    lastCameraHeadingRef.current = location.heading;
    mapRef.current?.animateCamera(
      {
        center: location.coordinate,
        heading: location.heading,
        pitch: 0,
        zoom: 18,
      },
      { duration: 220 }
    );
  };

  if (location.status === "loading") {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.stateText}>Carregando localizacao...</Text>
      </View>
    );
  }

  if (location.status === "permission-denied") {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateTitle}>Permissao de localizacao negada</Text>
        <Text style={styles.stateText}>Ative a permissao para usar o mapa e o recentro automatico.</Text>
      </View>
    );
  }

  if (location.status === "error") {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateTitle}>Nao foi possivel iniciar a localizacao</Text>
        <Text style={styles.stateText}>{location.errorMessage ?? "Tente novamente em instantes."}</Text>
      </View>
    );
  }

  const coordinate = location.coordinate ?? DEFAULT_COORDINATE;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        onPanDrag={() => setFollowUser(false)}
        initialCamera={{
          center: coordinate,
          heading: location.heading,
          pitch: 0,
          zoom: 18,
        }}
      >
        <Marker
          coordinate={coordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          centerOffset={{ x: 0, y: 0 }}
          tracksViewChanges={false}
        >
          <View style={styles.markerWrapper}>
            <DirectionCone heading={followUser ? 0 : location.heading} />
            <UserDot />
          </View>
        </Marker>
      </MapView>

      <View style={styles.speedBadge}>
        <Text style={styles.speedText}>{Math.round(location.speedKmh)} km/h</Text>
      </View>

      <Pressable
        style={[styles.recenterButton, followUser ? styles.recenterButtonActive : null]}
        onPress={handleRecenter}
      >
        <MaterialIcons name="my-location" size={24} color={followUser ? "#FFFFFF" : "#1B4332"} />
      </Pressable>

      {/*
        Fase 2 inicial:
        - heading simples de bussola
        - cone visual sem logica hibrida

        Mantido fora por enquanto:
        - sem navegacao hibrida
        - sem Kalman/predicao
      */}
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
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F8FAFC",
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  stateText: {
    marginTop: 10,
    fontSize: 15,
    color: "#334155",
    textAlign: "center",
  },
  speedBadge: {
    position: "absolute",
    left: 16,
    top: 48,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  speedText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  markerWrapper: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
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
});
