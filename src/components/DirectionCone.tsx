import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

export default function DirectionCone() {
    return (
        <View pointerEvents="none" style={styles.container}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
                <Polygon
                    points="32 32 24 8 40 8"
                    fill="rgba(37,99,235,0.35)"
                />
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        elevation: 2,
    },
});
