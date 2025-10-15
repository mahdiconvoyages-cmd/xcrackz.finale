import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  uploadInspectionPhoto,
  type InspectionPhoto,
} from '../services/inspectionService';
import { generatePhotoDescription } from '../services/aiService';

const { width } = Dimensions.get('window');

interface WizardStep {
  type: InspectionPhoto['photo_type'];
  label: string;
  instruction: string;
  icon: string;
  required: boolean;
  photo: InspectionPhoto | null;
  photoUri?: string; // URI locale pour affichage immédiat
  aiDescription?: string;
  descriptionApproved?: boolean;
}

interface Props {
  route?: {
    params?: {
      inspectionId: string;
      onComplete?: (photos: InspectionPhoto[]) => void;
    };
  };
  navigation: any;
}

export default function InspectionWizardScreen({ route, navigation }: Props) {
  const { inspectionId, onComplete } = route?.params || {};

  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 🎯 WIZARD: 4 obligatoires + 2 optionnelles
  const [steps, setSteps] = useState<WizardStep[]>([
    {
      type: 'front',
      label: 'Vue avant',
      instruction: 'Positionnez-vous face au véhicule, à environ 3 mètres',
      icon: 'arrow-up',
      required: true,
      photo: null,
    },
    {
      type: 'back',
      label: 'Vue arrière',
      instruction: 'Positionnez-vous derrière le véhicule, à environ 3 mètres',
      icon: 'arrow-down',
      required: true,
      photo: null,
    },
    {
      type: 'left_side',
      label: 'Côté gauche',
      instruction: 'Positionnez-vous à gauche du véhicule, vue complète',
      icon: 'arrow-left',
      required: true,
      photo: null,
    },
    {
      type: 'right_side',
      label: 'Côté droit',
      instruction: 'Positionnez-vous à droite du véhicule, vue complète',
      icon: 'arrow-right',
      required: true,
      photo: null,
    },
    {
      type: 'interior',
      label: 'Intérieur (optionnel)',
      instruction: 'Tableau de bord, sièges, état général intérieur',
      icon: 'layout',
      required: false,
      photo: null,
    },
    {
      type: 'dashboard',
      label: 'Compteur (optionnel)',
      instruction: 'Photo nette du kilométrage et indicateurs',
      icon: 'activity',
      required: false,
      photo: null,
    },
  ]);

  const currentPhotoStep = steps[currentStep];
  const requiredPhotos = steps.filter(s => s.required && s.photo);
  const allRequiredDone = requiredPhotos.length === 4;
  const totalPhotos = steps.filter(s => s.photo).length;

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (cameraStatus !== 'granted' || locationStatus !== 'granted') {
      Alert.alert(
        'Permissions requises',
        'La caméra et la localisation sont nécessaires pour l\'inspection',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handleTakePhoto = async () => {
    if (!inspectionId) {
      Alert.alert('Erreur', 'ID inspection manquant');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      
      // 1. Afficher immédiatement la photo (URI locale) - FIX: évite disparition
      const newSteps = [...steps];
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        photoUri: asset.uri, // Affichage immédiat
      };
      setSteps(newSteps);

      // 2. Upload en arrière-plan
      setUploading(true);
      
      try {
        const location = await Location.getCurrentPositionAsync({});
        
        const photo = await uploadInspectionPhoto(
          inspectionId,
          asset.uri,
          currentPhotoStep.type,
          undefined,
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        );

        if (!photo) {
          throw new Error('Upload failed');
        }

        // 3. Mettre à jour avec la photo uploadée - FIX: garder URI locale
        const updatedSteps = [...steps];
        updatedSteps[currentStep] = {
          ...updatedSteps[currentStep],
          photo,
          photoUri: asset.uri, // Garder l'URI locale pour affichage
        };
        setSteps(updatedSteps);

        setUploading(false);

        // 4. Analyser avec l'IA (si base64 disponible)
        if (asset.base64) {
          await analyzeWithAI(asset.base64, currentStep);
        }

        // 5. Auto-passer à l'étape suivante
        setTimeout(() => {
          if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
          }
        }, 1500);

      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        
        // FIX: Annuler l'affichage si erreur
        const revertSteps = [...steps];
        revertSteps[currentStep] = {
          ...revertSteps[currentStep],
          photoUri: undefined,
          photo: null,
        };
        setSteps(revertSteps);
        
        setUploading(false);
        
        Alert.alert(
          'Erreur d\'upload',
          'La photo n\'a pas pu être uploadée. Réessayez.',
          [{ text: 'Réessayer', onPress: handleTakePhoto }]
        );
      }

    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Erreur lors de la prise de photo');
    }
  };

  const analyzeWithAI = async (base64: string, stepIndex: number) => {
    setAnalyzing(true);
    try {
      const description = await generatePhotoDescription(
        base64,
        steps[stepIndex].label,
        10000 // Timeout 10s
      );

      const updatedSteps = [...steps];
      updatedSteps[stepIndex] = {
        ...updatedSteps[stepIndex],
        aiDescription: description,
        descriptionApproved: false,
      };
      setSteps(updatedSteps);

      setAnalyzing(false);

      // Afficher la description si online
      const isOffline = description.includes('📡') || description.includes('⚠️');
      
      if (!isOffline) {
        Alert.alert(
          '🤖 Description IA',
          description,
          [
            {
              text: 'OK ✓',
              onPress: () => {
                const approved = [...steps];
                approved[stepIndex] = {
                  ...approved[stepIndex],
                  descriptionApproved: true,
                };
                setSteps(approved);
              }
            }
          ]
        );
      }

    } catch (error) {
      console.error('AI analysis error:', error);
      setAnalyzing(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipOptional = () => {
    if (!currentPhotoStep.required && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleRetakePhoto = async () => {
    // Supprimer la photo actuelle
    const newSteps = [...steps];
    newSteps[currentStep] = {
      ...newSteps[currentStep],
      photo: null,
      photoUri: undefined,
      aiDescription: undefined,
      descriptionApproved: false,
    };
    setSteps(newSteps);

    // Reprendre une photo
    setTimeout(() => handleTakePhoto(), 300);
  };

  const handleComplete = () => {
    const completedPhotos = steps.filter(s => s.photo).map(s => s.photo!);
    
    Alert.alert(
      '✅ Photos complètes',
      `${totalPhotos} photo${totalPhotos > 1 ? 's' : ''} capturée${totalPhotos > 1 ? 's' : ''}`,
      [
        {
          text: 'Continuer',
          onPress: () => {
            onComplete?.(completedPhotos);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec progression */}
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Photos du véhicule</Text>
          <Text style={styles.headerSubtitle}>
            Étape {currentStep + 1} / {steps.length}
          </Text>
          <Text style={styles.headerProgress}>
            {requiredPhotos.length}/4 obligatoires • {totalPhotos} total
          </Text>
        </View>
        
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Barre de progression circulaire */}
      <View style={styles.progressContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressSteps}>
          {steps.map((step, index) => {
            const isDone = !!step.photo;
            const isCurrent = index === currentStep;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.progressStepButton}
                onPress={() => goToStep(index)}
              >
                <View
                  style={[
                    styles.progressStep,
                    isDone && styles.progressStepDone,
                    isCurrent && styles.progressStepActive,
                  ]}
                >
                  {isDone ? (
                    <Feather name="check" size={16} color="#fff" />
                  ) : (
                    <Text style={[styles.progressStepText, isCurrent && styles.progressStepTextActive]}>
                      {index + 1}
                    </Text>
                  )}
                  {step.required && !isDone && (
                    <View style={styles.requiredBadge} />
                  )}
                </View>
                <Text
                  style={[
                    styles.progressStepLabel,
                    isCurrent && styles.progressStepLabelActive,
                    isDone && styles.progressStepLabelDone,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenu principal */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <View style={styles.instructionIconContainer}>
              <Feather name={currentPhotoStep.icon as any} size={32} color="#14b8a6" />
            </View>
            <View style={styles.instructionTextContainer}>
              <View style={styles.instructionTitleRow}>
                <Text style={styles.instructionTitle}>{currentPhotoStep.label}</Text>
                {currentPhotoStep.required ? (
                  <View style={styles.requiredTag}>
                    <Text style={styles.requiredTagText}>Obligatoire</Text>
                  </View>
                ) : (
                  <View style={styles.optionalTag}>
                    <Text style={styles.optionalTagText}>Optionnel</Text>
                  </View>
                )}
              </View>
              <Text style={styles.instructionText}>{currentPhotoStep.instruction}</Text>
            </View>
          </View>
        </View>

        {/* Zone photo */}
        <View style={styles.photoContainer}>
          {currentPhotoStep.photoUri ? (
            <View style={styles.photoPreview}>
              <Image
                source={{ uri: currentPhotoStep.photoUri }}
                style={styles.photoImage}
                resizeMode="cover"
              />
              
              {/* Overlay avec actions */}
              <View style={styles.photoOverlay}>
                {uploading && (
                  <View style={styles.uploadingIndicator}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.uploadingText}>Upload...</Text>
                  </View>
                )}
                
                {analyzing && (
                  <View style={styles.analyzingIndicator}>
                    <ActivityIndicator size="small" color="#14b8a6" />
                    <Text style={styles.analyzingText}>🤖 Analyse IA...</Text>
                  </View>
                )}
                
                {currentPhotoStep.photo && !uploading && (
                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={styles.retakeButton}
                      onPress={handleRetakePhoto}
                    >
                      <Feather name="rotate-cw" size={20} color="#fff" />
                      <Text style={styles.retakeButtonText}>Reprendre</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Badge description IA */}
              {currentPhotoStep.aiDescription && !currentPhotoStep.aiDescription.includes('📡') && (
                <View style={styles.aiDescriptionBadge}>
                  <Feather
                    name={currentPhotoStep.descriptionApproved ? "check-circle" : "cpu"}
                    size={16}
                    color={currentPhotoStep.descriptionApproved ? "#10b981" : "#14b8a6"}
                  />
                  <Text style={styles.aiDescriptionBadgeText}>
                    {currentPhotoStep.descriptionApproved ? 'Description validée' : 'IA analysée'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cameraPlaceholder}
              onPress={handleTakePhoto}
              disabled={uploading || analyzing}
            >
              <LinearGradient
                colors={['rgba(20, 184, 166, 0.1)', 'rgba(20, 184, 166, 0.05)']}
                style={styles.cameraGradient}
              >
                <View style={styles.cameraIconContainer}>
                  <Feather name="camera" size={64} color="#14b8a6" />
                </View>
                <Text style={styles.cameraText}>Toucher pour prendre la photo</Text>
                <Text style={styles.cameraSubtext}>Assurez-vous d'un bon éclairage</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Description IA */}
        {currentPhotoStep.aiDescription && !currentPhotoStep.aiDescription.includes('📡') && (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Feather name="message-circle" size={20} color="#14b8a6" />
              <Text style={styles.descriptionTitle}>Description IA</Text>
            </View>
            <Text style={styles.descriptionText}>{currentPhotoStep.aiDescription}</Text>
          </View>
        )}

        {/* Conseils */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Feather name="info" size={18} color="#f59e0b" />
            <Text style={styles.tipsTitle}>Conseils</Text>
          </View>
          <Text style={styles.tipsText}>• Gardez le véhicule entier dans le cadre</Text>
          <Text style={styles.tipsText}>• Évitez les reflets et ombres</Text>
          <Text style={styles.tipsText}>• Prenez la photo en mode paysage si possible</Text>
        </View>
      </ScrollView>

      {/* Footer avec navigation */}
      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.prevButton}
              onPress={handlePrevStep}
            >
              <Feather name="arrow-left" size={20} color="#64748b" />
              <Text style={styles.prevButtonText}>Précédent</Text>
            </TouchableOpacity>
          )}

          {!currentPhotoStep.required && !currentPhotoStep.photo && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipOptional}
            >
              <Text style={styles.skipButtonText}>Ignorer</Text>
              <Feather name="arrow-right" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {allRequiredDone && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.completeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Feather name="check-circle" size={20} color="#fff" />
                <Text style={styles.completeButtonText}>Terminer ({totalPhotos} photos)</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
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
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  headerProgress: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  progressContainer: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  progressSteps: {
    paddingHorizontal: 20,
    gap: 16,
  },
  progressStepButton: {
    alignItems: 'center',
    gap: 8,
  },
  progressStep: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#475569',
    position: 'relative',
  },
  progressStepActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
    transform: [{ scale: 1.1 }],
  },
  progressStepDone: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  progressStepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
  },
  progressStepTextActive: {
    color: '#fff',
  },
  progressStepLabel: {
    fontSize: 11,
    color: '#64748b',
    maxWidth: 60,
    textAlign: 'center',
  },
  progressStepLabelActive: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  progressStepLabelDone: {
    color: '#10b981',
  },
  requiredBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
  },
  instructionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  instructionHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  instructionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  requiredTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  requiredTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  optionalTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  optionalTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  instructionText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  photoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  cameraPlaceholder: {
    aspectRatio: 4 / 3,
  },
  cameraGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  cameraIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderStyle: 'dashed',
  },
  cameraText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14b8a6',
  },
  cameraSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  photoPreview: {
    position: 'relative',
    aspectRatio: 4 / 3,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingIndicator: {
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  analyzingIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  analyzingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  photoActions: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retakeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  aiDescriptionBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiDescriptionBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  descriptionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14b8a6',
  },
  descriptionText: {
    fontSize: 14,
    color: '#e2e8f0',
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  tipsText: {
    fontSize: 13,
    color: '#fbbf24',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  completeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
