import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

function MapScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>MapaPessoal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
});

export default MapScreen;
