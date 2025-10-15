import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FormData {
  departureCity: string;
  departureAddress: string;
  arrivalCity: string;
  arrivalAddress: string;
  departureDate: Date;
  seatsAvailable: number;
  pricePerSeat: string;
  vehicleModel: string;
  vehicleYear: string;
  amenities: string[];
}

const AMENITIES_OPTIONS = [
  { id: 'wifi', label: 'WiFi', icon: 'wifi' },
  { id: 'ac', label: 'Climatisation', icon: 'ac-unit' },
  { id: 'music', label: 'Musique', icon: 'music-note' },
  { id: 'luggage', label: 'Bagages', icon: 'luggage' },
  { id: 'pets', label: 'Animaux acceptés', icon: 'pets' },
  { id: 'smoking', label: 'Fumeur', icon: 'smoking-rooms' },
];

const CovoituragePublish: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    departureCity: '',
    departureAddress: '',
    arrivalCity: '',
    arrivalAddress: '',
    departureDate: new Date(),
    seatsAvailable: 3,
    pricePerSeat: '',
    vehicleModel: '',
    vehicleYear: '',
    amenities: [],
  });

  const updateFormData = (key: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAmenity = (amenityId: string) => {
    setFormData((prev) => {
      const amenities = prev.amenities.includes(amenityId)
        ? prev.amenities.filter((a) => a !== amenityId)
        : [...prev.amenities, amenityId];
      return { ...prev, amenities };
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.departureCity &&
          formData.departureAddress &&
          formData.arrivalCity &&
          formData.arrivalAddress
        );
      case 2:
        return formData.departureDate > new Date();
      case 3:
        return !!(
          formData.pricePerSeat &&
          parseFloat(formData.pricePerSeat) > 0 &&
          formData.seatsAvailable > 0
        );
      case 4:
        return true; // Optional step
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis');
      return;
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rides')
        .insert({
          driver_id: user.id,
          departure_city: formData.departureCity,
          departure_address: formData.departureAddress,
          arrival_city: formData.arrivalCity,
          arrival_address: formData.arrivalAddress,
          departure_date: formData.departureDate.toISOString(),
          seats_available: formData.seatsAvailable,
          price_per_seat: parseFloat(formData.pricePerSeat),
          vehicle_model: formData.vehicleModel || null,
          vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
          amenities: formData.amenities.length > 0 ? formData.amenities : null,
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
            onPress: () => {
              navigation.navigate('CovoiturageMyTrips' as never);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error publishing trip:', error);
      Alert.alert('Erreur', error.message || 'Échec de la publication du trajet');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            {currentStep > step ? (
              <MaterialIcons name="check" size={16} color="#fff" />
            ) : (
              <Text style={styles.stepNumber}>{step}</Text>
            )}
          </View>
          {step < 4 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.stepIcon}>
          <MaterialIcons name="place" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.stepTitle}>Itinéraire</Text>
        <Text style={styles.stepDescription}>Où allez-vous ?</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ville de départ *</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="trip-origin" size={20} color="#06b6d4" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.departureCity}
            onChangeText={(text) => updateFormData('departureCity', text)}
            placeholder="Ex: Paris"
            placeholderTextColor="#64748b"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Adresse de départ *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.departureAddress}
          onChangeText={(text) => updateFormData('departureAddress', text)}
          placeholder="Adresse complète de départ"
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Ville d'arrivée *</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="location-on" size={20} color="#ef4444" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.arrivalCity}
            onChangeText={(text) => updateFormData('arrivalCity', text)}
            placeholder="Ex: Lyon"
            placeholderTextColor="#64748b"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Adresse d'arrivée *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.arrivalAddress}
          onChangeText={(text) => updateFormData('arrivalAddress', text)}
          placeholder="Adresse complète d'arrivée"
          placeholderTextColor="#64748b"
          multiline
          numberOfLines={2}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={['#10b981', '#059669']} style={styles.stepIcon}>
          <MaterialIcons name="event" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.stepTitle}>Date et heure</Text>
        <Text style={styles.stepDescription}>Quand partez-vous ?</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Date et heure de départ *</Text>
        <View style={styles.datePickerButton}>
          <MaterialIcons name="event" size={20} color="#06b6d4" />
          <Text style={styles.datePickerText}>
            {formData.departureDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.helperText}>
          Sélection de date/heure disponible dans la version complète
        </Text>
      </View>

      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color="#06b6d4" />
        <Text style={styles.infoText}>
          Date par défaut: {formData.departureDate.toLocaleString('fr-FR')}
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.stepIcon}>
          <MaterialIcons name="euro" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.stepTitle}>Prix et places</Text>
        <Text style={styles.stepDescription}>Définissez vos conditions</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Prix par place (€) *</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="euro" size={20} color="#10b981" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={formData.pricePerSeat}
            onChangeText={(text) => updateFormData('pricePerSeat', text)}
            placeholder="15.00"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Nombre de places disponibles *</Text>
        <View style={styles.seatsSelector}>
          <TouchableOpacity
            onPress={() =>
              updateFormData('seatsAvailable', Math.max(1, formData.seatsAvailable - 1))
            }
            style={styles.seatButton}
          >
            <MaterialIcons name="remove" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.seatsCount}>{formData.seatsAvailable}</Text>
          <TouchableOpacity
            onPress={() =>
              updateFormData('seatsAvailable', Math.min(8, formData.seatsAvailable + 1))
            }
            style={styles.seatButton}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoBox}>
        <MaterialIcons name="lightbulb" size={20} color="#f59e0b" />
        <Text style={styles.infoText}>
          Prix recommandé: 10-20€ par 100km
        </Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.stepIcon}>
          <MaterialIcons name="directions-car" size={32} color="#fff" />
        </LinearGradient>
        <Text style={styles.stepTitle}>Véhicule et équipements</Text>
        <Text style={styles.stepDescription}>Informations optionnelles</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Modèle du véhicule</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleModel}
          onChangeText={(text) => updateFormData('vehicleModel', text)}
          placeholder="Ex: Renault Clio"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Année</Text>
        <TextInput
          style={styles.input}
          value={formData.vehicleYear}
          onChangeText={(text) => updateFormData('vehicleYear', text)}
          placeholder="2020"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Équipements disponibles</Text>
        <View style={styles.amenitiesGrid}>
          {AMENITIES_OPTIONS.map((amenity) => (
            <TouchableOpacity
              key={amenity.id}
              onPress={() => toggleAmenity(amenity.id)}
              style={[
                styles.amenityChip,
                formData.amenities.includes(amenity.id) && styles.amenityChipActive,
              ]}
            >
              <MaterialIcons
                name={amenity.icon as any}
                size={20}
                color={formData.amenities.includes(amenity.id) ? '#06b6d4' : '#64748b'}
              />
              <Text
                style={[
                  styles.amenityLabel,
                  formData.amenities.includes(amenity.id) && styles.amenityLabelActive,
                ]}
              >
                {amenity.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.gradient}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepIndicator()}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <View style={styles.actions}>
            {currentStep > 1 && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={20} color="#94a3b8" />
                <Text style={styles.backButtonText}>Retour</Text>
              </TouchableOpacity>
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={handleNext}
                style={styles.nextButton}
                disabled={!validateStep(currentStep)}
              >
                <LinearGradient
                  colors={validateStep(currentStep) ? ['#06b6d4', '#0891b2'] : ['#475569', '#334155']}
                  style={styles.nextButtonGradient}
                >
                  <Text style={styles.nextButtonText}>Suivant</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handlePublish}
                style={styles.publishButton}
                disabled={loading}
              >
                <LinearGradient colors={['#10b981', '#059669']} style={styles.publishButtonGradient}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.publishButtonText}>Publier le trajet</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#06b6d4',
  },
  stepNumber: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#334155',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#06b6d4',
  },
  stepContent: {
    marginBottom: 32,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    color: '#f1f5f9',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  stepDescription: {
    color: '#94a3b8',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },
  datePickerText: {
    color: '#f1f5f9',
    fontSize: 16,
    flex: 1,
  },
  seatsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
  },
  seatButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatsCount: {
    color: '#f1f5f9',
    fontSize: 32,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  amenityChipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: '#06b6d4',
  },
  amenityLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  amenityLabelActive: {
    color: '#06b6d4',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    marginTop: 16,
  },
  infoText: {
    color: '#06b6d4',
    fontSize: 14,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  publishButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  publishButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default CovoituragePublish;
