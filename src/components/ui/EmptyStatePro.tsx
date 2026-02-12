import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}

export default function EmptyStatePro({ icon, title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color="#64748b" />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  title: { color: '#e2e8f0', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#94a3b8', textAlign: 'center', paddingHorizontal: 32 },
});
