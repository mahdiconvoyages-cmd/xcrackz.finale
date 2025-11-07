import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CarpoolingBooking } from '../types/carpooling';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MyBookingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<CarpoolingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyBookings();
  }, []);

  const loadMyBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('carpooling_bookings')
        .select(`
          *,
          trip:carpooling_trips(
            *,
            driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url, phone)
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyBookings();
  };

  const handleCancelBooking = (booking: CarpoolingBooking) => {
    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler cette réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('carpooling_bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);

              if (error) throw error;

              // If booking was confirmed, restore available seats
              if (booking.status === 'confirmed' && booking.trip) {
                await supabase
                  .from('carpooling_trips')
                  .update({
                    available_seats: booking.trip.available_seats + booking.seats_booked,
                    status: 'active',
                  })
                  .eq('id', booking.trip_id);
              }

              Alert.alert('Succès', 'Réservation annulée');
              loadMyBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler la réservation');
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: '#FF9800', label: 'En attente', icon: 'time' },
      confirmed: { color: '#4CAF50', label: 'Confirmé', icon: 'checkmark-circle' },
      rejected: { color: '#FF5722', label: 'Refusé', icon: 'close-circle' },
      cancelled: { color: '#9E9E9E', label: 'Annulé', icon: 'ban' },
    };

    const { color, label, icon } = config[status as keyof typeof config] || config.pending;

    return (
      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={14} color={color} />
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderBookingCard = ({ item }: { item: CarpoolingBooking }) => {
    if (!item.trip) return null;

    const departureDate = new Date(item.trip.departure_datetime);
    const formattedDate = format(departureDate, "EEE dd MMM", { locale: fr });
    const formattedTime = format(departureDate, "HH:mm");

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => navigation.navigate('TripDetails', { tripId: item.trip_id })}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <Ionicons name="location" size={18} color="#007AFF" />
              <Text style={styles.cityText}>{item.trip.departure_city}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color="#999" style={styles.arrowIcon} />
            <View style={styles.routeRow}>
              <Ionicons name="location" size={18} color="#FF3B30" />
              <Text style={styles.cityText}>{item.trip.arrival_city}</Text>
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

        <View style={styles.driverRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.driverText}>Conducteur: {item.trip.driver?.full_name}</Text>
        </View>

        <View style={styles.bottomInfo}>
          <View style={styles.seatsInfo}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.seatsText}>{item.seats_booked} place(s)</Text>
          </View>
          <Text style={styles.priceText}>{item.total_price}€</Text>
        </View>

        {(item.status === 'pending' || item.status === 'confirmed') && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() =>
                navigation.navigate('CarpoolingChat', {
                  tripId: item.trip_id,
                  otherUserId: item.trip.driver_id,
                })
              }
            >
              <Ionicons name="chatbubble-outline" size={16} color="#007AFF" />
              <Text style={styles.chatButtonText}>Contacter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#FF5722" />
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        )}
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
        <Text style={styles.headerTitle}>Mes réservations</Text>
      </View>

      <FlatList
        data={bookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>Aucune réservation</Text>
            <Text style={styles.emptySubtext}>
              Recherchez un trajet et réservez votre place !
            </Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => navigation.navigate('CarpoolingSearch')}
            >
              <Text style={styles.searchButtonText}>Rechercher un trajet</Text>
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
  listContainer: {
    padding: 16,
  },
  bookingCard: {
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
  bookingHeader: {
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
    marginBottom: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  timeIcon: {
    marginLeft: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginBottom: 12,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 4,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
    marginLeft: 4,
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
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
