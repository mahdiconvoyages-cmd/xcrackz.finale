import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import VehicleSchematic from './VehicleSchematic';

interface PhotoCardProps {
  type: 'front' | 'back' | 'left_front' | 'left_back' | 'right_front' | 'right_back' | 'interior' | 'dashboard';
  label: string;
  instruction?: string;
  isRequired?: boolean;
  isCaptured?: boolean;
  photoCount?: number;
  onPress?: () => void;
  disabled?: boolean;
  useRealPhoto?: boolean;
  vehicleType?: 'VL' | 'VU' | 'PL';
}

// Mapping des photos réelles pour chaque vue selon le type de véhicule
const VEHICLE_PHOTOS: Record<string, Record<string, any>> = {
  'VL': {
    'front': require('../../../assets/vehicles/avant.png'),
    'back': require('../../../assets/vehicles/arriere.png'),
    'left_front': require('../../../assets/vehicles/lateral gauche avant.png'),
    'left_back': require('../../../assets/vehicles/laterale gauche arriere.png'),
    'right_front': require('../../../assets/vehicles/lateraldroit avant.png'),
    'right_back': require('../../../assets/vehicles/lateral droit arriere.png'),
  },
  'VU': {
    'front': require('../../../assets/vehicles/master avant.png'),
    'back': require('../../../assets/vehicles/master avg (2).png'),
    'left_front': require('../../../assets/vehicles/master lateral droit avant.png'),
    'left_back': require('../../../assets/vehicles/master laterak gauche arriere.png'),
    'right_front': require('../../../assets/vehicles/master lateral droit avant.png'),
    'right_back': require('../../../assets/vehicles/master lateral droit arriere.png'),
  },
  'PL': {
    'front': require('../../../assets/vehicles/scania-avant.png'),
    'back': require('../../../assets/vehicles/scania-arriere.png'),
    'left_front': require('../../../assets/vehicles/scania-lateral-gauche-avant.png'),
    'left_back': require('../../../assets/vehicles/scania-lateral-gauche-arriere.png'),
    'right_front': require('../../../assets/vehicles/scania-lateral-droit-avant.png'),
    'right_back': require('../../../assets/vehicles/scania-lateral-droit-arriere.png'),
  }
};

export default function PhotoCard({
  type,
  label,
  instruction,
  isRequired = false,
  isCaptured = false,
  photoCount = 0,
  onPress,
  disabled = false,
  useRealPhoto = true,
  vehicleType = 'VL'
}: PhotoCardProps) {
  const { colors } = useTheme();

  // Vérifier si on a une vraie photo pour ce type de véhicule
  const realPhoto = VEHICLE_PHOTOS[vehicleType]?.[type];
  const hasRealPhoto = useRealPhoto && realPhoto;

  const borderColor = isCaptured 
    ? colors.success 
    : isRequired 
      ? colors.error 
      : colors.border;

  const backgroundColor = isCaptured ? `${colors.success}15` : colors.surface;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        {
          borderColor,
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Badge compteur de photos */}
      {photoCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{photoCount}</Text>
        </View>
      )}

      {/* Icône validation */}
      {isCaptured && (
        <View style={styles.checkIcon}>
          <Feather name="check-circle" size={24} color={colors.success} />
        </View>
      )}

      {/* Photo réelle OU SVG */}
      <View style={styles.imageContainer}>
        {hasRealPhoto ? (
          <View style={styles.realPhotoContainer}>
            <Image 
              source={realPhoto}
              style={styles.realPhoto}
              resizeMode="cover"
            />
            <View style={[styles.overlay, disabled && styles.overlayDisabled]} />
          </View>
        ) : (
          <VehicleSchematic type={type} height={96} />
        )}
      </View>

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {isRequired && <Text style={[styles.required, { color: colors.error }]}> *</Text>}
        </Text>
        {instruction && (
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            {instruction}
          </Text>
        )}
      </View>

      {/* Icône caméra si pas encore capturé */}
      {!isCaptured && (
        <View style={styles.cameraIcon}>
          <Feather name="camera" size={20} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4D6D',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  imageContainer: {
    marginBottom: 12,
  },
  realPhotoContainer: {
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  realPhoto: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  overlayDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  labelContainer: {
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  required: {
    marginLeft: 4,
  },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  cameraIcon: {
    marginTop: 8,
    alignItems: 'center',
  },
});
