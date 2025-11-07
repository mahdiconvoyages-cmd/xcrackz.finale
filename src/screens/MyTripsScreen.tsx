import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CarpoolingTrip, CarpoolingBooking } from '../types/carpooling';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MyTripsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<CarpoolingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyTrips();
  }, []);

  const loadMyTrips = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('carpooling_trips')
        .select(`
          *,
          driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('driver_id', user.id)
        .order('departure_datetime', { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (error) {
      console.error('Error loading my trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyTrips();
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: '#4CAF50', label: 'Actif', icon: 'checkmark-circle' },
      cancelled: { color: '#FF5722', label: 'Annulé', icon: 'close-circle' },
      completed: { color: '#2196F3', label: 'Terminé', icon: 'flag' },
      full: { color: '#FF9800', label: 'Complet', icon: 'people' },
    };

    const { color, label, icon } = config[status as keyof typeof config] || config.active;

    return (
      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={14} color={color} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderTripCard = ({ item }: { item: CarpoolingTrip }) => {
    const departureDate = new Date(item.departure_datetime);
    const formattedDate = format(departureDate, "EEE dd MMM", { locale: fr });
    const formattedTime = format(departureDate, "HH:mm");

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => navigation.navigate('TripDetails', { tripId: item.id })}
      >
        <View style={styles.tripHeader}>
          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <Ionicons name="location" size={18} color="#007AFF" />
              <Text style={styles.cityText}>{item.departure_city}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#999" style={styles.arrowIcon} />
            <View style={styles.routeRow}>
              <Ionicons name="location" size={18} color="#FF3B30" />
              <Text style={styles.cityText}>{item.arrival_city}</Text>
            </View>
          </View>
          {getStatusBadge(item.status)}
        </View>

        <View style={styles.dateTimeRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.dateTimeText}>{formattedDate}</Text>
          <Ionicons name="time-outline" size={16} color="#666" style={styles.timeIcon} />
          <Text style={styles.dateTimeText}>{formattedTime}</Text>
        </View>

        <View style={styles.bottomInfo}>
          <View style={styles.seatsInfo}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.seatsText}>
              {item.available_seats}/{item.total_seats} places
            </Text>
          </View>
          <Text style={styles.priceText}>{item.price_per_seat}€/place</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes trajets</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('TripCreate')}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        renderItem={renderTripCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Aucun trajet publié</Text>
            <Text style={styles.emptySubtext}>
              Créez votre premier trajet et partagez vos trajets !
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('TripCreate')}
            >
              <Text style={styles.createButtonText}>Créer un trajet</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  timeIcon: {
    marginLeft: 12,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
