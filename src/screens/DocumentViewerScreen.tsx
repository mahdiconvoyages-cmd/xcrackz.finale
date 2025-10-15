import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function DocumentViewerScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() && navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visualiseur</Text>
        <View style={styles.placeholder} />
      </LinearGradient>
      <View style={styles.content}>
        <Feather name="eye" size={64} color="#9ca3af" />
        <Text style={styles.title}>Visualiseur de Documents</Text>
        <Text style={styles.subtitle}>Fonctionnalité en développement</Text>
        <Text style={styles.description}>Cette section permettra de visualiser vos documents scannés (PDF, images).</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  placeholder: { width: 40 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginTop: 24, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#14b8a6', marginBottom: 16 },
  description: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
});
