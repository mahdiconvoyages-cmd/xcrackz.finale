// Missions - écran principal (version moderne premium)

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import JoinMissionByCode from '../../components/JoinMissionByCode';
import { Routes } from '../../navigation/Routes';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  price: number;
  created_at: string;
  user_id: string;
  assigned_user_id?: string;
  archived?: boolean;
  share_code?: string;
}

type TabType = 'created' | 'received';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';

export default function MissionsScreenNew({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createdMissions, setCreatedMissions] = useState<Mission[]>([]);
  const [receivedMissions, setReceivedMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [tabAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    loadMissions();
  }, []);

  const loadMissions = async () => {
    if (!user?.id) {
      console.error('❌ Pas d\'utilisateur connecté');
      return;
    }

    setLoading(true);
    try {
      console.log('📥 Chargement missions pour user:', user.id);

      // MISSIONS CRÉÉES PAR MOI
      const { data: created, error: createdError } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });

      if (createdError) {
        console.error('❌ Erreur missions créées:', createdError);
        throw createdError;
      }

      console.log('✅ Missions créées:', created?.length || 0);
      setCreatedMissions(created || []);

      // MISSIONS ASSIGNÉES À MOI
      const { data: received, error: receivedError } = await supabase
        .from('missions')
        .select('*')
        .eq('assigned_user_id', user.id)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('❌ Erreur missions reçues:', receivedError);
        throw receivedError;
      }

      console.log('✅ Missions reçues:', received?.length || 0);
      setReceivedMissions(received || []);

    } catch (error: any) {
      console.error('❌ Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les missions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMissions();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string): any => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-circle-outline';
      case 'completed': return 'checkmark-circle-outline';
      default: return 'ellipse-outline';
    }
  };

  // Filtrer les missions selon le statut sélectionné
  const getFilteredMissions = () => {
    const baseMissions = activeTab === 'created' ? createdMissions : receivedMissions;
    
    if (statusFilter === 'all') {
      return baseMissions.filter(m => m.status !== 'completed');
    }
    
    return baseMissions.filter(m => m.status === statusFilter);
  };

  // Compter les missions par statut
  const getStatusCount = (status: StatusFilter) => {
    const baseMissions = activeTab === 'created' ? createdMissions : receivedMissions;
    
    if (status === 'all') {
      return baseMissions.filter(m => m.status !== 'completed').length;
    }
    
    return baseMissions.filter(m => m.status === status).length;
  };

  const getCompletedMissionsCount = () => {
    const baseMissions = activeTab === 'created' ? createdMissions : receivedMissions;
    return baseMissions.filter(m => m.status === 'completed').length;
  };

  const renderMissionCard = ({ item: mission }: { item: Mission }) => {
    const isCreator = mission.user_id === user?.id;
    const isCompleted = mission.status === 'completed';
    
    return (
      <TouchableOpacity
        style={[
          styles.card, 
          { backgroundColor: colors.surface },
          isCompleted && styles.completedCard
        ]}
        onPress={() => navigation.navigate(Routes.MissionView as any, { missionId: mission.id })}
        activeOpacity={0.7}
      >
        {/* Gradient accent top */}
        <LinearGradient
          colors={isCompleted ? ['#4CAF5015', 'transparent'] : [colors.primary + '15', 'transparent']}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Badge terminé */}
        {isCompleted && (
          <View style={styles.completedOverlay}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.completedOverlayText}>Terminée</Text>
          </View>
        )}

        {/* En-tête */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: isCompleted ? '#4CAF5015' : colors.primary + '15' }]}>
              <Ionicons name="car-sport" size={22} color={isCompleted ? '#4CAF50' : colors.primary} />
            </View>
            <Text style={[styles.reference, { color: colors.text }]}>
              {mission.reference}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(mission.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(mission.status) }]}>
              {getStatusLabel(mission.status)}
            </Text>
          </View>
        </View>

        {/* Véhicule */}
        <View style={styles.vehicleSection}>
          <Text style={[styles.vehicle, { color: colors.text }]}>
            {mission.vehicle_brand} {mission.vehicle_model}
          </Text>
          <View style={[styles.plateBadge, { backgroundColor: colors.background }]}>
            <Ionicons name="car" size={12} color={colors.textSecondary} />
            <Text style={[styles.plate, { color: colors.textSecondary }]}>
              {mission.vehicle_plate}
            </Text>
          </View>
        </View>

        {/* Séparateur */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Itinéraire */}
        <View style={styles.routeSection}>
          <View style={styles.routeLine}>
            <View style={styles.routePoints}>
              <View style={[styles.pointStart, { backgroundColor: '#4CAF50' }]} />
              <View style={[styles.routeDash, { backgroundColor: colors.border }]} />
              <View style={[styles.pointEnd, { backgroundColor: '#f44336' }]} />
            </View>
            <View style={styles.routeAddresses}>
              <View style={styles.addressItem}>
                <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>Départ</Text>
                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                  {mission.pickup_address}
                </Text>
              </View>
              <View style={styles.addressItem}>
                <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>Arrivée</Text>
                <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                  {mission.delivery_address}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <LinearGradient
              colors={[colors.primary, colors.primary + 'CC']}
              style={styles.priceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="cash" size={16} color="#fff" />
              <Text style={styles.priceText}>
                {mission.price?.toFixed(2) || '0.00'} €
              </Text>
            </LinearGradient>
          </View>
          <View style={styles.footerRight}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {new Date(mission.pickup_date).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'short' 
              })}
            </Text>
          </View>
        </View>

        {/* Badge mission reçue */}
        {!isCreator && (
          <View style={[styles.assignedBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="arrow-down" size={12} color="#fff" />
            <Text style={styles.assignedText}>Reçue</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isCreatedTab = activeTab === 'created';
    
    // État vide spécial pour les missions terminées
    if (statusFilter === 'completed') {
      return (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconContainer, { backgroundColor: '#4CAF5010' }]}>
            <Ionicons 
              name="checkmark-circle" 
              size={48} 
              color="#4CAF50" 
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aucune mission terminée
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Les missions que vous terminerez apparaîtront ici
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons 
            name={isCreatedTab ? "rocket-outline" : "mail-open-outline"} 
            size={48} 
            color={colors.primary} 
          />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {statusFilter === 'pending' && 'Aucune mission en attente'}
          {statusFilter === 'in_progress' && 'Aucune mission en cours'}
          {statusFilter === 'all' && (isCreatedTab ? 'Aucune mission créée' : 'Aucune mission reçue')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {isCreatedTab 
            ? 'Créez votre première mission pour commencer' 
            : 'Les missions partagées avec vous apparaîtront ici'
          }
        </Text>
        
        {isCreatedTab ? (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate(Routes.MissionCreate as any)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.emptyActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyActionText}>Créer une mission</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={() => setShowJoinModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.emptyActionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="enter" size={20} color="#fff" />
              <Text style={styles.emptyActionText}>Rejoindre une mission</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderStatusFilters = () => {
    const filters: { id: StatusFilter; label: string; icon: string }[] = [
      { id: 'all', label: 'Actives', icon: 'list-outline' },
      { id: 'pending', label: 'En attente', icon: 'time-outline' },
      { id: 'in_progress', label: 'En cours', icon: 'play-circle-outline' },
    ];

    return (
      <View style={[styles.filtersContainer, { backgroundColor: colors.background }]}>
        <View style={styles.filtersScroll}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                statusFilter === filter.id && [styles.filterChipActive, { backgroundColor: colors.primary }],
                statusFilter !== filter.id && { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
              onPress={() => setStatusFilter(filter.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={filter.icon as any}
                size={16}
                color={statusFilter === filter.id ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === filter.id ? '#fff' : colors.text }
                ]}
              >
                {filter.label}
              </Text>
              {getStatusCount(filter.id) > 0 && (
                <View style={[
                  styles.filterBadge,
                  { backgroundColor: statusFilter === filter.id ? '#fff' : colors.primary }
                ]}>
                  <Text style={[
                    styles.filterBadgeText,
                    { color: statusFilter === filter.id ? colors.primary : '#fff' }
                  ]}>
                    {getStatusCount(filter.id)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton missions terminées */}
        {getCompletedMissionsCount() > 0 && (
          <TouchableOpacity
            style={[styles.completedButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              setStatusFilter('completed');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="archive-outline" size={18} color="#4CAF50" />
            <Text style={[styles.completedButtonText, { color: colors.text }]}>
              Terminées ({getCompletedMissionsCount()})
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const missions = getFilteredMissions();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[colors.primary, colors.primary + 'DD']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Gestion</Text>
            <Text style={styles.headerTitle}>Mes Missions</Text>
          </View>
          
          <View style={styles.headerActions}>
            {activeTab === 'received' && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowJoinModal(true)}
              >
                <Ionicons name="enter" size={22} color="#fff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate(Routes.MissionCreate as any)}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs modernes */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.tabsWrapper, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'created' && [styles.modernTabActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('created')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="briefcase" 
              size={18} 
              color={activeTab === 'created' ? '#fff' : colors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeTab === 'created' ? '#fff' : colors.textSecondary }
              ]}
            >
              Créées
            </Text>
            {createdMissions.length > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === 'created' ? '#fff' : colors.primary }
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: activeTab === 'created' ? colors.primary : '#fff' }
                ]}>
                  {createdMissions.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernTab,
              activeTab === 'received' && [styles.modernTabActive, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab('received')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="download" 
              size={18} 
              color={activeTab === 'received' ? '#fff' : colors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeTab === 'received' ? '#fff' : colors.textSecondary }
              ]}
            >
              Reçues
            </Text>
            {receivedMissions.length > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === 'received' ? '#fff' : colors.primary }
              ]}>
                <Text style={[
                  styles.tabBadgeText,
                  { color: activeTab === 'received' ? colors.primary : '#fff' }
                ]}>
                  {receivedMissions.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres de statut */}
      {renderStatusFilters()}

      {/* En-tête section terminées */}
      {statusFilter === 'completed' && missions.length > 0 && (
        <View style={[styles.completedHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.completedHeaderLeft}>
            <View style={[styles.completedIconBox, { backgroundColor: '#4CAF5015' }]}>
              <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
            </View>
            <View>
              <Text style={[styles.completedHeaderTitle, { color: colors.text }]}>
                Missions Terminées
              </Text>
              <Text style={[styles.completedHeaderSubtitle, { color: colors.textSecondary }]}>
                {missions.length} mission{missions.length > 1 ? 's' : ''} terminée{missions.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.backToActiveButton, { backgroundColor: colors.primary + '15' }]}
            onPress={() => setStatusFilter('all')}
          >
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={[styles.backToActiveText, { color: colors.primary }]}>Actives</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des missions...
          </Text>
        </View>
      ) : (
        <FlatList
          data={missions}
          renderItem={renderMissionCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Modal Rejoindre */}
      <JoinMissionByCode
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          loadMissions();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header avec gradient
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#ffffff99',
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tabs modernes
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tabsWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  modernTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  modernTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Filtres de statut
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  filtersScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  filterChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
  },
  completedButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  // En-tête missions terminées
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  completedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  completedIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  completedHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  backToActiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backToActiveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Liste
  listContent: {
    padding: 16,
  },
  // Cartes de mission
  card: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  completedCard: {
    opacity: 0.85,
  },
  completedOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 10,
  },
  completedOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reference: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Véhicule
  vehicleSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  vehicle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  plate: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Séparateur
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  // Itinéraire
  routeSection: {
    paddingHorizontal: 16,
  },
  routeLine: {
    flexDirection: 'row',
    gap: 12,
  },
  routePoints: {
    alignItems: 'center',
    paddingTop: 4,
  },
  pointStart: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeDash: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  pointEnd: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeAddresses: {
    flex: 1,
    gap: 16,
  },
  addressItem: {
    gap: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
  },
  footerLeft: {
    flex: 1,
  },
  priceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Badge mission reçue
  assignedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
