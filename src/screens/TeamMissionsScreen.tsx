import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { formatRelativeDate } from '../utils/dateFormat';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  distance?: number;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  price: number;
  notes?: string;
  created_at: string;
  user_id: string;
}

interface Profile {
  id: string;
  email: string;
}

interface Assignment {
  id: string;
  mission_id: string;
  user_id: string;
  assigned_by: string;
  payment_ht?: number;
  commission?: number;
  notes?: string;
  status: string;
  assigned_at: string;
  mission?: Mission;
  assignee?: Profile;
  assigner?: Profile;
}

type RootStackParamList = {
  MissionDetail: { missionId: string };
};

export default function TeamMissionsScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [receivedAssignments, setReceivedAssignments] = useState<Assignment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'missions' | 'received'>('missions');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [assignmentForm, setAssignmentForm] = useState({
    payment_ht: '',
    commission: '',
    notes: '',
  });

  useEffect(() => {
    loadUserId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadData();
      }
    }, [userId])
  );

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMissions(),
        loadProfiles(),
        loadReceivedAssignments(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', userId)
      .order('pickup_date', { ascending: true });

    if (error) {
      console.error('Error loading missions:', error);
    } else {
      setMissions(data || []);
    }
  };

  const loadProfiles = async () => {
    if (!userId) return;
    
    // 🔥 SOLUTION RADICALE: Charger tous les profiles sauf soi-même
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email')
      .neq('id', userId)
      .order('email', { ascending: true });

    if (error) {
      console.error('Error loading profiles:', error);
    } else {
      setProfiles(data || []);
    }
  };

  const loadReceivedAssignments = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('mission_assignments')
      .select(`
        *,
        mission:missions(*),
        assignee:profiles!mission_assignments_user_id_fkey(email, id),
        assigner:profiles!mission_assignments_assigned_by_fkey(email, id)
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error loading received assignments:', error);
    } else {
      setReceivedAssignments(data || []);
    }
  };

  const handleAssignMission = async () => {
    if (!selectedMission || !selectedUserId || !userId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un utilisateur');
      return;
    }

    try {
      const { error } = await supabase
        .from('mission_assignments')
        .insert([{
          mission_id: selectedMission.id,
          contact_id: null,
          user_id: selectedUserId,
          assigned_by: userId,
          payment_ht: parseFloat(assignmentForm.payment_ht) || 0,
          commission: parseFloat(assignmentForm.commission) || 0,
          notes: assignmentForm.notes,
          status: 'assigned',
        }]);

      if (error) throw error;

      Alert.alert('✅ Succès', 'Mission assignée avec succès !');
      setShowAssignModal(false);
      setSelectedMission(null);
      setSelectedUserId('');
      setAssignmentForm({ payment_ht: '', commission: '', notes: '' });
      loadData();
    } catch (error: any) {
      console.error('Error assigning mission:', error);
      Alert.alert('❌ Erreur', error.message || 'Erreur lors de l\'assignation');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [userId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22C55E';
      case 'in_progress': return '#3B82F6';
      case 'assigned': return '#A855F7';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'assigned': return 'Assignée';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const renderMissionCard = ({ item }: { item: Mission }) => (
    <TouchableOpacity
      style={styles.missionCard}
      onPress={() => navigation.navigate('MissionDetail', { missionId: item.id })}
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.cardGradient}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialCommunityIcons name="truck" size={24} color="#3B82F6" />
            <Text style={styles.cardReference}>{item.reference}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        {/* Vehicle */}
        <Text style={styles.cardVehicle}>
          {item.vehicle_brand} {item.vehicle_model}
        </Text>

        {/* Route */}
        <View style={styles.routeContainer}>
          <View style={styles.routePoint}>
            <MaterialIcons name="location-on" size={20} color="#22C55E" />
            <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address}</Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routePoint}>
            <MaterialIcons name="location-on" size={20} color="#EF4444" />
            <Text style={styles.routeText} numberOfLines={1}>{item.delivery_address}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => {
              setSelectedMission(item);
              setShowAssignModal(true);
            }}
          >
            <Feather name="user-plus" size={16} color="#FFF" />
            <Text style={styles.assignButtonText}>Assigner</Text>
          </TouchableOpacity>
          
          <Text style={styles.cardPrice}>{item.price?.toFixed(2)}€</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderReceivedCard = ({ item }: { item: Assignment }) => (
    <TouchableOpacity
      style={styles.missionCard}
      onPress={() => item.mission && navigation.navigate('MissionDetail', { missionId: item.mission.id })}
    >
      <LinearGradient
        colors={['#FEF3C7', '#FFFBEB']}
        style={styles.cardGradient}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <MaterialIcons name="assignment" size={24} color="#F59E0B" />
            <Text style={styles.cardReference}>{item.mission?.reference || 'N/A'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#F59E0B20' }]}>
            <Text style={[styles.statusText, { color: '#F59E0B' }]}>
              Assignée
            </Text>
          </View>
        </View>

        {/* Assigned by */}
        <Text style={styles.assignedBy}>
          👤 Assignée par: <Text style={styles.assignedByName}>{item.assigner?.email || 'N/A'}</Text>
        </Text>
        <Text style={styles.assignedDate}>
          📅 {formatRelativeDate(item.assigned_at)}
        </Text>

        {/* Vehicle */}
        {item.mission && (
          <>
            <Text style={styles.cardVehicle}>
              {item.mission.vehicle_brand} {item.mission.vehicle_model}
            </Text>

            {/* Route */}
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <MaterialIcons name="location-on" size={20} color="#22C55E" />
                <Text style={styles.routeText} numberOfLines={1}>{item.mission.pickup_address}</Text>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routePoint}>
                <MaterialIcons name="location-on" size={20} color="#EF4444" />
                <Text style={styles.routeText} numberOfLines={1}>{item.mission.delivery_address}</Text>
              </View>
            </View>
          </>
        )}

        {/* Payment */}
        {item.payment_ht !== undefined && item.payment_ht > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>💰 Paiement: {item.payment_ht.toFixed(2)}€</Text>
            {item.commission !== undefined && item.commission > 0 && (
              <Text style={styles.commissionLabel}>+{item.commission.toFixed(2)}€ commission</Text>
            )}
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const filteredMissions = missions.filter(m =>
    m.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.vehicle_brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.vehicle_model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.header}>
        <Text style={styles.headerTitle}>🎯 Gestion d'Équipe</Text>
        <Text style={styles.headerSubtitle}>Assignez vos missions à votre équipe</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'missions' && styles.tabActive]}
          onPress={() => setActiveTab('missions')}
        >
          <Text style={[styles.tabText, activeTab === 'missions' && styles.tabTextActive]}>
            📋 Mes Missions ({missions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.tabActive]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.tabTextActive]}>
            🎯 Missions Reçues ({receivedAssignments.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      {activeTab === 'missions' && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une mission..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
      )}

      {/* List */}
      <FlatList
        data={activeTab === 'missions' ? filteredMissions : receivedAssignments}
        renderItem={activeTab === 'missions' ? renderMissionCard : renderReceivedCard}
        keyExtractor={(item) => 'id' in item ? item.id : item.mission_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {activeTab === 'missions' ? 'Aucune mission' : 'Aucune mission reçue'}
            </Text>
          </View>
        }
      />

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assigner la Mission</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedMission && (
                <>
                  <Text style={styles.modalMissionRef}>{selectedMission.reference}</Text>
                  <Text style={styles.modalMissionVehicle}>
                    {selectedMission.vehicle_brand} {selectedMission.vehicle_model}
                  </Text>

                  {/* User Selection */}
                  <Text style={styles.modalLabel}>Assigner à:</Text>
                  <ScrollView style={styles.usersList} nestedScrollEnabled>
                    {profiles.map((profile) => (
                      <TouchableOpacity
                        key={profile.id}
                        style={[
                          styles.userOption,
                          selectedUserId === profile.id && styles.userOptionSelected
                        ]}
                        onPress={() => setSelectedUserId(profile.id)}
                      >
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>{profile.email.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.userEmail}>{profile.email}</Text>
                        {selectedUserId === profile.id && (
                          <Feather name="check-circle" size={20} color="#22C55E" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Payment */}
                  <Text style={styles.modalLabel}>Paiement HT (€):</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    value={assignmentForm.payment_ht}
                    onChangeText={(text) => setAssignmentForm({ ...assignmentForm, payment_ht: text })}
                    keyboardType="decimal-pad"
                  />

                  {/* Commission */}
                  <Text style={styles.modalLabel}>Commission (€):</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0.00"
                    value={assignmentForm.commission}
                    onChangeText={(text) => setAssignmentForm({ ...assignmentForm, commission: text })}
                    keyboardType="decimal-pad"
                  />

                  {/* Notes */}
                  <Text style={styles.modalLabel}>Notes (optionnel):</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalInputMultiline]}
                    placeholder="Instructions particulières..."
                    value={assignmentForm.notes}
                    onChangeText={(text) => setAssignmentForm({ ...assignmentForm, notes: text })}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSubmit}
                onPress={handleAssignMission}
              >
                <Text style={styles.modalButtonSubmitText}>Assigner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  missionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardReference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardVehicle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  routeText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
  },
  routeDivider: {
    width: 2,
    height: 12,
    backgroundColor: '#CBD5E1',
    marginLeft: 9,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  assignButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  assignedBy: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  assignedByName: {
    fontWeight: 'bold',
    color: '#1E293B',
  },
  assignedDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  commissionLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  modalMissionRef: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  modalMissionVehicle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  usersList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  userOptionSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  modalInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingBottom: 0,
  },
  modalButtonCancel: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
  },
  modalButtonSubmit: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  modalButtonSubmitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
