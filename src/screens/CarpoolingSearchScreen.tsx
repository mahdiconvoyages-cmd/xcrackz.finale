import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CarpoolingTrip, TripSearchFilters } from '../types/carpooling';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CarpoolingSearchScreen({ navigation }: any) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<CarpoolingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Search filters
  const [filters, setFilters] = useState<TripSearchFilters>({
    departure_city: '',
    arrival_city: '',
    departure_date: '',
    min_seats: 1,
    max_price: undefined,
    allows_pets: undefined,
    allows_smoking: undefined,
    automatic_booking: undefined,
  });

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('carpooling_trips')
        .select(`
          *,
          driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url, phone)
        `)
        .eq('status', 'active')
        .gte('departure_datetime', new Date().toISOString())
        .order('departure_datetime', { ascending: true });

      // Apply filters
      if (filters.departure_city) {
        query = query.ilike('departure_city', `%${filters.departure_city}%`);
      }
      if (filters.arrival_city) {
        query = query.ilike('arrival_city', `%${filters.arrival_city}%`);
      }
      if (filters.departure_date) {
        const startOfDay = new Date(filters.departure_date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.departure_date);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.gte('departure_datetime', startOfDay.toISOString())
                     .lte('departure_datetime', endOfDay.toISOString());
      }
      if (filters.min_seats) {
        query = query.gte('available_seats', filters.min_seats);
      }
      if (filters.max_price) {
        query = query.lte('price_per_seat', filters.max_price);
      }
      if (filters.allows_pets !== undefined) {
        query = query.eq('allows_pets', filters.allows_pets);
      }
      if (filters.allows_smoking !== undefined) {
        query = query.eq('allows_smoking', filters.allows_smoking);
      }
      if (filters.automatic_booking !== undefined) {
        query = query.eq('automatic_booking', filters.automatic_booking);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTrips(data || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const clearFilters = () => {
    setFilters({
      departure_city: '',
      arrival_city: '',
      departure_date: '',
      min_seats: 1,
      max_price: undefined,
      allows_pets: undefined,
      allows_smoking: undefined,
      automatic_booking: undefined,
    });
    setShowFilters(false);
    loadTrips();
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadTrips();
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
        {/* Header with driver info */}
        <View style={styles.tripHeader}>
          <View style={styles.driverInfo}>
            {item.driver?.avatar_url ? (
              <Image
                source={{ uri: item.driver.avatar_url }}
                style={styles.driverAvatar}
              />
            ) : (
              <View style={styles.driverAvatarPlaceholder}>
                <Ionicons name="person" size={24} color="#666" />
              </View>
            )}
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{item.driver?.full_name || 'Conducteur'}</Text>
              {item.driver_rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFA500" />
                  <Text style={styles.ratingText}>{item.driver_rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
          {item.automatic_booking && (
            <View style={styles.instantBadge}>
              <Ionicons name="flash" size={14} color="#FFF" />
              <Text style={styles.instantText}>Instant</Text>
            </View>
          )}
        </View>

        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <Text style={styles.cityText}>{item.departure_city}</Text>
          </View>
          <View style={styles.routeArrow}>
            <Ionicons name="arrow-down" size={20} color="#999" />
          </View>
          <View style={styles.routeRow}>
            <Ionicons name="location" size={20} color="#FF3B30" />
            <Text style={styles.cityText}>{item.arrival_city}</Text>
          </View>
        </View>

        {/* Date and time */}
        <View style={styles.dateTimeContainer}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.dateTimeText}>{formattedDate}</Text>
          <Ionicons name="time-outline" size={16} color="#666" style={styles.timeIcon} />
          <Text style={styles.dateTimeText}>{formattedTime}</Text>
        </View>

        {/* Bottom info */}
        <View style={styles.bottomInfo}>
          <View style={styles.seatsContainer}>
            <Ionicons name="people" size={16} color="#666" />
            <Text style={styles.seatsText}>{item.available_seats} place(s)</Text>
          </View>

          <View style={styles.preferencesContainer}>
            {item.allows_pets && (
              <Ionicons name="paw" size={16} color="#4CAF50" style={styles.prefIcon} />
            )}
            {!item.allows_smoking && (
              <Ionicons name="ban" size={16} color="#FF5722" style={styles.prefIcon} />
            )}
            {item.allows_music && (
              <Ionicons name="musical-notes" size={16} color="#2196F3" style={styles.prefIcon} />
            )}
          </View>

          <Text style={styles.priceText}>{item.price_per_seat}€</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Ville de départ</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.departure_city}
              onChangeText={(text) => setFilters({ ...filters, departure_city: text })}
              placeholder="Ex: Paris"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Ville d'arrivée</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.arrival_city}
              onChangeText={(text) => setFilters({ ...filters, arrival_city: text })}
              placeholder="Ex: Lyon"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Prix maximum par place</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.max_price?.toString()}
              onChangeText={(text) => setFilters({ ...filters, max_price: text ? parseFloat(text) : undefined })}
              placeholder="Ex: 20"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Nombre de places minimum</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.min_seats?.toString()}
              onChangeText={(text) => setFilters({ ...filters, min_seats: text ? parseInt(text) : 1 })}
              placeholder="Ex: 2"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.toggleSection}>
            <Text style={styles.filterLabel}>Accepte les animaux</Text>
            <TouchableOpacity
              style={[styles.toggleButton, filters.allows_pets && styles.toggleButtonActive]}
              onPress={() => setFilters({ ...filters, allows_pets: filters.allows_pets === undefined ? true : !filters.allows_pets })}
            >
              <Text style={styles.toggleText}>{filters.allows_pets === true ? 'Oui' : filters.allows_pets === false ? 'Non' : 'Peu importe'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleSection}>
            <Text style={styles.filterLabel}>Non-fumeur uniquement</Text>
            <TouchableOpacity
              style={[styles.toggleButton, filters.allows_smoking === false && styles.toggleButtonActive]}
              onPress={() => setFilters({ ...filters, allows_smoking: filters.allows_smoking === undefined ? false : filters.allows_smoking === false ? undefined : false })}
            >
              <Text style={styles.toggleText}>{filters.allows_smoking === false ? 'Oui' : 'Peu importe'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleSection}>
            <Text style={styles.filterLabel}>Réservation instantanée</Text>
            <TouchableOpacity
              style={[styles.toggleButton, filters.automatic_booking && styles.toggleButtonActive]}
              onPress={() => setFilters({ ...filters, automatic_booking: filters.automatic_booking === undefined ? true : !filters.automatic_booking })}
            >
              <Text style={styles.toggleText}>{filters.automatic_booking === true ? 'Oui' : 'Peu importe'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
        <Text style={styles.headerTitle}>Trajets disponibles</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('TripCreate')}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
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
            <Text style={styles.emptyText}>Aucun trajet disponible</Text>
            <Text style={styles.emptySubtext}>
              Essayez de modifier vos filtres ou créez un nouveau trajet
            </Text>
          </View>
        }
      />

      {renderFilterModal()}
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    padding: 8,
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
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  driverAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverDetails: {
    marginLeft: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  instantText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeArrow: {
    marginLeft: 2,
    marginVertical: 4,
  },
  cityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 8,
  },
  dateTimeContainer: {
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
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seatsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  preferencesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefIcon: {
    marginLeft: 8,
  },
  priceText: {
    fontSize: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  toggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
