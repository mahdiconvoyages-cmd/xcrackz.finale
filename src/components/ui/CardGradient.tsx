import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export default function CardGradient({ children, style }: Props) {
  return (
    <LinearGradient
      colors={["#1e293b", "#0f172a"] as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, Array.isArray(style) ? StyleSheet.flatten(style) : style]}
    >
      <View style={styles.inner}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inner: {
    padding: 16,
  },
});
