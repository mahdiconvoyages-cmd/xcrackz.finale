import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { realtimeSync } from '../../services/realtimeSync';

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
  user_id?: string;
  archived?: boolean;
  distance_km?: number;
}

interface Assignment {
  id: string;
  mission_id: string;
  contact_id: string;
  user_id: string;
  payment_ht: number;
  commission: number;
  status: string;
  assigned_at: string;
  mission?: Mission;
}

type TabType = 'my_missions' | 'received';

const { width } = Dimensions.get('window');

export default function MissionListScreenNew({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('my_missions');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [receivedAssignments, setReceivedAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // Stats rapides
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    loadData();

    if (user?.id) {
      realtimeSync.subscribeToMissions(user.id, () => {
        console.log('[MissionList] Realtime update');
        loadData();
      });

      return () => {
        realtimeSync.unsubscribe(`missions_${user.id}`);
      };
    }
  }, [statusFilter, user?.id, activeTab, showArchived]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadMissions(), loadReceivedAssignments()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMissions = async () => {
    try {
      let query = supabase
        .from('missions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (!showArchived) {
        query = query.or('archived.is.null,archived.eq.false');
      }

      const { data, error } = await query;
      if (error) throw error;

      const allMissions = data || [];
      setMissions(allMissions);

      // Calculer les stats
      setStats({
        total: allMissions.length,
        pending: allMissions.filter((m) => m.status === 'pending').length,
        inProgress: allMissions.filter((m) => m.status === 'in_progress').length,
        completed: allMissions.filter((m) => m.status === 'completed').length,
        cancelled: allMissions.filter((m) => m.status === 'cancelled').length,
      });
    } catch (error: any) {
      console.error('Error loading missions:', error);
      Alert.alert('Erreur', error.message);
    }
  };

  const loadReceivedAssignments = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from('mission_assignments')
        .select(`*, mission:missions(*)`)
        .eq('contact_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceivedAssignments((assignments as any) || []);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      setReceivedAssignments([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleArchiveMission = async (missionId: string, currentArchived: boolean) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({ archived: !currentArchived })
        .eq('id', missionId);

      if (error) throw error;

      Alert.alert('Succès', currentArchived ? 'Mission désarchivée' : 'Mission archivée');
      loadMissions();
    } catch (error: any) {
      console.error('Error archiving mission:', error);
      Alert.alert('Erreur', error.message);
    }
  };

  const confirmArchive = (mission: Mission) => {
    if (mission.status !== 'completed' && mission.status !== 'cancelled') {
      Alert.alert('Attention', 'Seules les missions terminées ou annulées peuvent être archivées.');
      return;
    }

    Alert.alert(
      mission.archived ? 'Désarchiver' : 'Archiver',
      mission.archived
        ? `Voulez-vous désarchiver la mission ${mission.reference} ?`
        : `Voulez-vous archiver la mission ${mission.reference} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: mission.archived ? 'default' : 'destructive',
          onPress: () => toggleArchiveMission(mission.id, mission.archived || false),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'assigned':
        return '#8b5cf6';
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      case 'assigned':
        return 'Assignée';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'in_progress':
        return 'speedometer';
      case 'completed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'assigned':
        return 'people';
      default:
        return 'help-circle';
    }
  };

  const navigateToInspection = (mission: Mission) => {
    switch (mission.status) {
      case 'pending':
        navigation.navigate('Inspections', {
          screen: 'InspectionDeparture',
          params: { missionId: mission.id },
        });
        break;
      case 'in_progress':
        navigation.navigate('Inspections', {
          screen: 'InspectionArrival',
          params: { missionId: mission.id },
        });
        break;
      case 'completed':
        navigation.navigate('Inspections', {
          screen: 'InspectionShare', // Harmonise avec InspectionsNavigator
        });
        break;
      default:
        Alert.alert('Info', 'Aucune inspection disponible pour cette mission');
    }
  };

  const filteredMissions = missions.filter(
    (mission) =>
      mission.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceivedAssignments = receivedAssignments.filter((assignment) => {
    const mission = assignment.mission;
    if (!mission) return false;

    return (
      mission.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mission.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const renderMission = ({ item }: { item: Mission }) => (
    <TouchableOpacity
      style={[
        styles.missionCard,
        { backgroundColor: colors.card, borderColor: getStatusColor(item.status) + '40' },
        item.archived && styles.archivedCard,
      ]}
      onPress={() => navigation.navigate('MissionView', { missionId: item.id })}
      onLongPress={() => confirmArchive(item)}
    >
      {/* Bande de couleur selon statut */}
      <LinearGradient
        colors={[getStatusColor(item.status), getStatusColor(item.status) + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.statusBar}
      />

      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.reference, { color: colors.text }]}>{item.reference}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) },
              ]}
            >
              <Ionicons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Ionicons name="cash" size={18} color="#10b981" />
            <Text style={styles.price}>{item.price?.toFixed(2)}€</Text>
          </View>
        </View>

        {/* Itinéraire */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <View style={[styles.routeIcon, { backgroundColor: '#3b82f6' + '20' }]}>
              <Ionicons name="location" size={16} color="#3b82f6" />
            </View>
            <View style={styles.addressContainer}>
              <Text style={[styles.address, { color: colors.text }]} numberOfLines={2}>
                {item.pickup_address}
              </Text>
            </View>
          </View>

          <View style={styles.routeConnector}>
            <View style={styles.dashedLine} />
            <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.textSecondary} />
            <View style={styles.dashedLine} />
          </View>

          <View style={styles.routeRow}>
            <View style={[styles.routeIcon, { backgroundColor: '#10b981' + '20' }]}>
              <Ionicons name="flag" size={16} color="#10b981" />
            </View>
            <View style={styles.addressContainer}>
              <Text style={[styles.address, { color: colors.text }]} numberOfLines={2}>
                {item.delivery_address}
              </Text>
            </View>
          </View>
        </View>

        {/* Infos véhicule et date */}
        <View style={styles.cardFooter}>
          <View style={styles.vehicleContainer}>
            <View style={[styles.vehicleIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="car-sport" size={16} color={colors.primary} />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehicleBrand, { color: colors.text }]}>
                {item.vehicle_brand} {item.vehicle_model}
              </Text>
              <Text style={[styles.vehiclePlate, { color: colors.textSecondary }]}>{item.vehicle_plate}</Text>
            </View>
          </View>

          <View style={styles.metaInfo}>
            {item.distance_km && item.distance_km > 0 && (
              <View style={styles.distanceChip}>
                <Ionicons name="navigate" size={12} color="#06b6d4" />
                <Text style={styles.distanceText}>{Math.round(item.distance_km)} km</Text>
              </View>
            )}
            <View style={styles.dateChip}>
              <Ionicons name="calendar" size={12} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {new Date(item.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {!item.archived && item.status !== 'cancelled' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                navigateToInspection(item);
              }}
            >
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>
                {item.status === 'pending' ? 'Départ' : item.status === 'in_progress' ? 'Arrivée' : 'Rapport'}
              </Text>
            </TouchableOpacity>

            {(item.status === 'completed' || item.status === 'cancelled') && (
              <TouchableOpacity
                style={[styles.actionButton, styles.archiveButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  confirmArchive(item);
                }}
              >
                <Ionicons name={item.archived ? 'archive' : 'archive-outline'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.archived && (
          <View style={[styles.archivedBanner, { backgroundColor: colors.textSecondary + '15' }]}>
            <Ionicons name="archive" size={14} color={colors.textSecondary} />
            <Text style={[styles.archivedText, { color: colors.textSecondary }]}>Mission archivée</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderAssignment = ({ item }: { item: Assignment }) => {
    const mission = item.mission;
    if (!mission) return null;

    return (
      <TouchableOpacity
        style={[styles.missionCard, styles.receivedCard, { backgroundColor: colors.card, borderColor: '#8b5cf6' }]}
        onPress={() => navigation.navigate('MissionView', { missionId: mission.id })}
      >
        <LinearGradient colors={['#8b5cf6', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statusBar} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text style={[styles.reference, { color: colors.text }]}>{mission.reference}</Text>
              <View style={[styles.receivedBadge, { backgroundColor: '#8b5cf6' + '20', borderColor: '#8b5cf6' }]}>
                <Ionicons name="arrow-down-circle" size={14} color="#8b5cf6" />
                <Text style={[styles.statusText, { color: '#8b5cf6' }]}>Mission reçue</Text>
              </View>
            </View>

            {item.payment_ht && (
              <View style={styles.priceContainer}>
                <Ionicons name="cash" size={18} color="#10b981" />
                <Text style={styles.price}>{item.payment_ht}€ HT</Text>
              </View>
            )}
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <View style={[styles.routeIcon, { backgroundColor: '#3b82f6' + '20' }]}>
                <Ionicons name="location" size={16} color="#3b82f6" />
              </View>
              <View style={styles.addressContainer}>
                <Text style={[styles.address, { color: colors.text }]} numberOfLines={2}>
                  {mission.pickup_address}
                </Text>
              </View>
            </View>

            <View style={styles.routeConnector}>
              <View style={styles.dashedLine} />
              <MaterialCommunityIcons name="map-marker-path" size={18} color={colors.textSecondary} />
              <View style={styles.dashedLine} />
            </View>

            <View style={styles.routeRow}>
              <View style={[styles.routeIcon, { backgroundColor: '#10b981' + '20' }]}>
                <Ionicons name="flag" size={16} color="#10b981" />
              </View>
              <View style={styles.addressContainer}>
                <Text style={[styles.address, { color: colors.text }]} numberOfLines={2}>
                  {mission.delivery_address}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.vehicleContainer}>
              <View style={[styles.vehicleIcon, { backgroundColor: '#8b5cf6' + '20' }]}>
                <Ionicons name="car-sport" size={16} color="#8b5cf6" />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleBrand, { color: colors.text }]}>
                  {mission.vehicle_brand} {mission.vehicle_model}
                </Text>
                <Text style={[styles.vehiclePlate, { color: colors.textSecondary }]}>{mission.vehicle_plate}</Text>
              </View>
            </View>

            <View style={styles.dateChip}>
              <Ionicons name="calendar" size={12} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {new Date(mission.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Header Premium */}
      <LinearGradient colors={['#14b8a6', '#06b6d4', '#3b82f6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="truck-fast" size={32} color="#fff" />
            <Text style={styles.headerTitle}>Mes Missions</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MissionCreate')} style={styles.addButton}>
            <Ionicons name="add-circle" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats rapides */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#fff7ed', borderColor: '#fb923c' }]}>
          <Ionicons name="time" size={20} color="#f97316" />
          <Text style={[styles.statValue, { color: '#f97316' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#dbeafe', borderColor: '#3b82f6' }]}>
          <Ionicons name="speedometer" size={20} color="#3b82f6" />
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#d1fae5', borderColor: '#10b981' }]}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#fee2e2', borderColor: '#ef4444' }]}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.cancelled}</Text>
          <Text style={styles.statLabel}>Annulées</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_missions' && styles.tabActive]}
          onPress={() => setActiveTab('my_missions')}
        >
          <Ionicons name="list" size={20} color={activeTab === 'my_missions' ? '#14b8a6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'my_missions' ? '#14b8a6' : colors.textSecondary }]}>
            Mes missions ({missions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons name="arrow-down-circle" size={20} color={activeTab === 'received' ? '#8b5cf6' : colors.textSecondary} />
          <Text style={[styles.tabText, { color: activeTab === 'received' ? '#8b5cf6' : colors.textSecondary }]}>
            Reçues ({receivedAssignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recherche et filtres */}
      <View style={styles.filtersContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher une mission..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>Toutes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pending' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pending')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'pending' && styles.filterChipTextActive]}>En attente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'in_progress' && styles.filterChipActive]}
            onPress={() => setStatusFilter('in_progress')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'in_progress' && styles.filterChipTextActive]}>En cours</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'completed' && styles.filterChipActive]}
            onPress={() => setStatusFilter('completed')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'completed' && styles.filterChipTextActive]}>Terminées</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.archiveToggle} onPress={() => setShowArchived(!showArchived)}>
            <Ionicons name={showArchived ? 'archive' : 'archive-outline'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste */}
      <FlatList
        data={activeTab === 'my_missions' ? filteredMissions : filteredReceivedAssignments}
        renderItem={activeTab === 'my_missions' ? renderMission : renderAssignment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchTerm ? 'Aucune mission trouvée' : 'Aucune mission'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    elevation: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  addButton: {
    padding: 4,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
  },
  tabActive: {
    backgroundColor: '#14b8a6' + '15',
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Filtres
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#14b8a6',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  archiveToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    marginLeft: 'auto',
  },

  // Liste
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Carte mission
  missionCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  statusBar: {
    height: 6,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 8,
  },
  reference: {
    fontSize: 18,
    fontWeight: '900',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },

  // Route
  routeContainer: {
    gap: 8,
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  addressContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  address: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    gap: 8,
  },
  dashedLine: {
    width: 1,
    height: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#d1d5db',
    borderStyle: 'dashed',
  },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  vehicleIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleBrand: {
    fontSize: 13,
    fontWeight: '700',
  },
  vehiclePlate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#cffafe',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#06b6d4',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  archiveButton: {
    flex: 0,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
  },

  // Archived
  archivedCard: {
    opacity: 0.7,
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 12,
    borderRadius: 10,
  },
  archivedText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Mission reçue
  receivedCard: {
    borderWidth: 3,
  },
  receivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
