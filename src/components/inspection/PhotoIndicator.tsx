/**
 * PhotoIndicator - Composant d'indication visuelle pour la capture de photo
 * Affiche une image du véhicule pour guider l'utilisateur
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Mapping des images de véhicules par type et angle
const VEHICLE_PHOTOS: Record<string, Record<string, any>> = {
  VL: {
    front: require('../../../assets/vehicles/avant.png'),
    back: require('../../../assets/vehicles/arriere.png'),
    left_front: require('../../../assets/vehicles/lateral gauche avant.png'),
    left_back: require('../../../assets/vehicles/laterale gauche arriere.png'),
    right_front: require('../../../assets/vehicles/lateraldroit avant.png'),
    right_back: require('../../../assets/vehicles/lateral droit arriere.png'),
  },
  VU: {
    front: require('../../../assets/vehicles/master avant.png'),
    back: require('../../../assets/vehicles/master avg (2).png'),
    left_front: require('../../../assets/vehicles/master laterak gauche arriere.png'),
    left_back: require('../../../assets/vehicles/master laterak gauche arriere.png'),
    right_front: require('../../../assets/vehicles/master lateral droit avant.png'),
    right_back: require('../../../assets/vehicles/master lateral droit arriere.png'),
  },
  PL: {
    front: require('../../../assets/vehicles/scania-avant.png'),
    back: require('../../../assets/vehicles/scania-arriere.png'),
    left_front: require('../../../assets/vehicles/scania-lateral-gauche-avant.png'),
    left_back: require('../../../assets/vehicles/scania-lateral-gauche-arriere.png'),
    right_front: require('../../../assets/vehicles/scania-lateral-droit-avant.png'),
    right_back: require('../../../assets/vehicles/scania-lateral-droit-arriere.png'),
  },
};

interface PhotoIndicatorProps {
  vehicleType: 'VL' | 'VU' | 'PL';
  photoType: string;
  isCaptured: boolean;
}

export default function PhotoIndicator({ vehicleType, photoType, isCaptured }: PhotoIndicatorProps) {
  // Récupérer l'image appropriée
  const vehicleImage = VEHICLE_PHOTOS[vehicleType]?.[photoType];

  return (
    <View style={styles.container}>
      {vehicleImage ? (
        <Image
          source={vehicleImage}
          style={styles.vehicleImage}
          resizeMode="contain"
        />
      ) : (
        // Fallback: icône caméra simple
        <Feather name="camera" size={32} color="#94a3b8" />
      )}
      
      {/* Overlay de validation */}
      {isCaptured && (
        <View style={styles.capturedOverlay}>
          <Feather name="check-circle" size={24} color="#10b981" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
  },
  capturedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 4,
  },
});
