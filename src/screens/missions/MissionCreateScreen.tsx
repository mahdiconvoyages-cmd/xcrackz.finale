import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../hooks/useCredits';
import { supabase } from '../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import VehicleImageUpload from '../../components/VehicleImageUpload';
import BuyCreditModal from '../../components/BuyCreditModal';

const TOTAL_STEPS = 4;

export default function MissionCreateScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { credits, deductCredits, hasEnoughCredits, refreshCredits } = useCredits();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDeliveryPicker, setShowDeliveryPicker] = useState(false);
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);

  const [formData, setFormData] = useState({
    reference: `MISSION-${Date.now()}`,
    // Step 1: Véhicule
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_type: 'VL' as 'VL' | 'VU' | 'PL',
    vehicle_plate: '',
    vehicle_vin: '',
    vehicle_image_url: '',
    // Step 2: Enlèvement
    pickup_address: '',
    pickup_lat: null as number | null,
    pickup_lng: null as number | null,
    pickup_date: new Date(),
    pickup_contact_name: '',
    pickup_contact_phone: '',
    // Step 3: Livraison
    delivery_address: '',
    delivery_lat: null as number | null,
    delivery_lng: null as number | null,
    delivery_date: new Date(),
    delivery_contact_name: '',
    delivery_contact_phone: '',
    // Step 4: Notes
    notes: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.vehicle_brand.trim() !== '' && formData.vehicle_model.trim() !== '';
      case 2:
        return formData.pickup_address.trim() !== '';
      case 3:
        return formData.delivery_address.trim() !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceedToNextStep()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Vérification crédits/abonnement...');
      console.log('💰 Crédits actuels:', credits);
      
      // 1. Vérifier si l'utilisateur a un abonnement actif OU des crédits
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('status, plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.error('❌ Erreur vérification abonnement:', subError);
      }

  // Abonnement actif uniquement si plan payant reconnu
  const paidPlans = ['basic', 'pro', 'business', 'enterprise'];
  const hasActiveSubscription = !!(subscription && subscription.status === 'active' && paidPlans.includes((subscription as any).plan));
      console.log('📊 Abonnement actif:', hasActiveSubscription, subscription);

      // Si pas d'abonnement actif, vérifier les crédits
      if (!hasActiveSubscription) {
        console.log('⚠️ Pas d\'abonnement actif, vérification des crédits...');
        
        if (!hasEnoughCredits(1)) {
          console.log('❌ Crédits insuffisants:', credits);
          setLoading(false);
          Alert.alert(
            '❌ Accès limité',
            `Vous avez besoin d'un abonnement actif ou d'au moins 1 crédit pour créer une mission.\n\nCrédits actuels: ${credits}`,
            [
              { text: 'Acheter des crédits', onPress: () => setShowBuyCreditModal(true) },
              { text: 'Annuler', style: 'cancel' }
            ]
          );
          return;
        }

        console.log('✅ Crédits suffisants, déduction de 1 crédit...');
        
        // Déduire 1 crédit si pas d'abonnement
  const deductResult = await deductCredits(1, `Création de mission ${formData.reference}`);
        
        if (!deductResult.success) {
          console.error('❌ Échec déduction crédits:', deductResult.error);
          Alert.alert('Crédits insuffisants', deductResult.error || 'Impossible de déduire les crédits');
          setShowBuyCreditModal(true);
          setLoading(false);
          return;
        }
        
        console.log('✅ Crédit déduit avec succès');
      } else {
        console.log('✅ Abonnement actif, pas de déduction de crédits');
      }

      // 2. Générer un code de partage unique
      const generateShareCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 9; i++) {
          if (i === 2 || i === 5) code += '-';
          else code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code; // Format: XX-XXX-XXX
      };

      // 3. Créer la mission
      const { data, error } = await supabase
        .from('missions')
        .insert({
          reference: formData.reference,
          user_id: user.id,
          share_code: generateShareCode(),
          status: 'pending',
          // Véhicule
          vehicle_brand: formData.vehicle_brand,
          vehicle_model: formData.vehicle_model,
          vehicle_type: formData.vehicle_type,
          vehicle_plate: formData.vehicle_plate || null,
          vehicle_vin: formData.vehicle_vin || null,
          vehicle_image_url: formData.vehicle_image_url || null,
          // Enlèvement
          pickup_address: formData.pickup_address,
          pickup_lat: formData.pickup_lat,
          pickup_lng: formData.pickup_lng,
          pickup_date: formData.pickup_date.toISOString(),
          pickup_contact_name: formData.pickup_contact_name || null,
          pickup_contact_phone: formData.pickup_contact_phone || null,
          // Livraison
          delivery_address: formData.delivery_address,
          delivery_lat: formData.delivery_lat,
          delivery_lng: formData.delivery_lng,
          delivery_date: formData.delivery_date.toISOString(),
          delivery_contact_name: formData.delivery_contact_name || null,
          delivery_contact_phone: formData.delivery_contact_phone || null,
          // Notes
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const successMessage = hasActiveSubscription
        ? `Mission ${formData.reference} créée avec succès\n\n✨ Abonnement ${subscription?.plan || 'actif'}`
        : `Mission ${formData.reference} créée avec succès\n\n💳 -1 crédit (Solde: ${credits - 1})`;

      Alert.alert(
        '✅ Mission créée',
        successMessage,
        [
          {
            text: 'Voir la mission',
            onPress: () => navigation.replace('MissionView', { missionId: data.id }),
          },
          {
            text: 'Retour',
            onPress: () => navigation.goBack(),
          },
        ]
      );

      // Rafraîchir les crédits après création (utile si déduits)
      try {
        if (!hasActiveSubscription && typeof refreshCredits === 'function') {
          await refreshCredits();
        }
      } catch (e) {
        console.log('ℹ️ refreshCredits post-mission: ignoré', e);
      }
    } catch (error: any) {
      console.error('Erreur création mission:', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer la mission');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor: step <= currentStep ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                { color: step <= currentStep ? '#fff' : colors.textSecondary },
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor: step < currentStep ? colors.primary : colors.border,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        🚗 Informations du véhicule
      </Text>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Référence</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          value={formData.reference}
          onChangeText={(text) => updateField('reference', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Marque du véhicule *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="BMW, Mercedes, etc."
          placeholderTextColor={colors.textSecondary}
          value={formData.vehicle_brand}
          onChangeText={(text) => updateField('vehicle_brand', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Modèle du véhicule *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Série 3, Classe A, etc."
          placeholderTextColor={colors.textSecondary}
          value={formData.vehicle_model}
          onChangeText={(text) => updateField('vehicle_model', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Type de véhicule *</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Picker
            selectedValue={formData.vehicle_type}
            onValueChange={(value) => updateField('vehicle_type', value)}
            style={{ color: colors.text }}
          >
            <Picker.Item label="🚗 Véhicule Léger (VL)" value="VL" />
            <Picker.Item label="🚐 Véhicule Utilitaire (VU)" value="VU" />
            <Picker.Item label="🚛 Poids Lourd (PL)" value="PL" />
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Immatriculation</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="AB-123-CD"
          placeholderTextColor={colors.textSecondary}
          value={formData.vehicle_plate}
          onChangeText={(text) => updateField('vehicle_plate', text.toUpperCase())}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Numéro de série (VIN)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="17 caractères"
          placeholderTextColor={colors.textSecondary}
          value={formData.vehicle_vin}
          onChangeText={(text) => updateField('vehicle_vin', text.toUpperCase())}
          autoCapitalize="characters"
          maxLength={17}
        />
      </View>

      <VehicleImageUpload
        value={formData.vehicle_image_url}
        onImageUploaded={(url) => updateField('vehicle_image_url', url)}
        label="Photo du véhicule"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        📍 Point d'enlèvement
      </Text>

      <AddressAutocomplete
        value={formData.pickup_address}
        onSelect={(address, lat, lng) => {
          updateField('pickup_address', address);
          updateField('pickup_lat', lat);
          updateField('pickup_lng', lng);
        }}
        label="Adresse d'enlèvement *"
        placeholder="Rechercher une adresse..."
      />

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Date d'enlèvement</Text>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPickupPicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formData.pickup_date.toLocaleDateString('fr-FR')} {formData.pickup_date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showPickupPicker && (
          <DateTimePicker
            value={formData.pickup_date}
            mode="datetime"
            display={Platform.OS === 'android' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              // Fermer sur Android dans tous les cas
              if (Platform.OS === 'android') {
                setShowPickupPicker(false);
              }
              
              // Mettre à jour seulement si l'utilisateur a validé (pas dismissed)
              if (event.type === 'set' && selectedDate) {
                updateField('pickup_date', selectedDate);
              }
              
              // Sur iOS, garder ouvert pour permettre les modifications
              if (Platform.OS === 'ios' && event.type === 'set' && selectedDate) {
                updateField('pickup_date', selectedDate);
              }
            }}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Contact</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Nom du contact"
          placeholderTextColor={colors.textSecondary}
          value={formData.pickup_contact_name}
          onChangeText={(text) => updateField('pickup_contact_name', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Téléphone</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="+33 6 12 34 56 78"
          placeholderTextColor={colors.textSecondary}
          value={formData.pickup_contact_phone}
          onChangeText={(text) => updateField('pickup_contact_phone', text)}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        🎯 Point de livraison
      </Text>

      <AddressAutocomplete
        value={formData.delivery_address}
        onSelect={(address, lat, lng) => {
          updateField('delivery_address', address);
          updateField('delivery_lat', lat);
          updateField('delivery_lng', lng);
        }}
        label="Adresse de livraison *"
        placeholder="Rechercher une adresse..."
      />

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Date de livraison</Text>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowDeliveryPicker(true)}
        >
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={[styles.dateText, { color: colors.text }]}>
            {formData.delivery_date.toLocaleDateString('fr-FR')} {formData.delivery_date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showDeliveryPicker && (
          <DateTimePicker
            value={formData.delivery_date}
            mode="datetime"
            display={Platform.OS === 'android' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              // Fermer sur Android dans tous les cas
              if (Platform.OS === 'android') {
                setShowDeliveryPicker(false);
              }
              
              // Mettre à jour seulement si l'utilisateur a validé (pas dismissed)
              if (event.type === 'set' && selectedDate) {
                updateField('delivery_date', selectedDate);
              }
              
              // Sur iOS, garder ouvert pour permettre les modifications
              if (Platform.OS === 'ios' && event.type === 'set' && selectedDate) {
                updateField('delivery_date', selectedDate);
              }
            }}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Contact</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Nom du contact"
          placeholderTextColor={colors.textSecondary}
          value={formData.delivery_contact_name}
          onChangeText={(text) => updateField('delivery_contact_name', text)}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Téléphone</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="+33 6 12 34 56 78"
          placeholderTextColor={colors.textSecondary}
          value={formData.delivery_contact_phone}
          onChangeText={(text) => updateField('delivery_contact_phone', text)}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>
        📋 Récapitulatif
      </Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summarySection, { color: colors.text }]}>🚗 Véhicule</Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {formData.vehicle_brand} {formData.vehicle_model} ({formData.vehicle_type})
        </Text>
        {formData.vehicle_plate && (
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
            Immatriculation: {formData.vehicle_plate}
          </Text>
        )}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summarySection, { color: colors.text }]}>📍 Enlèvement</Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {formData.pickup_address}
        </Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {formData.pickup_date.toLocaleDateString('fr-FR')} à {formData.pickup_date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summarySection, { color: colors.text }]}>🎯 Livraison</Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {formData.delivery_address}
        </Text>
        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
          {formData.delivery_date.toLocaleDateString('fr-FR')} à {formData.delivery_date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Notes supplémentaires</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder="Instructions spéciales, remarques..."
          placeholderTextColor={colors.textSecondary}
          value={formData.notes}
          onChangeText={(text) => updateField('notes', text)}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Nouvelle Mission
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView 
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={false}
      >
        {renderCurrentStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handlePrevious}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.navButtonText, { color: colors.text }]}>Précédent</Text>
          </TouchableOpacity>
        )}

        {currentStep < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              { backgroundColor: canProceedToNextStep() ? colors.primary : colors.border },
            ]}
            onPress={handleNext}
            disabled={!canProceedToNextStep()}
          >
            <Text style={[styles.navButtonText, { color: '#fff' }]}>Suivant</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.submitButton, { backgroundColor: colors.success }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={[styles.navButtonText, { color: '#fff' }]}>Créer la mission</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Modal Achat Crédits */}
      <BuyCreditModal
        visible={showBuyCreditModal}
        onClose={() => setShowBuyCreditModal(false)}
        currentCredits={credits}
        requiredCredits={1}
        action="créer une mission"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContent: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summarySection: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  nextButton: {
    borderWidth: 0,
  },
  submitButton: {
    borderWidth: 0,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
