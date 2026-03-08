import React from "react";
import { View, StyleSheet } from "react-native";

type Props = {
      heading: number;
};

export default function DirectionCone({ heading }: Props) {
      return (
            <View
                  pointerEvents="none"
                        style={[
                                    styles.container,
                                            { transform: [{ rotate: `${heading}deg` }] },
                        ]}
                            >
                                  <View style={styles.cone}/>
                                      </View>
      );
}

const styles = StyleSheet.create({
      container: {
            position: "absolute",
                width: 60,
                    height: 60,
                        alignItems: "center",
                            justifyContent: "center",
      },
        cone: {
                position: "absolute",
                    top: -22,
                    width: 0,
                        height: 0,
                            borderLeftWidth: 12,
                                borderRightWidth: 12,
                                    borderBottomWidth: 24,
                                        borderLeftColor: "transparent",
                                            borderRightColor: "transparent",
                                                    borderBottomColor: "rgba(37,99,235,0.30)",
        },
});
