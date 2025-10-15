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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { createMission, uploadVehicleImage } from '../services/missionService';
import { supabase } from '../config/supabase';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ModernDateTimePicker from '../components/DateTimePicker';

export default function MissionCreateScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    reference: `MISSION-${Date.now()}`,
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_plate: '',
    vehicle_vin: '',
    vehicle_image: null as any,
    pickup_address: '',
    pickup_lat: null as number | null,
    pickup_lng: null as number | null,
    pickup_date: '',
    pickup_time: '',
    pickup_contact_name: '',
    pickup_contact_phone: '',
    delivery_address: '',
    delivery_lat: null as number | null,
    delivery_lng: null as number | null,
    delivery_date: '',
    delivery_time: '',
    delivery_contact_name: '',
    delivery_contact_phone: '',
    price: '',
    notes: '',
  });

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData((prev) => ({ ...prev, vehicle_image: result.assets[0] }));
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.vehicle_brand && formData.vehicle_model;
      case 2:
        return formData.pickup_address && formData.pickup_date;
      case 3:
        return formData.delivery_address && formData.delivery_date;
      case 4:
        return formData.price;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps && canProceedToNextStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    if (!canProceedToNextStep()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      let vehicleImageUrl = '';
      if (formData.vehicle_image) {
        const tempMissionId = `temp-${Date.now()}`;
        const uploadedUrl = await uploadVehicleImage(
          formData.vehicle_image,
          tempMissionId
        );
        if (uploadedUrl) {
          vehicleImageUrl = uploadedUrl;
        }
      }

      const pickupDateTime = formData.pickup_time
        ? `${formData.pickup_date}T${formData.pickup_time}:00`
        : `${formData.pickup_date}T12:00:00`;

      const deliveryDateTime = formData.delivery_time
        ? `${formData.delivery_date}T${formData.delivery_time}:00`
        : `${formData.delivery_date}T12:00:00`;

      const mission = await createMission({
        reference: formData.reference,
        user_id: userId,
        vehicle_brand: formData.vehicle_brand,
        vehicle_model: formData.vehicle_model,
        vehicle_plate: formData.vehicle_plate || undefined,
        vehicle_vin: formData.vehicle_vin || undefined,
        vehicle_image_url: vehicleImageUrl || undefined,
        pickup_address: formData.pickup_address,
        pickup_lat: formData.pickup_lat || undefined,
        pickup_lng: formData.pickup_lng || undefined,
        pickup_date: pickupDateTime,
        delivery_address: formData.delivery_address,
        delivery_lat: formData.delivery_lat || undefined,
        delivery_lng: formData.delivery_lng || undefined,
        delivery_date: deliveryDateTime,
        price: parseFloat(formData.price),
        notes: formData.notes || undefined,
        status: 'pending',
      });

      if (mission) {
        Alert.alert('Succès', 'Mission créée avec succès', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Error creating mission:', error);
      const errorMessage = error?.message || 'Impossible de créer la mission';

      if (errorMessage.includes('Crédits insuffisants')) {
        Alert.alert(
          'Crédits insuffisants',
          'Vous avez besoin de 1 crédit pour créer une mission. Rechargez votre compte dans la boutique.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Recharger', onPress: () => navigation.navigate('Profile' as never) }
          ]
        );
      } else {
        Alert.alert('Erreur', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Informations du véhicule</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Marque <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Renault"
                value={formData.vehicle_brand}
                onChangeText={(value) => handleChange('vehicle_brand', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Modèle <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Clio"
                value={formData.vehicle_model}
                onChangeText={(value) => handleChange('vehicle_model', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Immatriculation</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: AB-123-CD"
                value={formData.vehicle_plate}
                onChangeText={(value) => handleChange('vehicle_plate', value)}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>VIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Numéro de série du véhicule"
                value={formData.vehicle_vin}
                onChangeText={(value) => handleChange('vehicle_vin', value)}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Feather name="camera" size={24} color="#14b8a6" />
              <Text style={styles.imagePickerText}>
                {formData.vehicle_image ? 'Photo ajoutée' : 'Ajouter une photo'}
              </Text>
              {formData.vehicle_image && (
                <Feather name="check-circle" size={20} color="#10b981" />
              )}
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Lieu de départ</Text>

            <AddressAutocomplete
              value={formData.pickup_address}
              onChange={(address, lat, lng) => {
                setFormData((prev) => ({
                  ...prev,
                  pickup_address: address,
                  pickup_lat: lat || null,
                  pickup_lng: lng || null,
                }));
              }}
              label="Adresse"
              placeholder="Rechercher une adresse..."
              required
            />

            <ModernDateTimePicker
              label="Date et heure de collecte"
              date={formData.pickup_date}
              time={formData.pickup_time}
              onDateChange={(value) => handleChange('pickup_date', value)}
              onTimeChange={(value) => handleChange('pickup_time', value)}
              required
              minDate={new Date()}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du contact"
                value={formData.pickup_contact_name}
                onChangeText={(value) =>
                  handleChange('pickup_contact_name', value)
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="+33 6 12 34 56 78"
                value={formData.pickup_contact_phone}
                onChangeText={(value) =>
                  handleChange('pickup_contact_phone', value)
                }
                keyboardType="phone-pad"
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Lieu de livraison</Text>

            <AddressAutocomplete
              value={formData.delivery_address}
              onChange={(address, lat, lng) => {
                setFormData((prev) => ({
                  ...prev,
                  delivery_address: address,
                  delivery_lat: lat || null,
                  delivery_lng: lng || null,
                }));
              }}
              label="Adresse"
              placeholder="Rechercher une adresse..."
              required
            />

            <ModernDateTimePicker
              label="Date et heure de livraison"
              date={formData.delivery_date}
              time={formData.delivery_time}
              onDateChange={(value) => handleChange('delivery_date', value)}
              onTimeChange={(value) => handleChange('delivery_time', value)}
              required
              minDate={new Date()}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du contact"
                value={formData.delivery_contact_name}
                onChangeText={(value) =>
                  handleChange('delivery_contact_name', value)
                }
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="+33 6 12 34 56 78"
                value={formData.delivery_contact_phone}
                onChangeText={(value) =>
                  handleChange('delivery_contact_phone', value)
                }
                keyboardType="phone-pad"
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tarification et notes</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Prix HT <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={formData.price}
                onChangeText={(value) => handleChange('price', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Informations complémentaires..."
                value={formData.notes}
                onChangeText={(value) => handleChange('notes', value)}
                multiline
                numberOfLines={5}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="x" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle mission</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentStep / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Étape {currentStep} sur {totalSteps}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handlePrevious}
              >
                <Feather name="chevron-left" size={20} color="#64748b" />
                <Text style={styles.buttonSecondaryText}>Précédent</Text>
              </TouchableOpacity>
            )}

            {currentStep < totalSteps ? (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  !canProceedToNextStep() && styles.buttonDisabled,
                ]}
                onPress={handleNext}
                disabled={!canProceedToNextStep()}
              >
                <LinearGradient
                  colors={
                    canProceedToNextStep()
                      ? ['#14b8a6', '#0d9488']
                      : ['#cbd5e1', '#94a3b8']
                  }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonPrimaryText}>Suivant</Text>
                  <Feather name="chevron-right" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  (!canProceedToNextStep() || loading) && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canProceedToNextStep() || loading}
              >
                <LinearGradient
                  colors={
                    canProceedToNextStep() && !loading
                      ? ['#14b8a6', '#0d9488']
                      : ['#cbd5e1', '#94a3b8']
                  }
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="check" size={20} color="#fff" />
                      <Text style={styles.buttonPrimaryText}>Créer</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
  },
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14b8a6',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
  },
  buttonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  buttonPrimary: {
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  buttonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
