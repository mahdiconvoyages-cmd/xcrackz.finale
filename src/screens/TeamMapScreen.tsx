import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface TrackedMission {
  mission_id: string;
  mission_reference: string;
  assignee_name: string;
  assignee_phone?: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  last_latitude: number;
  last_longitude: number;
  last_update: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
}

export default function TeamMapScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [trackedMissions, setTrackedMissions] = useState<TrackedMission[]>([]);
  const [selectedMission, setSelectedMission] = useState<TrackedMission | null>(null);
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation pulsante pour l'indicateur temps réel
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    loadTrackedMissions();
    
    // Subscription temps réel Supabase
    const subscription = supabase
      .channel('mission_locations_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_locations',
        },
        (payload) => {
          console.log('🆕 Nouvelle position reçue:', payload);
          loadTrackedMissions(); // Refresh immédiat sur nouveau point GPS
        }
      )
      .subscribe();

    // ⚡ TEMPS RÉEL : Rafraîchir toutes les 2 secondes
    const interval = setInterval(() => {
      loadTrackedMissions();
    }, 2000); // 2 secondes pour mouvement fluide

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadTrackedMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer toutes les missions en cours avec leurs dernières positions
      const { data, error } = await supabase
        .from('missions')
        .select(`
          id,
          reference,
          status,
          pickup_address,
          delivery_address,
          pickup_lat,
          pickup_lng,
          delivery_lat,
          delivery_lng,
          mission_assignments!inner(
            user_id,
            profiles!inner(
              full_name,
              phone
            )
          ),
          mission_locations(
            latitude,
            longitude,
            recorded_at
          )
        `)
        .eq('status', 'in_progress')
        .order('recorded_at', { foreignTable: 'mission_locations', ascending: false });

      if (error) throw error;

      const tracked: TrackedMission[] = data
        ?.filter((m: any) => m.mission_locations && m.mission_locations.length > 0)
        .map((m: any) => {
          const lastLocation = m.mission_locations[0];
          const assignment = m.mission_assignments[0];
          
          return {
            mission_id: m.id,
            mission_reference: m.reference,
            assignee_name: assignment?.profiles?.full_name || 'Inconnu',
            assignee_phone: assignment?.profiles?.phone,
            status: m.status,
            pickup_address: m.pickup_address,
            delivery_address: m.delivery_address,
            last_latitude: lastLocation.latitude,
            last_longitude: lastLocation.longitude,
            last_update: lastLocation.recorded_at,
            pickup_lat: m.pickup_lat,
            pickup_lng: m.pickup_lng,
            delivery_lat: m.delivery_lat,
            delivery_lng: m.delivery_lng,
          };
        }) || [];

      setTrackedMissions(tracked);
    } catch (error) {
      console.error('Error loading tracked missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceUpdate = (timestamp: string) => {
    const now = new Date();
    const update = new Date(timestamp);
    const diffMs = now.getTime() - update.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    // ⚡ Affichage en secondes pour temps réel
    if (diffSecs < 5) return '⚡ En direct';
    if (diffSecs < 60) return `Il y a ${diffSecs}s`;
    
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins === 1) return 'Il y a 1 min';
    if (diffMins < 60) return `Il y a ${diffMins} mins`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Il y a 1h';
    return `Il y a ${diffHours}h`;
  };

  const focusOnMission = (mission: TrackedMission) => {
    setSelectedMission(mission);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: mission.last_latitude,
        longitude: mission.last_longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  const fitAllMarkers = () => {
    if (mapRef.current && trackedMissions.length > 0) {
      const coordinates = trackedMissions.map(m => ({
        latitude: m.last_latitude,
        longitude: m.last_longitude,
      }));

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (trackedMissions.length > 0 && !loading) {
      // Centrer automatiquement sur toutes les missions
      setTimeout(() => fitAllMarkers(), 500);
    }
  }, [trackedMissions.length, loading]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carte de l'Équipe</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement de la carte...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carte de l'Équipe</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={loadTrackedMissions}
        >
          <Feather name="refresh-cw" size={24} color="#14b8a6" />
        </TouchableOpacity>
      </View>

      {trackedMissions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="map-pin" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Aucune mission en cours</Text>
          <Text style={styles.emptyText}>
            Les missions avec tracking GPS actif s'afficheront ici
          </Text>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: trackedMissions[0]?.last_latitude || 48.8566,
              longitude: trackedMissions[0]?.last_longitude || 2.3522,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
          >
            {trackedMissions.map((mission) => (
              <React.Fragment key={mission.mission_id}>
                {/* Marker position actuelle */}
                <Marker
                  coordinate={{
                    latitude: mission.last_latitude,
                    longitude: mission.last_longitude,
                  }}
                  title={mission.assignee_name}
                  description={mission.mission_reference}
                  pinColor="#EF4444"
                  onPress={() => setSelectedMission(mission)}
                />

                {/* Marker départ */}
                {mission.pickup_lat && mission.pickup_lng && (
                  <Marker
                    coordinate={{
                      latitude: mission.pickup_lat,
                      longitude: mission.pickup_lng,
                    }}
                    pinColor="#10b981"
                  >
                    <View style={styles.customMarker}>
                      <Feather name="map-pin" size={24} color="#10b981" />
                    </View>
                  </Marker>
                )}

                {/* Marker arrivée */}
                {mission.delivery_lat && mission.delivery_lng && (
                  <Marker
                    coordinate={{
                      latitude: mission.delivery_lat,
                      longitude: mission.delivery_lng,
                    }}
                    pinColor="#3B82F6"
                  >
                    <View style={styles.customMarker}>
                      <Feather name="flag" size={24} color="#3B82F6" />
                    </View>
                  </Marker>
                )}

                {/* Ligne de route */}
                {mission.pickup_lat && mission.pickup_lng && mission.delivery_lat && mission.delivery_lng && (
                  <Polyline
                    coordinates={[
                      { latitude: mission.pickup_lat, longitude: mission.pickup_lng },
                      { latitude: mission.last_latitude, longitude: mission.last_longitude },
                      { latitude: mission.delivery_lat, longitude: mission.delivery_lng },
                    ]}
                    strokeColor="#14b8a6"
                    strokeWidth={3}
                    lineDashPattern={[5, 5]}
                  />
                )}
              </React.Fragment>
            ))}
          </MapView>

          {/* Indicateur temps réel avec animation */}
          <View style={styles.realtimeIndicator}>
            <Animated.View style={[styles.realtimeDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.realtimeText}>⚡ Temps Réel (2s)</Text>
          </View>

          {/* Bottom sheet avec liste des missions */}
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              🚗 {trackedMissions.length} Mission{trackedMissions.length > 1 ? 's' : ''} en cours
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.missionList}
            >
              {trackedMissions.map((mission) => (
                <TouchableOpacity
                  key={mission.mission_id}
                  style={[
                    styles.missionCard,
                    selectedMission?.mission_id === mission.mission_id && styles.missionCardSelected
                  ]}
                  onPress={() => focusOnMission(mission)}
                >
                  <View style={styles.missionHeader}>
                    <Text style={styles.missionReference}>{mission.mission_reference}</Text>
                    <Text style={styles.missionTime}>
                      {getTimeSinceUpdate(mission.last_update)}
                    </Text>
                  </View>
                  
                  <Text style={styles.missionDriver}>
                    👤 {mission.assignee_name}
                  </Text>
                  
                  <View style={styles.missionRoute}>
                    <Feather name="map-pin" size={14} color="#10b981" />
                    <Text style={styles.missionAddress} numberOfLines={1}>
                      {mission.pickup_address}
                    </Text>
                  </View>
                  
                  <View style={styles.missionRoute}>
                    <Feather name="flag" size={14} color="#3B82F6" />
                    <Text style={styles.missionAddress} numberOfLines={1}>
                      {mission.delivery_address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  realtimeIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  realtimeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  customMarker: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  missionList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  missionCard: {
    width: 280,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  missionCardSelected: {
    borderColor: '#14b8a6',
    backgroundColor: '#f0fdfa',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionReference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  missionTime: {
    fontSize: 12,
    color: '#64748b',
  },
  missionDriver: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
  },
  missionRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  missionAddress: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
  },
});
