import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  onBack?: () => void;
  rightAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void };
  style?: ViewStyle | ViewStyle[];
}

export default function HeaderGradient({ title, onBack, rightAction, style }: Props) {
  return (
    <LinearGradient colors={["#0b1222", "#0a0a1a"] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, style as any]}>
      <View style={styles.row}>
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        {rightAction ? (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.iconBtn}>
            <Ionicons name={rightAction.icon} size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff20' },
  iconPlaceholder: { width: 36, height: 36 },
});
