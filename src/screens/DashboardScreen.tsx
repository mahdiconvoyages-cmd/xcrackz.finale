import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalMissions: number;
  activeMissions: number;
  completedMissions: number;
  cancelledMissions: number;
  totalContacts: number;
  pendingInvoices: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageMissionPrice: number;
  completionRate: number;
}

interface RecentMission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  price: number;
}

interface MonthlyData {
  month: string;
  missions: number;
  revenue: number;
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0,
    activeMissions: 0,
    completedMissions: 0,
    cancelledMissions: 0,
    totalContacts: 0,
    pendingInvoices: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageMissionPrice: 0,
    completionRate: 0,
  });
  const [recentMissions, setRecentMissions] = useState<RecentMission[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserId();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadDashboardData();
      }
    }, [userId])
  );

  const loadUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const loadDashboardData = async () => {
    if (!userId) return;

    try {
      const [missionsRes, contactsRes, invoicesRes, recentMissionsRes] = await Promise.all([
        supabase.from('missions').select('status, price, created_at, company_commission, bonus_amount', { count: 'exact' }).eq('user_id', userId),
        supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('invoices').select('status, total', { count: 'exact' }).eq('user_id', userId),
        supabase
          .from('missions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const missions = missionsRes.data || [];
      const invoices = invoicesRes.data || [];

      const completedCount = missions.filter((m) => m.status === 'completed').length;
      const totalCount = missions.length;
      const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      const totalRevenue = missions
        .filter((m) => m.status === 'completed')
        .reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyMissions = missions.filter((m) => {
        const missionDate = new Date(m.created_at);
        return missionDate.getMonth() === currentMonth && missionDate.getFullYear() === currentYear;
      });

      const monthlyRevenue = monthlyMissions
        .filter((m) => m.status === 'completed')
        .reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const avgPrice = completedCount > 0 ? totalRevenue / completedCount : 0;

      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        const monthMissions = missions.filter((m) => {
          const missionDate = new Date(m.created_at);
          return missionDate.getMonth() === date.getMonth() && missionDate.getFullYear() === date.getFullYear();
        });
        const revenue = monthMissions
          .filter((m) => m.status === 'completed')
          .reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
        last6Months.push({
          month,
          missions: monthMissions.length,
          revenue,
        });
      }

      setStats({
        totalMissions: missionsRes.count || 0,
        activeMissions: missions.filter((m) => m.status === 'in_progress').length,
        completedMissions: completedCount,
        cancelledMissions: missions.filter((m) => m.status === 'cancelled').length,
        totalContacts: contactsRes.count || 0,
        pendingInvoices: invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length,
        totalRevenue,
        monthlyRevenue,
        averageMissionPrice: avgPrice,
        completionRate,
      });

      setMonthlyData(last6Months);
      setRecentMissions(recentMissionsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: '#10b981' };
      case 'in_progress':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: '#3b82f6' };
      case 'pending':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: '#f59e0b' };
      case 'cancelled':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: '#ef4444' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: '#64748b' };
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

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06b6d4" />
          <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#0b1220', '#0e1930', '#0b1220']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.title}>Tableau de Bord</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Feather name="bell" size={22} color="#e5e7eb" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#06b6d4"
            colors={['#06b6d4']}
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['rgba(6, 182, 212, 0.15)', 'rgba(8, 145, 178, 0.15)']}
            style={styles.statCard}
          >
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="truck-delivery" size={24} color="#06b6d4" />
            </View>
            <Text style={styles.statValue}>{stats.totalMissions}</Text>
            <Text style={styles.statLabel}>Total Missions</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(245, 158, 11, 0.15)', 'rgba(217, 119, 6, 0.15)']}
            style={styles.statCard}
          >
            <View style={styles.statIconContainer}>
              <Feather name="clock" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.activeMissions}</Text>
            <Text style={styles.statLabel}>En Cours</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(16, 185, 129, 0.15)', 'rgba(5, 150, 105, 0.15)']}
            style={styles.statCard}
          >
            <View style={styles.statIconContainer}>
              <Feather name="check-circle" size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>{stats.completedMissions}</Text>
            <Text style={styles.statLabel}>Terminées</Text>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(124, 58, 237, 0.15)']}
            style={styles.statCard}
          >
            <View style={styles.statIconContainer}>
              <Feather name="users" size={24} color="#8b5cf6" />
            </View>
            <Text style={styles.statValue}>{stats.totalContacts}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </LinearGradient>
        </View>

        {/* Revenue Cards */}
        <View style={styles.revenueContainer}>
          <LinearGradient
            colors={['rgba(6, 182, 212, 0.2)', 'rgba(8, 145, 178, 0.2)']}
            style={styles.revenueCard}
          >
            <View style={styles.revenueHeader}>
              <View style={styles.revenueIcon}>
                <Feather name="trending-up" size={20} color="#06b6d4" />
              </View>
              <Text style={styles.revenueLabel}>Revenu Total</Text>
            </View>
            <Text style={styles.revenueValue}>{stats.totalRevenue.toFixed(2)} €</Text>
            <View style={styles.revenueFooter}>
              <Feather name="arrow-up-right" size={16} color="#10b981" />
              <Text style={styles.revenueChange}>+{stats.completionRate.toFixed(1)}% complétées</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(124, 58, 237, 0.2)']}
            style={styles.revenueCard}
          >
            <View style={styles.revenueHeader}>
              <View style={styles.revenueIcon}>
                <Feather name="calendar" size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.revenueLabel}>Ce Mois-ci</Text>
            </View>
            <Text style={styles.revenueValue}>{stats.monthlyRevenue.toFixed(2)} €</Text>
            <View style={styles.revenueFooter}>
              <Feather name="activity" size={16} color="#8b5cf6" />
              <Text style={styles.revenueChange}>{stats.averageMissionPrice.toFixed(2)} € moy.</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Monthly Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Revenus 6 Derniers Mois</Text>
            <Feather name="bar-chart-2" size={20} color="#06b6d4" />
          </View>
          <View style={styles.chart}>
            {monthlyData.map((item, index) => (
              <View key={index} style={styles.chartBar}>
                <View style={styles.chartBarContainer}>
                  <LinearGradient
                    colors={['#06b6d4', '#0891b2']}
                    style={[
                      styles.chartBarFill,
                      { height: `${(item.revenue / maxRevenue) * 100}%` }
                    ]}
                  >
                    {item.revenue > 0 && (
                      <Text style={styles.chartBarValue}>{item.revenue.toFixed(0)}</Text>
                    )}
                  </LinearGradient>
                </View>
                <Text style={styles.chartBarLabel}>{item.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Missions */}
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Missions Récentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Missions' as never)}>
              <Text style={styles.recentLink}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {recentMissions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="truck-delivery" size={48} color="#64748b" />
              <Text style={styles.emptyText}>Aucune mission récente</Text>
            </View>
          ) : (
            recentMissions.map((mission) => {
              const statusColors = getStatusColor(mission.status);
              return (
                <TouchableOpacity
                  key={mission.id}
                  style={styles.missionCard}
                  onPress={() => navigation.navigate('Inspections' as never)}
                >
                  <View style={styles.missionHeader}>
                    <Text style={styles.missionReference}>{mission.reference}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {getStatusLabel(mission.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.missionBody}>
                    <View style={styles.missionRow}>
                      <Feather name="truck" size={14} color="#64748b" />
                      <Text style={styles.missionText}>
                        {mission.vehicle_brand} {mission.vehicle_model}
                      </Text>
                    </View>
                    <View style={styles.missionRow}>
                      <Feather name="map-pin" size={14} color="#06b6d4" />
                      <Text style={styles.missionText} numberOfLines={1}>
                        {mission.pickup_address}
                      </Text>
                    </View>
                    <View style={styles.missionFooter}>
                      <Text style={styles.missionDate}>
                        {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
                      </Text>
                      <Text style={styles.missionPrice}>{mission.price.toFixed(2)} €</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Actions Rapides</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('MissionCreate' as never)}
            >
              <LinearGradient
                colors={['#06b6d4', '#0891b2']}
                style={styles.actionGradient}
              >
                <Feather name="plus" size={24} color="#fff" />
                <Text style={styles.actionLabel}>Nouvelle Mission</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Scanner' as never)}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.actionGradient}
              >
                <Feather name="camera" size={24} color="#fff" />
                <Text style={styles.actionLabel}>Scanner</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Facturation' as never)}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.actionGradient}
              >
                <Feather name="file-text" size={24} color="#fff" />
                <Text style={styles.actionLabel}>Facturation</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('More' as never)}
            >
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
                style={styles.actionGradient}
              >
                <Feather name="more-horizontal" size={24} color="#fff" />
                <Text style={styles.actionLabel}>Plus</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9ca3af',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: (width - 34) / 2,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#e5e7eb',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  revenueContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  revenueCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  revenueIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  revenueLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  revenueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  revenueChange: {
    fontSize: 11,
    color: '#9ca3af',
  },
  chartContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    gap: 6,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarContainer: {
    width: '100%',
    height: 90,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
    alignItems: 'center',
    paddingTop: 4,
  },
  chartBarValue: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
  },
  recentContainer: {
    marginBottom: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  recentLink: {
    fontSize: 13,
    color: '#06b6d4',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
  },
  missionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.3)',
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  missionReference: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e5e7eb',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  missionBody: {
    gap: 5,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  missionText: {
    flex: 1,
    fontSize: 12,
    color: '#d1d5db',
  },
  missionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  missionDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  missionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06b6d4',
  },
  quickActions: {
    marginTop: 6,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    width: (width - 34) / 2,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
