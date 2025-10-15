import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import MapboxGL from '@rnmapbox/maps';

// ✅ Token Mapbox configuré
MapboxGL.setAccessToken('pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w');

const { width, height } = Dimensions.get('window');

interface Props {
  route?: {
    params?: {
      destination: {
        latitude: number;
        longitude: number;
        address?: string;
        name?: string;
      };
      origin?: {
        latitude: number;
        longitude: number;
      };
    };
  };
  navigation: any;
}

interface NavigationData {
  distance: number; // en mètres
  duration: number; // en secondes
  eta: Date;
  currentSpeed: number; // km/h
  nextTurn?: {
    distance: number; // mètres avant le virage
    instruction: string;
    type: 'left' | 'right' | 'straight' | 'arrive';
  };
}

export default function WazeGPSScreen({ route, navigation }: Props) {
  const { destination, origin } = route?.params || {};

  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [navData, setNavData] = useState<NavigationData | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastAnnouncedDistance = useRef<number>(0);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

  useEffect(() => {
    if (destination) {
      initNavigation();
    } else {
      Alert.alert('Erreur', 'Destination manquante', [
        { text: 'Retour', onPress: () => navigation.goBack() }
      ]);
    }

    return () => {
      stopNavigation();
    };
  }, []);

  const initNavigation = async () => {
    try {
      // Demander permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'La localisation est nécessaire pour la navigation',
          [{ text: 'Retour', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Obtenir position actuelle
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation(location);
      
      // Créer ligne droite origine → destination (simple pour commencer)
      if (destination) {
        const coords = [
          [location.coords.longitude, location.coords.latitude],
          [destination.longitude, destination.latitude],
        ];
        setRouteCoordinates(coords);
      }
      
      setLoading(false);

      // Calculer itinéraire initial
      await calculateRoute(location);

    } catch (error) {
      console.error('Init navigation error:', error);
      Alert.alert('Erreur', 'Impossible d\'initialiser la navigation');
      setLoading(false);
    }
  };

  const calculateRoute = async (currentLoc: Location.LocationObject) => {
    if (!destination) return;

    const from = {
      lat: currentLoc.coords.latitude,
      lon: currentLoc.coords.longitude,
    };
    const to = {
      lat: destination.latitude,
      lon: destination.longitude,
    };

    // Calculer distance (Haversine)
    const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);
    
    // Calculer direction et prochaine instruction
    const bearing = calculateBearing(from.lat, from.lon, to.lat, to.lon);
    const instruction = getNavigationInstruction(bearing, distance);

    // Estimer durée (50 km/h moyen en ville)
    const avgSpeed = 50;
    const duration = (distance / 1000) / avgSpeed * 3600; // secondes
    
    const eta = new Date();
    eta.setSeconds(eta.getSeconds() + duration);

    const speed = currentLoc.coords.speed 
      ? currentLoc.coords.speed * 3.6 // m/s → km/h
      : 0;

    setNavData({
      distance,
      duration,
      eta,
      currentSpeed: speed,
      nextTurn: instruction,
    });

    // Annoncer si nouveau segment
    if (voiceEnabled && instruction && shouldAnnounce(distance)) {
      announceInstruction(instruction.instruction, distance);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Rayon terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    const θ = Math.atan2(y, x);
    return (θ * 180 / Math.PI + 360) % 360; // Normaliser 0-360
  };

  const getNavigationInstruction = (bearing: number, distance: number): NavigationData['nextTurn'] => {
    if (distance < 50) {
      return {
        distance,
        instruction: 'Vous êtes arrivé à destination',
        type: 'arrive',
      };
    }

    // Direction basée sur bearing
    let instruction = '';
    let type: 'left' | 'right' | 'straight' = 'straight';

    if (bearing >= 315 || bearing < 45) {
      instruction = 'Continuez tout droit vers le nord';
      type = 'straight';
    } else if (bearing >= 45 && bearing < 135) {
      instruction = 'Tournez à droite vers l\'est';
      type = 'right';
    } else if (bearing >= 135 && bearing < 225) {
      instruction = 'Faites demi-tour vers le sud';
      type = 'straight';
    } else {
      instruction = 'Tournez à gauche vers l\'ouest';
      type = 'left';
    }

    return { distance, instruction, type };
  };

  const shouldAnnounce = (distance: number): boolean => {
    // Annoncer à 500m, 200m, 100m
    const thresholds = [500, 200, 100, 50];
    
    for (const threshold of thresholds) {
      if (distance <= threshold && lastAnnouncedDistance.current > threshold) {
        lastAnnouncedDistance.current = distance;
        return true;
      }
    }
    
    return false;
  };

  const announceInstruction = async (instruction: string, distance: number) => {
    const distanceText = distance < 1000
      ? `${Math.round(distance)} mètres`
      : `${(distance / 1000).toFixed(1)} kilomètres`;

    const announcement = `Dans ${distanceText}, ${instruction}`;
    
    try {
      await Speech.speak(announcement, {
        language: 'fr-FR',
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Speech error:', error);
    }
  };

  const startNavigation = async () => {
    setIsNavigating(true);

    // Tracking en temps réel
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Maj tous les 10m
        timeInterval: 5000, // ou toutes les 5s
      },
      (location) => {
        setCurrentLocation(location);
        calculateRoute(location);
        
        // Mettre à jour route
        if (destination) {
          const coords = [
            [location.coords.longitude, location.coords.latitude],
            [destination.longitude, destination.latitude],
          ];
          setRouteCoordinates(coords);
        }
        
        // Centrer caméra sur position actuelle
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [location.coords.longitude, location.coords.latitude],
            zoomLevel: 16,
            animationDuration: 1000,
          });
        }

        // Vérifier arrivée
        if (navData && navData.distance < 20) {
          handleArrival();
        }
      }
    );

    // Annonce départ
    if (voiceEnabled) {
      Speech.speak('Navigation démarrée. Suivez les instructions.', {
        language: 'fr-FR',
      });
    }
  };

  const stopNavigation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsNavigating(false);
    
    if (voiceEnabled) {
      Speech.stop();
    }
  };

  const handleArrival = () => {
    stopNavigation();
    
    if (voiceEnabled) {
      Speech.speak('Vous êtes arrivé à destination !', { language: 'fr-FR' });
    }

    Alert.alert(
      '🎉 Arrivée !',
      'Vous êtes arrivé à destination',
      [
        {
          text: 'Terminer',
          onPress: () => navigation.goBack(),
        }
      ]
    );
  };

  // ❌ SUPPRIMÉ: Pas d'ouverture apps externes
  // GPS intégré uniquement !

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getTurnIcon = (type?: string) => {
    switch (type) {
      case 'left': return 'arrow-left';
      case 'right': return 'arrow-right';
      case 'arrive': return 'flag';
      default: return 'arrow-up';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Initialisation GPS...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Navigation GPS</Text>
          <Text style={styles.headerSubtitle}>{destination?.name || destination?.address || 'Destination'}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setVoiceEnabled(!voiceEnabled)}
          style={[styles.voiceButton, !voiceEnabled && styles.voiceButtonMuted]}
        >
          <Feather name={voiceEnabled ? "volume-2" : "volume-x"} size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 🗺️ CARTE MAPBOX INTÉGRÉE */}
      <View style={styles.mapContainer}>
        <MapboxGL.MapView
          ref={mapRef}
          style={styles.map}
          styleURL={MapboxGL.StyleURL.Street}
          compassEnabled={true}
          zoomEnabled={true}
          scrollEnabled={true}
          pitchEnabled={false}
          rotateEnabled={true}
        >
          <MapboxGL.Camera
            ref={cameraRef}
            zoomLevel={14}
            centerCoordinate={
              currentLocation
                ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
                : destination
                ? [destination.longitude, destination.latitude]
                : [2.3522, 48.8566]
            }
            animationDuration={2000}
          />

          {/* Ligne itinéraire */}
          {routeCoordinates.length > 0 && (
            <MapboxGL.ShapeSource
              id="routeSource"
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoordinates,
                },
              }}
            >
              <MapboxGL.LineLayer
                id="routeLine"
                style={{
                  lineColor: '#14b8a6',
                  lineWidth: 6,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </MapboxGL.ShapeSource>
          )}

          {/* Marker position actuelle */}
          {currentLocation && (
            <MapboxGL.PointAnnotation
              id="currentLocation"
              coordinate={[currentLocation.coords.longitude, currentLocation.coords.latitude]}
            >
              <View style={styles.currentLocationMarker}>
                <View style={styles.currentLocationDot} />
              </View>
            </MapboxGL.PointAnnotation>
          )}

          {/* Marker destination */}
          {destination && (
            <MapboxGL.PointAnnotation
              id="destination"
              coordinate={[destination.longitude, destination.latitude]}
            >
              <View style={styles.destinationMarker}>
                <Feather name="flag" size={24} color="#ef4444" />
              </View>
            </MapboxGL.PointAnnotation>
          )}
        </MapboxGL.MapView>

        {/* Card instruction flottante */}
        {navData?.nextTurn && (
          <View style={styles.floatingInstructionCard}>
            <View style={styles.instructionIconContainer}>
              <Feather name={getTurnIcon(navData.nextTurn.type) as any} size={40} color="#14b8a6" />
            </View>
            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionDistance}>{formatDistance(navData.nextTurn.distance)}</Text>
              <Text style={styles.instructionText}>{navData.nextTurn.instruction}</Text>
            </View>
          </View>
        )}

        {/* Stats en surimpression */}
        {navData && (
          <View style={styles.statsOverlay}>
            <View style={styles.statCard}>
              <Feather name="navigation" size={20} color="#14b8a6" />
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{formatDistance(navData.distance)}</Text>
            </View>

            <View style={styles.statCard}>
              <Feather name="clock" size={20} color="#14b8a6" />
              <Text style={styles.statLabel}>Durée</Text>
              <Text style={styles.statValue}>{formatDuration(navData.duration)}</Text>
            </View>

            <View style={styles.statCard}>
              <Feather name="target" size={20} color="#14b8a6" />
              <Text style={styles.statLabel}>Arrivée</Text>
              <Text style={styles.statValue}>{navData.eta.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        )}

        {/* Vitesse actuelle */}
        {navData && navData.currentSpeed > 0 && (
          <View style={styles.speedometer}>
            <Text style={styles.speedValue}>{Math.round(navData.currentSpeed)}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {!isNavigating ? (
          <TouchableOpacity style={styles.startButton} onPress={startNavigation}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.startButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="play-circle" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Démarrer la navigation</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.stopButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="square" size={24} color="#fff" />
              <Text style={styles.stopButtonText}>Arrêter</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ❌ SUPPRIMÉ: Apps externes
            ✅ GPS intégré uniquement */}
      </View>

      {/* Indicateur navigation active */}
      {isNavigating && (
        <View style={styles.navigationActiveIndicator}>
          <View style={styles.pulseCircle} />
          <Feather name="navigation" size={16} color="#10b981" />
          <Text style={styles.navigationActiveText}>Navigation en cours...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonMuted: {
    backgroundColor: '#64748b',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  // Markers
  currentLocationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#14b8a6',
    borderWidth: 3,
    borderColor: '#fff',
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Card instruction flottante
  floatingInstructionCard: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionDistance: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  statsOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  speedometer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#14b8a6',
  },
  speedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  speedUnit: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  actionsContainer: {
    backgroundColor: '#1e293b',
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stopButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  stopButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  navigationActiveIndicator: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  pulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  navigationActiveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
