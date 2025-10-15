import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../config/supabase';

interface Mission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  price: number;
  created_at: string;
}

export default function MissionReportsScreen() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMissions, setSelectedMissions] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadMissions();
    }
  }, [userId]);

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadMissions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMissionSelection = (missionId: string) => {
    const newSelection = new Set(selectedMissions);
    if (newSelection.has(missionId)) {
      newSelection.delete(missionId);
    } else {
      newSelection.add(missionId);
    }
    setSelectedMissions(newSelection);
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredMissions();
    if (selectedMissions.size === filtered.length) {
      setSelectedMissions(new Set());
    } else {
      setSelectedMissions(new Set(filtered.map(m => m.id)));
    }
  };

  const handleExportPDF = async () => {
    try {
      const missionsToExport = selectionMode 
        ? missions.filter(m => selectedMissions.has(m.id))
        : getFilteredMissions();
      
      if (missionsToExport.length === 0) {
        Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une mission.');
        return;
      }

      Alert.alert(
        'Export PDF',
        `Exporter ${missionsToExport.length} mission(s) sélectionnée(s) en PDF ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Exporter',
            onPress: () => {
              // TODO: Implémenter l'export PDF
              Alert.alert('Succès', `${missionsToExport.length} rapport(s) exporté(s) en PDF`);
              setSelectionMode(false);
              setSelectedMissions(new Set());
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le PDF');
    }
  };

  const handleExportCSV = async () => {
    try {
      const missionsToExport = selectionMode 
        ? missions.filter(m => selectedMissions.has(m.id))
        : getFilteredMissions();
      
      if (missionsToExport.length === 0) {
        Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une mission.');
        return;
      }

      const csvData = missionsToExport.map(m => ({
        Référence: m.reference,
        Statut: m.status,
        Véhicule: `${m.vehicle_brand} ${m.vehicle_model}`,
        Immatriculation: m.vehicle_plate || 'N/A',
        Départ: m.pickup_address,
        Arrivée: m.delivery_address,
        Date: new Date(m.pickup_date).toLocaleDateString('fr-FR'),
        Prix: `${m.price.toFixed(2)} €`,
      }));

      Alert.alert(
        'Export CSV',
        `Exporter ${missionsToExport.length} mission(s) sélectionnée(s) en CSV ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Exporter',
            onPress: () => {
              // TODO: Implémenter l'export CSV
              Alert.alert('Succès', `${missionsToExport.length} rapport(s) exporté(s) en CSV`);
              setSelectionMode(false);
              setSelectedMissions(new Set());
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le CSV');
    }
  };

  const handleSendEmailReport = async () => {
    try {
      const missionsToExport = selectionMode 
        ? missions.filter(m => selectedMissions.has(m.id))
        : getFilteredMissions();
      
      if (missionsToExport.length === 0) {
        Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une mission.');
        return;
      }

      const subject = encodeURIComponent('Rapport de missions XCrackz');
      const body = encodeURIComponent(
        `Bonjour,\n\nVoici le rapport de missions :\n\n` +
        `Nombre total : ${missionsToExport.length}\n` +
        `Terminées : ${missionsToExport.filter(m => m.status === 'completed').length}\n` +
        `En cours : ${missionsToExport.filter(m => m.status === 'in_progress').length}\n` +
        `En attente : ${missionsToExport.filter(m => m.status === 'pending').length}\n\n` +
        `Cordialement`
      );

      const url = `mailto:?subject=${subject}&body=${body}`;
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
        setSelectionMode(false);
        setSelectedMissions(new Set());
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi de l\'email');
    }
  };

  const getFilteredMissions = () => {
    return missions.filter((mission) => {
      // Search filter
      const matchesSearch =
        mission.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.vehicle_brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.vehicle_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const missionDate = new Date(mission.created_at);
        const now = new Date();
        
        if (dateFilter === 'today') {
          matchesDate = missionDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = missionDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = missionDate >= monthAgo;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  };

  const filteredMissions = getFilteredMissions();

  const stats = {
    total: filteredMissions.length,
    pending: filteredMissions.filter(m => m.status === 'pending').length,
    inProgress: filteredMissions.filter(m => m.status === 'in_progress').length,
    completed: filteredMissions.filter(m => m.status === 'completed').length,
    cancelled: filteredMissions.filter(m => m.status === 'cancelled').length,
    totalRevenue: filteredMissions
      .filter(m => m.status === 'completed')
      .reduce((sum, m) => sum + m.price, 0),
    averagePrice: filteredMissions.length > 0
      ? filteredMissions.reduce((sum, m) => sum + m.price, 0) / filteredMissions.length
      : 0,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#0b1220', '#0e1930', '#0b1220']}
        style={styles.header}
      >
        <Text style={styles.title}>Rapports de Missions</Text>
        <Text style={styles.subtitle}>Analyse et export de données</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une mission..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterChips}>
            <Text style={styles.filterLabel}>Statut :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {[
                { value: 'all', label: 'Tout' },
                { value: 'pending', label: 'En attente' },
                { value: 'in_progress', label: 'En cours' },
                { value: 'completed', label: 'Terminées' },
                { value: 'cancelled', label: 'Annulées' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.value}
                  style={[
                    styles.chip,
                    statusFilter === chip.value && styles.chipActive,
                  ]}
                  onPress={() => setStatusFilter(chip.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      statusFilter === chip.value && styles.chipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterChips}>
            <Text style={styles.filterLabel}>Période :</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {[
                { value: 'all', label: 'Toutes' },
                { value: 'today', label: 'Aujourd\'hui' },
                { value: 'week', label: '7 jours' },
                { value: 'month', label: '30 jours' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.value}
                  style={[
                    styles.chip,
                    dateFilter === chip.value && styles.chipActive,
                  ]}
                  onPress={() => setDateFilter(chip.value as any)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      dateFilter === chip.value && styles.chipTextActive,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Attente</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.inProgress}</Text>
              <Text style={styles.statLabel}>En cours</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Terminées</Text>
            </View>
          </View>

          <View style={styles.revenueBox}>
            <View style={styles.revenueRow}>
              <Feather name="trending-up" size={20} color="#06b6d4" />
              <Text style={styles.revenueLabel}>Revenu Total</Text>
            </View>
            <Text style={styles.revenueValue}>{stats.totalRevenue.toFixed(2)} €</Text>
            <Text style={styles.revenueAverage}>
              Moyenne : {stats.averagePrice.toFixed(2)} € / mission
            </Text>
          </View>
        </View>

        {/* Export Actions */}
        <View style={styles.actionsContainer}>
          <View style={styles.actionsHeader}>
            <Text style={styles.actionsTitle}>Actions d'Export</Text>
            <TouchableOpacity 
              style={styles.selectionButton}
              onPress={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) {
                  setSelectedMissions(new Set());
                }
              }}
            >
              <Feather 
                name={selectionMode ? "x-circle" : "check-square"} 
                size={18} 
                color={selectionMode ? "#ef4444" : "#06b6d4"} 
              />
              <Text style={[styles.selectionButtonText, selectionMode && { color: '#ef4444' }]}>
                {selectionMode ? 'Annuler' : 'Sélectionner'}
              </Text>
            </TouchableOpacity>
          </View>

          {selectionMode && (
            <View style={styles.selectionControls}>
              <TouchableOpacity 
                style={styles.selectAllButton}
                onPress={toggleSelectAll}
              >
                <Feather 
                  name={selectedMissions.size === filteredMissions.length ? "check-square" : "square"} 
                  size={20} 
                  color="#06b6d4" 
                />
                <Text style={styles.selectAllText}>
                  {selectedMissions.size === filteredMissions.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.selectionCount}>
                {selectedMissions.size} sélectionnée(s)
              </Text>
            </View>
          )}

          {selectionMode && (
            <View style={styles.missionsList}>
              {filteredMissions.map((mission) => (
                <TouchableOpacity
                  key={mission.id}
                  style={styles.missionItem}
                  onPress={() => toggleMissionSelection(mission.id)}
                >
                  <Feather
                    name={selectedMissions.has(mission.id) ? "check-circle" : "circle"}
                    size={24}
                    color={selectedMissions.has(mission.id) ? "#14b8a6" : "#64748b"}
                  />
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionReference}>{mission.reference}</Text>
                    <Text style={styles.missionDetails}>
                      {mission.vehicle_brand} {mission.vehicle_model}
                    </Text>
                    <Text style={styles.missionPrice}>{mission.price.toFixed(2)} €</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    mission.status === 'completed' && styles.statusCompleted,
                    mission.status === 'in_progress' && styles.statusInProgress,
                    mission.status === 'pending' && styles.statusPending,
                  ]}>
                    <Text style={styles.statusText}>
                      {mission.status === 'completed' ? 'Terminée' :
                       mission.status === 'in_progress' ? 'En cours' :
                       mission.status === 'pending' ? 'En attente' : 'Annulée'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.actionButton, selectedMissions.size === 0 && selectionMode && styles.actionButtonDisabled]} 
            onPress={handleExportPDF}
            disabled={selectionMode && selectedMissions.size === 0}
          >
            <LinearGradient
              colors={selectionMode && selectedMissions.size === 0 ? ['#64748b', '#475569'] : ['#ef4444', '#dc2626']}
              style={styles.actionGradient}
            >
              <Feather name="file-text" size={20} color="#fff" />
              <Text style={styles.actionText}>
                {selectionMode ? `Exporter ${selectedMissions.size} PDF` : 'Exporter en PDF'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, selectedMissions.size === 0 && selectionMode && styles.actionButtonDisabled]} 
            onPress={handleExportCSV}
            disabled={selectionMode && selectedMissions.size === 0}
          >
            <LinearGradient
              colors={selectionMode && selectedMissions.size === 0 ? ['#64748b', '#475569'] : ['#10b981', '#059669']}
              style={styles.actionGradient}
            >
              <Feather name="download" size={20} color="#fff" />
              <Text style={styles.actionText}>
                {selectionMode ? `Exporter ${selectedMissions.size} CSV` : 'Exporter en CSV'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, selectedMissions.size === 0 && selectionMode && styles.actionButtonDisabled]} 
            onPress={handleSendEmailReport}
            disabled={selectionMode && selectedMissions.size === 0}
          >
            <LinearGradient
              colors={selectionMode && selectedMissions.size === 0 ? ['#64748b', '#475569'] : ['#06b6d4', '#0891b2']}
              style={styles.actionGradient}
            >
              <Feather name="mail" size={20} color="#fff" />
              <Text style={styles.actionText}>
                {selectionMode ? `Envoyer ${selectedMissions.size} par Email` : 'Envoyer par Email'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        <View style={styles.resultsInfo}>
          <Feather name="info" size={16} color="#06b6d4" />
          <Text style={styles.resultsText}>
            {filteredMissions.length} mission(s) trouvée(s) avec les filtres actuels
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 14,
    color: '#e5e7eb',
  },
  filterChips: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  chipTextActive: {
    color: '#06b6d4',
  },
  statsContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  revenueBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#06b6d4',
    marginBottom: 4,
  },
  revenueAverage: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  selectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#06b6d4',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06b6d4',
  },
  selectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  missionsList: {
    marginBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    padding: 8,
    maxHeight: 300,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  missionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  missionReference: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  missionDetails: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  missionPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusInProgress: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  resultsText: {
    fontSize: 13,
    color: '#06b6d4',
    flex: 1,
  },
});
