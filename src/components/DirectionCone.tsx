import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  heading?: number;
};

export default function DirectionCone({ heading: _heading }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.cone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 32,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(0,150,255,0.45)",
    position: "absolute",
    top: 2,
  },
});
