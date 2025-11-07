import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import JoinMissionByCode from '../components/JoinMissionByCode';

const Tab = createMaterialTopTabNavigator();

// Types
interface Mission {
  id: string;
  reference: string;
  client_id: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_location: string;
  delivery_location: string;
  pickup_date: string;
  delivery_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  user_id: string;
  created_at: string;
}

interface VehicleInspection {
  id: string;
  mission_id: string;
  inspection_type: 'departure' | 'arrival';
}

// Composant carte mission
function MissionCard({ mission, onPress, viewMode }: { 
  mission: Mission; 
  onPress: () => void;
  viewMode: 'grid' | 'list';
}) {
  const { colors } = useTheme();

  const statusConfig = {
    pending: { label: 'En attente', color: '#ef4444', icon: 'clock-outline' },
    in_progress: { label: 'En cours', color: '#f59e0b', icon: 'play-circle-outline' },
    completed: { label: 'Terminée', color: '#10b981', icon: 'checkmark-circle-outline' },
  };

  const status = statusConfig[mission.status] || statusConfig.pending;

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Ionicons name={status.icon as any} size={12} color="white" />
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
        
        <Text style={[styles.reference, { color: colors.text }]} numberOfLines={1}>
          {mission.reference}
        </Text>
        
        <View style={styles.vehicleInfo}>
          <Ionicons name="car" size={14} color={colors.textSecondary} />
          <Text style={[styles.vehicle, { color: colors.textSecondary }]} numberOfLines={1}>
            {mission.vehicle_brand} {mission.vehicle_model}
          </Text>
        </View>
        
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={12} color={colors.textSecondary} />
          <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
            {mission.pickup_location}
          </Text>
        </View>
        
        <View style={styles.dateInfo}>
          <Ionicons name="calendar" size={12} color={colors.textSecondary} />
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {format(new Date(mission.pickup_date), 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.listCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.listCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reference, { color: colors.text }]}>
            {mission.reference}
          </Text>
          <View style={styles.vehicleInfo}>
            <Ionicons name="car" size={14} color={colors.textSecondary} />
            <Text style={[styles.vehicle, { color: colors.textSecondary }]}>
              {mission.vehicle_brand} {mission.vehicle_model}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Ionicons name={status.icon as any} size={12} color="white" />
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      </View>
      
      <View style={styles.listCardBody}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={14} color={colors.textSecondary} />
          <Text style={[styles.location, { color: colors.textSecondary }]}>
            {mission.pickup_location} → {mission.delivery_location}
          </Text>
        </View>
        
        <View style={styles.dateInfo}>
          <Ionicons name="calendar" size={14} color={colors.textSecondary} />
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {format(new Date(mission.pickup_date), 'dd MMMM yyyy', { locale: fr })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Composant Stats
function StatsCard({ label, value, color, icon }: { 
  label: string; 
  value: number; 
  color: string;
  icon: string;
}) {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statsValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

// Écran "Mes Missions" (missions créées par l'utilisateur)
function MyMissionsTab({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const reloadTimer = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadMyMissions();
    }
  }, [user]);

  // Realtime: refresh when missions or inspections change
  useEffect(() => {
    if (!user) return;

    // Debounced reload to avoid burst refreshes
    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        loadMyMissions();
      }, 300);
    };

    const channel = supabase
      .channel('realtime-my-missions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${user.id}` },
        () => scheduleReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_inspections' },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [user]);

  const loadMyMissions = async () => {
    try {
      setLoading(true);

      // Charger toutes les missions créées par l'utilisateur
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user!.id)
        .order('pickup_date', { ascending: true });

      if (missionsError) throw missionsError;

      if (!missionsData || missionsData.length === 0) {
        setMissions([]);
        setLoading(false);
        return;
      }

      // Récupérer les inspections pour calculer le statut
      const missionIds = missionsData.map(m => m.id);
      const { data: inspections, error: inspectionsError } = await supabase
        .from('vehicle_inspections')
        .select('mission_id, inspection_type')
        .in('mission_id', missionIds);

      if (inspectionsError) throw inspectionsError;

      // Calculer le statut pour chaque mission
      const missionsWithStatus = missionsData.map(mission => {
        const missionInspections = (inspections || []).filter(
          (i: VehicleInspection) => i.mission_id === mission.id
        );

        const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
        const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');

        let status: Mission['status'] = 'pending';
        if (hasDepart && hasArrival) {
          status = 'completed';
        } else if (hasDepart) {
          status = 'in_progress';
        }

        return { ...mission, status };
      });

      // Filtrer les missions terminées (ne pas afficher)
      const activeMissions = missionsWithStatus.filter(m => m.status !== 'completed');

      setMissions(activeMissions);
    } catch (error) {
      console.error('Erreur chargement missions:', error);
      Alert.alert('Erreur', 'Impossible de charger les missions');
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(mission =>
    mission.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
  };

  const handleMissionPress = (mission: Mission) => {
    // Naviguer vers l'écran de détails de mission
    navigation.navigate('Missions', {
      screen: 'MissionView',
      params: { missionId: mission.id }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard label="Total" value={stats.total} color="#3b82f6" icon="folder-outline" />
        <StatsCard label="En attente" value={stats.pending} color="#ef4444" icon="clock-outline" />
        <StatsCard label="En cours" value={stats.inProgress} color="#f59e0b" icon="play-circle-outline" />
      </View>

      {/* Barre de recherche et contrôles */}
      <View style={styles.controlsContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowJoinModal(true)}
        >
          <Ionicons name="add-circle" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { backgroundColor: viewMode === 'grid' ? colors.primary : colors.surface }
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons 
              name="grid" 
              size={20} 
              color={viewMode === 'grid' ? 'white' : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { backgroundColor: viewMode === 'list' ? colors.primary : colors.surface }
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={viewMode === 'list' ? 'white' : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des missions */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des missions...
          </Text>
        </View>
      ) : filteredMissions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchTerm ? 'Aucune mission trouvée' : 'Aucune mission active'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {searchTerm ? 'Essayez un autre terme de recherche' : 'Créez votre première mission'}
          </Text>
          <TouchableOpacity
            style={[styles.joinButtonLarge, { backgroundColor: colors.primary }]}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="log-in" size={24} color="white" />
            <Text style={styles.joinButtonText}>Rejoindre une mission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredMissions}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force re-render when changing view mode
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadMyMissions}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <MissionCard
              mission={item}
              onPress={() => handleMissionPress(item)}
              viewMode={viewMode}
            />
          )}
        />
      )}
      
      {/* Modal Rejoindre Mission */}
      <JoinMissionByCode
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          loadMyMissions();
        }}
      />
    </SafeAreaView>
  );
}

// Écran "Missions Reçues" (missions assignées à l'utilisateur)
function ReceivedMissionsTab({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const reloadTimer = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadReceivedMissions();
    }
  }, [user]);

  // Realtime: refresh when missions assigned to the user or inspections change
  useEffect(() => {
    if (!user) return;

    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        loadReceivedMissions();
      }, 300);
    };

    const channel = supabase
      .channel('realtime-received-missions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `assigned_to_user_id=eq.${user.id}` },
        () => scheduleReload()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_inspections' },
        () => scheduleReload()
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [user]);

  const loadReceivedMissions = async () => {
    try {
      setLoading(true);

      // Charger les missions assignées à l'utilisateur (via share_code)
      // Utilise assigned_to_user_id dans la table missions
      const { data: missionsData, error: missionsError } = await supabase
        .from('missions')
        .select('*')
        .eq('assigned_to_user_id', user!.id)
        .order('pickup_date', { ascending: true });

      if (missionsError) throw missionsError;

      if (!missionsData || missionsData.length === 0) {
        setMissions([]);
        setLoading(false);
        return;
      }

      const missionIds = missionsData.map(m => m.id);

      // Récupérer les inspections pour calculer le statut
      const { data: inspections, error: inspectionsError } = await supabase
        .from('vehicle_inspections')
        .select('mission_id, inspection_type')
        .in('mission_id', missionIds);

      if (inspectionsError) throw inspectionsError;

      // Calculer le statut pour chaque mission
      const missionsWithStatus = (missionsData || []).map(mission => {
        const missionInspections = (inspections || []).filter(
          (i: VehicleInspection) => i.mission_id === mission.id
        );

        const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
        const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');

        let status: Mission['status'] = 'pending';
        if (hasDepart && hasArrival) {
          status = 'completed';
        } else if (hasDepart) {
          status = 'in_progress';
        }

        return { ...mission, status };
      });

      // Filtrer les missions terminées
      const activeMissions = missionsWithStatus.filter(m => m.status !== 'completed');

      setMissions(activeMissions);
    } catch (error) {
      console.error('Erreur chargement missions reçues:', error);
      Alert.alert('Erreur', 'Impossible de charger les missions');
    } finally {
      setLoading(false);
    }
  };

  const filteredMissions = missions.filter(mission =>
    mission.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mission.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
  };

  const handleMissionPress = (mission: Mission) => {
    // Naviguer vers l'écran de détails de mission
    navigation.navigate('Missions', {
      screen: 'MissionView',
      params: { missionId: mission.id }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <StatsCard label="Reçues" value={stats.total} color="#8b5cf6" icon="mail-outline" />
        <StatsCard label="À faire" value={stats.pending} color="#ef4444" icon="alert-circle-outline" />
        <StatsCard label="Démarrées" value={stats.inProgress} color="#10b981" icon="checkmark-circle-outline" />
      </View>

      {/* Barre de recherche et contrôles */}
      <View style={styles.controlsContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { backgroundColor: viewMode === 'grid' ? colors.primary : colors.surface }
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons 
              name="grid" 
              size={20} 
              color={viewMode === 'grid' ? 'white' : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { backgroundColor: viewMode === 'list' ? colors.primary : colors.surface }
            ]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons 
              name="list" 
              size={20} 
              color={viewMode === 'list' ? 'white' : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des missions */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      ) : filteredMissions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-open-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {searchTerm ? 'Aucune mission trouvée' : 'Aucune mission reçue'}
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            {searchTerm ? 'Essayez un autre terme de recherche' : 'Vous n\'avez pas de missions assignées'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMissions}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadReceivedMissions}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <MissionCard
              mission={item}
              onPress={() => handleMissionPress(item)}
              viewMode={viewMode}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// Composant principal avec onglets
export default function NewMissionsScreen() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          textTransform: 'none',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border || '#e5e7eb',
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
          height: 3,
        },
      }}
    >
      <Tab.Screen
        name="MyMissions"
        component={MyMissionsTab}
        options={{ title: 'Mes Missions' }}
      />
      <Tab.Screen
        name="ReceivedMissions"
        component={ReceivedMissionsTab}
        options={{ title: 'Missions Reçues' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  statsCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  viewControls: {
    flexDirection: 'row',
    gap: 6,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  gridCard: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 140,
  },
  listCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  listCardBody: {
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  reference: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  vehicle: {
    fontSize: 13,
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    flex: 1,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  joinButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  joinButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
