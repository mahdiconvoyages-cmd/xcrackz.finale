import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import SignaturePad from '../../components/inspection/SignaturePad';
import PhotoIndicator from '../../components/inspection/PhotoIndicator';

interface PhotoData {
  type: string;
  label: string;
  uri: string | null;
  captured: boolean;
}

const REQUIRED_PHOTOS: Omit<PhotoData, 'uri' | 'captured'>[] = [
  { type: 'front', label: 'Face avant générale' },
  { type: 'back', label: 'Face arrière générale' },
  { type: 'left_front', label: 'Latéral gauche avant' },
  { type: 'left_back', label: 'Latéral gauche arrière' },
  { type: 'right_front', label: 'Latéral droit avant' },
  { type: 'right_back', label: 'Latéral droit arrière' },
  { type: 'interior', label: 'Intérieur véhicule' },
  { type: 'dashboard', label: 'Tableau de bord' },
];

const OPTIONAL_INTERIOR_PHOTOS: Omit<PhotoData, 'uri' | 'captured'>[] = [
  // Déplacé vers REQUIRED_PHOTOS (voir ci-dessus)
];

export default function InspectionDepartureNew({ route, navigation }: any) {
  const { missionId, isArrival } = route.params || {};
  const { user } = useAuth();
  const { colors } = useTheme();

  const inspectionType = isArrival ? 'arrival' : 'departure';
  const pageTitle = isArrival ? 'Inspection Arrivée' : 'Inspection Départ';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mission, setMission] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [photos, setPhotos] = useState<PhotoData[]>(
    REQUIRED_PHOTOS.map((p) => ({ ...p, uri: null, captured: false }))
  );

  const [optionalInteriorPhotos, setOptionalInteriorPhotos] = useState<PhotoData[]>(
    OPTIONAL_INTERIOR_PHOTOS.map((p) => ({ ...p, uri: null, captured: false }))
  );

  const [additionalDamagePhotos, setAdditionalDamagePhotos] = useState<PhotoData[]>([]);

  const [fuelLevel, setFuelLevel] = useState('50');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState('good');
  const [keysCount, setKeysCount] = useState(1);
  const [hasVehicleDocuments, setHasVehicleDocuments] = useState(false);
  const [hasRegistrationCard, setHasRegistrationCard] = useState(false);
  const [vehicleIsFull, setVehicleIsFull] = useState(false);
  const [windshieldCondition, setWindshieldCondition] = useState('bon');
  const [externalCleanliness, setExternalCleanliness] = useState('propre');
  const [internalCleanliness, setInternalCleanliness] = useState('propre');
  const [hasSpareWheel, setHasSpareWheel] = useState(false);
  const [hasRepairKit, setHasRepairKit] = useState(false);

  const [photoTime, setPhotoTime] = useState('jour');
  const [photoLocation, setPhotoLocation] = useState('parking');
  const [photoWeather, setPhotoWeather] = useState('beau-temps');

  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverSignature, setDriverSignature] = useState('');
  const [existingInspection, setExistingInspection] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSigningActive, setIsSigningActive] = useState(false);
  const [isMounted, setIsMounted] = useState(true);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
    loadMission();
    requestCameraPermissions();
    loadSavedProgress();
    cleanOldCaches(); // Nettoyer vieux caches au démarrage

    return () => {
      setIsMounted(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Sauvegarder automatiquement avec DEBOUNCE (évite trop de writes)
  useEffect(() => {
    if (!mission || currentStep === 0 || !isMounted) return;

    // Annuler précédent timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Sauvegarder après 2 secondes sans changement
    saveTimeoutRef.current = setTimeout(() => {
      if (isMounted) {
        saveProgress();
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [photos, optionalInteriorPhotos, additionalDamagePhotos, fuelLevel, mileage, condition, keysCount, notes, clientName, currentStep]);

  const getStorageKey = () => `inspection_progress_${missionId}_${inspectionType}`;

  const cleanOldCaches = async () => {
    try {
      console.log('🧹 Nettoyage des vieux caches...');
      const allKeys = await AsyncStorage.getAllKeys();
      const inspectionKeys = allKeys.filter(k => k.startsWith('inspection_progress_'));
      
      let cleaned = 0;
      for (const key of inspectionKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const savedAt = new Date(parsed.savedAt);
            const age = Date.now() - savedAt.getTime();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours
            
            if (age > maxAge) {
              await AsyncStorage.removeItem(key);
              cleaned++;
            }
          }
        } catch (err) {
          // Supprimer les caches corrompus
          await AsyncStorage.removeItem(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        console.log(`✅ ${cleaned} vieux cache(s) nettoyé(s)`);
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage caches:', error);
    }
  };

  const saveProgress = async () => {
    try {
      // ⚠️ NE PAS sauvegarder les URIs des photos (invalides après crash)
      // Sauvegarder uniquement l'état "captured" pour savoir quelles photos ont été prises
      const photosState = photos.map(p => ({ type: p.type, label: p.label, captured: p.captured }));
      const optionalPhotosState = optionalInteriorPhotos.map(p => ({ type: p.type, label: p.label, captured: p.captured }));
      const damagePhotosCount = additionalDamagePhotos.length;

      const progressData = {
        currentStep,
        photosState,  // ✅ État seulement, pas URIs
        optionalPhotosState,
        damagePhotosCount,
        fuelLevel,
        mileage,
        condition,
        keysCount,
        hasVehicleDocuments,
        hasRegistrationCard,
        vehicleIsFull,
        windshieldCondition,
        externalCleanliness,
        internalCleanliness,
        hasSpareWheel,
        hasRepairKit,
        photoTime,
        photoLocation,
        photoWeather,
        notes,
        clientName,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(progressData));
      console.log('💾 Progression sauvegardée (sans URIs photos)');
    } catch (error) {
      console.error('❌ Erreur sauvegarde progression:', error);
    }
  };

  const loadSavedProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(getStorageKey());
      if (saved) {
        const progressData = JSON.parse(saved);
        
        Alert.alert(
          '⚠️ Reprendre l\'inspection ?',
          `Une inspection en cours a été trouvée (${new Date(progressData.savedAt).toLocaleString('fr-FR')})\n\n⚠️ IMPORTANT: Les photos devront être reprises car elles ne peuvent pas être restaurées après un crash.`,
          [
            {
              text: 'Recommencer à zéro',
              style: 'destructive',
              onPress: () => clearSavedProgress(),
            },
            {
              text: 'Reprendre (reprendre photos)',
              onPress: () => {
                setCurrentStep(progressData.currentStep || 1);
                
                // ✅ Restaurer l'état "captured" mais réinitialiser les URIs
                if (progressData.photosState) {
                  const restoredPhotos = REQUIRED_PHOTOS.map((p) => {
                    const savedState = progressData.photosState.find((s: any) => s.type === p.type);
                    return {
                      ...p,
                      uri: null,  // ❌ URI invalide, doit reprendre photo
                      captured: false,  // ❌ Force à reprendre
                    };
                  });
                  setPhotos(restoredPhotos);
                  console.log('⚠️ Photos obligatoires: URIs invalides, à reprendre');
                }
                
                if (progressData.optionalPhotosState) {
                  const restoredOptional = OPTIONAL_INTERIOR_PHOTOS.map((p) => {
                    const savedState = progressData.optionalPhotosState.find((s: any) => s.type === p.type);
                    return {
                      ...p,
                      uri: null,
                      captured: false,
                    };
                  });
                  setOptionalInteriorPhotos(restoredOptional);
                }
                
                // Reset photos dommages (impossible de restaurer)
                setAdditionalDamagePhotos([]);
                
                // Restaurer les autres données
                setFuelLevel(progressData.fuelLevel || '50');
                setMileage(progressData.mileage || '');
                setCondition(progressData.condition || 'good');
                setKeysCount(progressData.keysCount || 1);
                setHasVehicleDocuments(progressData.hasVehicleDocuments || false);
                setHasRegistrationCard(progressData.hasRegistrationCard || false);
                setVehicleIsFull(progressData.vehicleIsFull || false);
                setWindshieldCondition(progressData.windshieldCondition || 'bon');
                setExternalCleanliness(progressData.externalCleanliness || 'propre');
                setInternalCleanliness(progressData.internalCleanliness || 'propre');
                setHasSpareWheel(progressData.hasSpareWheel || false);
                setHasRepairKit(progressData.hasRepairKit || false);
                setPhotoTime(progressData.photoTime || 'jour');
                setPhotoLocation(progressData.photoLocation || 'parking');
                setPhotoWeather(progressData.photoWeather || 'beau-temps');
                setNotes(progressData.notes || '');
                setClientName(progressData.clientName || '');
                
                console.log('✅ Progression restaurée (photos à reprendre)');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Erreur chargement progression:', error);
    }
  };

  const clearSavedProgress = async () => {
    try {
      await AsyncStorage.removeItem(getStorageKey());
      console.log('✅ Progression effacée');
    } catch (error) {
      console.error('❌ Erreur effacement progression:', error);
    }
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire");
    }
  };

  const loadMission = async () => {
    if (!missionId || !user) return;

    try {
      const { data, error } = await supabase.from('missions').select('*').eq('id', missionId).single();
      if (error) throw error;
      setMission(data);

      // Vérifier si une inspection existe déjà pour cette mission
      const { data: existingInsp, error: inspError } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('mission_id', missionId)
        .eq('inspection_type', inspectionType)
        .eq('status', 'completed')
        .single();

      if (existingInsp) {
        setExistingInspection(existingInsp);
        setIsLocked(true);
        
        Alert.alert(
          '🔒 Inspection déjà validée',
          `Cette inspection ${inspectionType === 'departure' ? 'de départ' : 'd\'arrivée'} a déjà été complétée et ne peut plus être modifiée.`,
          [
            {
              text: 'Voir le rapport',
              onPress: () => {
                // TODO: Naviguer vers le rapport PDF
                navigation.goBack();
              },
            },
            {
              text: 'Retour',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Erreur chargement mission:', error);
      Alert.alert('Erreur', 'Impossible de charger la mission');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async (photoType: string, isOptional: boolean = false, isDamage: boolean = false) => {
    if (isLocked) {
      Alert.alert('🔒 Inspection verrouillée', 'Cette inspection a été validée et ne peut plus être modifiée.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,  // Qualité max
        allowsEditing: false,  // Pas de recadrage
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;

        if (isDamage) {
          const newDamagePhoto: PhotoData = {
            type: `damage_${Date.now()}`,
            label: `Dommage ${additionalDamagePhotos.length + 1}`,
            uri,
            captured: true,
          };
          setAdditionalDamagePhotos([...additionalDamagePhotos, newDamagePhoto]);
        } else if (isOptional) {
          setOptionalInteriorPhotos((prev) =>
            prev.map((p) => (p.type === photoType ? { ...p, uri, captured: true } : p))
          );
        } else {
          setPhotos((prev) => prev.map((p) => (p.type === photoType ? { ...p, uri, captured: true } : p)));
        }
      }
    } catch (error) {
      console.error('Erreur capture photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const allRequiredPhotosValid = () => {
    return photos.every((p) => p.captured);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !allRequiredPhotosValid()) {
      Alert.alert('Photos manquantes', 'Veuillez capturer toutes les photos obligatoires (8 photos: 6 extérieures + tableau de bord + intérieur)');
      return;
    }

    if (currentStep === 2 && !mileage) {
      Alert.alert('Kilométrage requis', 'Veuillez saisir le kilométrage');
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!clientName.trim()) {
      Alert.alert('Nom client requis', 'Veuillez saisir le nom du client');
      return;
    }

    if (!clientSignature) {
      Alert.alert('Signature client requise', 'Veuillez faire signer le client');
      return;
    }

    if (!driverName.trim()) {
      Alert.alert('Nom convoyeur requis', 'Veuillez saisir le nom du convoyeur');
      return;
    }

    if (!driverSignature) {
      Alert.alert('Signature convoyeur requise', 'Veuillez signer en tant que convoyeur');
      return;
    }

    setSaving(true);

    try {
      const { data: inspection, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          mission_id: missionId,
          inspector_id: user.id,
          inspection_type: inspectionType,
          overall_condition: condition,
          fuel_level: parseInt(fuelLevel),
          mileage_km: parseInt(mileage),
          notes: notes,
          keys_count: keysCount,
          has_vehicle_documents: hasVehicleDocuments,
          has_registration_card: hasRegistrationCard,
          vehicle_is_full: vehicleIsFull,
          windshield_condition: windshieldCondition,
          external_cleanliness: externalCleanliness,
          internal_cleanliness: internalCleanliness,
          has_spare_wheel: hasSpareWheel,
          has_repair_kit: hasRepairKit,
          photo_time: photoTime,
          photo_location: photoLocation,
          photo_weather: photoWeather,
          client_name: clientName,
          client_signature: clientSignature,
          driver_name: driverName,
          driver_signature: driverSignature,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      const createdInspection = inspection as any;
      if (!createdInspection?.id) throw new Error('ID inspection non retourné');

      console.log('✅ Inspection créée:', createdInspection.id);

      // 🚀 OPTIMISATION: Upload parallèle des photos (au lieu de séquentiel)
      const allPhotosToUpload = [
        ...photos,
        ...optionalInteriorPhotos.filter((p) => p.captured),
        ...additionalDamagePhotos,
      ].filter((p) => p.uri && p.captured);

      console.log(`📸 Upload de ${allPhotosToUpload.length} photos en parallèle...`);

      const uploadPromises = allPhotosToUpload.map(async (photo, index) => {
        try {
          console.log(`📤 [${index + 1}/${allPhotosToUpload.length}] Upload photo ${photo.type} démarré...`);
          
          const fileExt = photo.uri.split('.').pop() || 'jpg';
          const fileName = `${createdInspection.id}-${photo.type}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          console.log(`📂 Fichier: ${filePath}`);

          // Lire le fichier
          const response = await fetch(photo.uri);
          if (!response.ok) {
            throw new Error(`Erreur lecture fichier: ${response.status} ${response.statusText}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          console.log(`📊 Taille fichier: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          console.log(`☁️ Upload vers Supabase Storage...`);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(filePath, decode(base64), {
              contentType: `image/${fileExt}`,
              upsert: false,
            });

          if (uploadError) {
            console.error(`❌ Erreur Supabase Storage:`, uploadError);
            throw new Error(`Upload failed: ${uploadError.message || JSON.stringify(uploadError)}`);
          }

          console.log(`✅ Fichier uploadé sur Storage:`, uploadData?.path || filePath);

          const { data: urlData } = supabase.storage.from('inspection-photos').getPublicUrl(filePath);
          console.log(`🔗 URL publique: ${urlData.publicUrl.substring(0, 80)}...`);

          console.log(`💾 Insertion dans table inspection_photos_v2...`);
          
          const { data: photoRecord, error: insertError } = await supabase.from('inspection_photos_v2').insert({
            inspection_id: createdInspection.id,
            photo_type: photo.type,
            full_url: urlData.publicUrl,
            taken_at: new Date().toISOString(),
          }).select().single();

          if (insertError) {
            console.error(`❌ Erreur insertion DB:`, insertError);
            throw new Error(`DB insert failed: ${insertError.message || JSON.stringify(insertError)}`);
          }

          console.log(`✅✅ Photo ${photo.type} complètement uploadée (ID: ${photoRecord?.id})`);
          return { success: true, type: photo.type, photoId: photoRecord?.id };
        } catch (error: any) {
          console.error(`❌❌ ERREUR COMPLÈTE upload photo ${photo.type}:`, error);
          console.error(`❌ Error stack:`, error.stack);
          console.error(`❌ Error message:`, error.message);
          return { success: false, type: photo.type, error: error.message || String(error) };
        }
      });

      // Attendre que tous les uploads soient terminés
      const uploadResults = await Promise.all(uploadPromises);
      const uploadedCount = uploadResults.filter(r => r.success).length;
      const failedCount = uploadResults.filter(r => !r.success).length;
      const failedPhotos = uploadResults.filter(r => !r.success);

      console.log(`✅ ${uploadedCount}/${allPhotosToUpload.length} photos uploadées${failedCount > 0 ? ` (${failedCount} échecs)` : ''}`);

      // Afficher les détails des échecs
      if (failedCount > 0) {
        console.error('❌ DÉTAILS DES ÉCHECS:');
        failedPhotos.forEach((failed, idx) => {
          console.error(`  ${idx + 1}. Type: ${failed.type}`);
          console.error(`     Erreur: ${failed.error}`);
        });
      }

      const updateField =
        inspectionType === 'departure' ? 'departure_inspection_completed' : 'arrival_inspection_completed';

      await supabase.from('missions').update({ [updateField]: true }).eq('id', missionId);

      // Effacer la progression sauvegardée
      await clearSavedProgress();

      Alert.alert('✅ Succès', `Inspection ${inspectionType === 'departure' ? 'départ' : 'arrivée'} enregistrée !\n${uploadedCount} photos uploadées${failedCount > 0 ? `\n⚠️ ${failedCount} photo(s) non uploadée(s)` : ''}`, [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde:', error);
      Alert.alert('Erreur', error.message || "Impossible de sauvegarder l'inspection");
    } finally {
      setSaving(false);
    }
  };

  const removeDamagePhoto = (index: number) => {
    setAdditionalDamagePhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Photos obligatoires (8)</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        6 vues extérieures + tableau de bord + intérieur
      </Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Capturez les 6 photos extérieures du véhicule
      </Text>

      <View style={styles.photosGrid}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo.type}
            style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => takePhoto(photo.type)}
          >
            {photo.uri ? (
              <>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                {/* Indicateur overlay sur la photo */}
                <View style={styles.photoIndicatorOverlay}>
                  <PhotoIndicator
                    vehicleType={mission?.vehicle_type || 'VL'}
                    photoType={photo.type}
                    isCaptured={photo.captured}
                  />
                </View>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                {/* Indicateur quand pas de photo */}
                <PhotoIndicator
                  vehicleType={mission?.vehicle_type || 'VL'}
                  photoType={photo.type}
                  isCaptured={false}
                />
              </View>
            )}
            <View style={styles.photoLabel}>
              <Text style={[styles.photoLabelText, { color: colors.text }]} numberOfLines={2}>
                {photo.label}
              </Text>
              {photo.captured && (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.checkIcon} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.optionalSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Photos optionnelles
        </Text>
        <View style={styles.photosGrid}>
          {optionalInteriorPhotos.map((photo) => (
            <TouchableOpacity
              key={photo.type}
              style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => takePhoto(photo.type, true)}
            >
              {photo.uri ? (
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.photoLabel}>
                <Text style={[styles.photoLabelText, { color: colors.text }]} numberOfLines={2}>
                  {photo.label}
                </Text>
                {photo.captured && (
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" style={styles.checkIcon} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.damagePhotosSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos dommages</Text>
        <TouchableOpacity
          style={styles.addDamageButton}
          onPress={() => takePhoto('damage', false, true)}
        >
          <Ionicons name="add-circle" size={24} color="#3b82f6" />
          <Text style={styles.addDamageText}>Ajouter photo de dommage</Text>
        </TouchableOpacity>

        {additionalDamagePhotos.length > 0 && (
          <View style={styles.damagePhotosGrid}>
            {additionalDamagePhotos.map((photo, index) => (
              <View key={index} style={[styles.damagePhotoCard, { backgroundColor: colors.card }]}>
                <Image source={{ uri: photo.uri! }} style={styles.damagePhotoPreview} />
                <TouchableOpacity
                  style={styles.removeDamageButton}
                  onPress={() => removeDamagePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
                <Text style={[styles.damagePhotoLabel, { color: colors.text }]}>{photo.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Informations véhicule</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>État général *</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={condition}
            onValueChange={setCondition}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Excellent" value="excellent" />
            <Picker.Item label="Bon" value="good" />
            <Picker.Item label="Moyen" value="fair" />
            <Picker.Item label="Mauvais" value="poor" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Niveau de carburant: {fuelLevel}%</Text>
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>0%</Text>
          <TextInput
            style={[styles.sliderInput, { color: colors.text, borderColor: colors.border }]}
            value={fuelLevel}
            onChangeText={setFuelLevel}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>100%</Text>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Kilométrage *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={mileage}
          onChangeText={setMileage}
          placeholder="Ex: 50000"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Nombre de clés</Text>
        <View style={styles.keysContainer}>
          {[1, 2, 3].map((num) => (
            <TouchableOpacity
              key={num}
              style={[styles.keyButton, keysCount === num && styles.keyButtonActive]}
              onPress={() => setKeysCount(num)}
            >
              <Text style={[styles.keyButtonText, keysCount === num && styles.keyButtonTextActive]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>État du pare-brise</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={windshieldCondition}
            onValueChange={setWindshieldCondition}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Bon" value="bon" />
            <Picker.Item label="Fissuré" value="fissuré" />
            <Picker.Item label="Cassé" value="cassé" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Propreté extérieure</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={externalCleanliness}
            onValueChange={setExternalCleanliness}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Propre" value="propre" />
            <Picker.Item label="Sale" value="sale" />
            <Picker.Item label="Très sale" value="très sale" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Propreté intérieure</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={internalCleanliness}
            onValueChange={setInternalCleanliness}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Propre" value="propre" />
            <Picker.Item label="Sale" value="sale" />
            <Picker.Item label="Très sale" value="très sale" />
          </Picker>
        </View>
      </View>

      <View style={styles.checkboxSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents et équipement</Text>

        <View style={styles.checkboxRow}>
          <Switch
            value={hasVehicleDocuments}
            onValueChange={setHasVehicleDocuments}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Documents du véhicule</Text>
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={hasRegistrationCard}
            onValueChange={setHasRegistrationCard}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Carte grise</Text>
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={hasSpareWheel}
            onValueChange={setHasSpareWheel}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Roue de secours</Text>
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={hasRepairKit}
            onValueChange={setHasRepairKit}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Kit de réparation</Text>
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={vehicleIsFull}
            onValueChange={setVehicleIsFull}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Véhicule plein</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Conditions de prise de vue</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Moment de la journée</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={photoTime}
            onValueChange={setPhotoTime}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Jour" value="jour" />
            <Picker.Item label="Nuit" value="nuit" />
            <Picker.Item label="Aube" value="aube" />
            <Picker.Item label="Crépuscule" value="crépuscule" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Lieu de prise de vue</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={photoLocation}
            onValueChange={setPhotoLocation}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Parking" value="parking" />
            <Picker.Item label="Rue" value="rue" />
            <Picker.Item label="Garage" value="garage" />
            <Picker.Item label="Autre" value="autre" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Conditions météo</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker
            selectedValue={photoWeather}
            onValueChange={setPhotoWeather}
            style={[styles.picker, { color: colors.text }]}
          >
            <Picker.Item label="Beau temps" value="beau-temps" />
            <Picker.Item label="Pluie" value="pluie" />
            <Picker.Item label="Neige" value="neige" />
            <Picker.Item label="Brouillard" value="brouillard" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Notes et observations</Text>
        <TextInput
          style={[
            styles.textarea,
            { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Remarques, dommages visibles..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView 
      style={styles.stepContainer}
      scrollEnabled={!isSigningActive}
      nestedScrollEnabled={false}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>Validation et signature</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Nom du client *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={clientName}
          onChangeText={setClientName}
          placeholder="Nom complet du client"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Signature du client *</Text>
        <SignaturePad 
          onSave={setClientSignature} 
          value={clientSignature}
          title="Signature du Client"
          placeholder="Nom du client"
          onBegin={() => setIsSigningActive(true)}
          onEnd={() => setIsSigningActive(false)}
        />
        {clientSignature && (
          <View style={styles.signaturePreview}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={[styles.signatureConfirm, { color: '#10b981' }]}>Signature client enregistrée</Text>
          </View>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Nom du convoyeur *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Nom complet du convoyeur"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Signature du convoyeur *</Text>
        <SignaturePad 
          onSave={setDriverSignature} 
          value={driverSignature}
          title="Signature du Convoyeur"
          placeholder="Nom du convoyeur"
          onBegin={() => setIsSigningActive(true)}
          onEnd={() => setIsSigningActive(false)}
        />
        {driverSignature && (
          <View style={styles.signaturePreview}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={[styles.signatureConfirm, { color: '#10b981' }]}>Signature convoyeur enregistrée</Text>
          </View>
        )}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Résumé</Text>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Photos obligatoires:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {photos.filter((p) => p.captured).length}/6
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Photos optionnelles:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {optionalInteriorPhotos.filter((p) => p.captured).length + additionalDamagePhotos.length}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Kilométrage:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{mileage} km</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Carburant:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{fuelLevel}%</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>État:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {condition === 'excellent' ? 'Excellent' : condition === 'good' ? 'Bon' : condition === 'fair' ? 'Moyen' : 'Mauvais'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View
            style={[
              styles.stepDot,
              currentStep >= step && styles.stepDotActive,
              currentStep === step && styles.stepDotCurrent,
            ]}
          >
            <Text
              style={[
                styles.stepDotText,
                currentStep >= step && styles.stepDotTextActive,
              ]}
            >
              {step}
            </Text>
          </View>
          <Text style={[styles.stepLabel, currentStep === step && styles.stepLabelActive]}>
            {step === 1 ? 'Photos' : step === 2 ? 'Détails' : step === 3 ? 'Conditions' : 'Signature'}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={[styles.loadingText, { color: colors.text }]}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{pageTitle}</Text>
          {mission && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {mission.reference} - {mission.vehicle_brand} {mission.vehicle_model}
            </Text>
          )}
        </View>
      </View>

      {renderStepIndicator()}

      <View style={styles.content}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </View>

      <View style={[styles.navigationButtons, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.prevButton]}
            onPress={handlePreviousStep}
            disabled={saving}
          >
            <Ionicons name="chevron-back" size={20} color="#6b7280" />
            <Text style={styles.prevButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
          onPress={handleNextStep}
          disabled={saving || (currentStep === 1 && !allRequiredPhotosValid())}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? 'Terminer' : 'Suivant'}
              </Text>
              <Ionicons name={currentStep === 4 ? 'checkmark' : 'chevron-forward'} size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepIndicatorItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDotActive: { backgroundColor: '#3b82f6' },
  stepDotCurrent: { backgroundColor: '#2563eb', transform: [{ scale: 1.1 }] },
  stepDotText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 11, color: '#9ca3af' },
  stepLabelActive: { fontWeight: '600', color: '#2563eb' },

  content: { flex: 1 },
  stepContainer: { flex: 1, padding: 16 },
  stepTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  stepSubtitle: { fontSize: 14, marginBottom: 20 },

  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '80%',
  },
  photoLabel: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoLabelText: { fontSize: 12, fontWeight: '600', flex: 1 },
  checkIcon: { marginLeft: 4 },
  photoIndicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    pointerEvents: 'none',
  },

  optionalSection: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  damagePhotosSection: { marginTop: 20 },
  addDamageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    marginBottom: 12,
    gap: 8,
  },
  addDamageText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  damagePhotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  damagePhotoCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  damagePhotoPreview: { width: '100%', height: '80%' },
  removeDamageButton: { position: 'absolute', top: 4, right: 4 },
  damagePhotoLabel: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 4,
  },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 120,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: { height: 50 },

  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderLabel: { fontSize: 12 },
  sliderInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  keysContainer: { flexDirection: 'row', gap: 12 },
  keyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  keyButtonActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  keyButtonText: { fontSize: 16, fontWeight: '600', color: '#6b7280' },
  keyButtonTextActive: { color: '#3b82f6' },

  checkboxSection: { marginTop: 20 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  checkboxLabel: { fontSize: 14 },

  signaturePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  signatureConfirm: { fontSize: 14, fontWeight: '600' },

  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '600' },

  navigationButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  prevButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  prevButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
  },
  nextButtonFull: { flex: 1 },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
