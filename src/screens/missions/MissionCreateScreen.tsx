import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Routes } from '../../navigation/Routes';
import type { MissionStackParamList } from '../../types/navigation';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCredits } from '../../hooks/useCredits';
import { supabase } from '../../lib/supabase';
import VehicleImageUpload from '../../components/VehicleImageUpload';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import BuyCreditModal from '../../components/BuyCreditModal';
import HeaderGradient from '../../components/ui/HeaderGradient';
import CardGradient from '../../components/ui/CardGradient';
import { offlineSyncService } from '../../services/offlineSyncService';

type MissionCreateNavigation = NativeStackNavigationProp<MissionStackParamList, 'MissionCreate'>;

interface MissionCreateScreenProps {
  navigation: MissionCreateNavigation;
}

type VehicleType = 'VL' | 'VU' | 'PL';

interface FormData {
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_type: VehicleType;
  vehicle_plate: string;
  vehicle_vin: string;
  vehicle_image_url: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_date: Date | null;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_date: Date | null;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  notes: string;
}

type StepKey = 'vehicle' | 'pickup' | 'delivery' | 'details' | 'summary';

interface StepDescriptor {
  key: StepKey;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const steps: StepDescriptor[] = [
  { key: 'vehicle', title: 'Véhicule', description: 'Identification et visuel', icon: 'car-sport' },
  { key: 'pickup', title: 'Départ', description: 'Adresse et contact départ', icon: 'navigate' },
  { key: 'delivery', title: 'Arrivée', description: 'Destination & contact', icon: 'flag' },
  { key: 'details', title: 'Notes', description: 'Informations complémentaires', icon: 'create' },
  { key: 'summary', title: 'Récapitulatif', description: 'Contrôle avant création', icon: 'document-text' },
];

const PAID_PLANS = ['basic', 'pro', 'business', 'enterprise'];

const formatDateTimeRaw = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDateTimeHuman = (value: Date | null): string => {
  if (!value) {
    return 'Choisir une date';
  }
  return value.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (nextValue: Date) => void;
  minimumDate?: Date;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({ label, value, onChange, minimumDate }) => {
  const { colors } = useTheme();
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [showAndroidDatePicker, setShowAndroidDatePicker] = useState(false);
  const [showAndroidTimePicker, setShowAndroidTimePicker] = useState(false);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      setShowAndroidDatePicker(true);
    } else {
      setShowIosPicker(true);
    }
  };

  const applyDatePart = (base: Date, datePart: Date) => {
    const updated = new Date(base);
    updated.setFullYear(datePart.getFullYear(), datePart.getMonth(), datePart.getDate());
    return updated;
  };

  const applyTimePart = (base: Date, timePart: Date) => {
    const updated = new Date(base);
    updated.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
    return updated;
  };

  const handleAndroidDate = (_event: any, selectedDate?: Date) => {
    setShowAndroidDatePicker(false);
    if (!_event || _event.type === 'dismissed') {
      return;
    }
    const current = value ?? new Date();
    const nextDate = applyDatePart(current, selectedDate ?? new Date());
    onChange(nextDate);
    setTimeout(() => setShowAndroidTimePicker(true), 80);
  };

  const handleAndroidTime = (_event: any, selectedDate?: Date) => {
    setShowAndroidTimePicker(false);
    if (!_event || _event.type === 'dismissed') {
      return;
    }
    const current = value ?? new Date();
    const nextDate = applyTimePart(current, selectedDate ?? new Date());
    onChange(nextDate);
  };

  const handleIosChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const closeIosPicker = () => setShowIosPicker(false);

  return (
    <View style={styles.datetimeContainer}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={openPicker}
        style={[styles.datetimeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
        <Text style={[styles.datetimeValue, { color: value ? colors.text : colors.textSecondary }]}> 
          {formatDateTimeHuman(value)}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {Platform.OS === 'android' && showAndroidDatePicker && (
        <DateTimePicker
          value={value ?? new Date()}
          onChange={handleAndroidDate}
          minimumDate={minimumDate}
          mode="date"
          display="calendar"
        />
      )}

      {Platform.OS === 'android' && showAndroidTimePicker && (
        <DateTimePicker value={value ?? new Date()} onChange={handleAndroidTime} mode="time" display="spinner" />
      )}

      {Platform.OS === 'ios' && showIosPicker && (
        <View style={[styles.iosPickerSheet, { borderColor: colors.border, backgroundColor: colors.card }]}> 
          <DateTimePicker
            value={value ?? new Date()}
            onChange={handleIosChange}
            minimumDate={minimumDate}
            mode="datetime"
            display="inline"
          />
          <TouchableOpacity style={styles.iosPickerClose} onPress={closeIosPicker}>
            <Text style={styles.iosPickerCloseText}>Terminer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
interface CreatedMissionSummary {
  id: string;
  reference: string;
  share_code?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  pickup_address?: string;
  delivery_address?: string;
}

export default function MissionCreateScreen({ navigation }: MissionCreateScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { credits, hasEnoughCredits, deductCredits, refreshCredits } = useCredits();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [createdMission, setCreatedMission] = useState<CreatedMissionSummary | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{ status: string | null; plan: string | null } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    reference: `MISSION-${Date.now()}`,
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_type: 'VL',
    vehicle_plate: '',
    vehicle_vin: '',
    vehicle_image_url: '',
    pickup_address: '',
    pickup_lat: null,
    pickup_lng: null,
    pickup_date: null,
    pickup_contact_name: '',
    pickup_contact_phone: '',
    delivery_address: '',
    delivery_lat: null,
    delivery_lng: null,
    delivery_date: null,
    delivery_contact_name: '',
    delivery_contact_phone: '',
    notes: '',
  });

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = useMemo(() => {
    switch (currentStep.key) {
      case 'vehicle':
        return formData.vehicle_brand.trim() !== '' && formData.vehicle_model.trim() !== '';
      case 'pickup':
        return formData.pickup_address.trim() !== '';
      case 'delivery':
        return formData.delivery_address.trim() !== '';
      case 'details':
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [currentStep.key, formData]);

  const goNext = () => {
    if (currentStepIndex >= totalSteps - 1) {
      return;
    }
    if (!canProceed) {
      setAttemptedNext(true);
      Alert.alert('Champs requis', 'Veuillez compléter les informations obligatoires avant de continuer.');
      return;
    }
    setAttemptedNext(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const goPrevious = () => {
    if (currentStepIndex === 0) {
      navigation.goBack();
      return;
    }
    setAttemptedNext(false);
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleCreateMission = async () => {
    if (loading) {
      return;
    }

    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour créer une mission.');
      return;
    }

    setAttemptedNext(true);
    if (!canProceed) {
      Alert.alert('Champs requis', 'Merci de vérifier les informations avant de créer la mission.');
      return;
    }

    setLoading(true);

    const status = offlineSyncService.getStatus();
    const isOnline = status.isOnline !== false;
  let resolvedSubscription: any = subscriptionInfo;
  let insertPayload: Record<string, any> | null = null;

    try {
      if (isOnline) {
        const { data: subscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('status, plan')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (subscriptionError) {
          console.error('Erreur abonnement:', subscriptionError);
        } else if (subscription) {
          resolvedSubscription = subscription;
          setSubscriptionInfo({
            status: (subscription as any).status ?? null,
            plan: (subscription as any).plan ?? null,
          });
        }
      }

      const hasActiveSubscription =
        resolvedSubscription &&
        (resolvedSubscription as any).status === 'active' &&
        PAID_PLANS.includes((resolvedSubscription as any).plan);

      if (!hasActiveSubscription) {
        if (!hasEnoughCredits(1)) {
          setShowBuyCreditModal(true);
          Alert.alert(
            'Crédits insuffisants',
            `Vous avez besoin d'un abonnement actif ou d'au moins 1 crédit pour créer une mission.\n\nCrédits actuels: ${credits}`
          );
          return;
        }

        const deduction = await deductCredits(1, `Création de mission ${formData.reference}`);
        if (!deduction.success) {
          setShowBuyCreditModal(true);
          Alert.alert('Crédits', deduction.error || 'Impossible de déduire les crédits.');
          return;
        }

        if (isOnline) {
          try {
            await refreshCredits();
          } catch (refreshError) {
            console.log('refreshCredits (création mission):', refreshError);
          }
        }
      }

      insertPayload = {
        reference: formData.reference,
        user_id: user.id,
        status: 'pending',
        vehicle_brand: formData.vehicle_brand,
        vehicle_model: formData.vehicle_model,
        vehicle_type: formData.vehicle_type,
        vehicle_plate: formData.vehicle_plate || null,
        vehicle_vin: formData.vehicle_vin || null,
        vehicle_image_url: formData.vehicle_image_url || null,
        pickup_address: formData.pickup_address,
        pickup_lat: formData.pickup_lat,
        pickup_lng: formData.pickup_lng,
        pickup_date: formatDateTimeRaw(formData.pickup_date),
        pickup_contact_name: formData.pickup_contact_name || null,
        pickup_contact_phone: formData.pickup_contact_phone || null,
        delivery_address: formData.delivery_address,
        delivery_lat: formData.delivery_lat,
        delivery_lng: formData.delivery_lng,
        delivery_date: formatDateTimeRaw(formData.delivery_date),
        delivery_contact_name: formData.delivery_contact_name || null,
        delivery_contact_phone: formData.delivery_contact_phone || null,
        notes: formData.notes || null,
      };

      if (!isOnline) {
        await offlineSyncService.addToQueue('create', 'missions', insertPayload);
        setCreatedMission(null);
        Alert.alert(
          'Mission enregistrée hors ligne',
          hasActiveSubscription
            ? `La mission ${formData.reference} sera synchronisée dès le retour de la connexion.`
            : `La mission ${formData.reference} sera synchronisée et 1 crédit sera déduit à la reconnexion.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      const { data, error } = await supabase.from('missions').insert(insertPayload).select().single();

      if (error) {
        throw error;
      }

      const created = data as CreatedMissionSummary;
      setCreatedMission(created);

      Alert.alert(
        'Mission créée',
        hasActiveSubscription
          ? `Mission ${formData.reference} créée avec succès.`
          : `Mission ${formData.reference} créée.\n\nDébit: -1 crédit (solde: ${Math.max(credits - 1, 0)})`,
        [
          {
            text: 'Partager',
            onPress: () => navigation.replace('ShareMission', { mission: created }),
            onPress: () => navigation.replace(Routes.ShareMission as any, { mission: created }),
          },
          {
            text: 'Voir la mission',
            onPress: () => navigation.replace('MissionView', { missionId: created.id }),
          },
          { text: 'Fermer', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      console.error('Erreur création mission:', error);
      const message = error?.message?.toLowerCase?.() || '';

      if (insertPayload && (message.includes('fetch') || message.includes('network') || message.includes('timeout'))) {
        await offlineSyncService.addToQueue('create', 'missions', insertPayload);
        setCreatedMission(null);
        Alert.alert(
          'Mission sauvegardée',
          'Connexion instable détectée. La mission sera synchronisée automatiquement dès que possible.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      Alert.alert('Erreur', error?.message || 'Impossible de créer la mission.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareCreatedMission = () => {
    if (!createdMission) {
      return;
    }
    navigation.replace(Routes.ShareMission as any, { mission: createdMission });
  };

  const handleViewCreatedMission = () => {
    if (!createdMission) {
      return;
    }
  navigation.replace('MissionView', { missionId: createdMission.id });
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => {
        const active = index === currentStepIndex;
        const completed = index < currentStepIndex;
        return (
          <View key={step.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: active || completed ? colors.primary : colors.surface,
                  borderColor: active || completed ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={step.icon}
                size={18}
                color={active || completed ? '#0b1222' : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.stepTitleLabel,
                { color: active || completed ? colors.primary : colors.textSecondary },
              ]}
            >
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: completed ? colors.primary : colors.border },
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );

  const renderVehicleStep = () => (
    <CardGradient>
      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text }]}>Référence</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={formData.reference}
          onChangeText={(text) => updateField('reference', text)}
          placeholder="MISSION-169512345"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text }]}>Marque du véhicule *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={formData.vehicle_brand}
          onChangeText={(text) => updateField('vehicle_brand', text)}
          placeholder="BMW, Mercedes, Renault..."
          placeholderTextColor={colors.textSecondary}
        />
        {attemptedNext && currentStep.key === 'vehicle' && !formData.vehicle_brand.trim() && (
          <Text style={styles.helperError}>Champ obligatoire</Text>
        )}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text }]}>Modèle du véhicule *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={formData.vehicle_model}
          onChangeText={(text) => updateField('vehicle_model', text)}
          placeholder="Série 3, Classe A, etc."
          placeholderTextColor={colors.textSecondary}
        />
        {attemptedNext && currentStep.key === 'vehicle' && !formData.vehicle_model.trim() && (
          <Text style={styles.helperError}>Champ obligatoire</Text>
        )}
      </View>

      <View style={styles.segmentGroup}>
        {(
          [
            { key: 'VL', label: 'VL', icon: 'car' },
            { key: 'VU', label: 'VU', icon: 'cube' },
            { key: 'PL', label: 'PL', icon: 'bus' },
          ] as const
        ).map((option) => {
          const isActive = formData.vehicle_type === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.segmentItem,
                {
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => updateField('vehicle_type', option.key)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={isActive ? '#0b1222' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: isActive ? '#0b1222' : colors.text, fontWeight: '600' }}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.duoRow}>
        <View style={[styles.fieldBlock, styles.duoItem]}>
          <Text style={[styles.label, { color: colors.text }]}>Immatriculation</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={formData.vehicle_plate}
            onChangeText={(text) => updateField('vehicle_plate', text)}
            placeholder="AB-123-CD"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
          />
        </View>
        <View style={[styles.fieldBlock, styles.duoItem]}>
          <Text style={[styles.label, { color: colors.text }]}>VIN</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={formData.vehicle_vin}
            onChangeText={(text) => updateField('vehicle_vin', text)}
            placeholder="Numéro de série"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <VehicleImageUpload
        label="Photo du véhicule"
        value={formData.vehicle_image_url || null}
        onImageUploaded={(url) => updateField('vehicle_image_url', url)}
      />
    </CardGradient>
  );

  const renderPickupStep = () => (
    <CardGradient>
      <View style={styles.fieldBlock}>
        <AddressAutocomplete
          value={formData.pickup_address}
          onSelect={(address, lat, lng) => {
            updateField('pickup_address', address);
            updateField('pickup_lat', Number.isFinite(lat) ? lat : null);
            updateField('pickup_lng', Number.isFinite(lng) ? lng : null);
          }}
          label="Adresse de départ *"
          placeholder="Rechercher une adresse..."
        />
        {attemptedNext && currentStep.key === 'pickup' && !formData.pickup_address.trim() && (
          <Text style={styles.helperError}>Adresse obligatoire</Text>
        )}
      </View>

      <DateTimeField
        label="Date et heure de départ"
        value={formData.pickup_date}
        onChange={(next) => updateField('pickup_date', next)}
        minimumDate={new Date()}
      />

      <View style={styles.duoRow}>
        <View style={[styles.fieldBlock, styles.duoItem]}>
          <Text style={[styles.label, { color: colors.text }]}>Contact départ</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={formData.pickup_contact_name}
            onChangeText={(text) => updateField('pickup_contact_name', text)}
            placeholder="Nom du contact"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={[styles.fieldBlock, styles.duoItem]}>
          <Text style={[styles.label, { color: colors.text }]}>Téléphone départ</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={formData.pickup_contact_phone}
            onChangeText={(text) => updateField('pickup_contact_phone', text)}
            placeholder="06 12 34 56 78"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </CardGradient>
  );

  const renderDeliveryStep = () => (
    <CardGradient>
      <View style={styles.fieldBlock}>
        <AddressAutocomplete
          value={formData.delivery_address}
          onSelect={(address, lat, lng) => {
            updateField('delivery_address', address);
            updateField('delivery_lat', Number.isFinite(lat) ? lat : null);
            updateField('delivery_lng', Number.isFinite(lng) ? lng : null);
          }}
          label="Adresse d'arrivée *"
          placeholder="Rechercher une adresse..."
        />
        {attemptedNext && currentStep.key === 'delivery' && !formData.delivery_address.trim() && (
          <Text style={styles.helperError}>Adresse obligatoire</Text>
        )}
      </View>

      <DateTimeField
        label="Date et heure d'arrivée"
        value={formData.delivery_date}
        onChange={(next) => updateField('delivery_date', next)}
        minimumDate={formData.pickup_date ?? new Date()}
      />

      <View style={styles.duoRow}>
        <View style={[styles.fieldBlock, styles.duoItem]}>
          <Text style={[styles.label, { color: colors.text }]}>Contact arrivée</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={formData.delivery_contact_name}
            onChangeText={(text) => updateField('delivery_contact_name', text)}
            placeholder="Nom du contact"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={[styles.fieldBlock, styles.duoItem]}>
          <Text style={[styles.label, { color: colors.text }]}>Téléphone arrivée</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={formData.delivery_contact_phone}
            onChangeText={(text) => updateField('delivery_contact_phone', text)}
            placeholder="06 98 76 54 32"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
          />
        </View>
      </View>
    </CardGradient>
  );

  const renderDetailsStep = () => (
    <CardGradient>
      <View style={styles.fieldBlock}>
        <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          ]}
          value={formData.notes}
          onChangeText={(text) => updateField('notes', text)}
          placeholder="Informations complémentaires..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
        />
      </View>
    </CardGradient>
  );

  const renderSummaryRow = (label: string, value?: string | null) => (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value && value.trim() ? value : '—'}</Text>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={{ gap: 16 }}>
      <CardGradient>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Véhicule</Text>
        {renderSummaryRow('Référence', formData.reference)}
        {renderSummaryRow('Véhicule', `${formData.vehicle_brand} ${formData.vehicle_model}`)}
        {renderSummaryRow('Type', formData.vehicle_type)}
        {renderSummaryRow('Immatriculation', formData.vehicle_plate)}
        {renderSummaryRow('VIN', formData.vehicle_vin)}
        {formData.vehicle_image_url ? (
          <View style={styles.summaryImageWrapper}>
            <Image source={{ uri: formData.vehicle_image_url }} style={styles.summaryImage} />
          </View>
        ) : null}
      </CardGradient>

      <CardGradient>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Départ</Text>
        {renderSummaryRow('Adresse', formData.pickup_address)}
        {renderSummaryRow('Date', formatDateTimeHuman(formData.pickup_date))}
        {renderSummaryRow('Contact', formData.pickup_contact_name)}
        {renderSummaryRow('Téléphone', formData.pickup_contact_phone)}
      </CardGradient>

      <CardGradient>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Arrivée</Text>
        {renderSummaryRow('Adresse', formData.delivery_address)}
        {renderSummaryRow('Date', formatDateTimeHuman(formData.delivery_date))}
        {renderSummaryRow('Contact', formData.delivery_contact_name)}
        {renderSummaryRow('Téléphone', formData.delivery_contact_phone)}
      </CardGradient>

      <CardGradient>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Notes</Text>
        <Text style={[styles.summaryNote, { color: colors.text }]}>
          {formData.notes.trim() ? formData.notes : 'Aucune note pour cette mission.'}
        </Text>
      </CardGradient>

      {createdMission && (
        <CardGradient style={{ borderColor: colors.primary }}>
          <View style={styles.successHeader}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={20} color="#0f172a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>Mission créée</Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>Référence {createdMission.reference}</Text>
            </View>
          </View>

          {createdMission.share_code ? (
            <View style={[styles.shareCodeBox, { borderColor: colors.border }]}> 
              <Text style={[styles.shareCodeLabel, { color: colors.textSecondary }]}>Code de partage</Text>
              <Text style={styles.shareCodeValue}>{createdMission.share_code}</Text>
            </View>
          ) : null}

          <View style={styles.successActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.primary }]}
              onPress={handleShareCreatedMission}
            >
              <Ionicons name="share-social" size={18} color={colors.primary} />
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButtonFilled} onPress={handleViewCreatedMission}>
              <Ionicons name="eye" size={18} color="#0b1222" />
              <Text style={styles.primaryButtonFilledText}>Voir</Text>
            </TouchableOpacity>
          </View>
        </CardGradient>
      )}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep.key) {
      case 'vehicle':
        return renderVehicleStep();
      case 'pickup':
        return renderPickupStep();
      case 'delivery':
        return renderDeliveryStep();
      case 'details':
        return renderDetailsStep();
      case 'summary':
        return renderSummaryStep();
      default:
        return null;
    }
  };

  const primaryButtonLabel = currentStep.key === 'summary' ? 'Créer la mission' : 'Suivant';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}> 
      <HeaderGradient title="Créer une mission" onBack={navigation.goBack} />
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      > 
        <View style={styles.content}>
          {renderStepIndicator()}
          <View style={styles.stepDescriptionWrapper}>
            <Text style={[styles.currentStepTitle, { color: colors.text }]}>{currentStep.title}</Text>
            <Text style={[styles.currentStepDescription, { color: colors.textSecondary }]}>
              {currentStep.description}
            </Text>
          </View>
          {renderStepContent()}
        </View>
      </ScrollView>

      <SafeAreaView style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]} edges={['bottom']}> 
        <TouchableOpacity style={styles.footerButton} onPress={goPrevious}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={[styles.footerButtonText, { color: colors.text }]}>Précédent</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={currentStep.key === 'summary' ? handleCreateMission : goNext}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? <ActivityIndicator color="#0b1222" /> : <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>}
        </TouchableOpacity>
      </SafeAreaView>

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
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  stepLine: {
    position: 'absolute',
    top: 21,
    right: -21,
    width: '100%',
    height: 2,
    zIndex: -1,
  },
  stepDescriptionWrapper: {
    gap: 4,
  },
  currentStepTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  currentStepDescription: {
    fontSize: 14,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  helperError: {
    fontSize: 12,
    color: '#f87171',
    marginTop: 6,
  },
  segmentGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 8,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  duoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  duoItem: {
    flex: 1,
  },
  datetimeContainer: {
    marginBottom: 16,
  },
  datetimeButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datetimeValue: {
    flex: 1,
    fontSize: 16,
  },
  iosPickerSheet: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  iosPickerClose: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0ea5e9',
  },
  iosPickerCloseText: {
    color: '#0b1222',
    fontWeight: '600',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    gap: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 110,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  summaryNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryImageWrapper: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  summaryImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  successHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  successIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  successSubtitle: {
    fontSize: 14,
  },
  shareCodeBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareCodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  shareCodeValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#22c55e',
  },
  successActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButtonFilled: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    gap: 8,
  },
  primaryButtonFilledText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b1222',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    borderTopWidth: 1,
    gap: 12,
    ...Platform.select({
      android: {
        elevation: 8,
        shadowColor: '#000',
      },
    }),
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b1222',
  },
});

