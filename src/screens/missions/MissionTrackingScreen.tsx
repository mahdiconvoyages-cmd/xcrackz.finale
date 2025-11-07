import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  ScrollView,
  Clipboard,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  isTrackingActive,
  getLocationHistory,
  getTrackingStats,
} from '../../services/gpsTrackingService';

export default function MissionTrackingScreen({ route, navigation }: any) {
  const { missionId } = route.params;
  const { colors, isDark } = useTheme();
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [tracking, setTracking] = useState(false);
  const [locationHistory, setLocationHistory] = useState<any[]>([]);
  const [mission, setMission] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<any>(null);

  useEffect(() => {
    initializeScreen();
    return () => {
      // Cleanup
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const initializeScreen = async () => {
    await loadMission();
    await requestLocationPermission();
    await checkTrackingStatus();
    await loadLocationHistory();
    setLoading(false);
  };

  const loadMission = async () => {
    const { data } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();
    if (data) setMission(data);
  };

  const loadLocationHistory = async () => {
    const history = await getLocationHistory(missionId);
    setLocationHistory(history);
    
    // Charger les statistiques
    const trackingStats = await getTrackingStats(missionId);
    setStats(trackingStats);
  };

  const checkTrackingStatus = async () => {
    const isActive = await isTrackingActive();
    setTracking(isActive);
    
    if (isActive) {
      startRealtimeUpdates();
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Accès à la localisation requis pour le suivi GPS');
      return false;
    }

    // Obtenir la position initiale
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting initial location:', error);
    }

    return true;
  };

  const startRealtimeUpdates = () => {
    // Mise à jour en temps réel toutes les 3 secondes
    locationSubscription.current = setInterval(() => {
      loadLocationHistory();
    }, 3000);
  };

  const stopRealtimeUpdates = () => {
    if (locationSubscription.current) {
      clearInterval(locationSubscription.current);
      locationSubscription.current = null;
    }
  };

  // 🚀 SUPPRIMÉ: startTracking et stopTracking (maintenant automatiques)
  // Le tracking démarre automatiquement après l'inspection départ
  // Le tracking s'arrête automatiquement quand la mission est complétée

  const handleShareTrackingLink = async () => {
    if (!mission?.public_tracking_link) {
      Alert.alert('Erreur', 'Aucun lien de suivi disponible');
      return;
    }

    const trackingUrl = `https://xcrackz.com/tracking/${mission.public_tracking_link}`;
    
    try {
      await Share.share({
        message: `Suivez votre livraison en temps réel :\n${trackingUrl}\n\nMission: ${mission.reference}`,
        title: 'Lien de suivi GPS',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyTrackingLink = async () => {
    if (!mission?.public_tracking_link) {
      Alert.alert('Erreur', 'Aucun lien de suivi disponible');
      return;
    }

    const trackingUrl = `https://xcrackz.com/tracking/${mission.public_tracking_link}`;
    Clipboard.setString(trackingUrl);
    Alert.alert('Copié', 'Le lien de suivi a été copié dans le presse-papiers');
  };

  const centerOnCurrentPosition = async () => {
    if (!currentLocation || !mapRef.current) return;

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newPosition);

      mapRef.current.animateToRegion({
        latitude: newPosition.latitude,
        longitude: newPosition.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } catch (error) {
      console.error('Error centering map:', error);
    }
  };

  const fitMapToRoute = () => {
    if (locationHistory.length === 0 || !mapRef.current) return;

    const coordinates = locationHistory.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
      animated: true,
    });
  };

  if (loading || !currentLocation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initialisation du suivi GPS...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        {/* Marqueur position actuelle */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Position actuelle"
          >
            <View style={[styles.currentMarker, { backgroundColor: colors.primary }]}>
              <Ionicons name="navigate" size={20} color="#ffffff" />
            </View>
          </Marker>
        )}

        {/* Tracé du parcours */}
        {locationHistory.length > 1 && (
          <Polyline
            coordinates={locationHistory.map(loc => ({
              latitude: loc.latitude,
              longitude: loc.longitude,
            }))}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        )}

        {/* Marqueur départ */}
        {locationHistory.length > 0 && (
          <Marker
            coordinate={{
              latitude: locationHistory[0].latitude,
              longitude: locationHistory[0].longitude,
            }}
            title="Départ"
          >
            <View style={[styles.startMarker, { backgroundColor: colors.success }]}>
              <Feather name="flag" size={16} color="#ffffff" />
            </View>
          </Marker>
        )}

        {/* Marqueur arrivée (si suivi terminé) */}
        {!tracking && locationHistory.length > 1 && (
          <Marker
            coordinate={{
              latitude: locationHistory[locationHistory.length - 1].latitude,
              longitude: locationHistory[locationHistory.length - 1].longitude,
            }}
            title="Arrivée"
          >
            <View style={[styles.endMarker, { backgroundColor: colors.error }]}>
              <Feather name="flag" size={16} color="#ffffff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bouton centrer sur ma position */}
      <TouchableOpacity
        style={[styles.centerButton, { backgroundColor: colors.card }]}
        onPress={centerOnCurrentPosition}
      >
        <Ionicons name="locate" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Bouton voir tout le parcours */}
      {locationHistory.length > 0 && (
        <TouchableOpacity
          style={[styles.fitButton, { backgroundColor: colors.card }]}
          onPress={fitMapToRoute}
        >
          <Feather name="maximize" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* Panneau de contrôle */}
      <ScrollView style={[styles.controls, { backgroundColor: colors.card }]}>
        {mission && (
          <View style={styles.missionInfo}>
            <Text style={[styles.missionRef, { color: colors.text }]}>
              {mission.reference}
            </Text>
            <Text style={[styles.missionRoute, { color: colors.textSecondary }]} numberOfLines={2}>
              {mission.pickup_address} → {mission.delivery_address}
            </Text>
          </View>
        )}

        {/* Statistiques */}
        {stats && stats.pointsCount > 0 && (
          <View style={[styles.statsContainer, { backgroundColor: colors.background }]}>
            <View style={styles.statItem}>
              <Feather name="navigation" size={18} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.totalDistance.toFixed(2)} km
              </Text>
            </View>

            <View style={styles.statItem}>
              <Feather name="clock" size={18} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Durée</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.totalDuration} min
              </Text>
            </View>

            <View style={styles.statItem}>
              <Feather name="activity" size={18} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vitesse moy.</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.averageSpeed.toFixed(1)} km/h
              </Text>
            </View>

            <View style={styles.statItem}>
              <Feather name="zap" size={18} color={colors.primary} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Vitesse max</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stats.maxSpeed.toFixed(1)} km/h
              </Text>
            </View>
          </View>
        )}

        {/* 🚀 NOUVEAU: Indicateur de statut tracking (pas de boutons manuels) */}
        <View style={[
          styles.trackingStatusCard,
          { backgroundColor: tracking ? colors.success + '15' : colors.background, borderColor: tracking ? colors.success : colors.border }
        ]}>
          <View style={styles.statusHeader}>
            {tracking ? (
              <>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]}>
                  <View style={styles.pulse} />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusTitle, { color: colors.success }]}>
                    📡 Suivi GPS actif
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                    Mise à jour automatique • {stats?.pointsCount || 0} points enregistrés
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.statusDot, { backgroundColor: colors.textSecondary }]} />
                <View style={styles.statusTextContainer}>
                  <Text style={[styles.statusTitle, { color: colors.text }]}>
                    ⏸️ Suivi inactif
                  </Text>
                  <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                    Le suivi démarre automatiquement après l'inspection départ
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Boutons partage lien */}
        {mission?.public_tracking_link && (
          <View style={styles.shareButtons}>
            <TouchableOpacity
              style={[styles.shareButton, { backgroundColor: colors.primary }]}
              onPress={handleShareTrackingLink}
            >
              <Feather name="share-2" size={18} color="#ffffff" />
              <Text style={styles.shareButtonText}>Partager le lien de suivi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.copyButton, { backgroundColor: colors.info }]}
              onPress={handleCopyTrackingLink}
            >
              <Feather name="copy" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  centerButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fitButton: {
    position: 'absolute',
    top: 120,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  missionInfo: { marginBottom: 16 },
  missionRef: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  missionRoute: { fontSize: 14 },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: '600' },
  // 🚀 NOUVEAUX STYLES: Carte de statut tracking
  trackingStatusCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'relative',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  pulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    opacity: 0.6,
    position: 'absolute',
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  currentMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  startMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: 16, fontSize: 16 },
});
