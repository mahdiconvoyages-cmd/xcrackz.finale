import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardStats {
  totalMissions: number;
  activeMissions: number;
  completedMissions: number;
  cancelledMissions: number;
  pendingMissions: number;
  totalContacts: number;
  totalDrivers: number;
  totalClients: number;
  pendingInvoices: number;
  paidInvoices: number;
  totalInvoices: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  averageMissionPrice: number;
  completionRate: number;
  totalCredits: number;
  usedCredits: number;
  topRatedContacts: number;
  missionsThisWeek: number;
  missionsToday: number;
  totalDistance: number;
}

interface RecentMission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  price: number;
}

interface MonthlyData {
  month: string;
  missions: number;
  revenue: number;
}

const { width } = Dimensions.get('window');

export default function DashboardScreenNew() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0,
    activeMissions: 0,
    completedMissions: 0,
    cancelledMissions: 0,
    pendingMissions: 0,
    totalContacts: 0,
    totalDrivers: 0,
    totalClients: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    averageMissionPrice: 0,
    completionRate: 0,
    totalCredits: 0,
    usedCredits: 0,
    topRatedContacts: 0,
    missionsThisWeek: 0,
    missionsToday: 0,
    totalDistance: 0,
  });
  
  const [recentMissions, setRecentMissions] = useState<RecentMission[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const reloadTimer = React.useRef<NodeJS.Timeout | null>(null);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.first_name) {
        setFirstName(data.first_name);
      }
    } catch (error) {
      console.error('[Dashboard] Error loading profile:', error);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [missionsRes, contactsRes, invoicesRes, recentMissionsRes, creditsRes] = await Promise.all([
        supabase.from('missions').select('status, price, created_at, company_commission, bonus_amount, distance_km').eq('user_id', user.id),
        supabase.from('contacts').select('id, type, is_driver, rating_average').eq('user_id', user.id),
        supabase.from('invoices').select('status, total, created_at').eq('user_id', user.id),
        supabase.from('missions').select('id, reference, status, vehicle_brand, vehicle_model, price').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle(),
      ]);

      const missions = missionsRes.data || [];
      const contacts = contactsRes.data || [];
      const invoices = invoicesRes.data || [];

      const completedCount = missions.filter((m) => m.status === 'completed').length;
      const cancelledCount = missions.filter((m) => m.status === 'cancelled').length;
      const activeCount = missions.filter((m) => m.status === 'in_progress').length;
      const pendingCount = missions.filter((m) => m.status === 'pending').length;
      const totalCount = missions.length;
      const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      const totalRevenue = missions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));

      const monthlyMissions = missions.filter((m) => {
        const missionDate = new Date(m.created_at);
        return missionDate.getMonth() === currentMonth && missionDate.getFullYear() === currentYear;
      });

      const weeklyMissions = missions.filter((m) => new Date(m.created_at) >= startOfWeek);
      const todayMissions = missions.filter((m) => new Date(m.created_at) >= startOfToday);

      const monthlyRevenue = monthlyMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
      const weeklyRevenue = weeklyMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const avgPrice = completedCount > 0 ? totalRevenue / completedCount : 0;

      const totalDrivers = contacts.filter((c) => c.is_driver).length;
      const totalClients = contacts.filter((c) => c.type === 'customer').length;
      const topRatedContacts = contacts.filter((c) => c.rating_average >= 4).length;

      const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
      const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length;

      const totalDistance = missions.reduce((sum, m) => sum + (m.distance_km || 0), 0);

      const totalCredits = creditsRes.data?.balance || 0;

      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        const monthMissions = missions.filter((m) => {
          const missionDate = new Date(m.created_at);
          return missionDate.getMonth() === date.getMonth() && missionDate.getFullYear() === date.getFullYear();
        });
        const revenue = monthMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
        last6Months.push({ month, missions: monthMissions.length, revenue });
      }

      setStats({
        totalMissions: totalCount,
        activeMissions: activeCount,
        completedMissions: completedCount,
        cancelledMissions: cancelledCount,
        pendingMissions: pendingCount,
        totalContacts: contacts.length,
        totalDrivers,
        totalClients,
        pendingInvoices,
        paidInvoices,
        totalInvoices: invoices.length,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        averageMissionPrice: avgPrice,
        completionRate,
        totalCredits,
        usedCredits: totalCount,
        topRatedContacts,
        missionsThisWeek: weeklyMissions.length,
        missionsToday: todayMissions.length,
        totalDistance,
      });

      setMonthlyData(last6Months);
      setRecentMissions(recentMissionsRes.data || []);
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      loadDashboardData();
    }, [user?.id])
  );

  // Realtime: refresh dashboard when core tables change
  React.useEffect(() => {
    if (!user) return;

    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => {
        loadDashboardData();
      }, 300);
    };

    const channel = supabase
      .channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${user.id}` }, () => scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, () => scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${user.id}` }, () => scheduleReload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_credits', filter: `user_id=eq.${user.id}` }, () => scheduleReload())
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const maxMissions = Math.max(...monthlyData.map((d) => d.missions), 1);
  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header Premium */}
        <LinearGradient
          colors={['#14b8a6', '#06b6d4', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <MaterialCommunityIcons name="shimmer" size={32} color="#fff" />
              <Text style={styles.headerTitle}>
                Bienvenue{firstName ? ` ${firstName}` : ''} ! 👋
              </Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Voici un aperçu de votre activité en temps réel
            </Text>
          </View>
        </LinearGradient>

        {/* Stats principales - 4 cartes */}
        <View style={styles.mainStatsContainer}>
          {/* Missions Totales */}
          <TouchableOpacity style={[styles.mainStatCard, { borderColor: '#3b82f6' }]}>
            <LinearGradient
              colors={['#3b82f6', '#06b6d4']}
              style={styles.statIconGradient}
            >
              <Ionicons name="car-sport" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.mainStatValue}>{stats.totalMissions}</Text>
            <Text style={styles.mainStatLabel}>Missions</Text>
            <Text style={styles.mainStatExtra}>+{stats.missionsThisWeek} cette semaine</Text>
          </TouchableOpacity>

          {/* Revenu Total */}
          <TouchableOpacity style={[styles.mainStatCard, { borderColor: '#a855f7' }]}>
            <LinearGradient
              colors={['#a855f7', '#ec4899']}
              style={styles.statIconGradient}
            >
              <Ionicons name="cash" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.mainStatValue}>{Math.round(stats.totalRevenue)}€</Text>
            <Text style={styles.mainStatLabel}>Total généré</Text>
            <Text style={styles.mainStatExtra}>Moy: {Math.round(stats.averageMissionPrice)}€</Text>
          </TouchableOpacity>

          {/* Taux de succès */}
          <TouchableOpacity style={[styles.mainStatCard, { borderColor: '#10b981' }]}>
            <LinearGradient
              colors={['#10b981', '#22c55e']}
              style={styles.statIconGradient}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.mainStatValue}>{stats.completionRate.toFixed(1)}%</Text>
            <Text style={styles.mainStatLabel}>Taux de succès</Text>
            <Text style={styles.mainStatExtra}>{stats.completedMissions} complétées</Text>
          </TouchableOpacity>

          {/* Contacts */}
          <TouchableOpacity style={[styles.mainStatCard, { borderColor: '#6366f1' }]}>
            <LinearGradient
              colors={['#6366f1', '#3b82f6']}
              style={styles.statIconGradient}
            >
              <Ionicons name="people" size={24} color="#fff" />
            </LinearGradient>
            <Text style={styles.mainStatValue}>{stats.totalContacts}</Text>
            <Text style={styles.mainStatLabel}>Contacts</Text>
            <Text style={styles.mainStatExtra}>{stats.totalDrivers} chauffeurs</Text>
          </TouchableOpacity>
        </View>

        {/* Stats secondaires - Mini cartes 2x3 */}
        <View style={styles.secondaryStatsContainer}>
          <View style={[styles.miniStatCard, { backgroundColor: '#fff7ed', borderColor: '#fb923c' }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: '#fed7aa' }]}>
              <Ionicons name="speedometer" size={20} color="#f97316" />
            </View>
            <Text style={[styles.miniStatValue, { color: '#f97316' }]}>{stats.activeMissions}</Text>
            <Text style={styles.miniStatLabel}>En cours</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: '#fef9c3', borderColor: '#fbbf24' }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: '#fde68a' }]}>
              <Ionicons name="time" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.miniStatValue, { color: '#f59e0b' }]}>{stats.pendingMissions}</Text>
            <Text style={styles.miniStatLabel}>En attente</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: '#fee2e2', borderColor: '#f87171' }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: '#fca5a5' }]}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.miniStatValue, { color: '#ef4444' }]}>{stats.cancelledMissions}</Text>
            <Text style={styles.miniStatLabel}>Annulées</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: '#fef3c7', borderColor: '#facc15' }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: '#fde047' }]}>
              <Ionicons name="star" size={20} color="#eab308" />
            </View>
            <Text style={[styles.miniStatValue, { color: '#eab308' }]}>{stats.topRatedContacts}</Text>
            <Text style={styles.miniStatLabel}>Top notés</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: '#ecfeff', borderColor: '#06b6d4' }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: '#a5f3fc' }]}>
              <Ionicons name="navigate" size={20} color="#06b6d4" />
            </View>
            <Text style={[styles.miniStatValue, { color: '#06b6d4' }]}>{Math.round(stats.totalDistance)}</Text>
            <Text style={styles.miniStatLabel}>Km total</Text>
          </View>

          <View style={[styles.miniStatCard, { backgroundColor: '#dbeafe', borderColor: '#3b82f6' }]}>
            <View style={[styles.miniStatIcon, { backgroundColor: '#93c5fd' }]}>
              <Ionicons name="flash" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.miniStatValue, { color: '#3b82f6', fontSize: 18 }]}>{stats.missionsToday}</Text>
            <Text style={styles.miniStatLabel}>Aujourd'hui</Text>
          </View>
        </View>

        {/* Graphique évolution 6 mois */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <Ionicons name="bar-chart" size={24} color="#14b8a6" />
              <Text style={[styles.chartTitle, { color: colors.text }]}>Évolution des 6 derniers mois</Text>
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#14b8a6' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Missions</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#a855f7' }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Revenus</Text>
              </View>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {monthlyData.map((data, index) => {
              const missionHeight = maxMissions > 0 ? (data.missions / maxMissions) * 100 : 0;
              const revenueHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;

              return (
                <View key={index} style={styles.chartBar}>
                  {/* Missions bar */}
                  <View style={styles.barContainer}>
                    <LinearGradient
                      colors={['#14b8a6', '#06b6d4']}
                      style={[styles.bar, { height: `${Math.max(missionHeight, 5)}%` }]}
                    >
                      <Text style={styles.barValue}>{data.missions}</Text>
                    </LinearGradient>
                  </View>

                  {/* Revenus bar (mini) */}
                  <View style={styles.barContainerSmall}>
                    <LinearGradient
                      colors={['#a855f7', '#ec4899']}
                      style={[styles.barSmall, { height: `${Math.max(revenueHeight, 10)}%` }]}
                    />
                  </View>

                  {/* Month label */}
                  <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>{data.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Missions récentes */}
        <View style={[styles.recentCard, { backgroundColor: colors.card }]}>
          <View style={styles.recentHeader}>
            <View style={styles.recentTitleContainer}>
              <Ionicons name="list" size={24} color="#14b8a6" />
              <Text style={[styles.recentTitle, { color: colors.text }]}>Missions récentes</Text>
            </View>
            <TouchableOpacity onPress={() => (navigation as any).navigate('Missions')}>
              <Text style={styles.viewAllText}>Tout voir →</Text>
            </TouchableOpacity>
          </View>

          {recentMissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-sport-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune mission</Text>
            </View>
          ) : (
            <View style={styles.missionsList}>
              {recentMissions.map((mission) => (
                <TouchableOpacity
                  key={mission.id}
                  style={[styles.missionItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => (navigation as any).navigate('MissionView', { missionId: mission.id })}
                >
                  <View style={styles.missionHeader}>
                    <Text style={[styles.missionRef, { color: colors.text }]}>{mission.reference}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(mission.status)}20`, borderColor: getStatusColor(mission.status) }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(mission.status) }]}>
                        {getStatusLabel(mission.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.missionVehicle, { color: colors.textSecondary }]}>
                    {mission.vehicle_brand} {mission.vehicle_model}
                  </Text>
                  {mission.price > 0 && (
                    <Text style={styles.missionPrice}>{mission.price}€</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Performance cards */}
        <View style={styles.performanceContainer}>
          <LinearGradient
            colors={['#14b8a6', '#06b6d4']}
            style={styles.performanceCard}
          >
            <View style={styles.performanceIcon}>
              <Ionicons name="calendar" size={24} color="#fff" />
            </View>
            <View style={styles.performanceContent}>
              <Text style={styles.performanceLabel}>Ce mois</Text>
              <Text style={styles.performanceValue}>{Math.round(stats.monthlyRevenue)}€</Text>
              <Text style={styles.performanceExtra}>Semaine: {Math.round(stats.weeklyRevenue)}€</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#a855f7', '#ec4899']}
            style={styles.performanceCard}
          >
            <View style={styles.performanceIcon}>
              <Ionicons name="cube" size={24} color="#fff" />
            </View>
            <View style={styles.performanceContent}>
              <Text style={styles.performanceLabel}>Crédits</Text>
              <Text style={styles.performanceValue}>{stats.totalCredits}</Text>
              <Text style={styles.performanceExtra}>Utilisés: {stats.usedCredits}</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['#6366f1', '#3b82f6']}
            style={styles.performanceCard}
          >
            <View style={styles.performanceIcon}>
              <Ionicons name="receipt" size={24} color="#fff" />
            </View>
            <View style={styles.performanceContent}>
              <Text style={styles.performanceLabel}>Factures</Text>
              <Text style={styles.performanceValue}>{stats.totalInvoices}</Text>
              <Text style={styles.performanceExtra}>Payées: {stats.paidInvoices}</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Header Premium
  headerGradient: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  headerContent: {
    gap: 12,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },

  // Stats principales
  mainStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  mainStatCard: {
    width: (width - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
  },
  statIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1f2937',
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  mainStatExtra: {
    fontSize: 11,
    fontWeight: '600',
    color: '#14b8a6',
  },

  // Stats secondaires (mini)
  secondaryStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  miniStatCard: {
    width: (width - 52) / 3,
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  miniStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniStatValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },

  // Graphique
  chartCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },

  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingBottom: 30,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
  },
  barContainer: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
    elevation: 3,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  barValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  barContainerSmall: {
    height: 40,
    width: '70%',
    justifyContent: 'flex-end',
  },
  barSmall: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    elevation: 2,
  },
  monthLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: 6,
  },

  // Missions récentes
  recentCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.1)',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14b8a6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  missionsList: {
    gap: 12,
  },
  missionItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  missionRef: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 2,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  missionVehicle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  missionPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14b8a6',
  },

  // Performance cards
  performanceContainer: {
    gap: 12,
  },
  performanceCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  performanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  performanceContent: {
    flex: 1,
  },
  performanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  performanceExtra: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
