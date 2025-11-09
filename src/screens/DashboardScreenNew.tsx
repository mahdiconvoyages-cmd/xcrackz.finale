import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCredits } from '../hooks/useCredits';

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
  reports_count?: number; // Nombre de rapports d'inspection disponibles
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
  const { credits, loading: creditsLoading, refreshCredits } = useCredits();
  
  console.log('🎯 Dashboard: credits =', credits, 'loading =', creditsLoading);
  console.log('🎯 Dashboard: user.id =', user?.id);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string>('');
  const [subscription, setSubscription] = useState<{
    plan_name: string;
    status: string;
    current_period_end: string;
  } | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
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

  // Animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation loop for credits badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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
      const [missionsRes, contactsRes, invoicesRes, recentMissionsRes, subscriptionRes] = await Promise.all([
        supabase.from('missions').select('status, price, created_at, company_commission, bonus_amount, distance_km').eq('user_id', user.id),
        supabase.from('contacts').select('id, type, is_driver, rating_average').eq('user_id', user.id),
        supabase.from('invoices').select('status, total, created_at').eq('user_id', user.id),
        supabase.from('missions').select('id, reference, status, vehicle_brand, vehicle_model, inspection_reports(id)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('plan_name, status, current_period_end').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      ]);

      const missions = missionsRes.data || [];
      const contacts = contactsRes.data || [];
      const invoices = invoicesRes.data || [];
      
      // Set subscription data
      if (subscriptionRes.data) {
        setSubscription(subscriptionRes.data);
      }

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

      // Crédits viennent du hook useCredits (realtime)

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
        totalCredits: credits, // Utilise le hook useCredits (realtime)
        usedCredits: totalCount,
        topRatedContacts,
        missionsThisWeek: weeklyMissions.length,
        missionsToday: todayMissions.length,
        totalDistance,
      });

      setMonthlyData(last6Months);
      
      // Transformer les données pour ajouter reports_count
      const formattedRecentMissions = (recentMissionsRes.data || []).map((mission: any) => ({
        id: mission.id,
        reference: mission.reference,
        status: mission.status,
        vehicle_brand: mission.vehicle_brand,
        vehicle_model: mission.vehicle_model,
        reports_count: mission.inspection_reports?.length || 0,
      }));
      
      setRecentMissions(formattedRecentMissions);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => scheduleReload())
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
    <SafeAreaView style={[styles.container, { backgroundColor: '#0a0a1a' }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadDashboardData();
            }}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Header avec animation */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <LinearGradient
            colors={['#14b8a6', '#06b6d4', '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <View style={styles.shimmerIcon}>
                  <MaterialCommunityIcons name="shimmer" size={28} color="#fff" />
                </View>
                <View>
                  <Text style={styles.welcomeText}>Bonjour ! 👋</Text>
                  <Text style={styles.userName}>{firstName || 'Utilisateur'}</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => console.log('Notifications')}
              >
                <Ionicons name="notifications" size={24} color="#fff" />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>

            <Text style={styles.headerSubtitle}>
              Tableau de bord en temps réel
            </Text>

            {/* Quick Stats dans le header */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatItem}>
                <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.quickStatLabel}>Aujourd'hui</Text>
                <Text style={styles.quickStatValue}>{stats.missionsToday}</Text>
              </View>
              
              <View style={[styles.quickStatItem, styles.quickStatDivider]}>
                <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.quickStatLabel}>Cette semaine</Text>
                <Text style={styles.quickStatValue}>{stats.missionsThisWeek}</Text>
              </View>
              
              <View style={styles.quickStatItem}>
                <Ionicons name="speedometer-outline" size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.quickStatLabel}>En cours</Text>
                <Text style={styles.quickStatValue}>{stats.activeMissions}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Carte Abonnement/Crédits Principale avec animation pulse */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <TouchableOpacity
            style={styles.creditsMainCard}
            onPress={() => {
              Linking.openURL('https://www.xcrackz.com/shop');
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={subscription ? ['#14b8a6', '#0d9488', '#0f766e'] : ['#f59e0b', '#fbbf24', '#fcd34d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.creditsGradient}
            >
              <View style={styles.creditsContent}>
                <View style={styles.creditsLeft}>
                  <View style={styles.creditsIconContainer}>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <Ionicons name={subscription ? "star" : "wallet"} size={32} color="#fff" />
                    </Animated.View>
                  </View>
                  <View>
                    {subscription ? (
                      <>
                        <Text style={styles.creditsLabel}>✨ Abonnement Actif</Text>
                        <Text style={styles.creditsValue}>{subscription.plan_name}</Text>
                        <Text style={styles.creditsUsed}>
                          Expire dans: {Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} jours
                        </Text>
                        <Text style={styles.creditsUsed}>
                          Crédits: {credits}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.creditsLabel}>Crédits disponibles</Text>
                        <Text style={styles.creditsValue}>{credits}</Text>
                        <Text style={styles.creditsUsed}>Mode à la carte</Text>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.creditsRight}>
                  <TouchableOpacity 
                    style={styles.rechargeButton}
                    onPress={async () => {
                      console.log('🔄 Refresh manuel...');
                      await refreshCredits();
                      await loadDashboardData();
                      console.log('✅ Refresh terminé');
                    }}
                  >
                    <Ionicons name="refresh" size={24} color="#fff" />
                    <Text style={styles.rechargeText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Prix indicatifs */}
              <View style={styles.creditsPricing}>
                <View style={styles.pricingItem}>
                  <Ionicons name="car-sport" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.pricingText}>{subscription ? 'Missions illimitées' : 'Mission: 1 crédit'}</Text>
                </View>
                <View style={styles.pricingItem}>
                  <Ionicons name="people" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.pricingText}>Covoiturage: 2 crédits</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Grid 2x2 */}
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.statsGrid}>
            {/* Missions Totales */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: '#1e1e2e' }]}
              onPress={() => (navigation as any).navigate('Missions')}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb']}
                style={styles.statIconCircle}
              >
                <Ionicons name="car-sport" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.statValue}>{stats.totalMissions}</Text>
              <Text style={styles.statLabel}>Missions totales</Text>
              <View style={styles.statBadge}>
                <Ionicons name="arrow-up" size={12} color="#10b981" />
                <Text style={styles.statBadgeText}>+{stats.missionsThisWeek} cette semaine</Text>
              </View>
            </TouchableOpacity>

            {/* Taux de succès */}
            <TouchableOpacity style={[styles.statCard, { backgroundColor: '#1e1e2e' }]}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.statIconCircle}
              >
                <Ionicons name="trophy" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.statValue}>{stats.completionRate.toFixed(0)}%</Text>
              <Text style={styles.statLabel}>Taux de succès</Text>
              <View style={styles.statBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                <Text style={styles.statBadgeText}>{stats.completedMissions} complétées</Text>
              </View>
            </TouchableOpacity>

            {/* Contacts */}
            <TouchableOpacity
              style={[styles.statCard, { backgroundColor: '#1e1e2e' }]}
              onPress={() => (navigation as any).navigate('Contacts')}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                style={styles.statIconCircle}
              >
                <Ionicons name="people" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.statValue}>{stats.totalContacts}</Text>
              <Text style={styles.statLabel}>Contacts</Text>
              <View style={styles.statBadge}>
                <Ionicons name="person" size={12} color="#6366f1" />
                <Text style={styles.statBadgeText}>{stats.totalDrivers} chauffeurs</Text>
              </View>
            </TouchableOpacity>

            {/* Revenus */}
            <TouchableOpacity style={[styles.statCard, { backgroundColor: '#1e1e2e' }]}>
              <LinearGradient
                colors={['#a855f7', '#9333ea']}
                style={styles.statIconCircle}
              >
                <Ionicons name="cash" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.statValue}>{Math.round(stats.monthlyRevenue)}€</Text>
              <Text style={styles.statLabel}>Ce mois</Text>
              <View style={styles.statBadge}>
                <Ionicons name="trending-up" size={12} color="#a855f7" />
                <Text style={styles.statBadgeText}>Semaine: {Math.round(stats.weeklyRevenue)}€</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Mini Stats Row */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.miniStatsRow}>
            <View style={[styles.miniStatCard, { borderLeftColor: '#f59e0b' }]}>
              <Ionicons name="time" size={20} color="#f59e0b" />
              <Text style={styles.miniStatValue}>{stats.pendingMissions}</Text>
              <Text style={styles.miniStatLabel}>En attente</Text>
            </View>

            <View style={[styles.miniStatCard, { borderLeftColor: '#ef4444' }]}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={styles.miniStatValue}>{stats.cancelledMissions}</Text>
              <Text style={styles.miniStatLabel}>Annulées</Text>
            </View>

            <View style={[styles.miniStatCard, { borderLeftColor: '#06b6d4' }]}>
              <Ionicons name="navigate" size={20} color="#06b6d4" />
              <Text style={styles.miniStatValue}>{Math.round(stats.totalDistance)}</Text>
              <Text style={styles.miniStatLabel}>Km</Text>
            </View>
          </View>
        </Animated.View>

        {/* Graphique évolution */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleRow}>
                <Ionicons name="analytics" size={24} color="#14b8a6" />
                <Text style={styles.chartTitle}>Évolution 6 mois</Text>
              </View>
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#14b8a6' }]} />
                  <Text style={styles.legendText}>Missions</Text>
                </View>
              </View>
            </View>

            <View style={styles.chartBars}>
              {monthlyData.map((data, index) => {
                const maxMissions = Math.max(...monthlyData.map(d => d.missions), 1);
                const height = (data.missions / maxMissions) * 100;
                
                return (
                  <View key={index} style={styles.chartBarContainer}>
                    <View style={styles.barWrapper}>
                      <LinearGradient
                        colors={['#14b8a6', '#0891b2']}
                        style={[styles.chartBar, { height: `${Math.max(height, 10)}%` }]}
                      >
                        {data.missions > 0 && (
                          <Text style={styles.barLabel}>{data.missions}</Text>
                        )}
                      </LinearGradient>
                    </View>
                    <Text style={styles.barMonth}>{data.month}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Missions récentes */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.recentSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="list" size={24} color="#14b8a6" />
                <Text style={styles.sectionTitle}>Missions récentes</Text>
              </View>
              <TouchableOpacity onPress={() => (navigation as any).navigate('Missions')}>
                <Text style={styles.seeAllText}>Tout voir →</Text>
              </TouchableOpacity>
            </View>

            {recentMissions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="car-sport-outline" size={64} color="#4b5563" />
                <Text style={styles.emptyText}>Aucune mission</Text>
                <Text style={styles.emptySubtext}>Créez votre première mission</Text>
              </View>
            ) : (
              <View style={styles.missionsList}>
                {recentMissions.map((mission, index) => (
                  <TouchableOpacity
                    key={mission.id}
                    style={[
                      styles.missionCard,
                      { borderLeftColor: getStatusColor(mission.status) }
                    ]}
                    onPress={() => (navigation as any).navigate('MissionView', { missionId: mission.id })}
                  >
                    <View style={styles.missionHeader}>
                      <Text style={styles.missionRef}>#{mission.reference}</Text>
                      <View
                        style={[
                          styles.missionStatusBadge,
                          { backgroundColor: `${getStatusColor(mission.status)}20` }
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: getStatusColor(mission.status) }
                          ]}
                        />
                        <Text
                          style={[
                            styles.missionStatus,
                            { color: getStatusColor(mission.status) }
                          ]}
                        >
                          {getStatusLabel(mission.status)}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.missionVehicle}>
                      {mission.vehicle_brand} {mission.vehicle_model}
                    </Text>
                    
                    <View style={styles.missionPriceRow}>
                      <Ionicons name="document-text-outline" size={16} color="#14b8a6" />
                      <Text style={styles.missionPrice}>
                        {mission.reports_count || 0} rapport{(mission.reports_count || 0) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Animated.View>

        {/* Actions rapides */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsTitle}>Actions rapides</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => (navigation as any).navigate('Missions', { screen: 'MissionCreate' })}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name="add-circle" size={32} color="#fff" />
                  <Text style={styles.quickActionText}>Nouvelle mission</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => (navigation as any).navigate('ScannerPro')}
              >
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name="scan" size={32} color="#fff" />
                  <Text style={styles.quickActionText}>Scanner</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => Linking.openURL('https://www.xcrackz.com/crm')}
              >
                <LinearGradient
                  colors={['#a855f7', '#9333ea']}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name="receipt" size={32} color="#fff" />
                  <Text style={styles.quickActionText}>Factures</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => Linking.openURL('https://www.xcrackz.com/shop')}
              >
                <LinearGradient
                  colors={['#f59e0b', '#fbbf24']}
                  style={styles.quickActionGradient}
                >
                  <Ionicons name="cart" size={32} color="#fff" />
                  <Text style={styles.quickActionText}>Boutique</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
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

  // Header
  headerGradient: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shimmerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickStatDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },

  // Crédits Main Card
  creditsMainCard: {
    marginBottom: 20,
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  creditsGradient: {
    borderRadius: 24,
    padding: 24,
  },
  creditsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  creditsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  creditsValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
  },
  creditsUsed: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  creditsRight: {
    alignItems: 'flex-end',
  },
  rechargeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rechargeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  creditsPricing: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  pricingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pricingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Stats Grid 2x2
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 44) / 2,
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },

  // Mini Stats Row
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginVertical: 4,
  },
  miniStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },

  // Chart Card
  chartCard: {
    backgroundColor: '#1e1e2e',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
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
    color: '#9ca3af',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: 4,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 25,
  },
  chartBar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 6,
    elevation: 4,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  barMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginTop: 6,
  },

  // Recent Section
  recentSection: {
    backgroundColor: '#1e1e2e',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14b8a6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9ca3af',
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  missionsList: {
    gap: 12,
  },
  missionCard: {
    backgroundColor: '#0a0a1a',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  missionRef: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
  missionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  missionStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  missionVehicle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 8,
  },
  missionPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14b8a6',
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 44) / 2,
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickActionGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    minHeight: 120,
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
