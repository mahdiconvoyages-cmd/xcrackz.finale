import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// import * as Haptics from 'expo-haptics'; // DÉSACTIVÉ - non installé
import {
  startInspection,
  completeInspection,
  uploadInspectionPhoto,
  lockInspection,
  addDriverSignature,
  addClientSignature,
  isInspectionLocked,
  type VehicleInspection,
  type InspectionPhoto,
} from '../services/inspectionService';
import { analyzeDamage, getDamageActionSuggestions, generatePhotoDescription, type DamageDetectionResult } from '../services/aiService';
// import { startGPSTracking, stopGPSTracking } from '../services/gpsTrackingService'; // DÉSACTIVÉ - noms incorrects
import { useInspectionPersistence } from '../hooks/useInspectionPersistence';
import SignatureModal from '../components/SignatureModal';
import { generateInspectionPDF } from '../services/inspectionReportService';

const { width, height } = Dimensions.get('window');

interface PhotoStep {
  type: InspectionPhoto['photo_type'];
  label: string;
  instruction: string;
  photo: InspectionPhoto | null;
  aiDescription?: string; // Description générée par l'IA
  descriptionApproved?: boolean; // Si l'utilisateur a approuvé
}

interface Props {
  route?: {
    params?: {
      missionId?: string;
      inspectionType?: 'departure' | 'arrival';
      onComplete?: (inspectionId: string) => void;
    };
  };
  navigation: any;
}

export default function InspectionScreen({ route, navigation }: Props) {
  const { missionId, inspectionType, onComplete } = route?.params || {};

  const [inspection, setInspection] = useState<VehicleInspection | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetailsForm, setShowDetailsForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locked, setLocked] = useState(false);

  // États pour signatures
  const [showDriverSignature, setShowDriverSignature] = useState(false);
  const [showClientSignature, setShowClientSignature] = useState(false);
  const [driverSignature, setDriverSignature] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  // États pour descriptions IA
  const [editingDescriptionIndex, setEditingDescriptionIndex] = useState<number | null>(null);
  const [tempDescription, setTempDescription] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  const [fuelLevel, setFuelLevel] = useState(50);
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [damageAnalysis, setDamageAnalysis] = useState<Record<string, DamageDetectionResult>>({});

  const [photoSteps, setPhotoSteps] = useState<PhotoStep[]>([
    {
      type: 'front',
      label: 'Vue avant',
      instruction: 'Positionnez le véhicule de face, centré dans le cadre',
      photo: null,
    },
    {
      type: 'back',
      label: 'Vue arrière',
      instruction: 'Positionnez le véhicule de dos, centré dans le cadre',
      photo: null,
    },
    {
      type: 'left_side',
      label: 'Côté gauche',
      instruction: 'Photographiez le côté gauche du véhicule en entier',
      photo: null,
    },
    {
      type: 'right_side',
      label: 'Côté droit',
      instruction: 'Photographiez le côté droit du véhicule en entier',
      photo: null,
    },
    {
      type: 'interior',
      label: 'Intérieur',
      instruction: "Photographiez l'habitacle et les sièges",
      photo: null,
    },
    {
      type: 'dashboard',
      label: 'Tableau de bord',
      instruction: 'Photographiez le compteur et le kilométrage clairement visible',
      photo: null,
    },
  ]);

  const inspectionState = {
    currentStep,
    fuelLevel,
    mileage,
    condition,
    notes,
  };

  const { saveState, loadState, clearState } = useInspectionPersistence(
    missionId,
    inspectionType,
    inspectionState
  );

  useEffect(() => {
    // Ne pas initialiser si pas de missionId
    if (missionId && inspectionType) {
      initInspection();
    }
  }, []);

  useEffect(() => {
    // Vérifier si l'inspection est verrouillée
    if (inspection?.id) {
      checkLockStatus();
    }
  }, [inspection?.id]);

  const checkLockStatus = async () => {
    if (!inspection?.id) return;
    const isLocked = await isInspectionLocked(inspection.id);
    setLocked(isLocked);
  };

  const initInspection = async () => {
    // Double vérification
    if (!missionId || !inspectionType) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const savedState = await loadState();
      if (savedState) {
        Alert.alert(
          'Inspection en cours',
          'Une inspection en cours a été trouvée. Voulez-vous la reprendre ?',
          [
            {
              text: 'Non, recommencer',
              style: 'destructive',
              onPress: async () => {
                await clearState();
                await startNewInspection();
              },
            },
            {
              text: 'Oui, reprendre',
              onPress: async () => {
                setCurrentStep(savedState.currentStep || 0);
                setFuelLevel(savedState.fuelLevel || 50);
                setMileage(savedState.mileage || '');
                setCondition(savedState.condition || 'good');
                setNotes(savedState.notes || '');
                await startNewInspection();
              },
            },
          ]
        );
      } else {
        await startNewInspection();
      }
    } catch (error) {
      console.error('Init error:', error);
      Alert.alert('Erreur', "Erreur lors de l'initialisation");
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const startNewInspection = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const newInspection = await startInspection(missionId, inspectionType, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address[0]
          ? `${address[0].street}, ${address[0].city}`
          : undefined,
      });

      if (newInspection) {
        setInspection(newInspection);
      } else {
        Alert.alert('Erreur', "Impossible de démarrer l'inspection");
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Start new inspection error:', error);
      throw error;
    }
  };

  const handleTakePhoto = async () => {
    if (!inspection) return;

    // Bloquer si verrouillé
    if (locked) {
      Alert.alert(
        '🔒 Inspection verrouillée',
        'Cette inspection a été validée et ne peut plus être modifiée.'
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', "L'accès à la caméra est nécessaire");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Keep old API for compatibility
      quality: 0.8,
      allowsEditing: false,
      base64: true, // Enable base64 encoding
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        const location = await Location.getCurrentPositionAsync({});
        const photo = await uploadInspectionPhoto(
          inspection.id,
          result.assets[0].uri,
          photoSteps[currentStep].type,
          undefined,
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        );

        if (photo) {
          const newSteps = [...photoSteps];
          newSteps[currentStep] = {
            ...newSteps[currentStep],
            photo,
          };
          setPhotoSteps(newSteps);

          // 🤖 GÉNÉRATION AUTOMATIQUE DE DESCRIPTION IA
          const AI_ENABLED = true;
          
          if (AI_ENABLED) {
            setAiAnalyzing(true);
            try {
              const base64 = result.assets[0].base64;
              
              if (base64) {
                console.log('🤖 Génération description IA...');
                
                // 1. Générer la description complète
                const description = await generatePhotoDescription(base64, photoSteps[currentStep].label);
                
                // 2. Analyser les dommages en parallèle
                const damage = await analyzeDamage(base64, photoSteps[currentStep].label);
                
                console.log('✅ Description:', description);
                console.log('✅ Analyse dommages:', damage);
                
                // Sauvegarder la description et l'analyse
                const updatedSteps = [...photoSteps];
                updatedSteps[currentStep] = {
                  ...updatedSteps[currentStep],
                  photo,
                  aiDescription: description,
                  descriptionApproved: false, // Pas encore approuvée
                };
                setPhotoSteps(updatedSteps);
                
                setDamageAnalysis(prev => ({
                  ...prev,
                  [photoSteps[currentStep].type]: damage
                }));

                // Afficher modal de validation de description
                setAiAnalyzing(false);
                
                // 📡 GESTION MODE OFFLINE / ERREUR RÉSEAU
                const isOfflineDescription = description.includes('📡') || description.includes('⚠️');
                
                if (isOfflineDescription) {
                  // Mode offline - proposer édition manuelle directement
                  Alert.alert(
                    '📡 Mode hors ligne',
                    description,
                    [
                      {
                        text: 'Ignorer (continuer sans)',
                        style: 'cancel',
                        onPress: () => {
                          // Continuer sans description
                          const updated = [...photoSteps];
                          updated[currentStep] = {
                            ...updated[currentStep],
                            aiDescription: 'Description non disponible (mode hors ligne)',
                            descriptionApproved: false,
                          };
                          setPhotoSteps(updated);
                        }
                      },
                      {
                        text: 'Ajouter manuellement',
                        onPress: () => {
                          setEditingDescriptionIndex(currentStep);
                          setTempDescription('');
                          setShowDescriptionModal(true);
                        }
                      }
                    ]
                  );
                } else {
                  // Mode online - description IA générée normalement
                  Alert.alert(
                    '🤖 Description générée',
                    description,
                    [
                      {
                        text: 'Modifier',
                        onPress: () => {
                          setEditingDescriptionIndex(currentStep);
                          setTempDescription(description);
                          setShowDescriptionModal(true);
                        }
                      },
                      {
                        text: 'Approuver ✓',
                        style: 'default',
                        onPress: () => {
                          const approved = [...photoSteps];
                          approved[currentStep] = {
                            ...approved[currentStep],
                            descriptionApproved: true,
                          };
                          setPhotoSteps(approved);
                          
                          // Si dommage détecté, montrer aussi
                          if (damage.hasDamage) {
                            setTimeout(() => {
                              const suggestions = getDamageActionSuggestions(damage);
                              Alert.alert(
                                '⚠️ Attention',
                                `Dommage détecté: ${damage.description}\n\nGravité: ${damage.severity === 'severe' ? '🔴 Élevée' : damage.severity === 'moderate' ? '🟠 Modérée' : '🟡 Mineure'}`,
                                [{ text: 'Compris' }]
                              );
                            }, 500);
                          }
                        }
                      }
                    ]
                  );
                }
              }
            } catch (aiError: any) {
              console.error('❌ Erreur IA:', aiError);
              setAiAnalyzing(false);
              
              // Proposer édition manuelle en cas d'erreur
              Alert.alert(
                '⚠️ Erreur IA',
                'Impossible de générer la description automatiquement. Voulez-vous en ajouter une manuellement ?',
                [
                  { text: 'Non, continuer', style: 'cancel' },
                  {
                    text: 'Oui, ajouter',
                    onPress: () => {
                      setEditingDescriptionIndex(currentStep);
                      setTempDescription('');
                      setShowDescriptionModal(true);
                    }
                  }
                ]
              );
            }
          }
        } else {
          Alert.alert('Erreur', "Échec de l'upload");
        }
      } catch (error) {
        console.error('Upload error:', error);
        Alert.alert('Erreur', "Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRetakePhoto = () => {
    // Bloquer si verrouillé
    if (locked) {
      Alert.alert(
        '🔒 Inspection verrouillée',
        'Cette inspection a été validée et ne peut plus être modifiée.'
      );
      return;
    }

    const newSteps = [...photoSteps];
    newSteps[currentStep] = {
      ...newSteps[currentStep],
      photo: null,
    };
    setPhotoSteps(newSteps);
  };

  const handleNextStep = () => {
    if (currentStep < photoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowDetailsForm(true);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleEditDescription = (index: number) => {
    const step = photoSteps[index];
    if (step.aiDescription) {
      setEditingDescriptionIndex(index);
      setTempDescription(step.aiDescription);
      setShowDescriptionModal(true);
    }
  };

  const handleSaveDescription = () => {
    if (editingDescriptionIndex !== null) {
      const updatedSteps = [...photoSteps];
      updatedSteps[editingDescriptionIndex] = {
        ...updatedSteps[editingDescriptionIndex],
        aiDescription: tempDescription,
        descriptionApproved: true,
      };
      setPhotoSteps(updatedSteps);
      setShowDescriptionModal(false);
      setEditingDescriptionIndex(null);
      setTempDescription('');
    }
  };

  const handleApproveDescription = (index: number) => {
    const updatedSteps = [...photoSteps];
    updatedSteps[index] = {
      ...updatedSteps[index],
      descriptionApproved: true,
    };
    setPhotoSteps(updatedSteps);
  };

  const handleComplete = async () => {
    if (!inspection) return;

    // Bloquer si déjà verrouillé
    if (locked) {
      Alert.alert('Inspection verrouillée', 'Cette inspection a déjà été validée et ne peut plus être modifiée.');
      return;
    }

    const photosNotTaken = photoSteps.filter((p) => !p.photo).length;
    if (photosNotTaken > 0) {
      Alert.alert('Photos manquantes', `Il reste ${photosNotTaken} photo(s) à prendre`);
      return;
    }

    // Compléter l'inspection d'abord
    setLoading(true);
    try {
      const success = await completeInspection(inspection.id, {
        overall_condition: condition,
        fuel_level: fuelLevel,
        mileage_km: parseInt(mileage) || 0,
        notes,
      });

      if (!success) {
        Alert.alert('Erreur', 'Échec de la finalisation');
        setLoading(false);
        return;
      }

      // Ensuite demander les signatures
      setLoading(false);
      Alert.alert(
        'Signatures requises',
        'Veuillez recueillir les signatures du chauffeur et du client pour valider définitivement cette inspection.',
        [
          {
            text: 'Commencer',
            onPress: () => setShowDriverSignature(true),
          },
        ]
      );
    } catch (error) {
      console.error('Complete error:', error);
      Alert.alert('Erreur', 'Erreur lors de la finalisation');
      setLoading(false);
    }
  };

  const handleDriverSignatureComplete = async (signature: string) => {
    if (!inspection) return;
    
    setLoading(true);
    const success = await addDriverSignature(inspection.id, signature);
    setLoading(false);

    if (success) {
      setDriverSignature(signature);
      setShowDriverSignature(false);
      
      // Passer à la signature client
      Alert.alert(
        'Signature chauffeur enregistrée',
        'Maintenant, demandez au client de signer.',
        [
          {
            text: 'Continuer',
            onPress: () => setShowClientSignature(true),
          },
        ]
      );
    } else {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la signature du chauffeur');
    }
  };

  const handleClientSignatureComplete = async (signature: string) => {
    if (!inspection) return;
    
    setLoading(true);
    const success = await addClientSignature(inspection.id, signature);

    if (success) {
      setClientSignature(signature);
      
      // Verrouiller l'inspection
      const locked = await lockInspection(inspection.id);
      
      if (locked) {
        setLocked(true);
        await clearState();
        
        // 🆕 AUTO-GÉNÉRATION PDF
        // Générer automatiquement le PDF après verrouillage
        console.log('🔄 Démarrage auto-génération PDF...');
        try {
          // Pour générer le PDF, on a besoin du rapport complet
          // On va appeler le backend qui va générer le PDF
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
          const pdfResponse = await fetch(
            `${apiUrl}/api/reports/generate-pdf/${inspection.mission_id}?inspection_type=${inspectionType}`,
            { method: 'POST' }
          );
          
          if (pdfResponse.ok) {
            console.log('✅ PDF généré automatiquement pour:', inspection.mission_id);
          } else {
            console.warn('⚠️ Erreur génération PDF auto:', await pdfResponse.text());
          }
        } catch (pdfError) {
          // Ne pas bloquer si la génération PDF échoue
          console.warn('⚠️ Auto-génération PDF échouée (non bloquant):', pdfError);
        }
        
        Alert.alert(
          '✅ Inspection validée',
          'L\'inspection a été verrouillée et le PDF sera généré automatiquement.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowClientSignature(false);
                if (onComplete) {
                  onComplete(inspection.id);
                }
                if (navigation.canGoBack()) {
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Erreur', 'Impossible de verrouiller l\'inspection');
      }
    } else {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la signature du client');
    }
    
    setLoading(false);
  };

  const getCompletedPhotosCount = () => {
    return photoSteps.filter((p) => p.photo !== null).length;
  };

  // Vérifier si les paramètres sont fournis
  if (!missionId || !inspectionType) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.loadingText}>
            Aucune mission sélectionnée
          </Text>
          <Text style={styles.loadingSubtext}>
            Veuillez sélectionner une mission pour démarrer une inspection
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { marginTop: 20, backgroundColor: '#14b8a6', width: 120, height: 45 }]}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentPhoto = photoSteps[currentStep];

  if (loading && !inspection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Initialisation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showDetailsForm) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowDetailsForm(false)}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Détails du véhicule</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView style={styles.content}>
          {/* Section Photos avec descriptions IA */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Feather name="image" size={20} color="#14b8a6" />
              <Text style={styles.sectionTitle}>📸 Photos et descriptions</Text>
            </View>

            {photoSteps.map((step, index) => {
              if (!step.photo) return null;

              const damage = damageAnalysis[step.type];
              const hasWarning = damage?.hasDamage;

              return (
                <View key={step.type} style={styles.photoCard}>
                  {/* Image avec indicateur de dommage */}
                  <View style={styles.photoCardImageContainer}>
                    <Image
                      source={{ uri: step.photo.photo_url }}
                      style={styles.photoCardImage}
                      resizeMode="cover"
                    />
                    {hasWarning && (
                      <View style={styles.photoWarningBadge}>
                        <Feather name="alert-triangle" size={16} color="#fff" />
                      </View>
                    )}
                  </View>

                  {/* Contenu */}
                  <View style={styles.photoCardContent}>
                    <View style={styles.photoCardHeader}>
                      <Text style={styles.photoCardTitle}>{step.label}</Text>
                      {step.descriptionApproved && (
                        <View style={styles.approvedBadge}>
                          <Feather name="check-circle" size={14} color="#10b981" />
                          <Text style={styles.approvedBadgeText}>Approuvée</Text>
                        </View>
                      )}
                    </View>

                    {/* Description IA */}
                    {step.aiDescription && (
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>
                          {step.aiDescription}
                        </Text>

                        {/* Boutons d'action */}
                        {!step.descriptionApproved && (
                          <View style={styles.descriptionActions}>
                            <TouchableOpacity
                              style={styles.editDescButton}
                              onPress={() => handleEditDescription(index)}
                            >
                              <Feather name="edit-2" size={16} color="#64748b" />
                              <Text style={styles.editDescText}>Modifier</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.approveDescButton}
                              onPress={() => handleApproveDescription(index)}
                            >
                              <Feather name="check" size={16} color="#14b8a6" />
                              <Text style={styles.approveDescText}>Approuver</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Indicateur de dommage si présent */}
                        {hasWarning && damage && (
                          <View style={[
                            styles.damageMiniCard,
                            {
                              borderColor: 
                                damage.severity === 'severe' ? '#ef4444' :
                                damage.severity === 'moderate' ? '#f59e0b' :
                                '#fbbf24'
                            }
                          ]}>
                            <View style={styles.damageMiniHeader}>
                              <Feather 
                                name="alert-circle" 
                                size={14} 
                                color={
                                  damage.severity === 'severe' ? '#ef4444' :
                                  damage.severity === 'moderate' ? '#f59e0b' :
                                  '#fbbf24'
                                }
                              />
                              <Text style={[
                                styles.damageMiniTitle,
                                {
                                  color:
                                    damage.severity === 'severe' ? '#ef4444' :
                                    damage.severity === 'moderate' ? '#f59e0b' :
                                    '#fbbf24'
                                }
                              ]}>
                                {damage.damageType || 'Dommage détecté'}
                              </Text>
                            </View>
                            <Text style={styles.damageMiniText}>
                              {damage.description}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {!step.aiDescription && (
                      <Text style={styles.noDescriptionText}>
                        Aucune description disponible
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Résumé IA des dommages détectés */}
          {Object.keys(damageAnalysis).length > 0 && (
            <View style={styles.formSection}>
              <View style={styles.aiSummaryHeader}>
                <Feather name="cpu" size={20} color="#14b8a6" />
                <Text style={styles.sectionTitle}>🤖 Analyse IA - Résumé</Text>
              </View>

              {Object.entries(damageAnalysis).map(([photoType, damage]) => {
                const step = photoSteps.find(s => s.type === photoType);
                if (!step || !damage.hasDamage) return null;

                return (
                  <View key={photoType} style={styles.damageCard}>
                    <View style={styles.damageHeader}>
                      <Text style={styles.damageTitle}>📸 {step.label}</Text>
                      <View style={[
                        styles.severityBadge,
                        { backgroundColor: 
                          damage.severity === 'severe' ? '#ef4444' :
                          damage.severity === 'moderate' ? '#f59e0b' :
                          '#10b981'
                        }
                      ]}>
                        <Text style={styles.severityText}>
                          {damage.severity === 'severe' ? '⚠️ Élevée' :
                           damage.severity === 'moderate' ? '⚡ Modérée' :
                           '✓ Mineure'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.damageDetails}>
                      <Text style={styles.damageType}>
                        Type: <Text style={styles.damageValue}>{damage.damageType}</Text>
                      </Text>
                      {damage.location && (
                        <Text style={styles.damageLocation}>
                          📍 {damage.location}
                        </Text>
                      )}
                      <Text style={styles.damageDescription}>
                        {damage.description}
                      </Text>
                      
                      {damage.suggestions && damage.suggestions.length > 0 && (
                        <View style={styles.suggestionsList}>
                          <Text style={styles.suggestionsTitle}>Actions recommandées:</Text>
                          {damage.suggestions.map((suggestion, i) => (
                            <Text key={i} style={styles.suggestionItem}>
                              • {suggestion}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {Object.values(damageAnalysis).filter(d => d.hasDamage).length === 0 && (
                <View style={styles.noDamageCard}>
                  <Feather name="check-circle" size={48} color="#10b981" />
                  <Text style={styles.noDamageTitle}>✅ Aucun dommage détecté</Text>
                  <Text style={styles.noDamageText}>
                    L'IA n'a détecté aucun dommage visible sur les photos
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Informations complémentaires</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Niveau de carburant (%)</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{fuelLevel}%</Text>
              </View>
              <View style={styles.sliderButtons}>
                {[0, 25, 50, 75, 100].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sliderButton,
                      fuelLevel === value && styles.sliderButtonActive,
                    ]}
                    onPress={() => setFuelLevel(value)}
                  >
                    <Text
                      style={[
                        styles.sliderButtonText,
                        fuelLevel === value && styles.sliderButtonTextActive,
                      ]}
                    >
                      {value}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kilométrage</Text>
              <TextInput
                style={styles.input}
                value={mileage}
                onChangeText={setMileage}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>État général</Text>
              <View style={styles.conditionButtons}>
                {[
                  { value: 'excellent', label: 'Excellent', color: '#10b981' },
                  { value: 'good', label: 'Bon', color: '#14b8a6' },
                  { value: 'fair', label: 'Moyen', color: '#f59e0b' },
                  { value: 'poor', label: 'Mauvais', color: '#ef4444' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.conditionButton,
                      condition === item.value && {
                        backgroundColor: item.color + '20',
                        borderColor: item.color,
                      },
                    ]}
                    onPress={() => setCondition(item.value)}
                  >
                    <Text
                      style={[
                        styles.conditionButtonText,
                        condition === item.value && { color: item.color },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                placeholder="Observations particulières..."
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleComplete}
            disabled={loading}
          >
            <LinearGradient
              colors={['#14b8a6', '#0d9488']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={20} color="#fff" />
                  <Text style={styles.completeButtonText}>Terminer l'inspection</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
        }} style={styles.backButton}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {locked && (
            <View style={styles.lockedBadge}>
              <Feather name="lock" size={14} color="#fbbf24" />
              <Text style={styles.lockedBadgeText}>Verrouillée</Text>
            </View>
          )}
          <Text style={styles.headerSubtitle}>
            Photo {currentStep + 1} sur {photoSteps.length}
          </Text>
          <Text style={styles.headerProgress}>
            {getCompletedPhotosCount()}/{photoSteps.length} terminées
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${(getCompletedPhotosCount() / photoSteps.length) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Bouton Mode Wizard */}
      {!locked && getCompletedPhotosCount() === 0 && inspection && (
        <View style={styles.wizardBannerContainer}>
          <TouchableOpacity
            style={styles.wizardBanner}
            onPress={() => {
              navigation.navigate('InspectionWizard', {
                inspectionId: inspection.id,
                onComplete: (wizardPhotos: any) => {
                  // Mettre à jour les photos avec les résultats du wizard
                  console.log('Photos du wizard:', wizardPhotos);
                  // Forcer le rechargement de l'écran
                  navigation.goBack();
                  navigation.navigate('Inspection', {
                    missionId,
                    inspectionType,
                  });
                },
              });
            }}
          >
            <LinearGradient
              colors={['#8b5cf6', '#6366f1']}
              style={styles.wizardBannerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.wizardBannerLeft}>
                <View style={styles.wizardIconContainer}>
                  <Feather name="zap" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.wizardBannerTitle}>Mode Wizard</Text>
                  <Text style={styles.wizardBannerSubtitle}>
                    Prendre toutes les photos en une seule fois
                  </Text>
                </View>
              </View>
              <Feather name="arrow-right" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.instructionContainer}>
          <Text style={styles.photoTitle}>{currentPhoto.label}</Text>
          <Text style={styles.photoInstruction}>{currentPhoto.instruction}</Text>
        </View>

        <View style={styles.cameraContainer}>
          {!currentPhoto.photo ? (
            <View style={styles.cameraPlaceholder}>
              <View style={styles.cameraIconContainer}>
                <Feather name="camera" size={80} color="#14b8a6" />
              </View>
              <Text style={styles.cameraText}>Positionnez le véhicule dans le cadre</Text>
              <Text style={styles.cameraSubtext}>
                Assurez-vous que l'éclairage est suffisant
              </Text>
              <TouchableOpacity
                onPress={handleTakePhoto}
                disabled={uploading}
                style={styles.captureButton}
              >
                <LinearGradient
                  colors={['#14b8a6', '#0d9488']}
                  style={styles.captureButtonGradient}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="camera" size={24} color="#fff" />
                      <Text style={styles.captureButtonText}>Prendre la photo</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoPreview}>
              <Image
                source={{ uri: currentPhoto.photo.photo_url }}
                style={styles.previewImage}
              />
              <View style={styles.checkBadge}>
                <Feather name="check" size={24} color="#fff" />
              </View>

              {/* Indicateur d'analyse IA */}
              {aiAnalyzing && (
                <View style={styles.aiAnalysisOverlay}>
                  <View style={styles.aiAnalysisCard}>
                    <ActivityIndicator size="large" color="#14b8a6" />
                    <Text style={styles.aiAnalysisText}>🤖 Analyse IA en cours...</Text>
                    <Text style={styles.aiAnalysisSubtext}>Détection des dommages</Text>
                  </View>
                </View>
              )}

              {/* Badge de résultat IA */}
              {damageAnalysis[currentPhoto.type] && !aiAnalyzing && (
                <View style={styles.aiResultBadge}>
                  {damageAnalysis[currentPhoto.type].hasDamage ? (
                    <>
                      <Feather name="alert-triangle" size={16} color="#ef4444" />
                      <Text style={styles.aiResultText}>
                        🚨 Dommage détecté
                      </Text>
                    </>
                  ) : (
                    <>
                      <Feather name="check-circle" size={16} color="#10b981" />
                      <Text style={styles.aiResultText}>
                        ✅ Aucun dommage
                      </Text>
                    </>
                  )}
                </View>
              )}

              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleRetakePhoto}
                >
                  <Text style={styles.retakeButtonText}>Reprendre</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNextStep}>
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.nextButtonGradient}
                  >
                    <Text style={styles.nextButtonText}>
                      {currentStep === photoSteps.length - 1 ? 'Continuer' : 'Photo suivante'}
                    </Text>
                    <Feather name="arrow-right" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {currentStep > 0 && !currentPhoto.photo && (
          <TouchableOpacity style={styles.previousButton} onPress={handlePreviousStep}>
            <Feather name="arrow-left" size={20} color="#64748b" />
            <Text style={styles.previousButtonText}>Photo précédente</Text>
          </TouchableOpacity>
        )}

        <View style={styles.thumbnails}>
          {photoSteps.map((step, index) => (
            <TouchableOpacity
              key={step.type}
              style={[
                styles.thumbnail,
                index === currentStep && styles.thumbnailActive,
                step.photo && styles.thumbnailCompleted,
              ]}
              onPress={() => setCurrentStep(index)}
            >
              {step.photo ? (
                <Feather name="check" size={16} color="#10b981" />
              ) : (
                <Text style={styles.thumbnailText}>{index + 1}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Modals de signature */}
      <SignatureModal
        visible={showDriverSignature}
        onClose={() => setShowDriverSignature(false)}
        onSign={handleDriverSignatureComplete}
        title="Signature du chauffeur"
        subtitle="Le chauffeur doit signer pour valider l'inspection"
      />

      <SignatureModal
        visible={showClientSignature}
        onClose={() => setShowClientSignature(false)}
        onSign={handleClientSignatureComplete}
        title="Signature du client"
        subtitle="Le client doit signer pour confirmer l'état du véhicule"
      />

      {/* Modal d'édition de description */}
      <Modal
        visible={showDescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDescriptionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#14b8a6', '#0d9488']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>📝 Modifier la description</Text>
              <TouchableOpacity
                onPress={() => setShowDescriptionModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Description de la photo</Text>
              <TextInput
                style={styles.modalTextInput}
                value={tempDescription}
                onChangeText={setTempDescription}
                multiline
                numberOfLines={6}
                placeholder="Décrivez l'état visible sur cette photo..."
                placeholderTextColor="#64748b"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowDescriptionModal(false)}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSaveDescription}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.modalSaveGradient}
                  >
                    <Feather name="check" size={20} color="#fff" />
                    <Text style={styles.modalSaveText}>Enregistrer</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 8,
  },
  lockedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  headerProgress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#fff',
  },
  wizardBannerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  wizardBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  wizardBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  wizardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  wizardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  wizardBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  photoInstruction: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 16,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraIconContainer: {
    marginBottom: 24,
  },
  cameraText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  cameraSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  captureButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  captureButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  captureButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  photoPreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
  },
  checkBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    marginTop: 12,
  },
  previousButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  thumbnails: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  thumbnail: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailActive: {
    borderColor: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
  },
  thumbnailCompleted: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  thumbnailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  formSection: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 12,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#14b8a6',
  },
  sliderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  sliderButtonActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderColor: '#14b8a6',
  },
  sliderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  sliderButtonTextActive: {
    color: '#14b8a6',
  },
  input: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  conditionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    alignItems: 'center',
  },
  conditionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  footer: {
    padding: 20,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  aiAnalysisOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  aiAnalysisCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  aiAnalysisText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
  },
  aiAnalysisSubtext: {
    fontSize: 14,
    color: '#94A3B8',
  },
  aiResultBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  aiResultText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  damageCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    marginBottom: 12,
  },
  damageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  damageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  damageDetails: {
    gap: 8,
  },
  damageType: {
    fontSize: 14,
    color: '#94A3B8',
  },
  damageValue: {
    fontWeight: '600',
    color: '#14b8a6',
  },
  damageLocation: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  damageDescription: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginTop: 4,
  },
  suggestionsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
    marginBottom: 8,
  },
  suggestionItem: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 4,
  },
  noDamageCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  noDamageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  noDamageText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  // Styles pour modal description
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  modalTextInput: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    fontSize: 15,
    color: '#fff',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Styles pour cards de photos avec descriptions
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  photoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  photoCardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  photoCardImage: {
    width: '100%',
    height: '100%',
  },
  photoWarningBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ef4444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  photoCardContent: {
    padding: 16,
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  approvedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  descriptionContainer: {
    gap: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 22,
  },
  descriptionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editDescButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
  },
  editDescText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  approveDescButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  approveDescText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  damageMiniCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  damageMiniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  damageMiniTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  damageMiniText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  noDescriptionText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
