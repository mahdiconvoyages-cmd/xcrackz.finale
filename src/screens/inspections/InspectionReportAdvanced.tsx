import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, 
  StyleSheet, Dimensions, Alert, Image, ScrollView
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ImageView from 'react-native-image-viewing';
import { supabase } from '../../lib/supabase';
import { getCachedPdfUrl, generateAndWaitPdf } from '../../shared/services/inspectionPdfEdgeService';
import ShareReportSheet from '../../components/ShareReportSheet';

// Fallback si FastImage n'est pas disponible
let FastImage: any = Image;

try {
  const FastImageModule = require('react-native-fast-image');
  FastImage = FastImageModule.default || FastImageModule;
} catch (e) {
  console.log('⚠️ FastImage non disponible, utilisation de Image standard');
}

interface Photo {
  id?: string;
  photo_url: string;
  thumbnail_url?: string;  // Add thumbnail support
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
}

interface PhotoGroup {
  type: string;
  departurePhotos: Photo[];
  arrivalPhotos: Photo[];
}

const ORDERED_TYPES = ['front','right_front','left_front','back','right_back','left_back','interior','dashboard'];

export default function InspectionReportAdvanced({ route }: Props) {
  const { departureId, arrivalId, missionReference } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [departure, setDeparture] = useState<Inspection | null>(null);
  const [arrival, setArrival] = useState<Inspection | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{ uri: string }[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendVisible, setSendVisible] = useState(false);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState<string>('');
  const [plate, setPlate] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try cache first
        const cacheKey = `${departureId || ''}_${arrivalId || ''}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
          setDeparture(cached.departure);
          setArrival(cached.arrival);
          setPdfUrl(cached.pdfUrl);
          setLoading(false);
        }
        
        // Fetch fresh data
        let freshDeparture = null;
        let freshArrival = null;
        
        if (departureId) {
          const { data: d, error: dErr } = await supabase.from('vehicle_inspections').select('*, mission:missions(id, vehicle:vehicles(brand, model, plate))').eq('id', departureId).single();
          
          // Stocker mission_id et infos véhicule
          if (d?.mission) {
            setMissionId(d.mission.id);
            if (d.mission.vehicle) {
              setVehicleLabel(`${d.mission.vehicle.brand} ${d.mission.vehicle.model}`);
              setPlate(d.mission.vehicle.plate);
            }
          }
          
          // Essayer d'abord inspection_photos (view compatible), puis inspection_photos_v2
          let dp = null;
          const { data: dpView } = await supabase
            .from('inspection_photos')
            .select('id, photo_url, photo_type, created_at')
            .eq('inspection_id', departureId)
            .order('created_at');
          
          if (dpView && dpView.length > 0) {
            dp = dpView;
          } else {
            const { data: dpV2 } = await supabase
              .from('inspection_photos_v2')
              .select('id, full_url, thumbnail_url, photo_type, created_at')
              .eq('inspection_id', departureId)
              .order('created_at');
            dp = dpV2?.map(p => ({
              id: p.id,
              photo_url: p.full_url,
              thumbnail_url: p.thumbnail_url,
              photo_type: p.photo_type,
              created_at: p.created_at
            })) || [];
          }
          
          if (d) {
            freshDeparture = { 
              id: d.id, 
              inspection_type: 'departure' as const, 
              photos: (dp || []).map((p: any) => ({
                id: p.id,
                photo_url: p.photo_url || p.full_url,
                thumbnail_url: p.thumbnail_url,
                photo_type: p.photo_type,
                created_at: p.created_at
              }))
            };
          }
          console.log(`📸 Départ: ${dp?.length || 0} photos chargées`);
        }
        
        if (arrivalId) {
          const { data: a, error: aErr } = await supabase.from('vehicle_inspections').select('*, mission:missions(id, vehicle:vehicles(brand, model, plate))').eq('id', arrivalId).single();
          
          // Stocker mission_id et infos véhicule (si pas déjà fait)
          if (a?.mission && !missionId) {
            setMissionId(a.mission.id);
            if (a.mission.vehicle) {
              setVehicleLabel(`${a.mission.vehicle.brand} ${a.mission.vehicle.model}`);
              setPlate(a.mission.vehicle.plate);
            }
          }
          
          // Essayer d'abord inspection_photos (view compatible), puis inspection_photos_v2
          let ap = null;
          const { data: apView } = await supabase
            .from('inspection_photos')
            .select('id, photo_url, photo_type, created_at')
            .eq('inspection_id', arrivalId)
            .order('created_at');
          
          if (apView && apView.length > 0) {
            ap = apView;
          } else {
            const { data: apV2 } = await supabase
              .from('inspection_photos_v2')
              .select('id, full_url, thumbnail_url, photo_type, created_at')
              .eq('inspection_id', arrivalId)
              .order('created_at');
            ap = apV2?.map(p => ({
              id: p.id,
              photo_url: p.full_url,
              thumbnail_url: p.thumbnail_url,
              photo_type: p.photo_type,
              created_at: p.created_at
            })) || [];
          }
          
          if (a) {
            freshArrival = { 
              id: a.id, 
              inspection_type: 'arrival' as const, 
              photos: (ap || []).map((p: any) => ({
                id: p.id,
                photo_url: p.photo_url || p.full_url,
                thumbnail_url: p.thumbnail_url,
                photo_type: p.photo_type,
                created_at: p.created_at
              }))
            };
          }
          console.log(`📸 Arrivée: ${ap?.length || 0} photos chargées`);
        }
        
        setDeparture(freshDeparture);
        setArrival(freshArrival);
        
        // Check PDF cache
        const inspectionId = arrivalId || departureId;
        let freshPdfUrl = null;
        if (inspectionId) {
          const cached = await getCachedPdfUrl(inspectionId);
          if (cached) {
            freshPdfUrl = cached;
            setPdfUrl(cached);
          }
        }
        
        // Update cache
        await cacheManager.set(cacheKey, {
          departure: freshDeparture,
          arrival: freshArrival,
          pdfUrl: freshPdfUrl
        });
      } catch (err: any) {
        console.error('❌ Erreur chargement rapport:', err);
        setError(err.message || 'Erreur lors du chargement du rapport');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [departureId, arrivalId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const inspectionId = arrivalId || departureId;
    if (inspectionId) {
      const cached = await getCachedPdfUrl(inspectionId);
      if (cached) setPdfUrl(cached);
    }
    setRefreshing(false);
  }, [arrivalId, departureId]);

  const openLightbox = useCallback((photos: Photo[], index: number) => {
    setLightboxImages(photos.map(p => ({ uri: p.photo_url })));
    setLightboxIndex(index);
    setLightboxVisible(true);
  }, []);

  const handleGeneratePdf = useCallback(async () => {
    const inspectionId = arrivalId || departureId;
    if (!inspectionId) {
      Alert.alert('Erreur', 'Aucune inspection sélectionnée');
      return;
    }

    setPdfGenerating(true);
    try {
      const cached = await getCachedPdfUrl(inspectionId);
      if (cached) {
        setPdfUrl(cached);
        Alert.alert('PDF disponible', 'Le PDF est déjà généré et prêt.', [
          { text: 'OK' }
        ]);
        return;
      }

      const res = await generateAndWaitPdf(inspectionId, 20000);
      if (res.success && res.pdfUrl) {
        setPdfUrl(res.pdfUrl);
        Alert.alert('Succès', 'PDF généré avec succès !', [
          { text: 'OK' }
        ]);
      } else {
        Alert.alert('Erreur', res.message || 'Échec de la génération PDF');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur réseau');
    } finally {
      setPdfGenerating(false);
    }
  }, [arrivalId, departureId]);

  const photoGroups = useMemo(() => {
    const group = (photos?: Photo[]) => {
      const m = new Map<string, Photo[]>();
      (photos || []).forEach((p) => {
        const k = (p.photo_type || 'autre').toLowerCase();
        m.set(k, [...(m.get(k) || []), p]);
      });
      return m;
    };
    
    const depMap = group(departure?.photos);
    const arrMap = group(arrival?.photos);
    
    const allTypes = new Set<string>();
    [...depMap.keys(), ...arrMap.keys()].forEach((k) => allTypes.add(k));
    
    const sorted = Array.from(allTypes).sort((a, b) => {
      const ia = ORDERED_TYPES.indexOf(a);
      const ib = ORDERED_TYPES.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    
    const groups: PhotoGroup[] = sorted.map(type => ({
      type,
      departurePhotos: depMap.get(type) || [],
      arrivalPhotos: arrMap.get(type) || []
    }));
    
    return groups;
  }, [departure?.photos, arrival?.photos]);

  // Memoized photo thumbnail component
  const PhotoThumbnail = React.memo(({ photo, onPress }: { photo: Photo; onPress: () => void }) => {
    const imageSource = { uri: photo.thumbnail_url || photo.photo_url };
    const imageProps = FastImagePriority.normal 
      ? { source: { ...imageSource, priority: FastImagePriority.normal }, resizeMode: FastImageResizeMode.cover }
      : { source: imageSource, resizeMode: 'cover' };
    
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <FastImage
          {...imageProps}
          style={styles.thumb}
        />
      </TouchableOpacity>
    );
  });

  // Memoized photo group row component
  const PhotoGroupRow = React.memo(({ group }: { group: PhotoGroup }) => (
    <View style={styles.row}>
      <View style={[styles.col, styles.depart]}>
        <Text style={[styles.colTitle, { color: '#166534' }]}>
          Départ • {group.type.replace(/_/g, ' ')} ({group.departurePhotos.length})
        </Text>
        <View style={styles.grid}>
          {group.departurePhotos.length === 0 ? (
            <Text style={[styles.muted, { color: '#166534' }]}>Aucune photo</Text>
          ) : (
            group.departurePhotos.map((p, idx) => (
              <PhotoThumbnail
                key={p.id || idx}
                photo={p}
                onPress={() => openLightbox(group.departurePhotos, idx)}
              />
            ))
          )}
        </View>
      </View>
      <View style={[styles.col, styles.arrivee]}>
        <Text style={[styles.colTitle, { color: '#1e3a8a' }]}>
          Arrivée • {group.type.replace(/_/g, ' ')} ({group.arrivalPhotos.length})
        </Text>
        <View style={styles.grid}>
          {group.arrivalPhotos.length === 0 ? (
            <Text style={[styles.muted, { color: '#1e3a8a' }]}>Aucune photo</Text>
          ) : (
            group.arrivalPhotos.map((p, idx) => (
              <PhotoThumbnail
                key={p.id || idx}
                photo={p}
                onPress={() => openLightbox(group.arrivalPhotos, idx)}
              />
            ))
          )}
        </View>
      </View>
    </View>
  ));

  const renderItem = useCallback(({ item }: { item: PhotoGroup }) => (
    <PhotoGroupRow group={item} />
  ), [openLightbox]);

  const keyExtractor = useCallback((item: PhotoGroup) => item.type, []);

  const ListHeaderComponent = useCallback(() => (
    <>
      {/* Header moderne avec gradient */}
      <LinearGradient
        colors={['#0ea5e9', '#0284c7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.modernHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={28} color="white" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Rapport d'inspection</Text>
            {missionReference && (
              <Text style={styles.headerSubtitle}>Mission {missionReference}</Text>
            )}
          </View>
        </View>
        
        {pdfUrl && (
          <View style={styles.pdfBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.pdfBadgeText}>PDF généré</Text>
          </View>
        )}
      </LinearGradient>

      {/* Stats cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
          <View style={[styles.statIcon, { backgroundColor: '#16a34a' }]}>
            <MaterialIcons name="flight-takeoff" size={20} color="white" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Départ</Text>
            <Text style={[styles.statValue, { color: '#166534' }]}>
              {departure?.photos?.length || 0} photos
            </Text>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <View style={[styles.statIcon, { backgroundColor: '#2563eb' }]}>
            <MaterialIcons name="flight-land" size={20} color="white" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statLabel}>Arrivée</Text>
            <Text style={[styles.statValue, { color: '#1e3a8a' }]}>
              {arrival?.photos?.length || 0} photos
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.modernButton, pdfGenerating && styles.buttonDisabled]}
          onPress={handleGeneratePdf}
          disabled={pdfGenerating}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={pdfGenerating ? ['#94a3b8', '#64748b'] : ['#8b5cf6', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {pdfGenerating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name={pdfUrl ? "document-text" : "download"} size={20} color="white" />
            )}
            <Text style={styles.modernButtonText}>
              {pdfGenerating ? 'Génération...' : pdfUrl ? 'PDF disponible' : 'Générer PDF'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 12 }} />
        <TouchableOpacity
          style={styles.modernButton}
          onPress={() => {
            console.log('📤 Share button pressed! MissionId:', missionId);
            console.log('📋 Mission Reference:', missionReference);
            console.log('🚗 Vehicle:', vehicleLabel, plate);
            setSendVisible(true);
          }}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#06b6d4', '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.modernButtonText}>Partager le rapport</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Ionicons name="images" size={20} color="#64748b" />
        <Text style={styles.sectionTitle}>Comparaison des photos</Text>
      </View>
    </>
  ), [missionReference, pdfUrl, pdfGenerating, handleGeneratePdf, departure?.photos?.length, arrival?.photos?.length]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="images-outline" size={64} color="#cbd5e1" />
      <Text style={styles.emptyText}>Aucune photo disponible</Text>
      <Text style={styles.emptySubtext}>Les photos apparaîtront ici après l'inspection</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Chargement du rapport...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Erreur</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={photoGroups}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={3}
        windowSize={5}
      />

      <ImageView
        images={lightboxImages}
        imageIndex={lightboxIndex}
        visible={lightboxVisible}
        onRequestClose={() => setLightboxVisible(false)}
      />

      {/** Partage du rapport */}
      <ShareReportSheet
        visible={sendVisible}
        onClose={() => setSendVisible(false)}
        missionId={missionId || ''}
        missionReference={missionReference || null}
        vehicleLabel={vehicleLabel}
        plate={plate}
      />
    </>
  );
}

const GAP = 8;
const COLS = 3;
const width = Dimensions.get('window').width;
const thumbSize = Math.floor((width - GAP*2 - 24 - GAP*(COLS-1)) / COLS);

const styles = StyleSheet.create({
  // Containers
  container: { 
    padding: 0,
    backgroundColor: '#f8fafc',
  },
  center: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#0ea5e9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },

  // Modern Header
  modernHeader: {
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  pdfBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },

  // Actions
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modernButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  modernButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Photo Rows
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  col: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  depart: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  arrivee: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  colTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  thumb: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Legacy styles (kept for compatibility)
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  title: { 
    fontSize: 18, 
    fontWeight: '700' 
  },
  badge: { 
    backgroundColor: '#d1fae5', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#6ee7b7' 
  },
  badgeText: { 
    fontSize: 11, 
    fontWeight: '600', 
    color: '#059669' 
  },
  button: { 
    backgroundColor: '#0ea5e9', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  buttonText: { 
    color: 'white', 
    fontWeight: '600', 
    fontSize: 14 
  },
  muted: { 
    color: '#64748b' 
  },
});
