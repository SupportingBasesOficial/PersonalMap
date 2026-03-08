import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
  heading: number;
};

export default function DirectionCone({ heading }: Props) {
  return (
    <View
      style={[
        styles.cone,
        {
          transform: [{ rotate: `${heading}deg` }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cone: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 40,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(0,150,255,0.4)",
    position: "absolute",
    top: -30,
    alignSelf: "center",
  },
});
