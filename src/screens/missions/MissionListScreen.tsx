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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { realtimeSync } from '../../services/realtimeSync';
import JoinMissionByCode from '../../components/JoinMissionByCode';

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

export default function MissionListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  // États principaux
  const [activeTab, setActiveTab] = useState<TabType>('my_missions');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [receivedAssignments, setReceivedAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    loadData();

    // S'abonner aux changements en temps réel
    if (user?.id) {
      const subscription = realtimeSync.subscribeToMissions(user.id, () => {
        console.log('[MissionListScreen] Realtime update detected, reloading data');
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
      await Promise.all([
        loadMissions(),
        loadReceivedAssignments(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMissions = async () => {
    try {
      // Charger MES missions créées + missions ASSIGNÉES à moi
      let createdQuery = supabase
        .from('missions')
        .select('*')
        .eq('user_id', user!.id);

      let assignedQuery = supabase
        .from('missions')
        .select('*')
        .eq('assigned_user_id', user!.id);

      if (statusFilter !== 'all') {
        createdQuery = createdQuery.eq('status', statusFilter);
        assignedQuery = assignedQuery.eq('status', statusFilter);
      }

      // Filtrer les missions archivées
      if (!showArchived) {
        createdQuery = createdQuery.or('archived.is.null,archived.eq.false');
        assignedQuery = assignedQuery.or('archived.is.null,archived.eq.false');
      }

      const [createdResult, assignedResult] = await Promise.all([
        createdQuery.order('created_at', { ascending: false }),
        assignedQuery.order('created_at', { ascending: false })
      ]);

      if (createdResult.error) throw createdResult.error;
      if (assignedResult.error) throw assignedResult.error;

      // Combiner les deux listes (éviter doublons)
      const allMissions = [
        ...(createdResult.data || []),
        ...(assignedResult.data || []).filter(
          assigned => !createdResult.data?.find(created => created.id === assigned.id)
        )
      ];

      console.log('✅ Missions chargées:', {
        created: createdResult.data?.length || 0,
        assigned: assignedResult.data?.length || 0,
        total: allMissions.length
      });

      setMissions(allMissions);
    } catch (error: any) {
      console.error('❌ Erreur chargement missions:', error);
      Alert.alert('Erreur', error.message);
    }
  };

  const loadReceivedAssignments = async () => {
    try {
      console.log('🔍 Chargement missions reçues pour user:', user!.id);
      
      const { data: assignments, error } = await supabase
        .from('mission_assignments')
        .select(`
          *,
          mission:missions(*)
        `)
        .eq('contact_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('✅ Missions reçues chargées:', assignments?.length || 0);
      setReceivedAssignments(assignments as any || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement missions reçues:', error);
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

      Alert.alert(
        'Succès',
        currentArchived ? 'Mission désarchivée' : 'Mission archivée',
        [{ text: 'OK' }]
      );

      loadMissions();
    } catch (error: any) {
      console.error('❌ Erreur archivage mission:', error);
      Alert.alert('Erreur', error.message);
    }
  };

  const confirmArchive = (mission: Mission) => {
    if (mission.status !== 'completed' && mission.status !== 'cancelled') {
      Alert.alert(
        'Attention',
        'Seules les missions terminées ou annulées peuvent être archivées.',
        [{ text: 'OK' }]
      );
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
      case 'pending': return '#f59e0b'; // Orange
      case 'in_progress': return '#3b82f6'; // Bleu
      case 'completed': return '#10b981'; // Vert
      case 'cancelled': return '#ef4444'; // Rouge
      case 'assigned': return '#8b5cf6'; // Violet
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      case 'assigned': return 'Assignée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in_progress': return 'play-circle-outline';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle-outline';
      case 'assigned': return 'people-outline';
      default: return 'help-circle-outline';
    }
  };

  // Navigation intelligente vers l'inspection selon le statut
  const navigateToInspection = (mission: Mission) => {
    switch (mission.status) {
      case 'pending':
        // Mission en attente → Inspection départ
        navigation.navigate('Inspections', {
          screen: 'InspectionDeparture',
          params: { missionId: mission.id }
        });
        break;
      case 'in_progress':
        // Mission en cours → Inspection arrivée
        navigation.navigate('Inspections', {
          screen: 'InspectionArrival',
          params: { missionId: mission.id }
        });
        break;
      case 'completed':
        // Mission terminée → Rapports d'inspection
        navigation.navigate('Inspections', {
          screen: 'InspectionReports'
        });
        break;
      default:
        Alert.alert('Info', 'Aucune inspection disponible pour cette mission');
    }
  };

  const filteredMissions = missions.filter(mission =>
    mission.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.pickup_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.delivery_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceivedAssignments = receivedAssignments.filter(assignment => {
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
        { backgroundColor: colors.card, borderColor: colors.border },
        item.archived && styles.archivedCard
      ]}
      onPress={() => navigation.navigate('MissionView', { missionId: item.id })}
      onLongPress={() => confirmArchive(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.referenceRow}>
            <Text style={[styles.reference, { color: colors.text }]}>
              {item.reference}
            </Text>
            {item.archived && (
              <View style={[styles.archivedBadge, { backgroundColor: colors.textSecondary + '20' }]}>
                <Ionicons name="archive" size={12} color={colors.textSecondary} />
                <Text style={[styles.archivedText, { color: colors.textSecondary }]}>
                  Archivée
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}> 
            <Ionicons name={getStatusIcon(item.status) as any} size={14} color={getStatusColor(item.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {item.price?.toFixed(2)} €
          </Text>
          {(item.status === 'completed' || item.status === 'cancelled') && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                confirmArchive(item);
              }}
              style={styles.archiveButton}
            >
              <Ionicons 
                name={item.archived ? "archive" : "archive-outline"} 
                size={20} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={16} color={colors.primary} />
          <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
            {item.pickup_address}
          </Text>
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="flag" size={16} color={colors.success} />
          <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
            {item.delivery_address}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={14} color={colors.textSecondary} />
          <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
            {`${item.vehicle_brand} ${item.vehicle_model} - ${item.vehicle_plate}`}
          </Text>
        </View>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date(item.pickup_date).toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {/* Bouton Inspection - Navigation intelligente selon statut */}
      {!item.archived && item.status !== 'cancelled' && (
        <TouchableOpacity
          style={[styles.inspectionButton, { backgroundColor: colors.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            navigateToInspection(item);
          }}
        >
          <Ionicons name="document-text" size={16} color="#fff" />
          <Text style={styles.inspectionButtonText}>
            {item.status === 'pending' ? 'Départ' : item.status === 'in_progress' ? 'Arrivée' : 'Rapport'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderAssignment = ({ item }: { item: Assignment }) => {
    const mission = item.mission;
    if (!mission) return null;

    return (
      <TouchableOpacity
        style={[styles.missionCard, styles.assignmentCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
        onPress={() => navigation.navigate('MissionView', { missionId: mission.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.reference, { color: colors.text }]}>
              {mission.reference}
            </Text>
            <View style={[styles.assignmentBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.assignmentBadgeText, { color: colors.primary }]}>Reçue</Text>
            </View>
          </View>
          {item.payment_ht && (
            <Text style={[styles.price, { color: colors.success }]}>
              {item.payment_ht} € HT
            </Text>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color={colors.primary} />
            <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
              {mission.pickup_address}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="flag" size={16} color={colors.success} />
            <Text style={[styles.address, { color: colors.text }]} numberOfLines={1}>
              {mission.delivery_address}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.vehicleInfo}>
            <Ionicons name="car" size={14} color={colors.textSecondary} />
            <Text style={[styles.vehicleText, { color: colors.textSecondary }]}>
              {`${mission.vehicle_brand} ${mission.vehicle_model} - ${mission.vehicle_plate}`}
            </Text>
          </View>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton, 
        { borderBottomColor: colors.border },
        activeTab === tab && { borderBottomColor: colors.primary }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabText, 
        { color: colors.textSecondary },
        activeTab === tab && { color: colors.primary, fontWeight: '600' }
      ]}>
        {label}
      </Text>
      {tab === 'my_missions' && missions.length > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.tabBadgeText}>{missions.length}</Text>
        </View>
      )}
      {tab === 'received' && receivedAssignments.length > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.tabBadgeText}>{receivedAssignments.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const statusOptions = [
    { value: 'all', label: 'Tous', icon: 'apps' },
    { value: 'pending', label: 'En attente', icon: 'time-outline' },
    { value: 'in_progress', label: 'En cours', icon: 'play-circle-outline' },
    { value: 'completed', label: 'Terminées', icon: 'checkmark-circle' },
    { value: 'cancelled', label: 'Annulées', icon: 'close-circle-outline' },
  ];

  // Stats rapides
  const getMissionsStats = () => {
    const pending = missions.filter(m => m.status === 'pending' && !m.archived).length;
    const inProgress = missions.filter(m => m.status === 'in_progress' && !m.archived).length;
    const completed = missions.filter(m => m.status === 'completed' && !m.archived).length;
    const total = missions.filter(m => !m.archived).length;
    
    return { pending, inProgress, completed, total };
  };

  const stats = getMissionsStats();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec bouton Rejoindre */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowJoinModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.joinButtonText}>Rejoindre mission</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderTabButton('my_missions', 'Mes missions')}
          {renderTabButton('received', 'Missions reçues')}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Rechercher une mission..."
          placeholderTextColor={colors.textSecondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {/* Toggle archived button - Only on my_missions tab */}
        {activeTab === 'my_missions' && (
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={styles.archiveToggle}
          >
            <Ionicons 
              name={showArchived ? "archive" : "archive-outline"} 
              size={22} 
              color={showArchived ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter - Only on my_missions tab */}
      {activeTab === 'my_missions' && (
        <>
          {/* Stats rapides */}
          <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.statCard}>
              <Ionicons name="albums" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.pending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En attente</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="play-circle-outline" size={20} color="#3b82f6" />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.inProgress}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>En cours</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Terminées</Text>
            </View>
          </View>

          {/* Filtres de statut */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersRow}
            contentContainerStyle={styles.filtersContent}
          >
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  statusFilter === option.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setStatusFilter(option.value)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={16} 
                  color={statusFilter === option.value ? '#ffffff' : colors.textSecondary} 
                />
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.text },
                    statusFilter === option.value && { color: '#ffffff', fontWeight: '600' }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Info pour missions reçues */}
      {activeTab === 'received' && receivedAssignments.length > 0 && (
        <View style={[styles.infoBar, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            <Text>Vous avez </Text>
            <Text style={{ fontWeight: '600' }}>{receivedAssignments.length}</Text>
            <Text> mission</Text>
            <Text>{receivedAssignments.length > 1 ? 's' : ''}</Text>
            <Text> qui vous </Text>
            <Text>{receivedAssignments.length > 1 ? 'ont' : 'a'}</Text>
            <Text> été assignée</Text>
            <Text>{receivedAssignments.length > 1 ? 's' : ''}</Text>
          </Text>
        </View>
      )}

      {/* Mission List */}
      {activeTab === 'my_missions' ? (
        <FlatList
          data={filteredMissions}
          renderItem={renderMission}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune mission créée
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredReceivedAssignments}
          renderItem={renderAssignment}
          keyExtractor={(item) => `assignment-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Aucune mission reçue
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Only on my_missions tab */}
      {activeTab === 'my_missions' && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('MissionCreate')}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      )}

      {/* Modal rejoindre mission */}
      <JoinMissionByCode
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabText: { 
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15,
    color: '#0f172a',
  },
  archiveToggle: {
    padding: 6,
    borderRadius: 8,
  },
  filtersRow: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  filtersContent: {
    gap: 10,
    paddingHorizontal: 4,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterText: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#64748b',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: '#64748b',
    fontWeight: '500',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  listContent: { 
    padding: 16, 
    paddingBottom: 100,
  },
  missionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  assignmentCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#14b8a6',
  },
  archivedCard: {
    opacity: 0.65,
    borderStyle: 'dashed',
    backgroundColor: '#f1f5f9',
  },
  assignmentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  assignmentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: { 
    flex: 1, 
    gap: 8,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  reference: { 
    fontSize: 17, 
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  archivedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusText: { 
    fontSize: 13, 
    fontWeight: '700',
  },
  priceContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  price: { 
    fontSize: 19, 
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  archiveButton: {
    padding: 6,
    borderRadius: 8,
  },
  cardBody: { 
    gap: 10, 
    marginBottom: 14,
  },
  addressRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    gap: 10,
  },
  address: { 
    flex: 1, 
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  vehicleInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 7, 
    flex: 1,
  },
  vehicleText: { 
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  date: { 
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  inspectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: '#14b8a6',
    elevation: 2,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  inspectionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: { 
    fontSize: 16,
    marginTop: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    backgroundColor: '#14b8a6',
  },
});
