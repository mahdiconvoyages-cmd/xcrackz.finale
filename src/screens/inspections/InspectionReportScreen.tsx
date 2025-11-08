import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateAndShareInspectionPDF } from '../../services/pdfGenerator';
import ShareInspectionModal from '../../components/ShareInspectionModal';

const { width } = Dimensions.get('window');

interface InspectionReport {
  id: string;
  mission_id: string;
  inspection_type: 'departure' | 'arrival';
  overall_condition: string;
  mileage_km: number;
  fuel_level: number;
  remarks?: string;
  created_at: string;
  completed_at?: string;
  inspector_signature?: string;
  client_signature?: string;
  photos_count?: number;
  mission?: {
    id: string;
    reference: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    pickup_address: string;
    delivery_address: string;
    status: string;
  };
}

interface Stats {
  total: number;
  departure: number;
  arrival: number;
  thisWeek: number;
}

export default function InspectionReportScreenNew({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, departure: 0, arrival: 0, thisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'departure' | 'arrival'>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalMissionId, setShareModalMissionId] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadInspections();
    
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [filter]);

  // Realtime
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('inspection_reports_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_inspections' },
        () => loadInspections()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inspection_photos_v2' },
        () => loadInspections()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadInspections = async () => {
    try {
      if (!user) return;

      let query = supabase
        .from('vehicle_inspections')
        .select(`
          *,
          missions!inner (
            id,
            reference,
            vehicle_brand,
            vehicle_model,
            vehicle_plate,
            pickup_address,
            delivery_address,
            status,
            user_id
          )
        `)
        .eq('missions.user_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('inspection_type', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Compter les photos pour chaque inspection
      const inspectionsWithPhotos = await Promise.all(
        (data || []).map(async (inspection) => {
          const { count } = await supabase
            .from('inspection_photos_v2')
            .select('*', { count: 'exact', head: true })
            .eq('inspection_id', inspection.id);
          
          return {
            ...inspection,
            photos_count: count || 0,
            mission: inspection.missions,
          };
        })
      );

      setInspections(inspectionsWithPhotos as any);

      // Calculer les stats
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      setStats({
        total: data?.length || 0,
        departure: data?.filter(i => i.inspection_type === 'departure').length || 0,
        arrival: data?.filter(i => i.inspection_type === 'arrival').length || 0,
        thisWeek: data?.filter(i => new Date(i.created_at) >= oneWeekAgo).length || 0,
      });

    } catch (error: any) {
      console.error('Erreur chargement inspections:', error);
      Alert.alert('Erreur', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInspections();
  };

  const deleteInspection = async (inspection: InspectionReport) => {
    Alert.alert(
      'Confirmer la suppression',
      `Supprimer le rapport ${inspection.inspection_type === 'departure' ? 'de départ' : "d'arrivée"} ?\n\nMission: ${inspection.mission?.reference}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Supprimer les photos d'abord
              const { error: photosError } = await supabase
                .from('inspection_photos_v2')
                .delete()
                .eq('inspection_id', inspection.id);

              if (photosError) throw photosError;

              // Supprimer l'inspection
              const { error } = await supabase
                .from('vehicle_inspections')
                .delete()
                .eq('id', inspection.id);

              if (error) throw error;

              Alert.alert('✅ Succès', 'Rapport supprimé');
              loadInspections();
            } catch (error: any) {
              Alert.alert('Erreur', error.message);
            }
          },
        },
      ]
    );
  };

  const generatePDF = async (inspection: InspectionReport) => {
    try {
      setGeneratingPDF(inspection.id);

      // Appeler l'Edge Function via RPC
      const { data, error } = await supabase.rpc('regenerate_inspection_pdf', {
        p_inspection_id: inspection.id
      });

      if (error) throw error;

      setGeneratingPDF(null);
      Alert.alert('✅ Succès', 'PDF généré et disponible !');
    } catch (error: any) {
      console.error('Erreur génération PDF:', error);
      setGeneratingPDF(null);
      Alert.alert('Erreur', error.message || 'Impossible de générer le PDF');
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent': return '#10b981';
      case 'bon': return '#3b82f6';
      case 'correct': return '#f59e0b';
      case 'mauvais': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getConditionIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent': return 'star';
      case 'bon': return 'thumbs-up';
      case 'correct': return 'hand-left';
      case 'mauvais': return 'thumbs-down';
      default: return 'help-circle';
    }
  };

  const renderStatsCard = () => (
    <Animated.View
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#2563eb', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsGradient}
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="document-text" size={28} color="#fff" />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="exit-outline" size={28} color="#fff" />
            <Text style={styles.statValue}>{stats.departure}</Text>
            <Text style={styles.statLabel}>Départs</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="enter-outline" size={28} color="#fff" />
            <Text style={styles.statValue}>{stats.arrival}</Text>
            <Text style={styles.statLabel}>Arrivées</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={28} color="#fff" />
            <Text style={styles.statValue}>{stats.thisWeek}</Text>
            <Text style={styles.statLabel}>7 jours</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderInspectionCard = (inspection: InspectionReport, index: number) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        key={inspection.id}
        style={[
          styles.card,
          {
            opacity: cardAnim,
            transform: [
              {
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('InspectionReportAdvanced', { 
            inspectionId: inspection.id,
            missionId: inspection.mission_id 
          })}
          activeOpacity={0.9}
        >
          {/* Header avec gradient */}
          <LinearGradient
            colors={
              inspection.inspection_type === 'departure'
                ? ['#10b981', '#059669']
                : ['#3b82f6', '#2563eb']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <View style={styles.cardHeaderContent}>
              <View style={styles.typeBadge}>
                <Ionicons
                  name={inspection.inspection_type === 'departure' ? 'exit' : 'enter'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.typeText}>
                  {inspection.inspection_type === 'departure' ? 'DÉPART' : 'ARRIVÉE'}
                </Text>
              </View>
              <Text style={styles.cardDate}>
                {format(new Date(inspection.created_at), 'dd MMM yyyy', { locale: fr })}
              </Text>
            </View>
          </LinearGradient>

          {/* Contenu */}
          <View style={styles.cardBody}>
            <View style={styles.missionInfo}>
              <Text style={styles.missionRef}>Mission {inspection.mission?.reference}</Text>
              <View style={styles.vehicleInfo}>
                <Ionicons name="car-sport" size={16} color="#6b7280" />
                <Text style={styles.vehicleText}>
                  {inspection.mission?.vehicle_brand} {inspection.mission?.vehicle_model}
                </Text>
              </View>
              <View style={styles.plateContainer}>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{inspection.mission?.vehicle_plate}</Text>
                </View>
              </View>
            </View>

            {/* Condition générale */}
            <View style={styles.conditionRow}>
              <View style={styles.conditionLabel}>
                <Ionicons 
                  name={getConditionIcon(inspection.overall_condition)} 
                  size={20} 
                  color={getConditionColor(inspection.overall_condition)} 
                />
                <Text style={[styles.conditionText, { color: getConditionColor(inspection.overall_condition) }]}>
                  {inspection.overall_condition}
                </Text>
              </View>
              
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="speedometer" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{inspection.mileage_km?.toLocaleString()} km</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="water" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{inspection.fuel_level}%</Text>
                </View>
              </View>
            </View>

            {/* Photos */}
            {inspection.photos_count && inspection.photos_count > 0 && (
              <View style={styles.photosBadge}>
                <Ionicons name="camera" size={14} color="#2563eb" />
                <Text style={styles.photosText}>{inspection.photos_count} photos</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, generatingPDF === inspection.id && styles.actionButtonDisabled]}
                onPress={(e) => {
                  e.stopPropagation();
                  generatePDF(inspection);
                }}
                disabled={generatingPDF === inspection.id}
              >
                {generatingPDF === inspection.id ? (
                  <ActivityIndicator size="small" color="#ef4444" />
                ) : (
                  <FontAwesome5 name="file-pdf" size={16} color="#ef4444" />
                )}
                <Text style={[styles.actionText, { color: '#ef4444' }]}>
                  {generatingPDF === inspection.id ? 'Génération...' : 'PDF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setShareModalMissionId(inspection.mission_id);
                  setShowShareModal(true);
                }}
              >
                <Ionicons name="share-social" size={16} color="#2563eb" />
                <Text style={styles.actionText}>Partager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('InspectionReportAdvanced', {
                    inspectionId: inspection.id,
                    missionId: inspection.mission_id,
                  });
                }}
              >
                <Ionicons name="eye" size={16} color="#10b981" />
                <Text style={[styles.actionText, { color: '#10b981' }]}>Voir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  deleteInspection(inspection);
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Chargement des rapports...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Rapports d'Inspection</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Historique complet de vos inspections
          </Text>
        </View>

        {/* Stats */}
        {renderStatsCard()}

        {/* Filtres */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
              onPress={() => setFilter('all')}
            >
              <Ionicons 
                name="apps" 
                size={18} 
                color={filter === 'all' ? '#fff' : '#6b7280'} 
              />
              <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                Tous ({stats.total})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'departure' && styles.filterChipActive]}
              onPress={() => setFilter('departure')}
            >
              <Ionicons 
                name="exit-outline" 
                size={18} 
                color={filter === 'departure' ? '#fff' : '#6b7280'} 
              />
              <Text style={[styles.filterChipText, filter === 'departure' && styles.filterChipTextActive]}>
                Départs ({stats.departure})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === 'arrival' && styles.filterChipActive]}
              onPress={() => setFilter('arrival')}
            >
              <Ionicons 
                name="enter-outline" 
                size={18} 
                color={filter === 'arrival' ? '#fff' : '#6b7280'} 
              />
              <Text style={[styles.filterChipText, filter === 'arrival' && styles.filterChipTextActive]}>
                Arrivées ({stats.arrival})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Liste des inspections */}
        <View style={styles.listContainer}>
          {inspections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={80} color="#d1d5db" />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucun rapport d'inspection
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Vos rapports apparaîtront ici après vos inspections
              </Text>
            </View>
          ) : (
            inspections.map((inspection, index) => renderInspectionCard(inspection, index))
          )}
        </View>
      </ScrollView>

      {/* Modal de partage */}
      {showShareModal && shareModalMissionId && (
        <ShareInspectionModal
          visible={showShareModal}
          missionId={shareModalMissionId}
          onClose={() => {
            setShowShareModal(false);
            setShareModalMissionId(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsContainer: {
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsGradient: {
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filtersContainer: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    marginRight: 12,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeB adge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDate: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
  cardBody: {
    padding: 16,
  },
  missionInfo: {
    marginBottom: 12,
  },
  missionRef: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  vehicleText: {
    fontSize: 14,
    color: '#6b7280',
  },
  plateContainer: {
    marginTop: 4,
  },
  plateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  plateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 1,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  conditionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  photosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  photosText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
