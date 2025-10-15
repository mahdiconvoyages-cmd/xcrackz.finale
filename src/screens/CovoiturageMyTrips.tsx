import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Trip {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  price_per_seat: number;
  seats_available: number;
  seats_total: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  vehicle_model?: string;
  is_driver: boolean;
  reservations_count?: number;
}

const CovoiturageMyTrips = ({ navigation }: any) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'driver' | 'passenger'>('driver');

  const loadTrips = async () => {
    if (!user) return;
    
    try {
      if (activeTab === 'driver') {
        // Trajets où je suis conducteur
        const { data, error } = await supabase
          .from('rides')
          .select(`
            *,
            reservations:ride_reservations(count)
          `)
          .eq('driver_id', user.id)
          .order('departure_time', { ascending: false });

        if (error) throw error;

        setTrips(data?.map(trip => ({
          ...trip,
          is_driver: true,
          reservations_count: trip.reservations?.[0]?.count || 0
        })) || []);
      } else {
        // Trajets où j'ai réservé
        const { data, error } = await supabase
          .from('ride_reservations')
          .select(`
            *,
            ride:rides(*)
          `)
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTrips(data?.map(reservation => ({
          ...reservation.ride,
          is_driver: false,
          reservation_status: reservation.status
        })) || []);
      }
    } catch (error) {
      console.error('Erreur chargement trajets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [activeTab, user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'completed':
        return '#3b82f6';
      case 'cancelled':
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      pending: 'En attente',
      active: 'Actif',
      completed: 'Terminé',
      cancelled: 'Annulé',
      confirmed: 'Confirmé',
      rejected: 'Refusé',
    };
    return labels[status] || status;
  };

  const renderTrip = (trip: Trip) => (
    <TouchableOpacity
      key={trip.id}
      style={styles.tripCard}
      onPress={() => navigation.navigate('CovoiturageTripDetails', { tripId: trip.id })}
    >
      <LinearGradient
        colors={['rgba(0, 175, 245, 0.1)', 'rgba(0, 175, 245, 0.05)']}
        style={styles.tripGradient}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripRoute}>
            <View style={styles.cityContainer}>
              <MaterialIcons name="trip-origin" size={20} color="#00AFF5" />
              <Text style={styles.cityText}>{trip.departure_city}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color="#666" />
            <View style={styles.cityContainer}>
              <MaterialIcons name="place" size={20} color="#00AFF5" />
              <Text style={styles.cityText}>{trip.arrival_city}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(trip.status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(trip.status) }]}>
              {getStatusLabel(trip.status)}
            </Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.tripInfo}>
            <MaterialIcons name="event" size={16} color="#888" />
            <Text style={styles.infoText}>
              {format(new Date(trip.departure_time), 'dd MMMM yyyy à HH:mm', {
                locale: fr,
              })}
            </Text>
          </View>

          {trip.vehicle_model && (
            <View style={styles.tripInfo}>
              <MaterialIcons name="directions-car" size={16} color="#888" />
              <Text style={styles.infoText}>{trip.vehicle_model}</Text>
            </View>
          )}

          <View style={styles.tripFooter}>
            <View style={styles.seatsContainer}>
              <MaterialIcons name="airline-seat-recline-normal" size={16} color="#00AFF5" />
              <Text style={styles.seatsText}>
                {trip.seats_available} / {trip.seats_total} places
              </Text>
            </View>
            <Text style={styles.priceText}>{trip.price_per_seat} €</Text>
          </View>

          {trip.is_driver && trip.reservations_count !== undefined && (
            <View style={styles.reservationsInfo}>
              <MaterialIcons name="people" size={16} color="#10b981" />
              <Text style={styles.reservationsText}>
                {trip.reservations_count} réservation(s)
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00AFF5" />
        <Text style={styles.loadingText}>Chargement de vos trajets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'driver' && styles.activeTab]}
          onPress={() => setActiveTab('driver')}
        >
          <MaterialIcons
            name="local-taxi"
            size={24}
            color={activeTab === 'driver' ? '#00AFF5' : '#888'}
          />
          <Text
            style={[styles.tabText, activeTab === 'driver' && styles.activeTabText]}
          >
            Mes trajets publiés
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'passenger' && styles.activeTab]}
          onPress={() => setActiveTab('passenger')}
        >
          <MaterialIcons
            name="person"
            size={24}
            color={activeTab === 'passenger' ? '#00AFF5' : '#888'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'passenger' && styles.activeTabText,
            ]}
          >
            Mes réservations
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {trips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="info-outline" size={64} color="#888" />
            <Text style={styles.emptyTitle}>Aucun trajet</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'driver'
                ? 'Vous n\'avez pas encore publié de trajet'
                : 'Vous n\'avez pas encore réservé de trajet'}
            </Text>
            <Button
              title={
                activeTab === 'driver'
                  ? 'Publier un trajet'
                  : 'Rechercher un trajet'
              }
              onPress={() =>
                navigation.navigate(
                  activeTab === 'driver' ? 'CovoituragePublish' : 'CovoiturageHome'
                )
              }
            />
          </View>
        ) : (
          <View style={styles.tripsContainer}>{trips.map(renderTrip)}</View>
        )}
      </ScrollView>

      {/* Bouton flottant pour publier */}
      {activeTab === 'driver' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CovoituragePublish')}
        >
          <LinearGradient colors={['#00AFF5', '#0088CC']} style={styles.fabGradient}>
            <MaterialIcons name="add" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const Button = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.button}>
    <LinearGradient colors={['#00AFF5', '#0088CC']} style={styles.buttonGradient}>
      <Text style={styles.buttonText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00AFF5',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#00AFF5',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  tripsContainer: {
    padding: 16,
  },
  tripCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripGradient: {
    padding: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripDetails: {
    gap: 8,
  },
  tripInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seatsText: {
    fontSize: 14,
    color: '#00AFF5',
    fontWeight: '600',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  reservationsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reservationsText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CovoiturageMyTrips;
