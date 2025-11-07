import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LocationSharingProps {
  missionId: string;
}

export default function LocationSharing({ missionId }: LocationSharingProps) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<string>('');
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Vérifier les permissions au montage
  useEffect(() => {
    checkPermissions();
    
    return () => {
      // Nettoyer l'abonnement si le composant est démonté
      stopTracking();
    };
  }, []);

  const checkPermissions = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setPermissionStatus(status);
  };

  const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Permission requise',
        'L\'accès à la localisation est nécessaire pour partager votre position en temps réel.'
      );
      return false;
    }

    // Demander permission background sur Android
    if (Platform.OS === 'android') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Permission background',
          'Pour un suivi continu, autorisez l\'accès "Toujours" à la localisation dans les paramètres.'
        );
      }
    }

    setPermissionStatus(foregroundStatus);
    return true;
  };

  const startTracking = async () => {
    // Vérifier/demander permissions
    if (permissionStatus !== 'granted') {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;
    }

    try {
      // Configurer le suivi GPS
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // Mise à jour toutes les 2 secondes
          distanceInterval: 5, // Ou tous les 5 mètres
        },
        async (location) => {
          const { latitude, longitude, speed, heading, accuracy } = location.coords;
          
          // Convertir la vitesse de m/s en km/h
          const speedKmh = speed ? speed * 3.6 : 0;
          setCurrentSpeed(speedKmh);

          // Insérer dans la base de données
          try {
            const { error } = await supabase
              .from('tracking_positions')
              .insert({
                mission_id: missionId,
                user_id: user?.id,
                latitude: latitude,
                longitude: longitude,
                speed_kmh: speedKmh,
                heading: heading || 0,
                accuracy: accuracy || null,
                recorded_at: new Date().toISOString(),
              });

            if (error) {
              console.error('Erreur insertion position:', error);
            }
          } catch (err) {
            console.error('Erreur suivi GPS:', err);
          }
        }
      );

      setIsTracking(true);
      Alert.alert('Suivi GPS activé', 'Votre position est maintenant partagée en temps réel.');
    } catch (error) {
      console.error('Erreur démarrage GPS:', error);
      Alert.alert('Erreur', 'Impossible de démarrer le suivi GPS.');
    }
  };

  const stopTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
    setCurrentSpeed(0);
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
      Alert.alert('Suivi GPS arrêté', 'Votre position n\'est plus partagée.');
    } else {
      startTracking();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Indicateur de statut */}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isTracking ? styles.statusActive : styles.statusInactive]} />
          <Text style={styles.statusText}>
            {isTracking ? 'Partage actif' : 'Partage inactif'}
          </Text>
        </View>

        {/* Vitesse actuelle */}
        {isTracking && (
          <View style={styles.speedContainer}>
            <Text style={styles.speedValue}>{Math.round(currentSpeed)}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}

        {/* Bouton Start/Stop */}
        <TouchableOpacity
          style={[
            styles.button,
            isTracking ? styles.buttonStop : styles.buttonStart,
          ]}
          onPress={toggleTracking}
        >
          <Text style={styles.buttonText}>
            {isTracking ? '⏹ Arrêter le partage' : '▶ Démarrer le partage'}
          </Text>
        </TouchableOpacity>

        {/* Info */}
        {isTracking && (
          <Text style={styles.infoText}>
            📍 Position mise à jour toutes les 2 secondes
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusInactive: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  speedContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  speedValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  speedUnit: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 4,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonStart: {
    backgroundColor: '#0ea5e9',
  },
  buttonStop: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
