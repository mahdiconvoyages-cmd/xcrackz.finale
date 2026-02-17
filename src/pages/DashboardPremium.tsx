// @ts-nocheck - Dashboard Premium - Responsive Mobile + Desktop
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, Users, CheckCircle, TrendingUp, Calendar,
  Wallet, AlertTriangle, Plus, UserPlus, Camera,
  ChevronRight, User, RefreshCw, DollarSign, FileText,
  Clock, Activity, BarChart3, ArrowUpRight, ArrowDownRight,
  AlertCircle, Gauge, Route
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types
interface DashboardStats {
  activeMissions: number;
  completedMissions: number;
  totalMissions: number;
  totalContacts: number;
  completionRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  growthRate: number;
}

interface CreditInfo {
  credits: number;
  plan: string;
  daysRemaining: number;
  hoursRemaining: number;
  endDate: Date | null;
  hasActiveSubscription: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
  timeRemainingText?: string;
}

interface FleetStats {
  totalKm: number;
  avgDeliveryTimeMin: number;
  missionsPerDriver: { name: string; count: number }[];
  totalCompletedThisMonth: number;
}

interface RecentActivity {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  color: string;
}

interface RecentMission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  price: number;
  created_at: string;
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: delay * 0.08, duration: 0.4, ease: "easeOut" }
  })
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

export default function DashboardPremium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    activeMissions: 0,
    completedMissions: 0,
    totalMissions: 0,
    totalContacts: 0,
    completionRate: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    growthRate: 0,
  });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    credits: 0,
    plan: 'FREE',
    daysRemaining: 0,
    hoursRemaining: 0,
    endDate: null,
    hasActiveSubscription: false,
    isExpiringSoon: false,
    isExpired: false,
  });
  const [fleetStats, setFleetStats] = useState<FleetStats>({
    totalKm: 0,
    avgDeliveryTimeMin: 0,
    missionsPerDriver: [],
    totalCompletedThisMonth: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentMissions, setRecentMissions] = useState<RecentMission[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${user.id}` }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, () => loadDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, credits')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setFirstName(profile.first_name || '');
        setLastName(profile.last_name || '');
      }

      // Load subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end, auto_renew')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      const now = new Date();
      let creditData: CreditInfo = {
        credits: profile?.credits || 0,
        plan: 'FREE',
        daysRemaining: 0,
        hoursRemaining: 0,
        endDate: null,
        hasActiveSubscription: false,
        isExpiringSoon: false,
        isExpired: false,
      };

      if (subscription) {
        // For new users with no current_period_end, calculate 30 days from account creation
        let endDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
        if (!endDate && user.created_at) {
          endDate = new Date(new Date(user.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 30;
        
        // Calcul temps restant précis
        let timeRemainingText = '';
        if (endDate) {
          const diffMs = endDate.getTime() - now.getTime();
          if (diffMs > 0) {
            const totalMin = Math.floor(diffMs / (1000 * 60));
            const d = Math.floor(totalMin / (60 * 24));
            const h = Math.floor((totalMin % (60 * 24)) / 60);
            const m = totalMin % 60;
            const parts: string[] = [];
            if (d > 0) parts.push(`${d}j`);
            if (h > 0) parts.push(`${h}h`);
            if (m > 0 || parts.length === 0) parts.push(`${m}min`);
            timeRemainingText = parts.join(' ');
          }
        }

        const hoursRemaining = endDate ? Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60))) : 30 * 24;
        creditData = {
          credits: profile?.credits || 0,
          plan: (subscription.plan || 'free').toUpperCase(),
          daysRemaining,
          hoursRemaining,
          endDate,
          hasActiveSubscription: true,
          isExpiringSoon: daysRemaining > 0 && daysRemaining < 7,
          isExpired: daysRemaining <= 0,
          timeRemainingText,
        };
      }
      setCreditInfo(creditData);

      // Load missions stats
      const { data: missions } = await supabase
        .from('missions')
        .select('status, company_commission, bonus_amount, created_at, driver_name, pickup_date, delivery_date')
        .or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);

      const totalMissions = missions?.length || 0;
      const activeMissions = missions?.filter(m => m.status === 'in_progress').length || 0;
      const completedMissions = missions?.filter(m => m.status === 'completed').length || 0;
      const completionRate = totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0;
      
      const totalRevenue = missions?.filter(m => m.status === 'completed')
        .reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0) || 0;

      // Monthly revenue
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthlyMissions = missions?.filter(m => {
        const d = new Date(m.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && m.status === 'completed';
      }) || [];
      const monthlyRevenue = monthlyMissions.reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      // Previous month for growth
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthMissions = missions?.filter(m => {
        const d = new Date(m.created_at);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear && m.status === 'completed';
      }) || [];
      const prevMonthRevenue = prevMonthMissions.reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
      const growthRate = prevMonthRevenue > 0 ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;

      // Fleet stats: missions per driver + delivery times
      const completedMissionsData = missions?.filter(m => m.status === 'completed') || [];
      const driverMap: Record<string, number> = {};
      let totalDeliveryMin = 0;
      let deliveryCount = 0;
      completedMissionsData.forEach(m => {
        const dName = m.driver_name || 'Non assigné';
        driverMap[dName] = (driverMap[dName] || 0) + 1;
        if (m.pickup_date && m.delivery_date) {
          const diff = new Date(m.delivery_date).getTime() - new Date(m.pickup_date).getTime();
          if (diff > 0) {
            totalDeliveryMin += Math.floor(diff / (1000 * 60));
            deliveryCount++;
          }
        }
      });
      const missionsPerDriver = Object.entries(driverMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Load vehicle inspections for total KM
      const { data: inspections } = await supabase
        .from('vehicle_inspections')
        .select('inspection_type, mileage_km, mission_id')
        .eq('user_id', user.id);

      let totalKm = 0;
      if (inspections) {
        const mileageByMission: Record<string, { dep?: number; arr?: number }> = {};
        inspections.forEach(ins => {
          if (!ins.mission_id) return;
          if (!mileageByMission[ins.mission_id]) mileageByMission[ins.mission_id] = {};
          if (ins.inspection_type === 'departure' && ins.mileage_km) mileageByMission[ins.mission_id].dep = ins.mileage_km;
          if (ins.inspection_type === 'arrival' && ins.mileage_km) mileageByMission[ins.mission_id].arr = ins.mileage_km;
        });
        Object.values(mileageByMission).forEach(({ dep, arr }) => {
          if (dep != null && arr != null && arr > dep) totalKm += arr - dep;
        });
      }

      setFleetStats({
        totalKm,
        avgDeliveryTimeMin: deliveryCount > 0 ? Math.round(totalDeliveryMin / deliveryCount) : 0,
        missionsPerDriver,
        totalCompletedThisMonth: monthlyMissions.length,
      });

      // Load contacts
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Load invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status')
        .eq('user_id', user.id);

      const totalInvoices = invoices?.length || 0;
      const paidInvoices = invoices?.filter(i => i.status === 'paid').length || 0;
      const pendingInvoices = invoices?.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length || 0;

      setStats({
        activeMissions,
        completedMissions,
        totalMissions,
        totalContacts: contactsCount || 0,
        completionRate,
        totalRevenue,
        monthlyRevenue,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        growthRate,
      });

      // Load recent missions for desktop view
      const { data: recentMissionsData } = await supabase
        .from('missions')
        .select('id, reference, status, vehicle_brand, vehicle_model, price, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentMissions(recentMissionsData || []);

      // Load recent activities
      const { data: recentMissionsForActivity } = await supabase
        .from('missions')
        .select('id, status, pickup_address, delivery_address, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      const activities: RecentActivity[] = (recentMissionsForActivity || []).map(m => ({
        id: m.id,
        icon: m.status === 'completed' ? 'check' : m.status === 'in_progress' ? 'truck' : 'clock',
        title: m.status === 'completed' ? 'Mission complétée' : m.status === 'in_progress' ? 'Mission en cours' : 'Mission en attente',
        subtitle: `${m.pickup_address?.split(',')[0] || 'Départ'} → ${m.delivery_address?.split(',')[0] || 'Arrivée'}`,
        time: getTimeAgo(m.created_at),
        color: m.status === 'completed' ? 'green' : m.status === 'in_progress' ? 'amber' : 'blue',
      }));
      setRecentActivities(activities);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return days === 1 ? 'Hier' : `Il y a ${days}j`;
    if (hours > 0) return `Il y a ${hours}h`;
    return 'À l\'instant';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; label: string }> = {
      completed: { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Terminée' },
      in_progress: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'En cours' },
      pending: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'En attente' },
      cancelled: { color: 'text-red-600', bg: 'bg-red-100', label: 'Annulée' },
    };
    return configs[status] || configs.pending;
  };

  const pendingMissions = stats.totalMissions - stats.completedMissions - stats.activeMissions;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-blue-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-blue-50/30"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">{getGreeting()}</p>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-800">
                {firstName ? `${firstName} ${lastName}` : user?.email}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                onClick={handleRefresh}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
              <Link to="/missions/new">
                <motion.button
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg shadow-teal-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-5 h-5" />
                  Nouvelle mission
                </motion.button>
              </Link>
              <motion.button
                onClick={() => navigate('/settings')}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ALERTE EXPIRY - 48h/24h */}
        {creditInfo.hasActiveSubscription && !creditInfo.isExpired && creditInfo.hoursRemaining <= 48 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl p-4 sm:p-5 border-2 ${
              creditInfo.hoursRemaining <= 24 
                ? 'bg-red-50 border-red-300' 
                : 'bg-amber-50 border-amber-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl ${
                creditInfo.hoursRemaining <= 24 ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                <AlertCircle className={`w-6 h-6 ${
                  creditInfo.hoursRemaining <= 24 ? 'text-red-600' : 'text-amber-600'
                }`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-sm sm:text-base ${
                  creditInfo.hoursRemaining <= 24 ? 'text-red-800' : 'text-amber-800'
                }`}>
                  {creditInfo.hoursRemaining <= 24 
                    ? '⚠️ Abonnement expire dans moins de 24h !' 
                    : '⏰ Abonnement expire dans moins de 48h'}
                </h3>
                <p className={`text-xs sm:text-sm mt-1 ${
                  creditInfo.hoursRemaining <= 24 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  Temps restant : <strong>{creditInfo.timeRemainingText || `${creditInfo.hoursRemaining}h`}</strong>
                  {creditInfo.endDate && (
                    <> — Expire le {creditInfo.endDate.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' })}</>
                  )}
                </p>
              </div>
              <Link to="/shop">
                <button className={`px-4 py-2 rounded-xl text-white text-sm font-bold whitespace-nowrap ${
                  creditInfo.hoursRemaining <= 24 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}>
                  Demander un renouvellement
                </button>
              </Link>
            </div>
          </motion.div>
        )}
        
        {/* Top Section: Credits + Quick Stats (Desktop: side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Credits Card */}
          <motion.div variants={fadeIn} custom={0} className="lg:col-span-1">
            <div 
              className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 h-full ${
                creditInfo.isExpired 
                  ? 'bg-gradient-to-br from-red-500 to-red-600' 
                  : creditInfo.isExpiringSoon 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                    : 'bg-gradient-to-br from-teal-500 to-blue-600'
              }`}
              style={{
                boxShadow: creditInfo.isExpired 
                  ? '0 10px 24px rgba(239, 68, 68, 0.35)'
                  : creditInfo.isExpiringSoon
                    ? '0 10px 24px rgba(245, 158, 11, 0.35)'
                    : '0 10px 24px rgba(20, 184, 166, 0.35)'
              }}
            >
              {/* Decorative */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm font-medium">Crédits disponibles</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-4xl sm:text-5xl font-bold text-white">{creditInfo.credits}</span>
                      <Wallet className="w-7 h-7 text-white/80" />
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-white/25 rounded-full text-white font-bold text-xs">
                    {creditInfo.plan}
                  </span>
                </div>

                <div className="h-px bg-white/20 my-4" />

                {creditInfo.hasActiveSubscription ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {creditInfo.isExpired ? (
                        <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
                      ) : (
                        <Calendar className="w-4 h-4 text-white/80 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {creditInfo.isExpired ? 'Expiré' : (creditInfo as any).timeRemainingText ? `${(creditInfo as any).timeRemainingText} restants` : `${creditInfo.daysRemaining}j restants`}
                        </p>
                        {creditInfo.endDate && (
                          <p className="text-white/70 text-xs truncate">
                            {creditInfo.endDate.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link to="/shop">
                      <button className="px-3 py-1.5 bg-white text-teal-600 rounded-lg text-sm font-semibold whitespace-nowrap">
                        {creditInfo.isExpired ? 'Demander un renouvellement' : 'Abonnements'}
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-white/80 text-sm">Passez à Pro</p>
                    <Link to="/shop">
                      <button className="px-3 py-1.5 bg-white text-teal-600 rounded-lg text-sm font-semibold">
                        Voir les abonnements
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Stats Cards - Desktop: 2 columns, Mobile: 2 columns */}
          <motion.div variants={fadeIn} custom={1} className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 h-full">
              {[
                { icon: Truck, label: 'Missions actives', value: stats.activeMissions, color: '#14b8a6' },
                { icon: CheckCircle, label: 'Complétées', value: stats.completedMissions, color: '#22c55e' },
                { icon: Users, label: 'Contacts', value: stats.totalContacts, color: '#3b82f6' },
                { icon: TrendingUp, label: 'Taux succès', value: `${stats.completionRate.toFixed(0)}%`, color: '#8b5cf6' },
              ].map((stat) => (
                <div 
                  key={stat.label}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center"
                  style={{ boxShadow: `0 4px 12px ${stat.color}15` }}
                >
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: stat.color }} />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Middle Section: Revenue + Progress (Desktop: side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Revenue Stats - Desktop only expanded */}
          <motion.div variants={fadeIn} custom={2} className="bg-white rounded-2xl p-5 sm:p-6" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Revenus
              </h3>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                stats.growthRate >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}>
                {stats.growthRate >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium">Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{stats.totalRevenue.toLocaleString('fr-FR')}€</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium">Ce mois</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.monthlyRevenue.toLocaleString('fr-FR')}€</p>
              </div>
            </div>

            {/* Invoice stats */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{stats.totalInvoices} factures</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {stats.paidInvoices}
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                    {stats.pendingInvoices}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Progress Chart */}
          <motion.div variants={fadeIn} custom={3} className="bg-white rounded-2xl p-5 sm:p-6" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Progression des missions
            </h3>
            
            {/* Progress Bar */}
            <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
              {stats.completedMissions > 0 && (
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.completedMissions / Math.max(stats.totalMissions, 1)) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              )}
              {stats.activeMissions > 0 && (
                <motion.div
                  className="h-full bg-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.activeMissions / Math.max(stats.totalMissions, 1)) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { label: 'Complétées', color: '#22c55e', value: stats.completedMissions },
                { label: 'En cours', color: '#f59e0b', value: stats.activeMissions },
                { label: 'En attente', color: '#cbd5e1', value: pendingMissions },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs sm:text-sm text-slate-600">{item.label} ({item.value})</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm text-slate-500">Total missions</span>
              <span className="text-2xl font-bold text-slate-800">{stats.totalMissions}</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Section: Quick Actions + Recent (Desktop: side by side) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Actions */}
          <motion.div variants={fadeIn} custom={4}>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">Actions rapides</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/missions/new">
                <motion.div 
                  className="rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center bg-gradient-to-br from-teal-500 to-blue-600 cursor-pointer"
                  style={{ boxShadow: '0 8px 20px rgba(20, 184, 166, 0.35)' }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-white/20 rounded-xl flex items-center justify-center mb-2 sm:mb-3">
                    <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <p className="text-white font-bold text-xs sm:text-sm">Nouvelle mission</p>
                </motion.div>
              </Link>

              <Link to="/crm?tab=clients&action=new">
                <motion.div 
                  className="rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center bg-gradient-to-br from-indigo-500 to-purple-600 cursor-pointer"
                  style={{ boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)' }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-white/20 rounded-xl flex items-center justify-center mb-2 sm:mb-3">
                    <UserPlus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <p className="text-white font-bold text-xs sm:text-sm">Nouveau client</p>
                </motion.div>
              </Link>
            </div>
          </motion.div>

          {/* Recent Missions - Expanded for desktop */}
          <motion.div variants={fadeIn} custom={5} className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-500" />
                Missions récentes
              </h3>
              <Link to="/missions" className="text-sm text-teal-600 font-semibold hover:underline flex items-center gap-1">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recentMissions.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucune mission récente</p>
                <Link to="/missions/new" className="text-teal-600 text-sm font-semibold hover:underline mt-2 inline-block">
                  Créer une mission
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMissions.map((mission) => {
                  const config = getStatusConfig(mission.status);
                  return (
                    <Link 
                      key={mission.id} 
                      to="/missions"
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                    >
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Truck className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{mission.reference}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {mission.vehicle_brand} {mission.vehicle_model}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        {mission.price > 0 && (
                          <p className="font-bold text-teal-600">{mission.price}€</p>
                        )}
                        <p className="text-xs text-slate-400">{getTimeAgo(mission.created_at)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* TABLEAU DE BORD COMPTABLE - Fleet Analytics */}
        <motion.div variants={fadeIn} custom={6} className="bg-white rounded-2xl p-5 sm:p-6" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Route className="w-5 h-5 text-purple-500" />
            Statistiques Flotte
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 text-center">
              <Gauge className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-700">{fleetStats.totalKm.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-slate-500 mt-1">KM Totaux</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 text-center">
              <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">
                {fleetStats.avgDeliveryTimeMin > 0 
                  ? fleetStats.avgDeliveryTimeMin >= 60 
                    ? `${Math.floor(fleetStats.avgDeliveryTimeMin / 60)}h${fleetStats.avgDeliveryTimeMin % 60 > 0 ? ` ${fleetStats.avgDeliveryTimeMin % 60}m` : ''}`
                    : `${fleetStats.avgDeliveryTimeMin}min`
                  : 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Temps Moyen Livraison</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 text-center">
              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-700">{fleetStats.totalCompletedThisMonth}</p>
              <p className="text-xs text-slate-500 mt-1">Terminées ce mois</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-700">{fleetStats.missionsPerDriver.length}</p>
              <p className="text-xs text-slate-500 mt-1">Convoyeurs Actifs</p>
            </div>
          </div>

          {/* Missions par convoyeur */}
          {fleetStats.missionsPerDriver.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-600 mb-3">Top convoyeurs (missions terminées)</h4>
              <div className="space-y-2">
                {fleetStats.missionsPerDriver.map((driver, i) => {
                  const max = fleetStats.missionsPerDriver[0]?.count || 1;
                  const pct = (driver.count / max) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-28 sm:w-40 text-sm text-slate-700 font-medium truncate">{driver.name}</div>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-teal-400 to-blue-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-800 w-8 text-right">{driver.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Mobile Quick Actions FAB */}
        <div className="sm:hidden fixed bottom-6 right-6 z-50">
          <Link to="/missions/new">
            <motion.button
              className="w-14 h-14 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/40 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </Link>
        </div>

        {/* Spacer */}
        <div className="h-20 sm:h-8" />
      </div>
    </motion.div>
  );
}
