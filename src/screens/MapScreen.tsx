import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { type LatLng } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import DebugHud from "../components/DebugHud";
import UserLocationIndicator from "../components/UserLocationIndicator";
import { useFollowCamera } from "../hooks/useFollowCamera";
import { useNavigationState } from "../hooks/useNavigationState";

const DEFAULT_COORDINATE: LatLng = {
  latitude: -23.55052,
  longitude: -46.633308,
};

export default function MapScreen() {
  const [followUser, setFollowUser] = useState(true);
  const location = useNavigationState({ followUser });
  const { mapRef, handlePanDrag, handleRecenter } = useFollowCamera({
    followUser,
    setFollowUser,
    coordinate: location.coordinate,
    worldHeading: location.worldHeading,
    speedKmh: location.speedKmh,
    status: location.status,
  });

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
        onPanDrag={handlePanDrag}
        initialCamera={{
          center: coordinate,
          heading: location.worldHeading,
          pitch: 0,
          zoom: 18,
        }}
      >
        <UserLocationIndicator
          coordinate={coordinate}
          followUser={followUser}
          heading={location.markerHeadingRelative}
        />
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

      {__DEV__ ? (
        <DebugHud
          status={location.status}
          followUser={followUser}
          speedKmh={location.speedKmh}
          accuracy={location.accuracy}
          navigationMode={location.navigationMode}
          motionMode={location.motionMode}
          headingSource={location.headingSource}
          worldHeading={location.worldHeading}
          tiltDegrees={location.tiltDegrees}
          headingTiltLocked={location.headingTiltLocked}
        />
      ) : null}

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
