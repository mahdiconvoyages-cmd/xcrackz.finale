/**
 * 🗺️ Tracking Map Screen - Carte de suivi GPS en temps réel
 * 
 * Affiche la carte avec la position en temps réel et le tracé optimisé
 * Utilise OpenRouteService pour le calcul d'itinéraire
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// OpenRouteService API Key from environment
const OPENROUTESERVICE_API_KEY = process.env.EXPO_PUBLIC_OPENROUTESERVICE_API_KEY || '';

interface Mission {
  id: string;
  reference: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  driver_id?: string;
}

interface GPSPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  bearing?: number;
}

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

type TrackingMapScreenRouteProp = RouteProp<{ params: { missionId: string } }, 'params'>;

export default function TrackingMapScreen() {
  const route = useRoute<TrackingMapScreenRouteProp>();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

  const { missionId } = route.params;

  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    loadMission();
    startLocationTracking();

    // Écouter les updates GPS en temps réel
    const channel = supabase.channel(`mission:${missionId}:gps`);
    
    channel.on('broadcast', { event: 'gps_update' }, (payload) => {
      const position = payload.payload as GPSPosition;
      console.log('GPS update received:', position);
      setCurrentPosition(position);
    });

    channel.subscribe((status) => {
      console.log('Realtime channel status:', status);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [missionId]);

  useEffect(() => {
    if (mission?.pickup_lat && mission?.pickup_lng && mission?.delivery_lat && mission?.delivery_lng) {
      loadRoute();
    }
  }, [mission]);

  const loadMission = async () => {
    try {
      console.log('[TrackingMap] Loading mission:', missionId);
      
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (error) {
        console.error('[TrackingMap] Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        console.error('[TrackingMap] Mission not found');
        Alert.alert('Erreur', 'Mission introuvable');
        return;
      }

      console.log('[TrackingMap] Mission loaded:', {
        reference: data.reference,
        status: data.status,
        hasPickupCoords: !!(data.pickup_lat && data.pickup_lng),
        hasDeliveryCoords: !!(data.delivery_lat && data.delivery_lng)
      });

      setMission(data);
    } catch (error: any) {
      console.error('[TrackingMap] Error loading mission:', error);
      Alert.alert('Erreur', 'Impossible de charger la mission');
    } finally {
      setLoading(false);
    }
  };

  const loadRoute = async () => {
    if (!mission?.pickup_lat || !mission?.pickup_lng || !mission?.delivery_lat || !mission?.delivery_lng) {
      console.log('[TrackingMap] Missing coordinates, cannot load route');
      return;
    }

    try {
      console.log('[TrackingMap] Loading route from OpenRouteService...');
      
      const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': OPENROUTESERVICE_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json, application/geo+json'
        },
        body: JSON.stringify({
          coordinates: [
            [mission.pickup_lng, mission.pickup_lat],
            [mission.delivery_lng, mission.delivery_lat]
          ],
          elevation: false,
          instructions: false,
          preference: 'recommended'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TrackingMap] OpenRouteService error:', response.status, errorText);
        
        // Fallback: ligne droite si erreur API
        console.log('[TrackingMap] Falling back to straight line');
        setRouteCoordinates([
          { latitude: mission.pickup_lat, longitude: mission.pickup_lng },
          { latitude: mission.delivery_lat, longitude: mission.delivery_lng }
        ]);
        return;
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        console.error('[TrackingMap] No route found in response');
        // Fallback: ligne droite
        setRouteCoordinates([
          { latitude: mission.pickup_lat, longitude: mission.pickup_lng },
          { latitude: mission.delivery_lat, longitude: mission.delivery_lng }
        ]);
        return;
      }

      const route = data.features[0];
      const geometry = route.geometry;
      const properties = route.properties;
      const summary = properties.summary;

      console.log('[TrackingMap] Route loaded:', {
        distance: `${(summary.distance / 1000).toFixed(1)} km`,
        duration: `${Math.round(summary.duration / 60)} min`,
        points: geometry.coordinates.length
      });

      // Convertir les coordonnées [lon, lat] en {latitude, longitude}
      const coordinates: RouteCoordinate[] = geometry.coordinates.map((coord: number[]) => ({
        longitude: coord[0],
        latitude: coord[1]
      }));

      setRouteCoordinates(coordinates);
      setRouteInfo({
        distance: summary.distance,
        duration: summary.duration
      });

      // Ajuster la vue de la carte pour inclure tout l'itinéraire
      if (mapRef.current && coordinates.length > 0) {
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true
        });
      }
    } catch (error) {
      console.error('[TrackingMap] Error loading route:', error);
      // Fallback: ligne droite en cas d'erreur réseau
      if (mission.pickup_lat && mission.pickup_lng && mission.delivery_lat && mission.delivery_lng) {
        setRouteCoordinates([
          { latitude: mission.pickup_lat, longitude: mission.pickup_lng },
          { latitude: mission.delivery_lat, longitude: mission.delivery_lng }
        ]);
      }
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('[TrackingMap] Requesting location permission...');
      
      // Vérifier d'abord si les permissions sont déjà accordées
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.error('[TrackingMap] Location permission denied');
        Alert.alert('Permission refusée', 'La permission de localisation est nécessaire pour le suivi GPS');
        return;
      }

      console.log('[TrackingMap] Starting GPS tracking...');
      setIsTracking(true);

      // Démarrer le suivi en temps réel
      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        async (location) => {
          const position: GPSPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            bearing: location.coords.heading || undefined
          };

          console.log('[TrackingMap] GPS update:', {
            lat: position.latitude.toFixed(6),
            lng: position.longitude.toFixed(6),
            bearing: position.bearing
          });

          setCurrentPosition(position);

          // TODO: Sauvegarder dans gps_location_points nécessite une session de tracking
          // Pour l'instant, on utilise uniquement le broadcast Realtime
          // Voir: gps_tracking_sessions table pour implémenter correctement
          
          // Broadcast position via Supabase Realtime
          try {
            await supabase.channel(`mission:${missionId}:gps`).send({
              type: 'broadcast',
              event: 'gps_update',
              payload: position
            });
            console.log('[TrackingMap] GPS position broadcasted');
          } catch (broadcastError) {
            console.error('[TrackingMap] Broadcast error:', broadcastError);
          }

          // Centrer la carte sur la position actuelle
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: position.latitude,
              longitude: position.longitude,
              latitudeDelta: LATITUDE_DELTA / 2,
              longitudeDelta: LONGITUDE_DELTA / 2,
            }, 1000);
          }
        }
      );
      
      // Sauvegarder la référence de la souscription pour pouvoir la nettoyer
      // Note: À implémenter dans un useEffect cleanup si nécessaire

      console.log('[TrackingMap] GPS tracking started successfully');
    } catch (error: any) {
      console.error('[TrackingMap] Error starting location tracking:', error);
      setIsTracking(false);
      Alert.alert(
        'Erreur GPS', 
        error?.message || 'Impossible de démarrer le suivi GPS. Vérifiez que les services de localisation sont activés.'
      );
    }
  };

  const centerOnCurrentPosition = () => {
    if (currentPosition && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: LATITUDE_DELTA / 2,
        longitudeDelta: LONGITUDE_DELTA / 2,
      }, 500);
    }
  };

  const centerOnRoute = () => {
    if (routeCoordinates.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true
      });
    }
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status || 'Inconnu';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Chargement de la carte...
        </Text>
      </View>
    );
  }

  if (!mission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Mission introuvable
        </Text>
      </SafeAreaView>
    );
  }

  const initialRegion = mission.pickup_lat && mission.pickup_lng ? {
    latitude: mission.pickup_lat,
    longitude: mission.pickup_lng,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  } : undefined;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={true}
      >
        {/* Pickup Marker */}
        {mission.pickup_lat && mission.pickup_lng && (
          <Marker
            coordinate={{
              latitude: mission.pickup_lat,
              longitude: mission.pickup_lng
            }}
            title="Départ"
            description={mission.pickup_address}
            pinColor="#10b981"
          />
        )}

        {/* Delivery Marker */}
        {mission.delivery_lat && mission.delivery_lng && (
          <Marker
            coordinate={{
              latitude: mission.delivery_lat,
              longitude: mission.delivery_lng
            }}
            title="Arrivée"
            description={mission.delivery_address}
            pinColor="#ef4444"
          />
        )}

        {/* Current Position Marker */}
        {currentPosition && (
          <Marker
            coordinate={{
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude
            }}
            title="Position actuelle"
            description={`${new Date(currentPosition.timestamp).toLocaleTimeString('fr-FR')}`}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.currentPositionMarker}>
              <View style={[styles.markerPulse, { backgroundColor: colors.primary }]} />
              <View style={[styles.markerDot, { backgroundColor: colors.primary }]} />
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={[styles.headerInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {mission.reference}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(mission.status) }]}>
              {getStatusLabel(mission.status)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.card }]}
          onPress={() => setShowStats(!showStats)}
        >
          <Ionicons name={showStats ? 'eye-off' : 'eye'} size={24} color={colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Stats Panel */}
      {showStats && routeInfo && (
        <View style={[styles.statsPanel, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Feather name="navigation" size={20} color={colors.primary} />
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Distance
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatDistance(routeInfo.distance)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Feather name="clock" size={20} color={colors.primary} />
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Durée estimée
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatDuration(routeInfo.duration)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Feather name="truck" size={20} color={colors.primary} />
            <View style={styles.statContent}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Véhicule
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
                {mission.vehicle_plate || 'N/A'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* GPS Status */}
      {isTracking && (
        <View style={[
          styles.gpsStatus, 
          { 
            backgroundColor: colors.success + '20',
            top: showStats && routeInfo ? 200 : 100
          }
        ]}>
          <View style={styles.pulseContainer}>
            <View style={[styles.pulseDot, { backgroundColor: colors.success }]} />
            <View style={[styles.pulse, { backgroundColor: colors.success }]} />
          </View>
          <Text style={[styles.gpsText, { color: colors.success }]}>
            📡 Suivi GPS actif
          </Text>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.card }]}
          onPress={centerOnCurrentPosition}
        >
          <Ionicons name="locate" size={24} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: colors.card }]}
          onPress={centerOnRoute}
        >
          <Ionicons name="map" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Route Details */}
      <ScrollView style={[styles.routeDetails, { backgroundColor: colors.card }]}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#10b981' }]} />
          <View style={styles.routeInfo}>
            <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>
              Départ
            </Text>
            <Text style={[styles.routeAddress, { color: colors.text }]}>
              {mission.pickup_address}
            </Text>
          </View>
        </View>

        <View style={[styles.routeLine, { backgroundColor: colors.border }]} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
          <View style={styles.routeInfo}>
            <Text style={[styles.routeLabel, { color: colors.textSecondary }]}>
              Arrivée
            </Text>
            <Text style={[styles.routeAddress, { color: colors.text }]}>
              {mission.delivery_address}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  headerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsPanel: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statDivider: {
    width: 2,
    height: 44,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    marginHorizontal: 12,
    borderRadius: 1,
  },
  gpsStatus: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pulseContainer: {
    position: 'relative',
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  pulse: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    opacity: 0.4,
  },
  gpsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 250,
    gap: 12,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  routeDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  routeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  routeLine: {
    width: 3,
    height: 28,
    marginLeft: 6,
    marginVertical: 6,
    borderRadius: 1.5,
  },
  currentPositionMarker: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.4,
  },
  gpsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 250,
    gap: 12,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  routeDetails: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  routeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  routeLine: {
    width: 3,
    height: 28,
    marginLeft: 6,
    marginVertical: 6,
    borderRadius: 1.5,
  },
  currentPositionMarker: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.3,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
