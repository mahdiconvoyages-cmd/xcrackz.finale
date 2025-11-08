import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, 
  StyleSheet, ScrollView, Alert, Image, Dimensions, Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ImageView from 'react-native-image-viewing';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface Photo {
  id?: string;
  photo_url: string;
  photo_type?: string;
  created_at?: string;
}

interface Inspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  photos: Photo[];
}

interface Props {
  route: { params: { departureId?: string; arrivalId?: string; missionReference?: string } };
  navigation: any;
}

const ORDERED_TYPES = ['front','right_front','left_front','back','right_back','left_back','interior','dashboard'];

const PHOTO_TYPE_LABELS: Record<string, string> = {
  front: 'Avant',
  right_front: 'Avant droit',
  left_front: 'Avant gauche',
  back: 'Arrière',
  right_back: 'Arrière droit',
  left_back: 'Arrière gauche',
  interior: 'Intérieur',
  dashboard: 'Tableau de bord',
};

export default function InspectionReportAdvancedNew({ route, navigation }: Props) {
  const { departureId, arrivalId, missionReference } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [departure, setDeparture] = useState<Inspection | null>(null);
  const [arrival, setArrival] = useState<Inspection | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{ uri: string }[]>([]);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [departureId, arrivalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      let freshDeparture = null;
      let freshArrival = null;
      
      if (departureId) {
        const { data: d } = await supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('id', departureId)
          .single();
        
        const { data: dpView } = await supabase
          .from('inspection_photos')
          .select('id, photo_url, photo_type, created_at')
          .eq('inspection_id', departureId)
          .order('created_at');
        
        if (d) {
          freshDeparture = { 
            id: d.id, 
            inspection_type: 'departure' as const, 
            photos: dpView || []
          };
        }
      }
      
      if (arrivalId) {
        const { data: a } = await supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('id', arrivalId)
          .single();
        
        const { data: apView } = await supabase
          .from('inspection_photos')
          .select('id, photo_url, photo_type, created_at')
          .eq('inspection_id', arrivalId)
          .order('created_at');
        
        if (a) {
          freshArrival = { 
            id: a.id, 
            inspection_type: 'arrival' as const, 
            photos: apView || []
          };
        }
      }
      
      setDeparture(freshDeparture);
      setArrival(freshArrival);
    } catch (err: any) {
      console.error('❌ Erreur chargement rapport:', err);
      Alert.alert('Erreur', err.message || 'Erreur lors du chargement du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    const inspectionId = arrivalId || departureId;
    if (!inspectionId) {
      Alert.alert('Erreur', 'Aucune inspection sélectionnée');
      return;
    }

    setPdfGenerating(true);
    try {
      // Appeler la edge function pour générer le PDF
      const { data, error } = await supabase.functions.invoke('generate-inspection-pdf', {
        body: { inspectionId }
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        Alert.alert('✅ Succès', 'PDF généré avec succès !');
      } else {
        throw new Error('URL du PDF non reçue');
      }
    } catch (error: any) {
      console.error('❌ Erreur génération PDF:', error);
      Alert.alert('Erreur', error.message || 'Impossible de générer le PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleSharePdf = async () => {
    if (!pdfUrl) {
      Alert.alert('Info', 'Veuillez d\'abord générer le PDF');
      return;
    }

    try {
      // Télécharger le PDF localement
      const filename = `rapport-inspection-${missionReference || 'mission'}.pdf`;
      const localUri = `${FileSystem.documentDirectory}${filename}`;
      
      const download = await FileSystem.downloadAsync(pdfUrl, localUri);
      
      if (download.status === 200) {
        // Partager le fichier
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(download.uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Partager le rapport d\'inspection',
          });
        } else {
          Alert.alert('Info', 'Le partage n\'est pas disponible sur cet appareil');
        }
      } else {
        throw new Error('Échec du téléchargement du PDF');
      }
    } catch (error: any) {
      console.error('❌ Erreur partage PDF:', error);
      Alert.alert('Erreur', error.message || 'Impossible de partager le PDF');
    }
  };

  const handleShareByEmail = async () => {
    if (!pdfUrl) {
      Alert.alert('Info', 'Veuillez d\'abord générer le PDF');
      return;
    }

    // Option alternative: partager juste le lien
    try {
      await Share.share({
        message: `Rapport d'inspection - Mission ${missionReference}\n\nConsultez le rapport complet: ${pdfUrl}`,
        title: 'Rapport d\'inspection',
      });
    } catch (error: any) {
      console.error('❌ Erreur partage:', error);
    }
  };

  const grouped = useMemo(() => {
    const groupByType = (photos?: Photo[]) => {
      const map = new Map<string, Photo[]>();
      (photos || []).forEach((p) => {
        const key = (p.photo_type || 'autre').toLowerCase();
        map.set(key, [...(map.get(key) || []), p]);
      });
      return map;
    };

    return {
      departure: groupByType(departure?.photos),
      arrival: groupByType(arrival?.photos),
    };
  }, [departure?.photos, arrival?.photos]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    [...grouped.departure.keys(), ...grouped.arrival.keys()].forEach((k) => set.add(k));
    return Array.from(set).sort((a, b) => {
      const ia = ORDERED_TYPES.indexOf(a);
      const ib = ORDERED_TYPES.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [grouped]);

  const openLightbox = (photos: Photo[], index: number) => {
    setLightboxImages(photos.map(p => ({ uri: p.photo_url })));
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Chargement du rapport...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <LinearGradient
          colors={['#14b8a6', '#0d9488']}
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Rapport d'inspection</Text>
            {missionReference && (
              <Text style={styles.headerSubtitle}>Mission {missionReference}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Actions - Générer et Partager PDF */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleGeneratePdf}
            disabled={pdfGenerating}
          >
            <LinearGradient
              colors={pdfGenerating ? ['#94a3b8', '#64748b'] : ['#8b5cf6', '#7c3aed']}
              style={styles.actionGradient}
            >
              {pdfGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name={pdfUrl ? "checkmark-circle" : "document-text"} size={20} color="#fff" />
              )}
              <Text style={styles.actionText}>
                {pdfGenerating ? 'Génération...' : pdfUrl ? 'PDF généré ✓' : 'Générer PDF'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {pdfUrl && (
            <View style={styles.shareButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.halfButton]}
                onPress={handleSharePdf}
              >
                <LinearGradient
                  colors={['#06b6d4', '#0891b2']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="share-social" size={20} color="#fff" />
                  <Text style={styles.actionText}>Partager</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.halfButton]}
                onPress={handleShareByEmail}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="mail" size={20} color="#fff" />
                  <Text style={styles.actionText}>Envoyer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Vue avancée par type de photo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="grid" size={20} color="#14b8a6" />
            <Text style={styles.sectionTitle}>Vue avancée par type de photo</Text>
          </View>

          {allTypes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyText}>Aucune photo disponible</Text>
            </View>
          ) : (
            allTypes.map((type) => {
              const leftPhotos = grouped.departure.get(type) || [];
              const rightPhotos = grouped.arrival.get(type) || [];
              const label = PHOTO_TYPE_LABELS[type] || type.replace(/_/g, ' ');

              return (
                <View key={type} style={styles.photoGroup}>
                  {/* Départ */}
                  <View style={styles.inspectionBlock}>
                    <View style={[styles.inspectionHeader, styles.departureHeader]}>
                      <Ionicons name="exit-outline" size={16} color="#16a34a" />
                      <Text style={styles.inspectionHeaderText}>
                        Départ • {label} ({leftPhotos.length})
                      </Text>
                    </View>
                    <View style={styles.photosGrid}>
                      {leftPhotos.length === 0 ? (
                        <Text style={styles.noPhotosText}>Aucune photo</Text>
                      ) : (
                        leftPhotos.map((photo, idx) => (
                          <TouchableOpacity
                            key={photo.id || idx}
                            style={styles.photoItem}
                            onPress={() => openLightbox(leftPhotos, idx)}
                          >
                            <Image
                              source={{ uri: photo.photo_url }}
                              style={styles.photoImage}
                              resizeMode="cover"
                            />
                            <View style={styles.photoOverlay} />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>

                  {/* Arrivée */}
                  <View style={styles.inspectionBlock}>
                    <View style={[styles.inspectionHeader, styles.arrivalHeader]}>
                      <Ionicons name="enter-outline" size={16} color="#2563eb" />
                      <Text style={styles.inspectionHeaderText}>
                        Arrivée • {label} ({rightPhotos.length})
                      </Text>
                    </View>
                    <View style={styles.photosGrid}>
                      {rightPhotos.length === 0 ? (
                        <Text style={styles.noPhotosText}>Aucune photo</Text>
                      ) : (
                        rightPhotos.map((photo, idx) => (
                          <TouchableOpacity
                            key={photo.id || idx}
                            style={styles.photoItem}
                            onPress={() => openLightbox(rightPhotos, idx)}
                          >
                            <Image
                              source={{ uri: photo.photo_url }}
                              style={styles.photoImage}
                              resizeMode="cover"
                            />
                            <View style={styles.photoOverlay} />
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Comparaison côte-à-côte */}
        {departure?.photos?.length && arrival?.photos?.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="swap-horizontal" size={20} color="#a855f7" />
              <Text style={styles.sectionTitle}>Comparaison Départ vs Arrivée</Text>
            </View>

            {allTypes.map((type) => {
              const leftPhoto = (grouped.departure.get(type) || [])[0];
              const rightPhoto = (grouped.arrival.get(type) || [])[0];
              
              if (!leftPhoto && !rightPhoto) return null;

              const label = PHOTO_TYPE_LABELS[type] || type.replace(/_/g, ' ');

              return (
                <View key={`cmp-${type}`} style={styles.comparisonRow}>
                  {/* Départ */}
                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>Départ • {label}</Text>
                    {leftPhoto ? (
                      <TouchableOpacity
                        onPress={() => openLightbox(grouped.departure.get(type)!, 0)}
                      >
                        <Image
                          source={{ uri: leftPhoto.photo_url }}
                          style={styles.comparisonImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.comparisonEmpty}>
                        <Text style={styles.comparisonEmptyText}>Aucune photo</Text>
                      </View>
                    )}
                  </View>

                  {/* Arrivée */}
                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>Arrivée • {label}</Text>
                    {rightPhoto ? (
                      <TouchableOpacity
                        onPress={() => openLightbox(grouped.arrival.get(type)!, 0)}
                      >
                        <Image
                          source={{ uri: rightPhoto.photo_url }}
                          style={styles.comparisonImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.comparisonEmpty}>
                        <Text style={styles.comparisonEmptyText}>Aucune photo</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Lightbox */}
      <ImageView
        images={lightboxImages}
        imageIndex={lightboxIndex}
        visible={lightboxVisible}
        onRequestClose={() => setLightboxVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerContent: {
    gap: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  photoGroup: {
    marginBottom: 24,
    gap: 12,
  },
  inspectionBlock: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  departureHeader: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  arrivalHeader: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  inspectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  noPhotosText: {
    fontSize: 12,
    color: '#64748b',
    padding: 8,
  },
  photoItem: {
    width: (width - 32 - 16 - 24) / 3, // Responsive 3 colonnes
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '600',
  },
  comparisonImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  comparisonEmpty: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  comparisonEmptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  // Actions
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  halfButton: {
    flex: 1,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
});
