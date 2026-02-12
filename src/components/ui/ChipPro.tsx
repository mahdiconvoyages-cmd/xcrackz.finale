import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export default function ChipPro({ label, active, onPress, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active ? styles.active : undefined, style as any]}>
      <Text style={[styles.text, active ? styles.textActive : undefined]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1222',
  },
  active: {
    borderColor: '#14b8a6',
    backgroundColor: '#14b8a620',
  },
  text: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  textActive: { color: '#22d3ee' },
});
