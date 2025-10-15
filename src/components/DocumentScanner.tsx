import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
// import DocumentScanner from 'react-native-document-scanner-plugin'; // DÉSACTIVÉ POUR EXPO GO
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onScanComplete: (imageUri: string) => void;
  onCancel: () => void;
}

export default function DocumentScannerModal({ visible, onScanComplete, onCancel }: Props) {
  const [scanning, setScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  const handleScanDocument = async () => {
    // DÉSACTIVÉ POUR EXPO GO - Scanner OCR non compatible
    Alert.alert(
      'Scanner non disponible', 
      'Le scanner OCR n\'est pas compatible avec Expo Go. Utilisez la galerie photo à la place.',
      [{ text: 'OK' }]
    );
    return;
    
    /* COMMENTÉ - Décommenter pour l'APK
    try {
      setScanning(true);
      const { scannedImages } = await DocumentScanner.scanDocument({
        croppedImageQuality: 100,
        maxNumDocuments: 1,
        responseType: 'imageFilePath',
      });

      if (scannedImages && scannedImages.length > 0) {
        setScannedImage(scannedImages[0]);
      }
    } catch (error: any) {
      console.error('Document scanning error:', error);
      if (error.message !== 'USER_CANCELED') {
        Alert.alert('Erreur', 'Impossible de scanner le document');
      }
    } finally {
      setScanning(false);
    }
    */
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setScannedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire pour prendre une photo');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setScannedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const handleConfirm = () => {
    if (scannedImage) {
      onScanComplete(scannedImage);
      setScannedImage(null);
    }
  };

  const handleRetake = () => {
    setScannedImage(null);
  };

  const handleClose = () => {
    setScannedImage(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scanner un document</Text>
          <View style={styles.placeholder} />
        </View>

        {scanning ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Scan en cours...</Text>
          </View>
        ) : scannedImage ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: scannedImage }} style={styles.previewImage} resizeMode="contain" />

            <View style={styles.previewActions}>
              <TouchableOpacity
                onPress={handleRetake}
                style={[styles.actionButton, styles.retakeButton]}
              >
                <Feather name="rotate-cw" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Reprendre</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirm}
                style={[styles.actionButton, styles.confirmButton]}
              >
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.optionsContainer}>
            <View style={styles.iconContainer}>
              <Feather name="file-text" size={64} color="#14b8a6" />
            </View>

            <Text style={styles.title}>Scanner un document</Text>
            <Text style={styles.subtitle}>
              Choisissez comment capturer le document
            </Text>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                onPress={handleScanDocument}
                style={[styles.optionButton, styles.scanButton]}
              >
                <Feather name="maximize" size={24} color="#fff" />
                <Text style={styles.optionButtonText}>Scanner (recommandé)</Text>
                <Text style={styles.optionButtonSubtext}>
                  Utilise la détection automatique des bords
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTakePhoto}
                style={[styles.optionButton, styles.cameraButton]}
              >
                <Feather name="camera" size={24} color="#fff" />
                <Text style={styles.optionButtonText}>Prendre une photo</Text>
                <Text style={styles.optionButtonSubtext}>
                  Utilise l'appareil photo normal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.optionButton, styles.galleryButton]}
              >
                <Feather name="image" size={24} color="#fff" />
                <Text style={styles.optionButtonText}>Choisir depuis la galerie</Text>
                <Text style={styles.optionButtonSubtext}>
                  Sélectionner une image existante
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
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
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  optionsContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 60,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonsContainer: {
    gap: 16,
  },
  optionButton: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#14b8a6',
  },
  cameraButton: {
    backgroundColor: '#3b82f6',
  },
  galleryButton: {
    backgroundColor: '#64748b',
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  optionButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1e293b',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  retakeButton: {
    backgroundColor: '#64748b',
  },
  confirmButton: {
    backgroundColor: '#14b8a6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
