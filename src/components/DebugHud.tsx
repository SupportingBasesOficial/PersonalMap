import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  status: "loading" | "ready" | "permission-denied" | "error";
  followUser: boolean;
  speedKmh: number;
  accuracy: number | null;
  navigationMode: string;
  motionMode: string;
  headingSource: string;
  worldHeading: number;
};

function formatAccuracy(accuracy: number | null) {
  if (accuracy === null || !Number.isFinite(accuracy)) {
    return "n/d";
  }

  return `${Math.round(accuracy)} m`;
}

export default function DebugHud(props: Props) {
  const {
    status,
    followUser,
    speedKmh,
    accuracy,
    navigationMode,
    motionMode,
    headingSource,
    worldHeading,
  } = props;

  return (
    <View pointerEvents="none" style={styles.container}>
      <Text style={styles.text}>status: {status}</Text>
      <Text style={styles.text}>follow: {followUser ? "on" : "off"}</Text>
      <Text style={styles.text}>velocidade: {Math.round(speedKmh)} km/h</Text>
      <Text style={styles.text}>precisao: {formatAccuracy(accuracy)}</Text>
      <Text style={styles.text}>modo nav: {navigationMode}</Text>
      <Text style={styles.text}>modo movimento: {motionMode}</Text>
      <Text style={styles.text}>fonte heading: {headingSource}</Text>
      <Text style={styles.text}>heading mundo: {Math.round(worldHeading)} deg</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    bottom: 92,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(2, 6, 23, 0.75)",
  },
  text: {
    color: "#E2E8F0",
    fontSize: 11,
    lineHeight: 15,
  },
});