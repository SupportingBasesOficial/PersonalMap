import React from "react";
import { StyleSheet, View } from "react-native";
import { Marker, type LatLng } from "react-native-maps";
import DirectionCone from "./DirectionCone";
import UserDot from "./UserDot";

type Props = {
  coordinate: LatLng;
  followUser: boolean;
  heading: number;
};

export default function UserLocationIndicator({ coordinate, followUser, heading }: Props) {
  if (followUser) {
    return (
      <View pointerEvents="none" style={styles.centerOverlay}>
        <View style={styles.markerWrapper}>
          <DirectionCone heading={0} />
          <UserDot />
        </View>
      </View>
    );
  }

  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} centerOffset={{ x: 0, y: 0 }}>
      <View style={styles.markerWrapper}>
        <DirectionCone heading={heading} />
        <UserDot />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerWrapper: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  centerOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});