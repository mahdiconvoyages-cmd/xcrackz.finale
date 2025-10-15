import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { supabase } from '../config/supabase';
import { navigationService } from '../services/NavigationService';
import { useNavigation } from '@react-navigation/native';

interface InspectionGPSScreenProps {
  missionId: string;
  onComplete: () => void;
}

interface Mission {
  id: string;
  pickup_address: string;
  delivery_address: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  delivery_latitude?: number;
  delivery_longitude?: number;
}

export default function InspectionGPSScreen({ missionId, onComplete }: InspectionGPSScreenProps) {
  const navigation = useNavigation();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [startingNavigation, setStartingNavigation] = useState(false);

  useEffect(() => {
    loadMission();
    getCurrentLocation();
  }, [missionId]);

  const loadMission = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (error) throw error;
      setMission(data);
    } catch (error) {
      console.error('Error loading mission:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations de la mission');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'accès à la localisation est nécessaire pour utiliser le GPS');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const openWaze = async (destination: 'pickup' | 'delivery') => {
    try {
      let lat, lng, address;

      if (destination === 'pickup') {
        lat = mission?.pickup_latitude;
        lng = mission?.pickup_longitude;
        address = mission?.pickup_address;
      } else {
        lat = mission?.delivery_latitude;
        lng = mission?.delivery_longitude;
        address = mission?.delivery_address;
      }

      if (!lat || !lng) {
        Alert.alert('Coordonnées manquantes', 'Les coordonnées GPS ne sont pas disponibles pour cette adresse');
        return;
      }

      // URL scheme Waze
      const wazeUrl = `waze://?ll=${lat},${lng}&navigate=yes`;
      const webFallback = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;

      const supported = await Linking.canOpenURL(wazeUrl);

      if (supported) {
        await Linking.openURL(wazeUrl);
      } else {
        // Fallback to web if Waze app not installed
        await Linking.openURL(webFallback);
      }
    } catch (error) {
      console.error('Error opening Waze:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir Waze');
    }
  };

  const openGoogleMaps = async (destination: 'pickup' | 'delivery') => {
    try {
      let lat, lng;

      if (destination === 'pickup') {
        lat = mission?.pickup_latitude;
        lng = mission?.pickup_longitude;
      } else {
        lat = mission?.delivery_latitude;
        lng = mission?.delivery_longitude;
      }

      if (!lat || !lng) {
        Alert.alert('Coordonnées manquantes', 'Les coordonnées GPS ne sont pas disponibles pour cette adresse');
        return;
      }

      const scheme = Platform.select({
        ios: 'comgooglemaps://',
        android: 'google.navigation:',
      });

      const url = Platform.select({
        ios: `${scheme}?daddr=${lat},${lng}&directionsmode=driving`,
        android: `${scheme}q=${lat},${lng}`,
      });

      const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

      const supported = await Linking.canOpenURL(url!);

      if (supported) {
        await Linking.openURL(url!);
      } else {
        await Linking.openURL(webFallback);
      }
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps');
    }
  };

  const handleComplete = () => {
    Alert.alert(
      'Navigation terminée',
      'Avez-vous terminé votre trajet ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: () => {
            onComplete();
          },
        },
      ]
    );
  };

  // 🆕 Integrated Navigation with Mapbox
  const startIntegratedNavigation = async (destination: 'pickup' | 'delivery') => {
    setStartingNavigation(true);
    try {
      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      let destLat, destLng, destAddress;

      if (destination === 'pickup') {
        destLat = mission?.pickup_latitude;
        destLng = mission?.pickup_longitude;
        destAddress = mission?.pickup_address;
      } else {
        destLat = mission?.delivery_latitude;
        destLng = mission?.delivery_longitude;
        destAddress = mission?.delivery_address;
      }

      if (!destLat || !destLng) {
        Alert.alert('Erreur', 'Coordonnées de destination manquantes');
        return;
      }

      // Start navigation session
      const route = await navigationService.startNavigationSession({
        origin: [location.coords.longitude, location.coords.latitude],
        destination: [destLng, destLat],
        missionId,
      });

      // Navigate to NavigationScreen
      (navigation as any).navigate('Navigation', {
        missionId,
        departureInspectionId: missionId, // You may need to pass actual inspection ID
        destination: {
          latitude: destLat,
          longitude: destLng,
          address: destAddress,
        },
        onComplete: () => {
          console.log('Navigation completed');
        },
      });

    } catch (error: any) {
      console.error('Navigation error:', error);
      
      if (error.message?.includes('quota')) {
        Alert.alert(
          'Quota Mapbox atteint',
          'Le quota mensuel de navigation est atteint. Utilisez Waze ou Google Maps à la place.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de démarrer la navigation');
      }
    } finally {
      setStartingNavigation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current Location */}
      {currentLocation && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={20} color="#06b6d4" />
            <Text style={styles.sectionTitle}>Ma Position</Text>
          </View>
          <View style={styles.locationCard}>
            <Text style={styles.coordinates}>
              📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            </Text>
          </View>
        </View>
      )}

      {/* Pickup Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="map-marker-up" size={20} color="#10b981" />
          <Text style={styles.sectionTitle}>Point de Départ</Text>
        </View>
        <View style={styles.addressCard}>
          <Text style={styles.address}>{mission?.pickup_address}</Text>
          {mission?.pickup_latitude && mission?.pickup_longitude && (
            <Text style={styles.coordinates}>
              {mission.pickup_latitude.toFixed(6)}, {mission.pickup_longitude.toFixed(6)}
            </Text>
          )}
        </View>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => openWaze('pickup')}
          >
            <LinearGradient
              colors={['#00d8ff', '#00b8d4']}
              style={styles.navGradient}
            >
              <MaterialCommunityIcons name="waze" size={24} color="#fff" />
              <Text style={styles.navText}>Waze</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => openGoogleMaps('pickup')}
          >
            <LinearGradient
              colors={['#4285F4', '#357ae8']}
              style={styles.navGradient}
            >
              <Feather name="navigation" size={24} color="#fff" />
              <Text style={styles.navText}>Google Maps</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* 🆕 Integrated Navigation Button */}
        <TouchableOpacity
          style={[styles.integratedNavButton, startingNavigation && styles.buttonDisabled]}
          onPress={() => startIntegratedNavigation('pickup')}
          disabled={startingNavigation}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.navGradient}
          >
            {startingNavigation ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="navigation-variant" size={24} color="#fff" />
                <Text style={styles.navText}>🧭 Navigation Intégrée</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Delivery Location */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="map-marker-down" size={20} color="#ef4444" />
          <Text style={styles.sectionTitle}>Point d'Arrivée</Text>
        </View>
        <View style={styles.addressCard}>
          <Text style={styles.address}>{mission?.delivery_address}</Text>
          {mission?.delivery_latitude && mission?.delivery_longitude && (
            <Text style={styles.coordinates}>
              {mission.delivery_latitude.toFixed(6)}, {mission.delivery_longitude.toFixed(6)}
            </Text>
          )}
        </View>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => openWaze('delivery')}
          >
            <LinearGradient
              colors={['#00d8ff', '#00b8d4']}
              style={styles.navGradient}
            >
              <MaterialCommunityIcons name="waze" size={24} color="#fff" />
              <Text style={styles.navText}>Waze</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => openGoogleMaps('delivery')}
          >
            <LinearGradient
              colors={['#4285F4', '#357ae8']}
              style={styles.navGradient}
            >
              <Feather name="navigation" size={24} color="#fff" />
              <Text style={styles.navText}>Google Maps</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* 🆕 Integrated Navigation Button */}
        <TouchableOpacity
          style={[styles.integratedNavButton, startingNavigation && styles.buttonDisabled]}
          onPress={() => startIntegratedNavigation('delivery')}
          disabled={startingNavigation}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.navGradient}
          >
            {startingNavigation ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons name="navigation-variant" size={24} color="#fff" />
                <Text style={styles.navText}>🧭 Navigation Intégrée</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Feather name="info" size={18} color="#06b6d4" />
        <Text style={styles.infoText}>
          Utilisez Waze ou Google Maps pour la navigation GPS. Marquez cette étape comme terminée une fois arrivé à destination.
        </Text>
      </View>

      {/* Complete Button */}
      <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.completeGradient}
        >
          <Feather name="check-circle" size={20} color="#fff" />
          <Text style={styles.completeText}>Trajet Terminé</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  locationCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  addressCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
  },
  navGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  completeButton: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  integratedNavButton: {
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
