import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { CovoiturageStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<CovoiturageStackParamList, 'RideDetails'>;
type RouteProps = RouteProp<CovoiturageStackParamList, 'RideDetails'>;

const colors = {
  primary: '#0b1220',
  success: '#10b981',
  background: '#f5f5f5',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  warning: '#f59e0b',
};

export default function RideDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { rideId } = route.params;
  const { user } = useAuth();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchRideDetails();
  }, []);

  const fetchRideDetails = async () => {
    try {
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
            rating,
            comment,
            tags
          )
        `)
        .eq('id', rideId)
        .single();

      if (error) throw error;

      const averageRating = data.reviews?.length > 0
        ? (data.reviews.reduce((acc, r) => acc + r.rating, 0) / data.reviews.length).toFixed(1)
        : null;

      setRide({ ...data, averageRating });
    } catch (error) {
      console.error('Error fetching ride:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du trajet');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = () => {
    navigation.navigate('BookRide', { ride });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.centerContainer}>
        <Text>Trajet introuvable</Text>
      </View>
    );
  }

  const isOwnRide = ride.driver_id === user?.id;

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* En-tête avec prix */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{ride.price_per_seat}€</Text>
            <Text style={styles.priceLabel}>par place</Text>
          </View>
        </View>

        {/* Itinéraire */}
        <View style={styles.section}>
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={styles.dotDeparture} />
              <View style={styles.routeInfo}>
                <Text style={styles.time}>
                  {new Date(ride.departure_date).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.city}>{ride.departure_city}</Text>
                {ride.departure_address && (
                  <Text style={styles.address}>{ride.departure_address}</Text>
                )}
              </View>
            </View>

            <View style={styles.routeLine}>
              {ride.distance_km && (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>{ride.distance_km} km</Text>
                </View>
              )}
            </View>

            <View style={styles.routePoint}>
              <View style={styles.dotArrival} />
              <View style={styles.routeInfo}>
                <Text style={styles.time}>
                  {ride.estimated_duration_minutes
                    ? new Date(
                        new Date(ride.departure_date).getTime() + ride.estimated_duration_minutes * 60000
                      ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : 'À confirmer'}
                </Text>
                <Text style={styles.city}>{ride.arrival_city}</Text>
                {ride.arrival_address && (
                  <Text style={styles.address}>{ride.arrival_address}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.dateCard}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.dateText}>
              {new Date(ride.departure_date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Conducteur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conducteur</Text>
          <View style={styles.driverCard}>
            <Image
              source={{ uri: ride.driver?.profiles?.avatar_url || 'https://via.placeholder.com/60' }}
              style={styles.driverAvatar}
            />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{ride.driver?.profiles?.full_name || 'Convoyeur'}</Text>
              {ride.averageRating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color={colors.warning} />
                  <Text style={styles.rating}>{ride.averageRating}</Text>
                  <Text style={styles.reviewCount}>({ride.reviews.length} avis)</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Véhicule */}
          {ride.vehicle_brand && (
            <View style={styles.vehicleCard}>
              <Ionicons name="car-sport" size={24} color={colors.primary} />
              <Text style={styles.vehicleText}>
                {ride.vehicle_brand} {ride.vehicle_model}
              </Text>
            </View>
          )}
        </View>

        {/* Informations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              {ride.available_seats} place{ride.available_seats > 1 ? 's' : ''} disponible{ride.available_seats > 1 ? 's' : ''}
            </Text>
          </View>

          {ride.auto_accept && (
            <View style={styles.infoRow}>
              <Ionicons name="flash" size={20} color={colors.success} />
              <Text style={styles.infoText}>Réservation instantanée</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.infoText}>
              Paiement : {ride.payment_methods.includes('credits') && 'Crédits'}
              {ride.payment_methods.includes('credits') && ride.payment_methods.includes('cash') && ' ou '}
              {ride.payment_methods.includes('cash') && 'Espèces'}
            </Text>
          </View>
        </View>

        {/* Préférences */}
        {ride.preferences && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Préférences</Text>
            <View style={styles.preferencesGrid}>
              {!ride.preferences.smoking && (
                <View style={styles.prefChip}>
                  <Ionicons name="ban" size={16} color={colors.text} />
                  <Text style={styles.prefText}>Non-fumeur</Text>
                </View>
              )}
              {ride.preferences.music && (
                <View style={styles.prefChip}>
                  <Ionicons name="musical-notes" size={16} color={colors.text} />
                  <Text style={styles.prefText}>Musique</Text>
                </View>
              )}
              {ride.preferences.pets && (
                <View style={styles.prefChip}>
                  <Ionicons name="paw" size={16} color={colors.text} />
                  <Text style={styles.prefText}>Animaux OK</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Avis */}
        {ride.reviews && ride.reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis ({ride.reviews.length})</Text>
            {ride.reviews.slice(0, 3).map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.stars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < review.rating ? 'star' : 'star-outline'}
                        size={14}
                        color={colors.warning}
                      />
                    ))}
                  </View>
                </View>
                {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                {review.tags && review.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {review.tags.map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer avec bouton de réservation */}
      {!isOwnRide && ride.available_seats > 0 && (
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerPrice}>{ride.price_per_seat}€</Text>
            <Text style={styles.footerLabel}>par place</Text>
          </View>
          <TouchableOpacity style={styles.bookButton} onPress={handleBooking}>
            <Text style={styles.bookButtonText}>Réserver</Text>
          </TouchableOpacity>
        </View>
      )}

      {isOwnRide && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.bookButton, { flex: 1 }]}>
            <Text style={styles.bookButtonText}>Gérer ce trajet</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotDeparture: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    marginTop: 4,
  },
  dotArrival: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 60,
    backgroundColor: colors.border,
    marginLeft: 6,
    marginVertical: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  routeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  time: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  city: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  },
  address: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.text,
    textTransform: 'capitalize',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.border,
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  messageButton: {
    padding: 8,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  vehicleText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.text,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prefChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  prefText: {
    fontSize: 14,
    color: colors.text,
  },
  reviewCard: {
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  footerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
