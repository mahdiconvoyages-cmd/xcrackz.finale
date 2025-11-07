import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CarpoolingTrip, CarpoolingBooking } from '../types/carpooling';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TripDetailsScreen({ route, navigation }: any) {
  const { tripId } = route.params;
  const { user } = useAuth();
  const [trip, setTrip] = useState<CarpoolingTrip | null>(null);
  const [bookings, setBookings] = useState<CarpoolingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState('1');
  const [bookingMessage, setBookingMessage] = useState('');
  const [credits, setCredits] = useState(0);

  const isDriver = trip?.driver_id === user?.id;

  useEffect(() => {
    loadTripDetails();
    loadUserCredits();
  }, [tripId]);

  const loadTripDetails = async () => {
    try {
      setLoading(true);

      // Load trip with driver info
      const { data: tripData, error: tripError } = await supabase
        .from('carpooling_trips')
        .select(`
          *,
          driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url, phone)
        `)
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;
      setTrip(tripData);

      // If user is driver, load bookings
      if (tripData.driver_id === user?.id) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('carpooling_bookings')
          .select(`
            *,
            passenger:profiles!carpooling_bookings_passenger_id_fkey(id, full_name, email, avatar_url, phone)
          `)
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);
      }
    } catch (error) {
      console.error('Error loading trip details:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails du trajet');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCredits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setCredits(data.balance);
    }
  };

  const handleBookTrip = async () => {
    if (!trip || !user) return;

    const seats = parseInt(seatsToBook);
    if (isNaN(seats) || seats < 1 || seats > trip.available_seats) {
      Alert.alert('Erreur', `Nombre de places invalide (1-${trip.available_seats})`);
      return;
    }

    if (credits < 2) {
      Alert.alert(
        'Crédits insuffisants',
        `Vous avez ${credits} crédits. 2 crédits sont requis pour réserver un trajet.`
      );
      return;
    }

    setActionLoading(true);

    try {
      const totalPrice = seats * trip.price_per_seat;

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('carpooling_bookings')
        .insert([
          {
            trip_id: trip.id,
            passenger_id: user.id,
            seats_booked: seats,
            total_price: totalPrice,
            status: trip.automatic_booking ? 'confirmed' : 'pending',
            message: bookingMessage,
          },
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Deduct 2 credits
      const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: 2,
        p_description: `Réservation covoiturage ${trip.departure_city} → ${trip.arrival_city}`,
      });

      if (deductError) {
        console.error('Error deducting credits:', deductError);
      }

      // Update available seats if automatic booking
      if (trip.automatic_booking) {
        const { error: updateError } = await supabase
          .from('carpooling_trips')
          .update({
            available_seats: trip.available_seats - seats,
            status: trip.available_seats - seats === 0 ? 'full' : 'active',
          })
          .eq('id', trip.id);

        if (updateError) throw updateError;
      }

      setShowBookingModal(false);
      Alert.alert(
        'Succès',
        trip.automatic_booking
          ? 'Votre réservation est confirmée !'
          : 'Votre demande de réservation a été envoyée au conducteur.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error booking trip:', error);
      Alert.alert('Erreur', 'Impossible de réserver le trajet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBooking = async (booking: CarpoolingBooking) => {
    if (!trip) return;

    try {
      setActionLoading(true);

      // Update booking status
      const { error: bookingError } = await supabase
        .from('carpooling_bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Update available seats
      const { error: tripError } = await supabase
        .from('carpooling_trips')
        .update({
          available_seats: trip.available_seats - booking.seats_booked,
          status: trip.available_seats - booking.seats_booked === 0 ? 'full' : 'active',
        })
        .eq('id', trip.id);

      if (tripError) throw tripError;

      Alert.alert('Succès', 'Réservation confirmée');
      loadTripDetails();
    } catch (error) {
      console.error('Error confirming booking:', error);
      Alert.alert('Erreur', 'Impossible de confirmer la réservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (booking: CarpoolingBooking) => {
    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('carpooling_bookings')
        .update({ status: 'rejected' })
        .eq('id', booking.id);

      if (error) throw error;

      Alert.alert('Succès', 'Réservation refusée');
      loadTripDetails();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      Alert.alert('Erreur', 'Impossible de refuser la réservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTrip = () => {
    if (!trip) return;

    Alert.alert(
      'Annuler le trajet',
      'Êtes-vous sûr de vouloir annuler ce trajet ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);

              const { error } = await supabase
                .from('carpooling_trips')
                .update({ status: 'cancelled' })
                .eq('id', trip.id);

              if (error) throw error;

              Alert.alert('Succès', 'Trajet annulé', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Error cancelling trip:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler le trajet');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderBookingModal = () => (
    <Modal
      visible={showBookingModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBookingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Réserver ce trajet</Text>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Nombre de places</Text>
            <TextInput
              style={styles.modalInput}
              value={seatsToBook}
              onChangeText={setSeatsToBook}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Message au conducteur (optionnel)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={bookingMessage}
              onChangeText={setBookingMessage}
              multiline
              numberOfLines={4}
              placeholder="Ajoutez un message..."
            />
          </View>

          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Prix total:</Text>
            <Text style={styles.priceValue}>
              {(parseInt(seatsToBook || '1') * (trip?.price_per_seat || 0)).toFixed(2)}€
            </Text>
          </View>

          <View style={styles.creditsInfo}>
            <Text style={styles.creditsLabel}>Crédits requis: 2</Text>
            <Text style={styles.creditsBalance}>Votre solde: {credits}</Text>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, actionLoading && styles.modalButtonDisabled]}
            onPress={handleBookTrip}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.modalButtonText}>Confirmer la réservation</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <Text>Trajet introuvable</Text>
      </View>
    );
  }

  const departureDate = new Date(trip.departure_datetime);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du trajet</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Map */}
        {trip.departure_lat && trip.departure_lng && trip.arrival_lat && trip.arrival_lng && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: (trip.departure_lat + trip.arrival_lat) / 2,
              longitude: (trip.departure_lng + trip.arrival_lng) / 2,
              latitudeDelta: Math.abs(trip.departure_lat - trip.arrival_lat) * 2 || 0.5,
              longitudeDelta: Math.abs(trip.departure_lng - trip.arrival_lng) * 2 || 0.5,
            }}
          >
            <Marker
              coordinate={{ latitude: trip.departure_lat, longitude: trip.departure_lng }}
              pinColor="#007AFF"
              title="Départ"
            />
            <Marker
              coordinate={{ latitude: trip.arrival_lat, longitude: trip.arrival_lng }}
              pinColor="#FF3B30"
              title="Arrivée"
            />
            <Polyline
              coordinates={[
                { latitude: trip.departure_lat, longitude: trip.departure_lng },
                { latitude: trip.arrival_lat, longitude: trip.arrival_lng },
              ]}
              strokeColor="#007AFF"
              strokeWidth={3}
            />
          </MapView>
        )}

        {/* Driver Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conducteur</Text>
          <View style={styles.driverCard}>
            {trip.driver?.avatar_url ? (
              <Image source={{ uri: trip.driver.avatar_url }} style={styles.driverAvatar} />
            ) : (
              <View style={styles.driverAvatarPlaceholder}>
                <Ionicons name="person" size={32} color="#666" />
              </View>
            )}
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{trip.driver?.full_name}</Text>
              {trip.driver_rating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#FFA500" />
                  <Text style={styles.ratingText}>{trip.driver_rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
            {!isDriver && (
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() =>
                  navigation.navigate('CarpoolingChat', {
                    tripId: trip.id,
                    otherUserId: trip.driver_id,
                  })
                }
              >
                <Ionicons name="chatbubble-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Trip Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails du trajet</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#666" />
            <Text style={styles.infoText}>
              {format(departureDate, "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTextBold}>{trip.departure_city}</Text>
              <Text style={styles.infoTextLight}>{trip.departure_address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#FF3B30" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTextBold}>{trip.arrival_city}</Text>
              <Text style={styles.infoTextLight}>{trip.arrival_address}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color="#666" />
            <Text style={styles.infoText}>
              {trip.available_seats} place(s) disponible(s) sur {trip.total_seats}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash" size={20} color="#666" />
            <Text style={styles.infoText}>{trip.price_per_seat}€ par place</Text>
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences</Text>
          <View style={styles.preferencesGrid}>
            <View style={[styles.prefBadge, trip.allows_pets && styles.prefBadgeActive]}>
              <Ionicons name="paw" size={20} color={trip.allows_pets ? '#4CAF50' : '#999'} />
              <Text style={styles.prefText}>Animaux</Text>
            </View>
            <View style={[styles.prefBadge, !trip.allows_smoking && styles.prefBadgeActive]}>
              <Ionicons name="ban" size={20} color={!trip.allows_smoking ? '#FF5722' : '#999'} />
              <Text style={styles.prefText}>Non-fumeur</Text>
            </View>
            <View style={[styles.prefBadge, trip.allows_music && styles.prefBadgeActive]}>
              <Ionicons name="musical-notes" size={20} color={trip.allows_music ? '#2196F3' : '#999'} />
              <Text style={styles.prefText}>Musique</Text>
            </View>
            <View style={[styles.prefBadge, trip.automatic_booking && styles.prefBadgeActive]}>
              <Ionicons name="flash" size={20} color={trip.automatic_booking ? '#FF9500' : '#999'} />
              <Text style={styles.prefText}>Instantané</Text>
            </View>
          </View>
        </View>

        {trip.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{trip.description}</Text>
          </View>
        )}

        {/* Bookings (for driver) */}
        {isDriver && bookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Réservations ({bookings.length})</Text>
            {bookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingPassenger}>{booking.passenger?.full_name}</Text>
                  <View style={[styles.statusBadge, styles[`status${booking.status}`]]}>
                    <Text style={styles.statusText}>{booking.status}</Text>
                  </View>
                </View>
                <Text style={styles.bookingDetails}>
                  {booking.seats_booked} place(s) • {booking.total_price}€
                </Text>
                {booking.message && (
                  <Text style={styles.bookingMessage}>{booking.message}</Text>
                )}
                {booking.status === 'pending' && (
                  <View style={styles.bookingActions}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectBooking(booking)}
                    >
                      <Text style={styles.rejectButtonText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => handleConfirmBooking(booking)}
                    >
                      <Text style={styles.confirmButtonText}>Confirmer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {isDriver ? (
          <TouchableOpacity
            style={[styles.cancelButton, actionLoading && styles.buttonDisabled]}
            onPress={handleCancelTrip}
            disabled={actionLoading || trip.status === 'cancelled'}
          >
            <Text style={styles.cancelButtonText}>
              {trip.status === 'cancelled' ? 'Trajet annulé' : 'Annuler le trajet'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.bookButton, actionLoading && styles.buttonDisabled]}
            onPress={() => setShowBookingModal(true)}
            disabled={actionLoading || trip.available_seats === 0 || trip.status !== 'active'}
          >
            <Text style={styles.bookButtonText}>
              {trip.available_seats === 0 ? 'Complet' : 'Réserver'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {renderBookingModal()}
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  map: {
    height: 200,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  driverAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  chatButton: {
    padding: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTextBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoTextLight: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  prefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  prefBadgeActive: {
    backgroundColor: '#E3F2FD',
  },
  prefText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bookingCard: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingPassenger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statuspending: {
    backgroundColor: '#FFF3CD',
  },
  statusconfirmed: {
    backgroundColor: '#D1E7DD',
  },
  statusrejected: {
    backgroundColor: '#F8D7DA',
  },
  statuscancelled: {
    backgroundColor: '#E2E3E5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookingMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.6,
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
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  creditsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  creditsLabel: {
    fontSize: 14,
    color: '#666',
  },
  creditsBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
