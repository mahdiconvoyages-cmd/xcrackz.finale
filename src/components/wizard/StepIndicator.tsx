import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface StepDef {
  key: string | number;
  label: string;
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
}

interface Props {
  steps: StepDef[];
  current: number; // 1-based index
}

export default function StepIndicator({ steps, current }: Props) {
  return (
    <View style={styles.container}>
      {steps.map((s, idx) => {
        const stepIndex = idx + 1;
        const active = current >= stepIndex;
        const currentStep = current === stepIndex;
        const Icon = s.Icon;
        return (
          <View key={String(s.key)} style={styles.item}>
            <View style={[styles.dot, active && styles.dotActive, currentStep && styles.dotCurrent]}>
              {Icon ? (
                <Icon size={18} color={active ? '#fff' : '#9ca3af'} />
              ) : (
                <Text style={[styles.dotText, active && styles.dotTextActive]}>{stepIndex}</Text>
              )}
            </View>
            <Text style={[styles.label, currentStep && styles.labelActive]} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  item: { alignItems: 'center', flex: 1 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  dotActive: { backgroundColor: '#3b82f6' },
  dotCurrent: { backgroundColor: '#2563eb', transform: [{ scale: 1.1 }] },
  dotText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  dotTextActive: { color: '#fff' },
  label: { fontSize: 11, color: '#9ca3af' },
  labelActive: { fontWeight: '600', color: '#2563eb' },
});
