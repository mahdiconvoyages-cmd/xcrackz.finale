import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';

interface Props {
  value: string | null;
  onImageUploaded: (url: string) => void;
  label?: string;
}

export default function VehicleImageUpload({ value, onImageUploaded, label }: Props) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissions requises',
          'Les permissions caméra et galerie sont nécessaires pour cette fonctionnalité.'
        );
        return false;
      }
    }
    return true;
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une source',
      [
        {
          text: 'Appareil photo',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Galerie',
          onPress: () => pickImage('gallery'),
        },
        {
          text: 'Annuler',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      let result;
      
      const commonOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,  // Permettre le recadrage pour un meilleur format
        aspect: [4, 3] as [number, number],
        quality: 0.8,  // Qualité légèrement réduite pour optimiser la taille
      };

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(commonOptions);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(commonOptions);
      }

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('❌ Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      console.log('📤 [VEHICLE PHOTO] Début upload depuis:', uri.substring(0, 50) + '...');
      
      // Créer un nom de fichier unique
      const timestamp = Date.now();
      const extension = uri.split('.').pop() || 'jpg';
      const fileName = `vehicle_${timestamp}.${extension}`;
      const filePath = fileName;

      console.log('📂 [VEHICLE PHOTO] Nom fichier:', fileName);

      // Méthode optimisée pour React Native : fetch + arrayBuffer + base64
      console.log('📥 [VEHICLE PHOTO] Lecture du fichier...');
      const response = await fetch(uri);
      
      if (!response.ok) {
        throw new Error(`Erreur lecture fichier: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log(`📊 [VEHICLE PHOTO] Taille: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

      // Convertir ArrayBuffer en base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      console.log('☁️ [VEHICLE PHOTO] Upload vers Supabase Storage...');

      // Upload vers Supabase Storage (bucket 'vehicle-images')
      const { data, error } = await supabase.storage
        .from('vehicle-images')
        .upload(filePath, decode(base64), {
          contentType: `image/${extension}`,
          upsert: false,
        });

      if (error) {
        console.error('❌ [VEHICLE PHOTO] Erreur Storage:', error);
        throw error;
      }

      console.log('✅ [VEHICLE PHOTO] Fichier uploadé:', data?.path || filePath);

      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        console.log('🔗 [VEHICLE PHOTO] URL publique obtenue');
        onImageUploaded(publicUrlData.publicUrl);
        Alert.alert('✅ Succès', 'Photo téléchargée avec succès');
      } else {
        throw new Error('Impossible d\'obtenir l\'URL publique');
      }
    } catch (error: any) {
      console.error('❌ [VEHICLE PHOTO] Erreur complète:', error);
      Alert.alert(
        '❌ Erreur',
        error.message || 'Impossible de télécharger l\'image. Vérifiez vos permissions de stockage.'
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onImageUploaded(''),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: colors.text }]}>{label}</Text>}
      
      {value ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: value }} style={styles.image} />
          
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={showImagePickerOptions}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.actionButtonText}>Changer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={removeImage}
            >
              <Ionicons name="trash" size={20} color="white" />
              <Text style={styles.actionButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadButton, { 
            backgroundColor: colors.surface,
            borderColor: colors.border 
          }]}
          onPress={showImagePickerOptions}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="camera" size={48} color={colors.textSecondary} />
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                Ajouter une photo du véhicule
              </Text>
              <Text style={[styles.uploadSubtext, { color: colors.textSecondary }]}>
                Appareil photo ou galerie
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  uploadButton: {
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
