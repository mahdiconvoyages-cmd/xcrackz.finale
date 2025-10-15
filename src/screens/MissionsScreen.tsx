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
  Image,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import { getMissions, type Mission } from '../services/missionService';
import { supabase } from '../config/supabase';
import { formatRelativeDate, formatTime } from '../utils/dateFormat';

type InspectionsStackParamList = {
  InspectionsHome: undefined;
  MissionDetail: { missionId: string };
  MissionCreate: undefined;
  MissionReports: undefined;
  InspectionDeparture: { missionId: string };
  InspectionGPS: { missionId: string };
  InspectionArrival: { missionId: string };
  Inspection: { missionId: string };
  InAppNavigation: { missionId: string };
  Contacts: undefined;
};

export default function MissionsScreen() {
  const navigation = useNavigation<NavigationProp<InspectionsStackParamList>>();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [receivedMissions, setReceivedMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'created' | 'received'>('created');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadMissions();
      }
    }, [userId])
  );

  const loadUserId = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadMissions = async () => {
    if (!userId) return;

    try {
      // Charger missions créées
      const createdData = await getMissions(userId);
      setMissions(createdData);

      // Charger missions assignées directement à l'user
      // Utilise le champ missions.assigned_to_user_id (référence auth.users)
      const { data: assignedData, error: assignedError } = await supabase
        .from('missions')
        .select('*')
        .eq('assigned_to_user_id', userId)
        .order('created_at', { ascending: false });

      if (assignedError) {
        console.error('Error loading assigned missions:', assignedError);
        setReceivedMissions([]);
      } else {
        setReceivedMissions(assignedData || []);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMissions();
  };

  const handleDownloadPDF = async (missionId: string) => {
    try {
      const pdfUrl = `${process.env.EXPO_PUBLIC_API_URL || ''}/api/missions/${missionId}/pdf`;
      const supported = await Linking.canOpenURL(pdfUrl);

      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Erreur', 'Erreur lors du téléchargement du PDF');
    }
  };

  const handleSendEmail = async (mission: Mission) => {
    try {
      const subject = `Rapport de mission ${mission.reference}`;
      const body = `Bonjour,\n\nVeuillez trouver ci-joint le rapport de mission ${mission.reference}.\n\nVéhicule: ${mission.vehicle_brand} ${mission.vehicle_model}\nImmatriculation: ${mission.vehicle_plate || 'N/A'}\n\nCordialement`;

      const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const supported = await Linking.canOpenURL(emailUrl);

      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi de l\'email');
    }
  };

  const openInbox = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const domain = user.email.split('@')[1];
        let inboxUrl = '';

        const inboxUrls: { [key: string]: string } = {
          'gmail.com': 'googlegmail://',
          'outlook.com': 'ms-outlook://',
          'hotmail.com': 'ms-outlook://',
          'yahoo.com': 'ymail://',
          'icloud.com': 'message://',
        };

        const webInboxUrls: { [key: string]: string } = {
          'gmail.com': 'https://mail.google.com',
          'outlook.com': 'https://outlook.live.com',
          'hotmail.com': 'https://outlook.live.com',
          'yahoo.com': 'https://mail.yahoo.com',
          'icloud.com': 'https://www.icloud.com/mail',
        };

        inboxUrl = inboxUrls[domain] || '';

        if (inboxUrl) {
          const supported = await Linking.canOpenURL(inboxUrl);
          if (supported) {
            await Linking.openURL(inboxUrl);
            return;
          }
        }

        const webUrl = webInboxUrls[domain] || `https://${domain}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Error opening inbox:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir votre boîte mail');
    }
  };

  const currentMissions = activeTab === 'created' ? missions : receivedMissions;

  const filteredMissions = currentMissions.filter((mission) => {
    const matchesSearch =
      mission.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.vehicle_brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.vehicle_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'in_progress':
        return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
      case 'cancelled':
        return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'in_progress':
        return 'En cours';
      case 'pending':
        return 'En attente';
      case 'cancelled':
        return 'Annulée';
      case 'assigned':
        return 'Assignée';
      default:
        return status;
    }
  };

  const stats = {
    total: currentMissions.length,
    pending: currentMissions.filter((m) => m.status === 'pending').length,
    inProgress: currentMissions.filter((m) => m.status === 'in_progress').length,
    completed: currentMissions.filter((m) => m.status === 'completed').length,
  };

  const renderMissionCard = ({ item }: { item: Mission }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MissionDetail', { missionId: item.id })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.reference}>{item.reference}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={24} color="#94a3b8" />
          </View>

          {item.vehicle_image_url && (
            <Image source={{ uri: item.vehicle_image_url }} style={styles.vehicleImage} />
          )}

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Feather name="truck" size={16} color="#64748b" />
              <Text style={styles.infoText}>
                {item.vehicle_brand} {item.vehicle_model}
              </Text>
            </View>

            {item.vehicle_plate && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="card-text" size={16} color="#64748b" />
                <Text style={styles.infoText}>{item.vehicle_plate}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.locationRow}>
              <View style={styles.locationDot} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.pickup_address}
              </Text>
            </View>

            <View style={styles.locationConnector} />

            <View style={styles.locationRow}>
              <View style={[styles.locationDot, styles.locationDotEnd]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.delivery_address}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardFooter}>
              <View style={styles.dateTimeInfo}>
                <View style={styles.infoRow}>
                  <Feather name="calendar" size={14} color="#14b8a6" />
                  <Text style={styles.dateText}>
                    {formatRelativeDate(item.pickup_date)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="clock" size={14} color="#14b8a6" />
                  <Text style={styles.dateText}>
                    {formatTime(item.pickup_date)}
                  </Text>
                </View>
              </View>
              <Text style={styles.priceText}>{item.price.toFixed(2)} €</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* BOUTONS ÉTATS DES LIEUX ET GPS */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Inspection', { missionId: item.id })}
          >
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.quickActionGradient}>
              <Feather name="check-square" size={18} color="#fff" />
              <Text style={styles.quickActionText}>Inspection</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('InAppNavigation', { missionId: item.id })}
          >
            <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.quickActionGradient}>
              <Feather name="navigation" size={18} color="#fff" />
              <Text style={styles.quickActionText}>Navigation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {item.status === 'completed' && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsLabel}>Documents :</Text>
            <View style={styles.actionsButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDownloadPDF(item.id)}
              >
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionButtonGradient}>
                  <Feather name="download" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>PDF</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSendEmail(item)}
              >
                <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.actionButtonGradient}>
                  <Feather name="mail" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Email</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="truck-delivery" size={80} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>Aucune mission</Text>
      <Text style={styles.emptyText}>
        Créez votre première mission pour commencer
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('MissionCreate')}
      >
        <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.emptyButtonGradient}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Nouvelle mission</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Missions</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'created' ? 'Créées par vous' : 'Assignées à vous'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.reportsButton} 
            onPress={() => navigation.navigate('MissionReports')}
          >
            <Feather name="bar-chart-2" size={20} color="#06b6d4" />
            <Text style={styles.reportsButtonText}>Rapports</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inboxButton} onPress={openInbox}>
            <Feather name="inbox" size={20} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('MissionCreate')}
          >
            <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.addButtonGradient}>
              <Feather name="plus" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ONGLETS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'created' && styles.activeTab]}
          onPress={() => setActiveTab('created')}
        >
          <Feather name="truck" size={18} color={activeTab === 'created' ? '#14b8a6' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
            Créées ({missions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Feather name="mail" size={18} color={activeTab === 'received' ? '#14b8a6' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Reçues ({receivedMissions.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={[styles.statValue, { color: '#92400e' }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: '#92400e' }]}>En attente</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Text style={[styles.statValue, { color: '#1e40af' }]}>{stats.inProgress}</Text>
          <Text style={[styles.statLabel, { color: '#1e40af' }]}>En cours</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Text style={[styles.statValue, { color: '#065f46' }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: '#065f46' }]}>Terminées</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une mission..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {['all', 'pending', 'in_progress', 'completed'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive,
              ]}
            >
              {status === 'all'
                ? 'Toutes'
                : status === 'pending'
                ? 'En attente'
                : status === 'in_progress'
                ? 'En cours'
                : 'Terminées'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMissions}
        renderItem={renderMissionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#14b8a6']}
            tintColor="#14b8a6"
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  activeTab: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: '#14b8a6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#14b8a6',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#06b6d4',
  },
  reportsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
  inboxButton: {
    width: 48,
    height: 48,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reference: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  vehicleImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#14b8a6',
  },
  locationDotEnd: {
    backgroundColor: '#f59e0b',
  },
  locationConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#cbd5e1',
    marginLeft: 5,
    marginVertical: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#64748b',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  actionsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  dateTimeInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  // Nouveaux styles pour boutons États des lieux et GPS
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
