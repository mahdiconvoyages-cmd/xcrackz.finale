import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

export default function UpdateCheckerScreen() {
  const [checking, setChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Mise à jour disponible',
          'Une nouvelle version est disponible. Voulez-vous l\'installer ?',
          [
            { text: 'Plus tard', style: 'cancel' },
            {
              text: 'Installer',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        Alert.alert('Aucune mise à jour', 'Vous avez la dernière version');
      }
      
      setUpdateInfo(update);
    } catch (error) {
      Alert.alert('Erreur', `Impossible de vérifier les mises à jour: ${error}`);
    } finally {
      setChecking(false);
    }
  };

  const forceReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      Alert.alert('Erreur', `Impossible de recharger: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Test Expo Updates</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Runtime Version:</Text>
          <Text style={styles.infoValue}>{Updates.runtimeVersion || 'N/A'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Update ID:</Text>
          <Text style={styles.infoValue}>{Updates.updateId || 'N/A'}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Channel:</Text>
          <Text style={styles.infoValue}>{Updates.channel || 'N/A'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={checkForUpdates}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Vérifier les mises à jour</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={forceReload}>
          <Text style={styles.buttonText}>Forcer le rechargement</Text>
        </TouchableOpacity>

        {updateInfo && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>
              {JSON.stringify(updateInfo, null, 2)}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#1a2332',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8b92a8',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: '#1a2332',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  resultText: {
    color: '#8b92a8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
