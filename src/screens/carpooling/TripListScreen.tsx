import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Trip {
  id: string;
  driver_id: string;
  origin_address: string;
  origin_city: string;
  destination_address: string;
  destination_city: string;
  departure_time: string;
  seats_available: number;
  price_per_seat: number;
  status: 'active' | 'full' | 'completed' | 'cancelled';
  created_at: string;
  driver?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    phone?: string;
  };
}

export default function TripListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  useEffect(() => {
    loadTrips();
    setupRealtimeSubscription();
  }, [searchOrigin, searchDestination]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('carpooling_trips_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carpooling_trips',
        },
        () => {
          loadTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadTrips = async () => {
    try {
      let query = supabase
        .from('carpooling_trips')
        .select(`
          *,
          driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, avatar_url, phone)
        `)
        .eq('status', 'active')
        .gte('departure_time', new Date().toISOString())
        .order('departure_time', { ascending: true });

      if (searchOrigin) {
        query = query.ilike('origin_city', `%${searchOrigin}%`);
      }

      if (searchDestination) {
        query = query.ilike('destination_city', `%${searchDestination}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTrips((data as any) || []);
    } catch (error: any) {
      console.error('Erreur chargement trajets:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrips();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTripCard = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate('TripDetails', { tripId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.routeInfo}>
          <View style={styles.cityRow}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={[styles.cityText, { color: colors.text }]}>
              {item.origin_city}
            </Text>
          </View>
          <Ionicons
            name="arrow-forward"
            size={24}
            color={colors.textSecondary}
            style={styles.arrowIcon}
          />
          <View style={styles.cityRow}>
            <Ionicons name="location" size={20} color={colors.error} />
            <Text style={[styles.cityText, { color: colors.text }]}>
              {item.destination_city}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {formatDate(item.departure_time)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {item.driver?.full_name || 'Conducteur'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.seatsInfo}>
            <Ionicons name="people" size={16} color={colors.primary} />
            <Text style={[styles.seatsText, { color: colors.primary }]}>
              {item.seats_available} places
            </Text>
          </View>
          <Text style={[styles.priceText, { color: colors.success }]}>
            {item.price_per_seat} €
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filtres de recherche */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ville de départ..."
            placeholderTextColor={colors.textSecondary}
            value={searchOrigin}
            onChangeText={setSearchOrigin}
          />
        </View>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Ville d'arrivée..."
            placeholderTextColor={colors.textSecondary}
            value={searchDestination}
            onChangeText={setSearchDestination}
          />
        </View>
      </View>

      {/* Liste des trajets */}
      <FlatList
        data={trips}
        renderItem={renderTripCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="car" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Aucun trajet disponible
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Créez votre premier trajet
            </Text>
          </View>
        }
      />

      {/* Bouton Créer Trajet */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('TripCreate')}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrowIcon: {
    marginHorizontal: 8,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seatsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
