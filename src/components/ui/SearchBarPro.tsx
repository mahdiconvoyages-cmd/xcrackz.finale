import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export default function SearchBarPro({ value, onChangeText, placeholder }: Props) {
  return (
    <View style={styles.box}>
      <Ionicons name="search" size={18} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Rechercher'}
        placeholderTextColor="#64748b"
        style={styles.input}
        returnKeyType="search"
      />
      {value?.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={18} color="#94a3b8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1222',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { flex: 1, color: '#e2e8f0', paddingVertical: 0 },
});
