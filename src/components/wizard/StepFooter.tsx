import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  showPrev?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  loading?: boolean;
}

export default function StepFooter({ showPrev = true, onPrev, onNext, nextLabel = 'Suivant', loading }: Props) {
  return (
    <View style={styles.container}>
      {showPrev && (
        <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onPrev} disabled={loading}>
          <Ionicons name="chevron-back" size={20} color="#6b7280" />
          <Text style={styles.secondaryText}>Précédent</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={[styles.btn, styles.btnPrimary, !showPrev && { flex: 1 }]} onPress={onNext} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.primaryText}>{nextLabel}</Text>
            <Ionicons name={nextLabel === 'Terminer' ? 'checkmark' : 'chevron-forward'} size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
    backgroundColor: '#fff',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  btnPrimary: {
    flex: 2,
    backgroundColor: '#3b82f6',
  },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  primaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
