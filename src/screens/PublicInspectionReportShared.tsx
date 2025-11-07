import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface PublicInspectionReportProps {
  route: {
    params: {
      token: string;
    };
  };
}

export default function PublicInspectionReportShared({ route }: PublicInspectionReportProps) {
  const { token } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadReportData();
  }, [token]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_inspection_report_by_token', {
        p_token: token,
      });

      if (rpcError) throw rpcError;
      if (data?.error) throw new Error(data.error);

      setReportData(data);
    } catch (err: any) {
      console.error('Erreur chargement rapport:', err);
      setError(err.message || 'Impossible de charger le rapport');
    } finally {
      setLoading(false);
    }
  };

  const renderPhotoGrid = (photos: any[], title: string) => {
    if (!photos || photos.length === 0) return null;

    return (
      <View style={styles.photoSection}>
        <Text style={styles.photoSectionTitle}>{title}</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={photo.id || index}
              style={styles.photoItem}
              onPress={() => setSelectedPhoto(photo.photo_url || photo.url)}
            >
              <Image
                source={{ uri: photo.photo_url || photo.url }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderInspectionData = (inspection: any, title: string) => {
    if (!inspection) return null;

    return (
      <View style={styles.inspectionSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Kilométrage:</Text>
          <Text style={styles.dataValue}>{inspection.mileage_km || 'N/A'} km</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Niveau de Carburant:</Text>
          <Text style={styles.dataValue}>{inspection.fuel_level || 'N/A'}%</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Propreté Intérieure:</Text>
          <Text style={styles.dataValue}>{inspection.cleanliness_interior || 'N/A'}</Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Propreté Extérieure:</Text>
          <Text style={styles.dataValue}>{inspection.cleanliness_exterior || 'N/A'}</Text>
        </View>

        {inspection.driver_signature && (
          <View style={styles.signatureSection}>
            <Text style={styles.dataLabel}>Signature Chauffeur:</Text>
            <Image
              source={{ uri: inspection.driver_signature }}
              style={styles.signatureImage}
              resizeMode="contain"
            />
          </View>
        )}

        {renderPhotoGrid(inspection.photos, `Photos ${title}`)}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du rapport...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadReportData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!reportData) {
    return (
      <View style={styles.centerContainer}>
  <Text style={styles.errorText}>Aucune donnée disponible</Text>
      </View>
    );
  }

  const { mission_data, vehicle_data, inspection_departure, inspection_arrival } = reportData;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
  <Text style={styles.headerTitle}>Rapport d'Inspection</Text>
  <Text style={styles.headerSubtitle}>Mission #{mission_data?.reference || 'N/A'}</Text>
      </View>

      {/* Informations Véhicule */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}> Véhicule</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Marque/Modèle:</Text>
          <Text style={styles.dataValue}>
            {vehicle_data?.brand || 'N/A'} {vehicle_data?.model || ''}
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Immatriculation:</Text>
          <Text style={styles.dataValue}>{vehicle_data?.plate || 'N/A'}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>VIN:</Text>
          <Text style={styles.dataValue}>{vehicle_data?.vin || 'N/A'}</Text>
        </View>
      </View>

      {/* Informations Mission */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}> Mission</Text>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Départ:</Text>
          <Text style={styles.dataValue}>{mission_data?.pickup_address || 'N/A'}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Arrivée:</Text>
          <Text style={styles.dataValue}>{mission_data?.delivery_address || 'N/A'}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Date:</Text>
          <Text style={styles.dataValue}>
            {mission_data?.pickup_date ? new Date(mission_data.pickup_date).toLocaleDateString('fr-FR') : 'N/A'}
          </Text>
        </View>
      </View>

  {/* Inspection Départ */}
  {renderInspectionData(inspection_departure, 'Départ')}

  {/* Inspection Arrivée */}
  {renderInspectionData(inspection_arrival, 'Arrivée')}

      {/* Modal Photo */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalBackground} onPress={() => setSelectedPhoto(null)} />
          <View style={styles.modalContent}>
            <Image source={{ uri: selectedPhoto! }} style={styles.modalImage} resizeMode="contain" />
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedPhoto(null)}>
              <Ionicons name="close-circle" size={40} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  inspectionSection: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dataLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  photoSection: {
    marginTop: 20,
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  photoItem: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    margin: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  signatureSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  signatureImage: {
    width: '100%',
    height: 150,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: width,
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '90%',
    height: '90%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
});
