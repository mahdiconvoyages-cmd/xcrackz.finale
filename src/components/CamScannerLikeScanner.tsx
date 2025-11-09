/**
 * SCANNER PROFESSIONNEL IDENTIQUE À CAMSCANNER
 * Utilise react-native-document-scanner-plugin
 * - Détection automatique des bords en temps réel
 * - Correction de perspective automatique
 * - Filtres professionnels
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DocumentScanner from 'react-native-document-scanner-plugin';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  visible: boolean;
  onScanComplete: (imageUri: string) => void;
  onCancel: () => void;
}

export default function CamScannerLikeScanner({ visible, onScanComplete, onCancel }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Scanner avec détection automatique (comme CamScanner)
  const handleScanDocument = async () => {
    try {
      setIsScanning(true);

      // Utilise le scanner natif avec détection ML
      const { scannedImages } = await DocumentScanner.scanDocument({
        // Options CamScanner-like  
        croppedImageQuality: 100,
        maxNumDocuments: 1,
        responseType: 'imageFilePath',  // ✅ CHANGÉ: Retourne un chemin de fichier au lieu de base64
      });

      if (scannedImages && scannedImages.length > 0) {
        const imageUri = scannedImages[0];
        console.log('✅ Scanner: Image capturée -', imageUri);
        setScannedImage(imageUri);
        onScanComplete(imageUri);
        setIsScanning(false);
      } else {
        setIsScanning(false);
        onCancel();
      }
    } catch (error: any) {
      console.error('❌ Erreur scan:', error);
      setIsScanning(false);

      if (error.code === 'userCanceled') {
        // L'utilisateur a annulé
        onCancel();
      } else {
        Alert.alert(
          'Erreur',
          'Impossible de scanner le document. Vérifiez les permissions caméra.',
          [{ text: 'OK', onPress: onCancel }]
        );
      }
    }
  };

  // Scanner depuis la galerie
  const handleScanFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        // Retourner directement l'URI de l'image de la galerie
        console.log('✅ Galerie: Image sélectionnée -', result.assets[0].uri);
        onScanComplete(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Erreur galerie:', error);
      Alert.alert('Erreur', 'Impossible de traiter l\'image');
    }
  };

  // Lancer automatiquement le scan quand le modal s'ouvre
  React.useEffect(() => {
    if (visible && !isScanning && !scannedImage) {
      handleScanDocument();
    }
    
    // Réinitialiser l'état quand le modal se ferme
    if (!visible) {
      setScannedImage(null);
      setIsScanning(false);
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        {isScanning ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Ouverture du scanner...</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.menuContainer}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.title}>Scanner Document</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="file-document-outline" size={80} color="#3b82f6" />
              </View>

              <Text style={styles.description}>
                Scanner professionnel avec détection automatique des bords
              </Text>

              <View style={styles.features}>
                <FeatureItem icon="check-circle" text="Détection automatique" />
                <FeatureItem icon="crop" text="Recadrage intelligent" />
                <FeatureItem icon="contrast" text="Correction perspective" />
                <FeatureItem icon="image-filter-black-white" text="Filtres pro" />
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleScanDocument}
                >
                  <Ionicons name="camera" size={24} color="white" />
                  <Text style={styles.primaryButtonText}>Prendre une photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleScanFromGallery}
                >
                  <Ionicons name="images" size={24} color="#3b82f6" />
                  <Text style={styles.secondaryButtonText}>Depuis la galerie</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons name={icon as any} size={20} color="#10b981" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
    marginLeft: 12,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});
