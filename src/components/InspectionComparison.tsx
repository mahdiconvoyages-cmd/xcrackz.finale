/**
 * Composant Comparaison d'Inspection - React Native
 * 
 * Affichage côte à côte des inspections départ/arrivée
 * Calculs automatiques des différences
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

interface Inspection {
  id?: string;
  mileage_km?: number;
  fuel_level?: number;
  overall_condition?: string;
  external_cleanliness?: string;
  internal_cleanliness?: string;
  notes?: string;
  photos?: Array<{
    id?: string;
    photo_url: string;
    photo_type: string;
  }>;
}

interface InspectionComparisonProps {
  departureInspection: Inspection;
  arrivalInspection: Inspection;
  onPhotoClick?: (photos: any[], index: number, title: string) => void;
}

export default function InspectionComparison({
  departureInspection,
  arrivalInspection,
  onPhotoClick,
}: InspectionComparisonProps) {
  
  const getConditionColor = (condition?: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent': return '#10b981';
      case 'bon': case 'good': return '#3b82f6';
      case 'moyen': case 'fair': return '#f59e0b';
      case 'mauvais': case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDifference = (start?: number, end?: number) => {
    if (start === undefined || end === undefined) return null;
    const diff = end - start;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff}`;
  };

  const mileageDiff = getDifference(
    departureInspection.mileage_km,
    arrivalInspection.mileage_km
  );
  
  const fuelDiff = getDifference(
    departureInspection.fuel_level,
    arrivalInspection.fuel_level
  );

  const renderSection = (
    title: string,
    departureValue?: string | number,
    arrivalValue?: string | number,
    difference?: string | null,
    type: 'text' | 'condition' = 'text'
  ) => {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{title}</Text>
        
        <View style={styles.valuesContainer}>
          {/* Départ */}
          <View style={[styles.valueCard, styles.departureCard]}>
            {type === 'condition' && departureValue ? (
              <View style={styles.conditionBadge}>
                <View
                  style={[
                    styles.conditionDot,
                    { backgroundColor: getConditionColor(departureValue as string) },
                  ]}
                />
                <Text style={styles.valueText}>{departureValue}</Text>
              </View>
            ) : (
              <Text style={styles.valueText}>{departureValue || 'N/A'}</Text>
            )}
          </View>

          {/* Différence */}
          {difference && (
            <View style={styles.differenceContainer}>
              <Text style={[
                styles.differenceText,
                difference.startsWith('+') ? styles.differencePositive : styles.differenceNegative
              ]}>
                {difference}
              </Text>
            </View>
          )}

          {/* Arrivée */}
          <View style={[styles.valueCard, styles.arrivalCard]}>
            {type === 'condition' && arrivalValue ? (
              <View style={styles.conditionBadge}>
                <View
                  style={[
                    styles.conditionDot,
                    { backgroundColor: getConditionColor(arrivalValue as string) },
                  ]}
                />
                <Text style={styles.valueText}>{arrivalValue}</Text>
              </View>
            ) : (
              <Text style={styles.valueText}>{arrivalValue || 'N/A'}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerCard, styles.departureHeader]}>
          <Feather name="log-in" size={24} color="#10b981" />
          <Text style={styles.headerTitle}>Départ</Text>
        </View>
        
        <Feather name="arrow-right" size={24} color="#6b7280" />
        
        <View style={[styles.headerCard, styles.arrivalHeader]}>
          <Feather name="log-out" size={24} color="#3b82f6" />
          <Text style={styles.headerTitle}>Arrivée</Text>
        </View>
      </View>

      {/* Sections de comparaison */}
      <View style={styles.content}>
        {renderSection(
          '🚗 Kilométrage',
          departureInspection.mileage_km ? `${departureInspection.mileage_km.toLocaleString('fr-FR')} km` : undefined,
          arrivalInspection.mileage_km ? `${arrivalInspection.mileage_km.toLocaleString('fr-FR')} km` : undefined,
          mileageDiff ? `${mileageDiff} km` : null
        )}

        {renderSection(
          '⛽ Carburant',
          departureInspection.fuel_level !== undefined ? `${departureInspection.fuel_level}%` : undefined,
          arrivalInspection.fuel_level !== undefined ? `${arrivalInspection.fuel_level}%` : undefined,
          fuelDiff ? `${fuelDiff}%` : null
        )}

        {renderSection(
          '✓ État général',
          departureInspection.overall_condition,
          arrivalInspection.overall_condition,
          null,
          'condition'
        )}

        {renderSection(
          '🧽 Propreté ext.',
          departureInspection.external_cleanliness,
          arrivalInspection.external_cleanliness,
          null,
          'condition'
        )}

        {renderSection(
          '🧼 Propreté int.',
          departureInspection.internal_cleanliness,
          arrivalInspection.internal_cleanliness,
          null,
          'condition'
        )}
      </View>

      {/* Notes */}
      {(departureInspection.notes || arrivalInspection.notes) && (
        <View style={styles.notesSection}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          
          <View style={styles.notesContainer}>
            <View style={[styles.noteCard, styles.departureCard]}>
              <Text style={styles.noteTitle}>Départ</Text>
              <Text style={styles.noteText}>
                {departureInspection.notes || 'Aucune note'}
              </Text>
            </View>

            <View style={[styles.noteCard, styles.arrivalCard]}>
              <Text style={styles.noteTitle}>Arrivée</Text>
              <Text style={styles.noteText}>
                {arrivalInspection.notes || 'Aucune note'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Photos */}
      {(departureInspection.photos?.length || arrivalInspection.photos?.length) && (
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>📸 Photos</Text>
          
          <View style={styles.photosContainer}>
            {/* Photos départ */}
            <View style={styles.photosColumn}>
              <Text style={styles.photosColumnTitle}>Départ ({departureInspection.photos?.length || 0})</Text>
              <View style={styles.photosGrid}>
                {departureInspection.photos?.slice(0, 4).map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id || index}
                    onPress={() => onPhotoClick?.(
                      departureInspection.photos || [],
                      index,
                      'Photos Départ'
                    )}
                    style={styles.photoItem}
                  >
                    <Image
                      source={{ uri: photo.photo_url }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
                {(departureInspection.photos?.length || 0) > 4 && (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>
                      +{(departureInspection.photos?.length || 0) - 4}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Photos arrivée */}
            <View style={styles.photosColumn}>
              <Text style={styles.photosColumnTitle}>Arrivée ({arrivalInspection.photos?.length || 0})</Text>
              <View style={styles.photosGrid}>
                {arrivalInspection.photos?.slice(0, 4).map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id || index}
                    onPress={() => onPhotoClick?.(
                      arrivalInspection.photos || [],
                      index,
                      'Photos Arrivée'
                    )}
                    style={styles.photoItem}
                  >
                    <Image
                      source={{ uri: photo.photo_url }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
                {(arrivalInspection.photos?.length || 0) > 4 && (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>
                      +{(arrivalInspection.photos?.length || 0) - 4}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  departureHeader: {
    backgroundColor: '#f0fdf4',
  },
  arrivalHeader: {
    backgroundColor: '#eff6ff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  row: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  valuesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  departureCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  arrivalCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },
  conditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  conditionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  differenceContainer: {
    paddingHorizontal: 8,
  },
  differenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  differencePositive: {
    color: '#10b981',
  },
  differenceNegative: {
    color: '#ef4444',
  },
  notesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  notesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  noteCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  photosSection: {
    padding: 20,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photosColumn: {
    flex: 1,
  },
  photosColumnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  photoItem: {
    width: (CARD_WIDTH - 12) / 2,
    height: (CARD_WIDTH - 12) / 2,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  morePhotos: {
    width: (CARD_WIDTH - 12) / 2,
    height: (CARD_WIDTH - 12) / 2,
    borderRadius: 8,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
