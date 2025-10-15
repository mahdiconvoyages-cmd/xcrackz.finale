import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Trip {
  id: string;
  driver_id: string;
  departure_city: string;
  arrival_city: string;
  departure_address: string;
  arrival_address: string;
  departure_date: string;
  seats_available: number;
  price_per_seat: number;
  vehicle_model?: string;
  vehicle_year?: number;
  amenities?: string[];
  status: string;
  created_at: string;
  driver?: {
    full_name: string;
    avatar_url?: string;
    phone?: string;
  };
}

interface Reservation {
  id: string;
  ride_id: string;
  passenger_id: string;
  seats_reserved: number;
  status: string;
  created_at: string;
  passenger?: {
    full_name: string;
    avatar_url?: string;
    phone?: string;
  };
}

const CovoiturageTripDetails: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { tripId } = route.params as { tripId: string };

  const [trip, setTrip] = useState<Trip | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [userReservation, setUserReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [canRateDriver, setCanRateDriver] = useState(false);
  const [canRatePassengers, setCanRatePassengers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  const loadTripDetails = async () => {
    try {
      // Load trip
      const { data: tripData, error: tripError } = await supabase
        .from('rides')
        .select(`
          *,
          driver:profiles!rides_driver_id_fkey(full_name, avatar_url, phone)
        `)
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // Load reservations
      const { data: reservationsData, error: reservationsError } = await supabase
        .from('ride_reservations')
        .select(`
          *,
          passenger:profiles!ride_reservations_passenger_id_fkey(full_name, avatar_url, phone)
        `)
        .eq('ride_id', tripId);

      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);

      // Check if current user has a reservation
      const myReservation = reservationsData?.find(
        (r: Reservation) => r.passenger_id === user?.id
      );
      setUserReservation(myReservation || null);
    } catch (error) {
      console.error('Error loading trip details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du trajet');
    } finally {
      setLoading(false);
    }
  };

  const handleBookTrip = async () => {
    if (!user || !trip) return;

    // Check if user is the driver
    if (trip.driver_id === user.id) {
      Alert.alert('Erreur', 'Vous ne pouvez pas réserver votre propre trajet');
      return;
    }

    // Check if user already has a reservation
    if (userReservation) {
      Alert.alert('Info', 'Vous avez déjà réservé ce trajet');
      return;
    }

    // Check available seats
    const totalReserved = reservations
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + r.seats_reserved, 0);
    
    const availableSeats = trip.seats_available - totalReserved;

    if (seatsToBook > availableSeats) {
      Alert.alert('Erreur', `Seulement ${availableSeats} place(s) disponible(s)`);
      return;
    }

    Alert.alert(
      'Confirmer la réservation',
      `Réserver ${seatsToBook} place(s) pour ${(trip.price_per_seat * seatsToBook).toFixed(2)}€ ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réserver',
          onPress: async () => {
            setBookingLoading(true);
            try {
              const { error } = await supabase
                .from('ride_reservations')
                .insert({
                  ride_id: tripId,
                  passenger_id: user.id,
                  seats_reserved: seatsToBook,
                  status: 'pending',
                });

              if (error) throw error;

              Alert.alert('Succès', 'Réservation effectuée avec succès');
              loadTripDetails();
            } catch (error: any) {
              console.error('Error booking trip:', error);
              Alert.alert('Erreur', error.message || 'Échec de la réservation');
            } finally {
              setBookingLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelReservation = async () => {
    if (!userReservation) return;

    Alert.alert(
      'Annuler la réservation',
      'Êtes-vous sûr de vouloir annuler votre réservation ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('ride_reservations')
                .update({ status: 'cancelled' })
                .eq('id', userReservation.id);

              if (error) throw error;

              Alert.alert('Succès', 'Réservation annulée');
              loadTripDetails();
            } catch (error) {
              console.error('Error cancelling reservation:', error);
              Alert.alert('Erreur', 'Échec de l\'annulation');
            }
          },
        },
      ]
    );
  };

  const handleAcceptReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('ride_reservations')
        .update({ status: 'confirmed' })
        .eq('id', reservationId);

      if (error) throw error;

      Alert.alert('Succès', 'Réservation acceptée');
      loadTripDetails();
    } catch (error) {
      console.error('Error accepting reservation:', error);
      Alert.alert('Erreur', 'Échec de l\'acceptation');
    }
  };

  const handleRejectReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('ride_reservations')
        .update({ status: 'rejected' })
        .eq('id', reservationId);

      if (error) throw error;

      Alert.alert('Succès', 'Réservation refusée');
      loadTripDetails();
    } catch (error) {
      console.error('Error rejecting reservation:', error);
      Alert.alert('Erreur', 'Échec du refus');
    }
  };

  const handleCallDriver = () => {
    if (trip?.driver?.phone) {
      Linking.openURL(`tel:${trip.driver.phone}`);
    }
  };

  const handleMessageDriver = () => {
    // Navigate to messages with this driver
    navigation.navigate('CovoiturageMessages' as never);
  };

  const handleViewProfile = (userId: string) => {
    (navigation as any).navigate('CovoiturageUserProfile', { userId });
  };

  const handleRateUser = (userId: string, userName: string, role: 'driver' | 'passenger') => {
    (navigation as any).navigate('CovoiturageRateUser', {
      rideId: tripId,
      revieweeId: userId,
      revieweeName: userName,
      role,
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#06b6d4';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmée';
      case 'pending': return 'En attente';
      case 'rejected': return 'Refusée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Trajet introuvable</Text>
      </View>
    );
  }

  const isDriver = trip.driver_id === user?.id;
  const totalReserved = reservations
    .filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + r.seats_reserved, 0);
  const availableSeats = trip.seats_available - totalReserved;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.gradient}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Route Card */}
          <View style={styles.card}>
            <View style={styles.routeHeader}>
              <Text style={styles.cityText}>{trip.departure_city}</Text>
              <MaterialIcons name="arrow-forward" size={24} color="#06b6d4" />
              <Text style={styles.cityText}>{trip.arrival_city}</Text>
            </View>
            
            <View style={styles.dateContainer}>
              <MaterialIcons name="event" size={20} color="#06b6d4" />
              <Text style={styles.dateText}>{formatDate(trip.departure_date)}</Text>
            </View>

            <View style={styles.addressesContainer}>
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={20} color="#10b981" />
                <Text style={styles.addressText}>{trip.departure_address}</Text>
              </View>
              <View style={styles.addressRow}>
                <MaterialIcons name="location-on" size={20} color="#ef4444" />
                <Text style={styles.addressText}>{trip.arrival_address}</Text>
              </View>
            </View>
          </View>

          {/* Price & Seats Card */}
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <MaterialIcons name="euro" size={24} color="#10b981" />
                <Text style={styles.infoLabel}>Prix par place</Text>
                <Text style={styles.infoValue}>{trip.price_per_seat.toFixed(2)}€</Text>
              </View>
              <View style={styles.infoItem}>
                <MaterialIcons name="airline-seat-recline-normal" size={24} color="#06b6d4" />
                <Text style={styles.infoLabel}>Places disponibles</Text>
                <Text style={styles.infoValue}>{availableSeats}/{trip.seats_available}</Text>
              </View>
            </View>
          </View>

          {/* Driver Card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Conducteur</Text>
            <TouchableOpacity 
              onPress={() => handleViewProfile(trip.driver_id)}
              style={styles.driverContainer}
            >
              <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {trip.driver?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{trip.driver?.full_name || 'Utilisateur'}</Text>
                {trip.vehicle_model && (
                  <View style={styles.vehicleInfo}>
                    <MaterialIcons name="directions-car" size={16} color="#64748b" />
                    <Text style={styles.vehicleText}>
                      {trip.vehicle_model} {trip.vehicle_year ? `(${trip.vehicle_year})` : ''}
                    </Text>
                  </View>
                )}
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#64748b" />
            </TouchableOpacity>

            {!isDriver && (
              <View style={styles.driverActions}>
                <TouchableOpacity onPress={handleCallDriver} style={styles.driverActionButton}>
                  <MaterialIcons name="phone" size={20} color="#06b6d4" />
                  <Text style={styles.driverActionText}>Appeler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleMessageDriver} style={styles.driverActionButton}>
                  <MaterialIcons name="message" size={20} color="#06b6d4" />
                  <Text style={styles.driverActionText}>Message</Text>
                </TouchableOpacity>
                {canRateDriver && (
                  <TouchableOpacity 
                    onPress={() => handleRateUser(trip.driver_id, trip.driver?.full_name || 'Conducteur', 'driver')}
                    style={[styles.driverActionButton, styles.rateButton]}
                  >
                    <MaterialIcons name="star" size={20} color="#fbbf24" />
                    <Text style={[styles.driverActionText, { color: '#fbbf24' }]}>Noter</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Amenities */}
          {trip.amenities && trip.amenities.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Équipements</Text>
              <View style={styles.amenitiesContainer}>
                {trip.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityChip}>
                    <MaterialIcons name="check-circle" size={16} color="#10b981" />
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reservations (Driver View) */}
          {isDriver && reservations.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Réservations ({reservations.length})</Text>
              {reservations.map((reservation) => (
                <View key={reservation.id} style={styles.reservationCard}>
                  <TouchableOpacity 
                    onPress={() => handleViewProfile(reservation.passenger_id)}
                    style={styles.reservationHeader}
                  >
                    <View style={styles.passengerInfo}>
                      <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.passengerAvatar}>
                        <Text style={styles.passengerAvatarText}>
                          {reservation.passenger?.full_name?.charAt(0).toUpperCase() || 'P'}
                        </Text>
                      </LinearGradient>
                      <View>
                        <Text style={styles.passengerName}>
                          {reservation.passenger?.full_name || 'Passager'}
                        </Text>
                        <Text style={styles.seatsReserved}>
                          {reservation.seats_reserved} place(s)
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(reservation.status) + '33' },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: getStatusColor(reservation.status) }]}
                      >
                        {getStatusLabel(reservation.status)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {reservation.status === 'pending' && (
                    <View style={styles.reservationActions}>
                      <TouchableOpacity
                        onPress={() => handleAcceptReservation(reservation.id)}
                        style={[styles.reservationActionButton, styles.acceptButton]}
                      >
                        <Text style={styles.reservationActionText}>Accepter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRejectReservation(reservation.id)}
                        style={[styles.reservationActionButton, styles.rejectButton]}
                      >
                        <Text style={styles.reservationActionText}>Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {canRatePassengers[reservation.passenger_id] && reservation.status === 'confirmed' && (
                    <TouchableOpacity
                      onPress={() => handleRateUser(reservation.passenger_id, reservation.passenger?.full_name || 'Passager', 'passenger')}
                      style={styles.ratePassengerButton}
                    >
                      <MaterialIcons name="star" size={20} color="#fbbf24" />
                      <Text style={styles.ratePassengerText}>Noter ce passager</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Booking Section (Passenger View) */}
          {!isDriver && !userReservation && availableSeats > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Réserver ce trajet</Text>
              <View style={styles.seatsSelector}>
                <Text style={styles.seatsSelectorLabel}>Nombre de places :</Text>
                <View style={styles.seatsSelectorButtons}>
                  <TouchableOpacity
                    onPress={() => setSeatsToBook(Math.max(1, seatsToBook - 1))}
                    style={styles.seatButton}
                  >
                    <MaterialIcons name="remove" size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.seatsCount}>{seatsToBook}</Text>
                  <TouchableOpacity
                    onPress={() => setSeatsToBook(Math.min(availableSeats, seatsToBook + 1))}
                    style={styles.seatButton}
                  >
                    <MaterialIcons name="add" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.totalPrice}>
                Total: {(trip.price_per_seat * seatsToBook).toFixed(2)}€
              </Text>
              <TouchableOpacity
                onPress={handleBookTrip}
                disabled={bookingLoading}
                style={styles.bookButton}
              >
                <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.bookButtonGradient}>
                  {bookingLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.bookButtonText}>Réserver maintenant</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* User Reservation Status */}
          {userReservation && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Votre réservation</Text>
              <View
                style={[
                  styles.userReservationBadge,
                  { backgroundColor: getStatusColor(userReservation.status) + '33' },
                ]}
              >
                <Text
                  style={[
                    styles.userReservationText,
                    { color: getStatusColor(userReservation.status) },
                  ]}
                >
                  {getStatusLabel(userReservation.status)} - {userReservation.seats_reserved} place(s)
                </Text>
              </View>
              {userReservation.status === 'pending' && (
                <TouchableOpacity
                  onPress={handleCancelReservation}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Annuler ma réservation</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    marginTop: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  cityText: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dateText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  addressesContainer: {
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    color: '#cbd5e1',
    fontSize: 14,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  infoValue: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
  driverActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  driverActionText: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '600',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  amenityText: {
    color: '#10b981',
    fontSize: 12,
  },
  reservationCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passengerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  passengerName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  seatsReserved: {
    color: '#94a3b8',
    fontSize: 12,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reservationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reservationActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  reservationActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  seatsSelector: {
    marginBottom: 16,
  },
  seatsSelectorLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  seatsSelectorButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  seatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatsCount: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'center',
  },
  totalPrice: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  bookButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userReservationBadge: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userReservationText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rateButton: {
    borderColor: '#fbbf24',
  },
  ratePassengerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginTop: 8,
  },
  ratePassengerText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CovoiturageTripDetails;
