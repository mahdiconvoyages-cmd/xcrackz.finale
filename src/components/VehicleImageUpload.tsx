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
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,  // Désactiver le recadrage
          quality: 1,  // Qualité maximale, pas de redimensionnement
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,  // Désactiver le recadrage
          quality: 1,  // Qualité maximale, pas de redimensionnement
        });
      }

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      // Créer un nom de fichier unique
      const timestamp = Date.now();
      const extension = uri.split('.').pop() || 'jpg';
      const fileName = `vehicle_${timestamp}.${extension}`;
      const filePath = `vehicle-images/${fileName}`;

      // Convertir l'URI en Blob pour l'upload
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload vers Supabase Storage (bucket 'missions' comme le web)
      const { data, error } = await supabase.storage
        .from('missions')
        .upload(filePath, blob, {
          contentType: `image/${extension}`,
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Obtenir l'URL publique (bucket 'missions' comme le web)
      const { data: publicUrlData } = supabase.storage
        .from('missions')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        onImageUploaded(publicUrlData.publicUrl);
        Alert.alert('Succès', 'Photo téléchargée avec succès');
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      Alert.alert('Erreur', 'Impossible de télécharger l\'image');
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
