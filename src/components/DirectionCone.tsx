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
                width: 64,
                    height: 64,
                        alignItems: "center",
                            justifyContent: "center",
                            zIndex: 2,
                            elevation: 2,
      },
        cone: {
                position: "absolute",
                    top: 6,
                    width: 0,
                        height: 0,
                            borderLeftWidth: 10,
                                borderRightWidth: 10,
                                    borderBottomWidth: 18,
                                        borderLeftColor: "transparent",
                                            borderRightColor: "transparent",
                                                    borderBottomColor: "rgba(37,99,235,0.55)",
                                                    zIndex: 2,
                                                    elevation: 2,
        },
});
