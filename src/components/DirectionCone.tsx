import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

type Props = {
    heading: number;
};

export default function DirectionCone({ heading }: Props) {
    const normalized = ((heading % 360) + 360) % 360;

    return (
        <View pointerEvents="none" style={styles.container}>
            <Svg width={64} height={64} viewBox="0 0 64 64">
                <G transform={`rotate(${normalized} 32 32)`}>
                    <Path d="M32 8 L24 32 L40 32 Z" fill="rgba(37,99,235,0.4)" />
                </G>
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
    },
});
