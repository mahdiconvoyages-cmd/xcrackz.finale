import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CovoiturageStackParamList } from '../../types/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<CovoiturageStackParamList>;

const colors = {
  primary: '#0b1220',
  success: '#10b981',
  background: '#f5f5f5',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  disabled: '#d1d5db',
};

export default function PublishRideScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [departureAddress, setDepartureAddress] = useState('');
  const [departureCity, setDepartureCity] = useState('');
  const [arrivalAddress, setArrivalAddress] = useState('');
  const [arrivalCity, setArrivalCity] = useState('');
  const [departureDate, setDepartureDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState(3);
  const [pricePerSeat, setPricePerSeat] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  
  // Préférences
  const [smoking, setSmoking] = useState(false);
  const [pets, setPets] = useState(false);
  const [music, setMusic] = useState(true);
  const [autoAccept, setAutoAccept] = useState(true);
  
  // Modes de paiement
  const [acceptCash, setAcceptCash] = useState(true);

  const [loading, setLoading] = useState(false);

  const calculateSuggestedPrice = () => {
    if (distanceKm) {
      const suggested = (parseFloat(distanceKm) * 0.08).toFixed(2);
      setPricePerSeat(suggested);
    }
  };

  const handlePublish = async () => {
    if (!departureCity || !arrivalCity || !pricePerSeat) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!acceptCash) {
      Alert.alert('Erreur', 'Le mode de paiement espèces doit être activé');
      return;
    }

    setLoading(true);

    try {
      const paymentMethods = ['cash'];

      const { data, error } = await supabase
        .from('carpooling_rides')
        .insert({
          driver_id: user.id,
          departure_address: departureAddress || departureCity,
          departure_city: departureCity,
          arrival_address: arrivalAddress || arrivalCity,
          arrival_city: arrivalCity,
          departure_date: departureDate.toISOString(),
          total_seats: seats,
          available_seats: seats,
          price_per_seat: parseFloat(pricePerSeat),
          distance_km: distanceKm ? parseFloat(distanceKm) : null,
          vehicle_brand: vehicleBrand,
          vehicle_model: vehicleModel,
          payment_methods: paymentMethods,
          preferences: {
            smoking,
            pets,
            music,
            luggage: 'medium',
          },
          auto_accept: autoAccept,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Succès',
        'Votre trajet a été publié avec succès !',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MyRides'),
          },
        ]
      );
    } catch (error) {
      console.error('Error publishing ride:', error);
      Alert.alert('Erreur', 'Impossible de publier le trajet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.title}>Publier un trajet</Text>
          <Text style={styles.subtitle}>
            Partagez vos frais de convoyage avec d'autres conducteurs
          </Text>
        </View>

        {/* Itinéraire */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinéraire</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="Ville de départ *"
              value={departureCity}
              onChangeText={setDepartureCity}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Adresse précise (optionnel)"
              value={departureAddress}
              onChangeText={setDepartureAddress}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="Ville d'arrivée *"
              value={arrivalCity}
              onChangeText={setArrivalCity}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Adresse précise (optionnel)"
              value={arrivalAddress}
              onChangeText={setArrivalAddress}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="compass-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Distance (km)"
              value={distanceKm}
              onChangeText={setDistanceKm}
              keyboardType="decimal-pad"
              onBlur={calculateSuggestedPrice}
            />
          </View>
        </View>

        {/* Date et heure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date et heure</Text>

          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.inputText}>
              {departureDate.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.inputText}>
              {departureDate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={departureDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) setDepartureDate(selectedDate);
              }}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={departureDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedDate) setDepartureDate(selectedDate);
              }}
            />
          )}
        </View>

        {/* Places et prix */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Places et prix</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Nombre de places</Text>
            <View style={styles.counter}>
              <TouchableOpacity
                onPress={() => setSeats(Math.max(1, seats - 1))}
                style={styles.counterButton}
              >
                <Ionicons name="remove-circle-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{seats}</Text>
              <TouchableOpacity
                onPress={() => setSeats(Math.min(8, seats + 1))}
                style={styles.counterButton}
              >
                <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="Prix par place (€) *"
              value={pricePerSeat}
              onChangeText={setPricePerSeat}
              keyboardType="decimal-pad"
            />
          </View>

          {distanceKm && pricePerSeat && (
            <Text style={styles.hint}>
              Prix suggéré : {(parseFloat(distanceKm) * 0.08).toFixed(2)}€ (0.08€/km)
            </Text>
          )}
        </View>

        {/* Véhicule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Véhicule (optionnel)</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="car-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Marque"
              value={vehicleBrand}
              onChangeText={setVehicleBrand}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="car-sport-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Modèle"
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
          </View>
        </View>

        {/* Préférences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences du voyage</Text>

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => setSmoking(!smoking)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name="ban-outline" size={24} color={colors.text} />
              <Text style={styles.preferenceText}>Fumeur autorisé</Text>
            </View>
            <View style={[styles.switch, smoking && styles.switchActive]}>
              {smoking && <View style={styles.switchDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => setPets(!pets)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name="paw-outline" size={24} color={colors.text} />
              <Text style={styles.preferenceText}>Animaux acceptés</Text>
            </View>
            <View style={[styles.switch, pets && styles.switchActive]}>
              {pets && <View style={styles.switchDot} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => setMusic(!music)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name="musical-notes-outline" size={24} color={colors.text} />
              <Text style={styles.preferenceText}>Musique pendant le trajet</Text>
            </View>
            <View style={[styles.switch, music && styles.switchActive]}>
              {music && <View style={styles.switchDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Modes de paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Modes de paiement acceptés</Text>

          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => setAcceptCash(!acceptCash)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name="cash-outline" size={24} color={colors.text} />
              <Text style={styles.preferenceText}>Espèces</Text>
            </View>
            <View style={[styles.switch, acceptCash && styles.switchActive]}>
              {acceptCash && <View style={styles.switchDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Réservation automatique */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.preferenceRow}
            onPress={() => setAutoAccept(!autoAccept)}
          >
            <View style={styles.preferenceLeft}>
              <Ionicons name="flash-outline" size={24} color={colors.text} />
              <View style={{ flex: 1 }}>
                <Text style={styles.preferenceText}>Réservation instantanée</Text>
                <Text style={styles.preferenceHint}>
                  Les passagers peuvent réserver sans votre validation
                </Text>
              </View>
            </View>
            <View style={[styles.switch, autoAccept && styles.switchActive]}>
              {autoAccept && <View style={styles.switchDot} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Bouton Publier */}
        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={handlePublish}
          disabled={loading}
        >
          <Text style={styles.publishButtonText}>
            {loading ? 'Publication...' : 'Publier le trajet'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: colors.text,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: 16,
    color: colors.text,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterButton: {
    padding: 4,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  preferenceText: {
    fontSize: 16,
    color: colors.text,
  },
  preferenceHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: colors.success,
    alignItems: 'flex-end',
  },
  switchDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  publishButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  publishButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
