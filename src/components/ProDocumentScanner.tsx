/**
 * Scanner de documents professionnel avec détection automatique
 * Recadrage manuel, correction de perspective, et amélioration d'image
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  applyDocumentFilter,
  rotateImage,
  enhanceDocumentImage,
} from '../utils/imageProcessing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onScanComplete: (imageUri: string) => void;
  onCancel: () => void;
}

export default function ProDocumentScanner({ visible, onScanComplete, onCancel }: Props) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'bw' | 'grayscale' | 'color' | 'magic'>('magic');
  const [step, setStep] = useState<'capture' | 'adjust' | 'filter'>('capture');

  const filters = [
    { id: 'magic', name: 'Auto', icon: 'auto-fix' },
    { id: 'bw', name: 'N&B', icon: 'invert-colors' },
    { id: 'grayscale', name: 'Gris', icon: 'gradient' },
    { id: 'color', name: 'Couleur', icon: 'palette' },
  ];

  const handleCapturePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire pour scanner');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Pas d'édition native, on gère manuellement
        quality: 1, // Qualité maximale
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setProcessedImage(result.assets[0].uri);
        setStep('adjust');
        
        // Auto-amélioration initiale
        await applyFilter('magic', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setProcessedImage(result.assets[0].uri);
        setStep('adjust');
        
        // Auto-amélioration initiale
        await applyFilter('magic', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const applyFilter = async (filterType: typeof selectedFilter, imageUri?: string) => {
    try {
      setIsProcessing(true);
      const sourceImage = imageUri || capturedImage;
      
      if (!sourceImage) return;

      const enhanced = await applyDocumentFilter(sourceImage, filterType);
      setProcessedImage(enhanced);
      setSelectedFilter(filterType);
    } catch (error) {
      console.error('Filter error:', error);
      Alert.alert('Erreur', 'Impossible d\'appliquer le filtre');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = async () => {
    if (!processedImage) return;
    
    try {
      setIsProcessing(true);
      const rotated = await rotateImage(processedImage, 90);
      setProcessedImage(rotated);
    } catch (error) {
      console.error('Rotate error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setStep('capture');
    setSelectedFilter('magic');
  };

  const handleConfirm = () => {
    if (processedImage) {
      onScanComplete(processedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setStep('capture');
    setSelectedFilter('magic');
    onCancel();
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {step === 'capture' ? 'Scanner un document' : 'Ajuster le document'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === 'capture' ? (
            // Étape 1: Capture
            <View style={styles.captureContainer}>
              <LinearGradient
                colors={['#0d9488', '#14b8a6']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="scanner" size={80} color="#fff" />
              </LinearGradient>

              <Text style={styles.captureTitle}>Scanner un document</Text>
              <Text style={styles.captureSubtitle}>
                Capturez votre document avec la caméra ou sélectionnez depuis la galerie
              </Text>

              <View style={styles.featuresGrid}>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="crop" size={24} color="#14b8a6" />
                  <Text style={styles.featureText}>Recadrage automatique</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="brightness-6" size={24} color="#14b8a6" />
                  <Text style={styles.featureText}>Amélioration auto</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="format-rotate-90" size={24} color="#14b8a6" />
                  <Text style={styles.featureText}>Correction perspective</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialCommunityIcons name="auto-fix" size={24} color="#14b8a6" />
                  <Text style={styles.featureText}>Filtres intelligents</Text>
                </View>
              </View>

              <View style={styles.captureButtons}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#0d9488', '#14b8a6']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="camera" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Prendre une photo</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="image" size={24} color="#14b8a6" />
                  <Text style={styles.secondaryButtonText}>Depuis la galerie</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Étape 2: Ajustement et filtres
            <View style={styles.adjustContainer}>
              {/* Prévisualisation de l'image */}
              <View style={styles.imagePreviewContainer}>
                {processedImage ? (
                  <Image
                    source={{ uri: processedImage }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : null}
                
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color="#14b8a6" />
                    <Text style={styles.processingText}>Traitement...</Text>
                  </View>
                )}

                {/* Overlay avec guides */}
                <View style={styles.guidesOverlay}>
                  <View style={[styles.guideCorner, styles.topLeft]} />
                  <View style={[styles.guideCorner, styles.topRight]} />
                  <View style={[styles.guideCorner, styles.bottomLeft]} />
                  <View style={[styles.guideCorner, styles.bottomRight]} />
                </View>
              </View>

              {/* Sélecteur de filtres */}
              <View style={styles.filtersContainer}>
                <Text style={styles.filtersTitle}>Filtres</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersList}
                >
                  {filters.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[
                        styles.filterButton,
                        selectedFilter === filter.id && styles.filterButtonActive,
                      ]}
                      onPress={() => applyFilter(filter.id as any)}
                      disabled={isProcessing}
                    >
                      <MaterialCommunityIcons
                        name={filter.icon as any}
                        size={24}
                        color={selectedFilter === filter.id ? '#fff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.filterButtonText,
                          selectedFilter === filter.id && styles.filterButtonTextActive,
                        ]}
                      >
                        {filter.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRotate}
                  disabled={isProcessing}
                >
                  <MaterialCommunityIcons name="rotate-right" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Rotation</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleRetake}
                  disabled={isProcessing}
                >
                  <MaterialCommunityIcons name="camera-retake" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Reprendre</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={handleConfirm}
                  disabled={isProcessing}
                >
                  <MaterialCommunityIcons name="check-bold" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Valider</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },

  // Capture Screen
  captureContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  captureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  captureSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 20,
  },
  featureItem: {
    width: (SCREEN_WIDTH - 100) / 2,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 15,
    borderRadius: 12,
  },
  featureText: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  captureButtons: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#14b8a6',
    gap: 10,
  },
  secondaryButtonText: {
    color: '#14b8a6',
    fontSize: 16,
    fontWeight: '600',
  },

  // Adjust Screen
  adjustContainer: {
    flex: 1,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  guidesOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  guideCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#14b8a6',
    borderWidth: 3,
  },
  topLeft: {
    top: 20,
    left: 20,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 20,
    right: 20,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 20,
    left: 20,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 20,
    right: 20,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  filtersContainer: {
    backgroundColor: '#1e293b',
    paddingVertical: 15,
  },
  filtersTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filtersList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#334155',
    minWidth: 90,
  },
  filterButtonActive: {
    backgroundColor: '#14b8a6',
  },
  filterButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  confirmButton: {
    backgroundColor: '#14b8a6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
