import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Application from 'expo-application';

export default function VersionBadge() {
  const version = Application.nativeApplicationVersion ?? '0.0.0';
  const build = Application.nativeBuildVersion ?? '0';
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Version {version} (build {build})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(20,184,166,0.15)',
    borderWidth: 1,
    borderColor: '#14b8a6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '700',
  },
});
