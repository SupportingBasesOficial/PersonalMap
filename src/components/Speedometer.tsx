import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  speedKmh: number;
};

export default function Speedometer({ speedKmh }: Props) {
  const speed = Math.max(0, Math.round(speedKmh));

  return (
    <View style={styles.container}>
      <Text style={styles.speed}>{speed}</Text>
      <Text style={styles.unit}>km/h</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  speed: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  unit: {
    fontSize: 12,
    color: "#E5E7EB",
    letterSpacing: 1,
  },
});
