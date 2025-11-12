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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
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
  user_id: string;
  assigned_user_id?: string;
  archived?: boolean;
  share_code?: string;
}

type TabType = 'created' | 'received';

export default function MissionsScreenNew({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [createdMissions, setCreatedMissions] = useState<Mission[]>([]);
  const [receivedMissions, setReceivedMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

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

  const renderMissionCard = ({ item: mission }: { item: Mission }) => {
    const isCreator = mission.user_id === user?.id;
    
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('MissionView', { missionId: mission.id })}
        activeOpacity={0.7}
      >
        {/* En-tête */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="car" size={20} color={colors.primary} />
            <Text style={[styles.reference, { color: colors.text }]}>
              {mission.reference}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(mission.status) }]}>
              {getStatusLabel(mission.status)}
            </Text>
          </View>
        </View>

        {/* Véhicule */}
        <Text style={[styles.vehicle, { color: colors.text }]}>
          {mission.vehicle_brand} {mission.vehicle_model}
        </Text>
        <Text style={[styles.plate, { color: colors.textSecondary }]}>
          {mission.vehicle_plate}
        </Text>

        {/* Adresses */}
        <View style={styles.addresses}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#4CAF50" />
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
              {mission.pickup_address}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="flag" size={16} color="#f44336" />
            <Text style={[styles.address, { color: colors.textSecondary }]} numberOfLines={1}>
              {mission.delivery_address}
            </Text>
          </View>
        </View>

        {/* Prix et date */}
        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.primary }]}>
            {mission.price?.toFixed(2) || '0.00'} €
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>

        {/* Indicateur créateur/assigné */}
        {!isCreator && (
          <View style={[styles.assignedBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="arrow-down-circle" size={14} color={colors.primary} />
            <Text style={[styles.assignedText, { color: colors.primary }]}>
              Mission reçue
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const isCreatedTab = activeTab === 'created';
    
    return (
      <View style={styles.emptyState}>
        <Ionicons 
          name={isCreatedTab ? "add-circle-outline" : "mail-open-outline"} 
          size={64} 
          color={colors.textSecondary} 
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {isCreatedTab ? 'Aucune mission créée' : 'Aucune mission reçue'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {isCreatedTab 
            ? 'Créez votre première mission' 
            : 'Les missions partagées avec vous apparaîtront ici'
          }
        </Text>
        
        {!isCreatedTab && (
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="enter" size={20} color="#fff" />
            <Text style={styles.joinButtonText}>Rejoindre une mission</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const missions = activeTab === 'created' ? createdMissions : receivedMissions;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Mes Missions</Text>
        
        <View style={styles.headerActions}>
          {activeTab === 'received' && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowJoinModal(true)}
            >
              <Ionicons name="enter" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('MissionCreate')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'created' && { borderBottomColor: colors.primary }
          ]}
          onPress={() => setActiveTab('created')}
        >
          <Ionicons 
            name="briefcase" 
            size={20} 
            color={activeTab === 'created' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'created' ? colors.primary : colors.textSecondary }
            ]}
          >
            Mes missions ({createdMissions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'received' && { borderBottomColor: colors.primary }
          ]}
          onPress={() => setActiveTab('received')}
        >
          <Ionicons 
            name="download" 
            size={20} 
            color={activeTab === 'received' ? colors.primary : colors.textSecondary} 
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'received' ? colors.primary : colors.textSecondary }
            ]}
          >
            Reçues ({receivedMissions.length})
          </Text>
        </TouchableOpacity>
      </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reference: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  plate: {
    fontSize: 14,
    marginBottom: 12,
  },
  addresses: {
    gap: 8,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  address: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: '600',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
