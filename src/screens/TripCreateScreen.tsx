import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

export default function TripCreateScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [showDepartureDatePicker, setShowDepartureDatePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);

  const [formData, setFormData] = useState({
    departure_address: '',
    departure_city: '',
    arrival_address: '',
    arrival_city: '',
    departure_date: new Date(),
    departure_time: new Date(),
    seats_available: 3,
    total_seats: '',
    price_per_seat: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_brand: '',
    vehicle_color: '',
    allows_pets: false,
    allows_smoking: false,
    allows_music: true,
    max_two_back: false,
    automatic_booking: true,
    luggage_size: 'medium' as 'small' | 'medium' | 'large',
    description: '',
    amenities: [] as string[],
  });

  useEffect(() => {
    loadUserCredits();
  }, []);

  const loadUserCredits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading credits:', error);
      return;
    }

    setCredits(data?.credits || 0);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDepartureDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, departure_date: selectedDate });
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowDepartureTimePicker(false);
    if (selectedTime) {
      setFormData({ ...formData, departure_time: selectedTime });
    }
  };

  const validateForm = (): string | null => {
    if (!formData.departure_city.trim()) return 'Ville de départ requise';
    if (!formData.departure_address.trim()) return 'Adresse de départ requise';
    if (!formData.arrival_city.trim()) return 'Ville d\'arrivée requise';
    if (!formData.arrival_address.trim()) return 'Adresse d\'arrivée requise';
    
    const price = parseFloat(formData.price_per_seat);
    if (isNaN(price) || price <= 0) return 'Prix par place requis';
    
    if (formData.seats_available < 1 || formData.seats_available > 8) {
      return 'Nombre de places invalide (1-8)';
    }

    if (formData.departure_date <= new Date()) {
      return 'La date de départ doit être dans le futur';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Erreur', validationError);
      return;
    }

    setLoading(true);

    try {
      // Insert trip (simplifié comme web)
      const { data: tripData, error: tripError } = await supabase
        .from('rides')
        .insert([
          {
            driver_id: user?.id,
            departure_city: formData.departure_city,
            departure_address: formData.departure_address,
            arrival_city: formData.arrival_city,
            arrival_address: formData.arrival_address,
            departure_date: formData.departure_date.toISOString(),
            seats_available: formData.seats_available,
            price_per_seat: parseFloat(formData.price_per_seat),
            vehicle_model: formData.vehicle_model || null,
            vehicle_year: formData.vehicle_year || null,
            amenities: formData.amenities,
            status: 'published',
          },
        ])
        .select()
        .single();

      if (tripError) throw tripError;

      Alert.alert(
        'Succès',
        'Votre trajet a été publié !',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating trip:', error);
      Alert.alert('Erreur', 'Impossible de créer le trajet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Publier un trajet</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.creditsCard}>
        <Ionicons name="wallet" size={24} color="#007AFF" />
        <Text style={styles.creditsText}>Crédits disponibles: {credits}</Text>
        <Text style={styles.creditsCost}>Coût: 2 crédits</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Départ</Text>
        <TextInput
          style={styles.input}
          placeholder="Adresse de départ *"
          value={formData.departure_address}
          onChangeText={(text) => setFormData({ ...formData, departure_address: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Ville de départ *"
          value={formData.departure_city}
          onChangeText={(text) => setFormData({ ...formData, departure_city: text })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Arrivée</Text>
        <TextInput
          style={styles.input}
          placeholder="Adresse d'arrivée *"
          value={formData.arrival_address}
          onChangeText={(text) => setFormData({ ...formData, arrival_address: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Ville d'arrivée *"
          value={formData.arrival_city}
          onChangeText={(text) => setFormData({ ...formData, arrival_city: text })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Date et heure</Text>
        
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDepartureDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#666" />
          <Text style={styles.dateButtonText}>
            {formData.departure_date.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </TouchableOpacity>

        {showDepartureDatePicker && (
          <DateTimePicker
            value={formData.departure_date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDepartureTimePicker(true)}
        >
          <Ionicons name="time" size={20} color="#666" />
          <Text style={styles.dateButtonText}>
            {formData.departure_time.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>

        {showDepartureTimePicker && (
          <DateTimePicker
            value={formData.departure_time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            is24Hour={true}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💺 Places et prix</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de places disponibles *"
          value={formData.total_seats}
          onChangeText={(text) => setFormData({ ...formData, total_seats: text })}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Prix par place (min 2€) *"
          value={formData.price_per_seat}
          onChangeText={(text) => setFormData({ ...formData, price_per_seat: text })}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Véhicule (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Marque"
          value={formData.vehicle_brand}
          onChangeText={(text) => setFormData({ ...formData, vehicle_brand: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Modèle"
          value={formData.vehicle_model}
          onChangeText={(text) => setFormData({ ...formData, vehicle_model: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Couleur"
          value={formData.vehicle_color}
          onChangeText={(text) => setFormData({ ...formData, vehicle_color: text })}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Préférences</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Animaux acceptés</Text>
          <Switch
            value={formData.allows_pets}
            onValueChange={(value) => setFormData({ ...formData, allows_pets: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Fumeur autorisé</Text>
          <Switch
            value={formData.allows_smoking}
            onValueChange={(value) => setFormData({ ...formData, allows_smoking: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Musique autorisée</Text>
          <Switch
            value={formData.allows_music}
            onValueChange={(value) => setFormData({ ...formData, allows_music: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Max 2 à l'arrière</Text>
          <Switch
            value={formData.max_two_back}
            onValueChange={(value) => setFormData({ ...formData, max_two_back: value })}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Réservation instantanée</Text>
          <Switch
            value={formData.automatic_booking}
            onValueChange={(value) => setFormData({ ...formData, automatic_booking: value })}
          />
        </View>

        <Text style={styles.sectionSubtitle}>Taille des bagages</Text>
        <View style={styles.luggageButtons}>
          {(['small', 'medium', 'large'] as const).map((size) => (
            <TouchableOpacity
              key={size}
              style={[
                styles.luggageButton,
                formData.luggage_size === size && styles.luggageButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, luggage_size: size })}
            >
              <Text
                style={[
                  styles.luggageButtonText,
                  formData.luggage_size === size && styles.luggageButtonTextActive,
                ]}
              >
                {size === 'small' ? 'Petit' : size === 'medium' ? 'Moyen' : 'Grand'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ajoutez des informations supplémentaires..."
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.submitButtonText}>Publier le trajet</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    paddingBottom: 40,
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
  creditsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  creditsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  creditsCost: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  luggageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  luggageButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  luggageButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  luggageButtonText: {
    fontSize: 14,
    color: '#666',
  },
  luggageButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
