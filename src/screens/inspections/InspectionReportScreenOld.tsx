import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateAndShareInspectionPDF } from '../../services/pdfGenerator';
import ShareInspectionModal from '../../components/ShareInspectionModal';

interface InspectionReport {
  id: string;
  mission_id: string;
  type: 'departure' | 'arrival';
  vehicle_info: any;
  equipment_status: any;
  remarks?: string;
  created_at: string;
  completed_at?: string;
  inspector_signature?: string;
  client_signature?: string;
  photos?: InspectionPhoto[];
  mission?: {
    id: string;
    mission_number: string;
    pickup_address: string;
    delivery_address: string;
    vehicle?: {
      brand: string;
      model: string;
      registration: string;
    };
    client?: {
      name: string;
      email: string;
      phone: string;
    };
  };
}

interface InspectionPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  created_at: string;
}

export default function InspectionReportScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [inspections, setInspections] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [filter, setFilter] = useState<'all' | 'departure' | 'arrival'>('all');
  const [selectedInspection, setSelectedInspection] = useState<InspectionReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalMissionId, setShareModalMissionId] = useState<string | null>(null);

  useEffect(() => {
    loadInspections();
  }, [filter]);

  // Realtime sync séparé avec cleanup
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setup realtime pour rapports inspection...');

    // Synchronisation temps réel
    const channel = supabase
      .channel('inspection_reports_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_inspections' },
        (payload) => {
          console.log('📡 Inspection modifiée (realtime):', payload.eventType);
          loadInspections();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inspection_photos_v2' },
        (payload) => {
          console.log('📸 Photo ajoutée (realtime):', payload.eventType);
          loadInspections();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime rapports inspection status:', status);
      });

    // Cleanup au démontage
    return () => {
      console.log('🔌 Unsubscribe realtime rapports');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadInspections = async () => {
    if (!user) return;

    try {
      console.log('🔍 Chargement des inspections pour user:', user.id);
      
      // Première étape : récupérer toutes les inspections (COMME WEB)
      let query = supabase
        .from('vehicle_inspections')
        .select(`
          *,
          mission:missions(
            id,
            reference,
            user_id,
            pickup_address,
            delivery_address,
            vehicle_brand,
            vehicle_model,
            vehicle_plate,
            client_name,
            client_email,
            client_phone
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('inspection_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        throw error;
      }

      console.log('✅ Inspections récupérées:', data?.length || 0);

      // 🔒 SÉCURITÉ: Filtrer pour que l'utilisateur voie UNIQUEMENT:
      // 1. Ses propres missions (user_id)
      // 2. Missions qui lui sont assignées (assigned_to_user_id)
      // 3. Missions auxquelles il a accès via code de partage
      const userInspections = (data || []).filter((inspection: any) => {
        const mission = inspection.mission;
        if (!mission) return false;

        // 1. C'est sa mission
        if (mission.user_id === user.id) {
          console.log(`✅ Mission ${mission.reference}: propriétaire`);
          return true;
        }

        // 2. Mission lui a été assignée
        if (mission.assigned_to_user_id === user.id) {
          console.log(`✅ Mission ${mission.reference}: assignée à moi`);
          return true;
        }

        // 3. Mission accessible via share_code
        // Note: Si l'utilisateur a utilisé le share_code, la mission devrait avoir assigned_to_user_id = user.id
        // Donc normalement couvert par le cas 2

        console.log(`❌ Mission ${mission.reference}: accès refusé`);
        return false;
      });

      console.log('🔒 Inspections filtrées pour cet utilisateur:', userInspections.length, '/', data?.length || 0);

      // Charger les photos pour chaque inspection
      const inspectionsWithPhotos = await Promise.all(
        userInspections.map(async (inspection: any) => {
          // Ensure older UI that expects `inspection.mission.vehicle` and `inspection.mission.client` keeps working
          if (inspection.mission) {
            if (!inspection.mission.vehicle) {
              inspection.mission.vehicle = {
                brand: inspection.mission.vehicle_brand || null,
                model: inspection.mission.vehicle_model || null,
                registration: inspection.mission.vehicle_plate || null,
              };
            }
            if (!inspection.mission.client) {
              inspection.mission.client = {
                name: inspection.mission.client_name || null,
                email: inspection.mission.client_email || null,
                phone: inspection.mission.client_phone || null,
              };
            }
          }
          const { data: photos } = await supabase
            .from('inspection_photos')
            .select('*')
            .eq('inspection_id', inspection.id)
            .order('created_at');
          return {
            ...inspection,
            photos: photos || [],
          };
        })
      );

      console.log('✅ Photos chargées pour', inspectionsWithPhotos.length, 'inspections');
      setInspections(inspectionsWithPhotos);
    } catch (error: any) {
      console.error('❌ Erreur chargement inspections:', error);
      Alert.alert('Erreur', error.message || 'Impossible de charger les rapports');
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
      '🗑️ Supprimer le rapport',
      `Voulez-vous vraiment supprimer ce rapport ${inspection.type === 'departure' ? 'de départ' : "d'arrivée"} ?\n\nMission: ${inspection.mission?.mission_number || 'N/A'}\nDate: ${format(new Date(inspection.created_at), 'dd MMM yyyy', { locale: fr })}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Suppression inspection:', inspection.id);

              // Supprimer les photos d'abord
              const { error: photosError } = await supabase
                .from('inspection_photos_v2')
                .delete()
                .eq('inspection_id', inspection.id);

              if (photosError) {
                console.error('❌ Erreur suppression photos:', photosError);
                throw photosError;
              }

              // Supprimer l'inspection
              const { error: inspectionError } = await supabase
                .from('vehicle_inspections')
                .delete()
                .eq('id', inspection.id);

              if (inspectionError) {
                console.error('❌ Erreur suppression inspection:', inspectionError);
                throw inspectionError;
              }

              console.log('✅ Inspection supprimée');
              Alert.alert('✅ Succès', 'Rapport supprimé');
              loadInspections(); // Recharger la liste
            } catch (error: any) {
              console.error('❌ Erreur:', error);
              Alert.alert('❌ Erreur', error.message || 'Impossible de supprimer le rapport');
            }
          }
        }
      ]
    );
  };

  const generatePDF = async (inspection: InspectionReport) => {
    try {
      setGeneratingPDF(true);
      Alert.alert('📄 Génération PDF', 'Conversion des photos en cours...');

      // Utiliser le nouveau service de génération PDF
      const result = await generateAndShareInspectionPDF({
        ...inspection,
        mission: {
          reference: inspection.mission?.mission_number || 'N/A',
          pickup_address: inspection.mission?.pickup_address || '',
          delivery_address: inspection.mission?.delivery_address || '',
          vehicle_brand: inspection.mission?.vehicle?.brand || '',
          vehicle_model: inspection.mission?.vehicle?.model || '',
          vehicle_plate: inspection.mission?.vehicle?.registration || '',
          client_name: inspection.mission?.client?.name,
          client_email: inspection.mission?.client?.email,
          client_phone: inspection.mission?.client?.phone,
        },
      } as any);

      setGeneratingPDF(false);

      if (result.success) {
        Alert.alert('✅ Succès', 'PDF généré et partagé avec succès !');
      } else {
        Alert.alert('❌ Erreur', result.error || 'Impossible de générer le PDF');
      }
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      setGeneratingPDF(false);
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  const renderInspectionCard = (inspection: InspectionReport) => (
    <TouchableOpacity
      key={inspection.id}
      style={styles.card}
      onPress={() => {
        setSelectedInspection(inspection);
        setShowDetails(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardBadge}>
          <Ionicons 
            name={inspection.type === 'departure' ? 'exit-outline' : 'enter-outline'} 
            size={20} 
            color="white" 
          />
          <Text style={styles.badgeText}>
            {inspection.type === 'departure' ? 'DÉPART' : 'ARRIVÉE'}
          </Text>
        </View>
        <Text style={styles.cardDate}>
          {format(new Date(inspection.created_at), 'dd MMM yyyy', { locale: fr })}
        </Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.missionNumber}>
          Mission {inspection.mission?.mission_number || 'N/A'}
        </Text>
        <Text style={styles.vehicle}>
          {inspection.mission?.vehicle?.brand || ''} {inspection.mission?.vehicle?.model || ''}
        </Text>
        <Text style={styles.registration}>
          {inspection.mission?.vehicle?.registration || ''}
        </Text>

        <View style={styles.locations}>
          <View style={styles.location}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {inspection.mission?.pickup_address || ''}
            </Text>
          </View>
          <MaterialIcons name="arrow-forward" size={16} color="#666" />
          <View style={styles.location}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {inspection.mission?.delivery_address || ''}
            </Text>
          </View>
        </View>

        {inspection.photos && inspection.photos.length > 0 && (
          <View style={styles.photoIndicator}>
            <Ionicons name="camera" size={16} color="#2563eb" />
            <Text style={styles.photoCount}>{inspection.photos.length} photos</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, generatingPDF && styles.actionButtonDisabled]}
          onPress={(e) => {
            e.stopPropagation();
            generatePDF(inspection);
          }}
          disabled={generatingPDF}
        >
          <FontAwesome5 name="file-pdf" size={18} color={generatingPDF ? "#9ca3af" : "#ef4444"} />
          <Text style={[styles.actionText, generatingPDF && styles.actionTextDisabled]}>
            {generatingPDF ? 'Génération...' : 'PDF'}
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
          <Ionicons name="share-social" size={18} color="#2563eb" />
          <Text style={styles.actionText}>Partager</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            deleteInspection(inspection);
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Chargement des rapports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rapports d'Inspection</Text>
        <View style={styles.filters}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'departure' && styles.filterActive]}
            onPress={() => setFilter('departure')}
          >
            <Text style={[styles.filterText, filter === 'departure' && styles.filterTextActive]}>
              Départ
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'arrival' && styles.filterActive]}
            onPress={() => setFilter('arrival')}
          >
            <Text style={[styles.filterText, filter === 'arrival' && styles.filterTextActive]}>
              Arrivée
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {inspections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Aucun rapport d'inspection</Text>
          </View>
        ) : (
          inspections.map(renderInspectionCard)
        )}
      </ScrollView>

      {/* Modal de Partage */}
      {showShareModal && shareModalMissionId && (
        <ShareInspectionModal
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareModalMissionId(null);
          }}
          missionId={shareModalMissionId}
          reportType="complete"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  filters: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  cardContent: {
    padding: 15,
  },
  missionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  vehicle: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 2,
  },
  registration: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  locations: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  location: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  photoCount: {
    fontSize: 12,
    color: '#2563eb',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 5,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  actionTextDisabled: {
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
  },
});