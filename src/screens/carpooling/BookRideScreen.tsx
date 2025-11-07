import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const colors = {
  primary: '#0b1220',
  success: '#10b981',
  background: '#f5f5f5',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  warning: '#f59e0b',
};

export default function BookRideScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { ride } = route.params as any;
  const { user } = useAuth();

  const [seats, setSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'cash'>('credits');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const totalPrice = ride.price_per_seat * seats;

  const handleBooking = async () => {
    if (paymentMethod === 'credits') {
      // Vérifier le solde
      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!creditsData || creditsData.balance < totalPrice) {
        Alert.alert(
          'Crédits insuffisants',
          `Il vous faut ${totalPrice}€ de crédits. Souhaitez-vous recharger ?`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Recharger',
              onPress: () => navigation.navigate('CreditsWallet' as never),
            },
          ]
        );
        return;
      }
    }

    setLoading(true);

    try {
      // Créer la réservation
      const { data: booking, error: bookingError } = await supabase
        .from('carpooling_bookings')
        .insert({
          ride_id: ride.id,
          passenger_id: user.id,
          seats_booked: seats,
          payment_method: paymentMethod,
          amount_paid: totalPrice,
          passenger_message: message,
          status: ride.auto_accept ? 'confirmed' : 'pending',
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Mettre à jour les places disponibles
      const { error: updateError } = await supabase
        .from('carpooling_rides')
        .update({
          available_seats: ride.available_seats - seats,
          status: ride.available_seats - seats === 0 ? 'full' : ride.status,
        })
        .eq('id', ride.id);

      if (updateError) throw updateError;

      // Si paiement par crédits et auto-accept, traiter le paiement
      if (paymentMethod === 'credits' && ride.auto_accept) {
        const { data: paymentResult, error: paymentError } = await supabase.rpc(
          'process_credit_payment',
          {
            p_passenger_id: user.id,
            p_driver_id: ride.driver_id,
            p_amount: totalPrice,
            p_booking_id: booking.id,
          }
        );

        if (paymentError) throw paymentError;

        if (!paymentResult.success) {
          throw new Error(paymentResult.error);
        }
      }

      Alert.alert(
        'Réservation confirmée !',
        ride.auto_accept
          ? `Votre réservation est confirmée. Le conducteur vous contactera bientôt.`
          : `Votre demande a été envoyée au conducteur. Vous recevrez une notification de sa réponse.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Erreur', 'Impossible de finaliser la réservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réserver ce trajet</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Résumé du trajet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trajet</Text>
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={styles.routeText}>{ride.departure_city}</Text>
            </View>
            <Ionicons name="arrow-down" size={16} color={colors.textSecondary} />
            <View style={styles.routeRow}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles.routeText}>{ride.arrival_city}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date(ride.departure_date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Nombre de places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre de places</Text>
          <View style={styles.seatsSelector}>
            <TouchableOpacity
              onPress={() => setSeats(Math.max(1, seats - 1))}
              style={styles.seatButton}
              disabled={seats === 1}
            >
              <Ionicons
                name="remove-circle"
                size={32}
                color={seats === 1 ? colors.border : colors.primary}
              />
            </TouchableOpacity>
            <Text style={styles.seatsCount}>
              {seats} place{seats > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              onPress={() => setSeats(Math.min(ride.available_seats, seats + 1))}
              style={styles.seatButton}
              disabled={seats === ride.available_seats}
            >
              <Ionicons
                name="add-circle"
                size={32}
                color={seats === ride.available_seats ? colors.border : colors.primary}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.availableText}>
            {ride.available_seats} place{ride.available_seats > 1 ? 's' : ''} disponible
            {ride.available_seats > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Mode de paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>

          {ride.payment_methods.includes('credits') && (
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'credits' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('credits')}
            >
              <View style={styles.paymentLeft}>
                <Ionicons name="wallet" size={24} color={colors.primary} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Crédits XCrackz</Text>
                  <Text style={styles.paymentSubtitle}>Paiement instantané et sécurisé</Text>
                </View>
              </View>
              <View
                style={[
                  styles.radio,
                  paymentMethod === 'credits' && styles.radioSelected,
                ]}
              >
                {paymentMethod === 'credits' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          )}

          {ride.payment_methods.includes('cash') && (
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cash' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('cash')}
            >
              <View style={styles.paymentLeft}>
                <Ionicons name="cash" size={24} color={colors.primary} />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle}>Espèces</Text>
                  <Text style={styles.paymentSubtitle}>Paiement au conducteur</Text>
                </View>
              </View>
              <View
                style={[styles.radio, paymentMethod === 'cash' && styles.radioSelected]}
              >
                {paymentMethod === 'cash' && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Message au conducteur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message au conducteur (optionnel)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Dites bonjour au conducteur..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>
        </View>

        {/* Récapitulatif */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Récapitulatif</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {seats} place{seats > 1 ? 's' : ''} × {ride.price_per_seat}€
            </Text>
            <Text style={styles.summaryValue}>{totalPrice.toFixed(2)}€</Text>
          </View>
          {paymentMethod === 'credits' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frais de service</Text>
              <Text style={styles.summaryValue}>0€</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{totalPrice.toFixed(2)}€</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer avec bouton */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total à payer</Text>
          <Text style={styles.footerPrice}>{totalPrice.toFixed(2)}€</Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, loading && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>
              {ride.auto_accept ? 'Réserver' : 'Envoyer la demande'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  routeCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textTransform: 'capitalize',
  },
  seatsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
  },
  seatButton: {
    padding: 8,
  },
  seatsCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
  },
  availableText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: 12,
  },
  paymentOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}05`,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  paymentSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  messageInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
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
  footerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footerPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  bookButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: colors.border,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
