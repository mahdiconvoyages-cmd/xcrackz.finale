import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { CovoiturageStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';

type NavigationProp = NativeStackNavigationProp<CovoiturageStackParamList, 'CarpoolingResults'>;
type RouteProps = RouteProp<CovoiturageStackParamList, 'CarpoolingResults'>;

const colors = {
  primary: '#0b1220',
  success: '#10b981',
  background: '#f5f5f5',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  warning: '#f59e0b',
};

export default function CarpoolingResultsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { departureCity, arrivalCity, date, passengers } = route.params;

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

      const { data, error } = await supabase
        .from('carpooling_rides')
        .select(`
          *,
          driver:driver_id (
            id,
            email,
            profiles (
              full_name,
              avatar_url,
              phone
            )
          ),
          reviews:carpooling_reviews!carpooling_reviews_reviewed_id_fkey (
            rating
          )
        `)
        .eq('status', 'active')
        .gte('departure_date', startOfDay.toISOString())
        .lte('departure_date', endOfDay.toISOString())
        .gte('available_seats', passengers)
        .ilike('departure_city', `%${departureCity}%`)
        .ilike('arrival_city', `%${arrivalCity}%`)
        .order('departure_date', { ascending: true });

      if (error) throw error;

      // Calculer la moyenne des notes
      const ridesWithRating = data.map(ride => ({
        ...ride,
        averageRating: ride.reviews?.length > 0
          ? (ride.reviews.reduce((acc, r) => acc + r.rating, 0) / ride.reviews.length).toFixed(1)
          : null,
      }));

      setRides(ridesWithRating);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRideCard = ({ item }) => (
    <TouchableOpacity
      style={styles.rideCard}
      onPress={() => navigation.navigate('RideDetails', { rideId: item.id })}
    >
      {/* En-tête avec avatar et note */}
      <View style={styles.cardHeader}>
        <View style={styles.driverInfo}>
          <Image
            source={{ uri: item.driver?.profiles?.avatar_url || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{item.driver?.profiles?.full_name || 'Convoyeur'}</Text>
            {item.averageRating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={colors.warning} />
                <Text style={styles.rating}>{item.averageRating}</Text>
                <Text style={styles.reviewCount}>({item.reviews.length})</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={styles.price}>{item.price_per_seat}€</Text>
      </View>

      {/* Itinéraire */}
      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={styles.dotDeparture} />
          <View style={styles.routeInfo}>
            <Text style={styles.time}>
              {new Date(item.departure_date).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.city}>{item.departure_city}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={styles.dotArrival} />
          <View style={styles.routeInfo}>
            <Text style={styles.time}>
              {item.estimated_duration_minutes
                ? new Date(
                    new Date(item.departure_date).getTime() + item.estimated_duration_minutes * 60000
                  ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>
            <Text style={styles.city}>{item.arrival_city}</Text>
          </View>
        </View>
      </View>

      {/* Informations supplémentaires */}
      <View style={styles.cardFooter}>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{item.available_seats} place{item.available_seats > 1 ? 's' : ''}</Text>
        </View>
        {item.vehicle_brand && (
          <View style={styles.infoItem}>
            <Ionicons name="car-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{item.vehicle_brand} {item.vehicle_model}</Text>
          </View>
        )}
        {item.auto_accept && (
          <View style={styles.instantBadge}>
            <Ionicons name="flash" size={12} color="#fff" />
            <Text style={styles.instantText}>Instantané</Text>
          </View>
        )}
      </View>

      {/* Préférences */}
      {item.preferences && (
        <View style={styles.preferences}>
          {!item.preferences.smoking && (
            <View style={styles.prefBadge}>
              <Ionicons name="ban" size={12} color={colors.textSecondary} />
              <Text style={styles.prefText}>Non-fumeur</Text>
            </View>
          )}
          {item.preferences.music && (
            <View style={styles.prefBadge}>
              <Ionicons name="musical-notes" size={12} color={colors.textSecondary} />
              <Text style={styles.prefText}>Musique</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Recherche de trajets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerRoute}>
            {departureCity} → {arrivalCity}
          </Text>
          <Text style={styles.headerDate}>
            {new Date(date).toLocaleDateString('fr-FR', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })} · {passengers} passager{passengers > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {rides.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
          <Text style={styles.emptyText}>
            Essayez de modifier vos critères de recherche ou créez une alerte.
          </Text>
          <TouchableOpacity
            style={styles.publishButton}
            onPress={() => navigation.navigate('PublishRide')}
          >
            <Text style={styles.publishButtonText}>Publier ce trajet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rides}
          renderItem={renderRideCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerRoute: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.border,
  },
  driverDetails: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotDeparture: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  dotArrival: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  routeLine: {
    width: 2,
    height: 30,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeInfo: {
    marginLeft: 12,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  city: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  instantText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  preferences: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  prefText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  publishButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
