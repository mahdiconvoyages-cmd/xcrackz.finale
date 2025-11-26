// @ts-nocheck - Dashboard Premium V2 - Thème Teal cohérent comme l'app Flutter
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Users, DollarSign, TrendingUp, Calendar, Package, 
  CheckCircle, Clock, XCircle, Star, ArrowUpRight, ArrowDownRight,
  Activity, Sparkles, BarChart3, Navigation2, MapPin, Wallet,
  Award, Target, Zap, ChevronRight, Eye, FileText, AlertTriangle,
  CreditCard, PieChart, Bell, RefreshCw, Plus, MoreHorizontal,
  TrendingDown, ArrowRight, Briefcase, Shield, Timer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Types
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
  missionsThisWeek: number;
  missionsToday: number;
  totalDistance: number;
  growthRate: number;
}

interface CreditInfo {
  balance: number;
  plan: string;
  daysRemaining: number;
  endDate: Date | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
}

interface RecentMission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  pickup_address: string;
  delivery_address: string;
  price: number;
  created_at: string;
}

interface MonthlyData {
  month: string;
  missions: number;
  revenue: number;
  completed: number;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 20 }
  }
};

// Animated counter component
function AnimatedNumber({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <span>{prefix}{count.toLocaleString('fr-FR')}{suffix}</span>;
}

// Progress ring component
function CircularProgress({ value, size = 80, strokeWidth = 8, color = '#14b8a6' }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          stroke="#e2e8f0"
          fill="none"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <motion.circle
          stroke={color}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-slate-800">{value.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function DashboardPremium() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0, activeMissions: 0, completedMissions: 0, cancelledMissions: 0,
    pendingMissions: 0, totalContacts: 0, totalDrivers: 0, totalClients: 0,
    pendingInvoices: 0, paidInvoices: 0, totalInvoices: 0, totalRevenue: 0,
    monthlyRevenue: 0, weeklyRevenue: 0, averageMissionPrice: 0, completionRate: 0,
    totalCredits: 0, usedCredits: 0, missionsThisWeek: 0, missionsToday: 0,
    totalDistance: 0, growthRate: 0,
  });
  const [creditInfo, setCreditInfo] = useState<CreditInfo>({
    balance: 0, plan: 'Gratuit', daysRemaining: 0, endDate: null,
    isExpiringSoon: false, isExpired: false
  });
  const [recentMissions, setRecentMissions] = useState<RecentMission[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadUserProfile();
  }, [user]);

  // Realtime
  useEffect(() => {
    if (!user) return;

    let timer: any;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadDashboardData(), 300);
    };

    const channel = supabase
      .channel('realtime-dashboard-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${user.id}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, scheduleReload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timer) clearTimeout(timer);
    };
  }, [user?.id]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('first_name, credits').eq('id', user.id).maybeSingle();
      if (data?.first_name) setFirstName(data.first_name);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [missionsRes, contactsRes, invoicesRes, recentMissionsRes, creditsRes, subscriptionRes] = await Promise.all([
        supabase.from('missions').select('status, price, created_at, company_commission, bonus_amount, distance_km', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('contacts').select('id, type, is_driver, rating_average', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('invoices').select('status, total, created_at', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('missions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('credits').eq('id', user.id).maybeSingle(),
        supabase.from('user_subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').maybeSingle(),
      ]);

      const missions = missionsRes.data || [];
      const contacts = contactsRes.data || [];
      const invoices = invoicesRes.data || [];

      // Calculs
      const completedCount = missions.filter(m => m.status === 'completed').length;
      const cancelledCount = missions.filter(m => m.status === 'cancelled').length;
      const activeCount = missions.filter(m => m.status === 'in_progress').length;
      const pendingCount = missions.filter(m => m.status === 'pending').length;
      const totalCount = missions.length;
      const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      const totalRevenue = missions.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const monthlyMissions = missions.filter(m => {
        const d = new Date(m.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const previousMonthMissions = missions.filter(m => {
        const d = new Date(m.created_at);
        return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
      });

      const weeklyMissions = missions.filter(m => new Date(m.created_at) >= startOfWeek);
      const todayMissions = missions.filter(m => new Date(m.created_at) >= startOfToday);

      const monthlyRevenue = monthlyMissions.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
      const previousMonthRevenue = previousMonthMissions.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
      const weeklyRevenue = weeklyMissions.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const growthRate = previousMonthRevenue > 0 ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;
      const avgPrice = completedCount > 0 ? totalRevenue / completedCount : 0;

      const totalDrivers = contacts.filter(c => c.is_driver).length;
      const totalClients = contacts.filter(c => c.type === 'customer').length;
      const paidInvoices = invoices.filter(i => i.status === 'paid').length;
      const pendingInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length;
      const totalDistance = missions.reduce((sum, m) => sum + (m.distance_km || 0), 0);
      const totalCredits = creditsRes.data?.credits || 0;

      // Subscription info
      const subscription = subscriptionRes.data;
      let creditData: CreditInfo = {
        balance: totalCredits,
        plan: 'Gratuit',
        daysRemaining: 0,
        endDate: null,
        isExpiringSoon: false,
        isExpired: false,
      };

      if (subscription) {
        const endDate = subscription.end_date ? new Date(subscription.end_date) : null;
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        creditData = {
          balance: totalCredits,
          plan: subscription.plan_name || 'Pro',
          daysRemaining,
          endDate,
          isExpiringSoon: daysRemaining > 0 && daysRemaining < 7,
          isExpired: daysRemaining <= 0,
        };
      }

      // Monthly data
      const last6Months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        const monthMissions = missions.filter(m => {
          const d = new Date(m.created_at);
          return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
        });
        const revenue = monthMissions.filter(m => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
        const completed = monthMissions.filter(m => m.status === 'completed').length;
        last6Months.push({ month, missions: monthMissions.length, revenue, completed });
      }

      setStats({
        totalMissions: missionsRes.count || 0,
        activeMissions: activeCount,
        completedMissions: completedCount,
        cancelledMissions: cancelledCount,
        pendingMissions: pendingCount,
        totalContacts: contactsRes.count || 0,
        totalDrivers,
        totalClients,
        pendingInvoices,
        paidInvoices,
        totalInvoices: invoicesRes.count || 0,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        averageMissionPrice: avgPrice,
        completionRate,
        totalCredits,
        usedCredits: totalCount,
        missionsThisWeek: weeklyMissions.length,
        missionsToday: todayMissions.length,
        totalDistance,
        growthRate,
      });

      setCreditInfo(creditData);
      setMonthlyData(last6Months);
      setRecentMissions(recentMissionsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; icon: any; label: string }> = {
      completed: { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle, label: 'Terminée' },
      in_progress: { color: 'text-blue-600', bg: 'bg-blue-100', icon: Activity, label: 'En cours' },
      pending: { color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock, label: 'En attente' },
      cancelled: { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, label: 'Annulée' },
    };
    return configs[status] || configs.pending;
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `il y a ${days}j`;
    if (hours > 0) return `il y a ${hours}h`;
    return 'À l\'instant';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 flex items-center justify-center">
        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-teal-200 rounded-full animate-spin border-t-teal-500" />
            <Sparkles className="w-6 h-6 text-teal-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-slate-500 font-medium">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  const maxMissions = Math.max(...monthlyData.map(d => d.missions), 1);
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 p-4 sm:p-6 lg:p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          variants={itemVariants}
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Bonjour{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-slate-500 mt-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <motion.button
              onClick={handleRefresh}
              className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
            
            <Link to="/missions/new">
              <motion.button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Nouvelle mission</span>
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Credits Card - Style Flutter */}
        <motion.div variants={itemVariants}>
          <div className={`relative overflow-hidden rounded-2xl p-6 shadow-xl ${
            creditInfo.isExpired 
              ? 'bg-gradient-to-br from-red-500 to-red-600' 
              : creditInfo.isExpiringSoon 
                ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                : 'bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600'
          }`}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-2">Crédits disponibles</p>
                  <div className="flex items-center gap-3">
                    <motion.span 
                      className="text-5xl sm:text-6xl font-black text-white"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                    >
                      {creditInfo.balance}
                    </motion.span>
                    <Wallet className="w-10 h-10 text-white/80" />
                  </div>
                </div>
                
                <div className="flex flex-col items-start sm:items-end gap-3">
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-bold text-sm">
                    {creditInfo.plan}
                  </span>
                </div>
              </div>
              
              {(creditInfo.endDate || creditInfo.daysRemaining > 0 || creditInfo.isExpired) && (
                <>
                  <div className="h-px bg-white/20 my-5" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {creditInfo.isExpired ? (
                        <AlertTriangle className="w-5 h-5 text-white" />
                      ) : creditInfo.isExpiringSoon ? (
                        <AlertTriangle className="w-5 h-5 text-white" />
                      ) : (
                        <Calendar className="w-5 h-5 text-white/80" />
                      )}
                      <div>
                        <p className="text-white font-semibold">
                          {creditInfo.isExpired ? 'Abonnement expiré' : creditInfo.isExpiringSoon ? 'Expire bientôt' : 'Abonnement actif'}
                        </p>
                        <p className="text-white/80 text-sm">
                          {creditInfo.isExpired 
                            ? 'Renouvelez dès maintenant' 
                            : `${creditInfo.daysRemaining} jours restants`}
                        </p>
                        {creditInfo.endDate && (
                          <p className="text-white/60 text-xs mt-1">
                            Expire le {creditInfo.endDate.toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Link to="/shop">
                      <motion.button
                        className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                          creditInfo.isExpired || creditInfo.isExpiringSoon
                            ? 'bg-white text-red-600 hover:bg-white/90'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {creditInfo.isExpired ? 'Renouveler' : 'Gérer'}
                      </motion.button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          variants={containerVariants}
        >
          {[
            { label: "Aujourd'hui", value: stats.missionsToday, icon: Calendar, gradient: 'from-blue-500 to-indigo-500' },
            { label: 'Cette semaine', value: stats.missionsThisWeek, icon: TrendingUp, gradient: 'from-purple-500 to-pink-500' },
            { label: 'En cours', value: stats.activeMissions, icon: Activity, gradient: 'from-orange-500 to-amber-500' },
            { label: 'En attente', value: stats.pendingMissions, icon: Clock, gradient: 'from-teal-500 to-cyan-500' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all"
              variants={itemVariants}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg bg-gradient-to-br ${item.gradient}`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                  <p className="text-xs text-slate-500 font-medium">{item.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          variants={containerVariants}
        >
          {/* Total Missions */}
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +{stats.missionsThisWeek}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">
              <AnimatedNumber value={stats.totalMissions} />
            </h3>
            <p className="text-sm text-slate-500 font-medium">Missions totales</p>
          </motion.div>

          {/* Revenue */}
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                stats.growthRate >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
              }`}>
                {stats.growthRate >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(0)}%
              </span>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">
              <AnimatedNumber value={stats.totalRevenue} suffix="€" />
            </h3>
            <p className="text-sm text-slate-500 font-medium">Revenus totaux</p>
          </motion.div>

          {/* Success Rate */}
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center gap-4">
              <CircularProgress value={stats.completionRate} color="#10b981" />
              <div>
                <p className="text-sm text-slate-500 font-medium mb-1">Taux de succès</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.completedMissions}</p>
                <p className="text-xs text-slate-400">terminées</p>
              </div>
            </div>
          </motion.div>

          {/* Contacts */}
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all"
            variants={itemVariants}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-1">
              <AnimatedNumber value={stats.totalContacts} />
            </h3>
            <p className="text-sm text-slate-500 font-medium mb-3">Contacts</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-slate-600">{stats.totalDrivers} chauffeurs</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-slate-600">{stats.totalClients} clients</span>
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Secondary Stats */}
        <motion.div 
          className="grid grid-cols-3 sm:grid-cols-6 gap-3"
          variants={containerVariants}
        >
          {[
            { label: 'En cours', value: stats.activeMissions, icon: Activity, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
            { label: 'En attente', value: stats.pendingMissions, icon: Clock, bgColor: 'bg-amber-100', iconColor: 'text-amber-600' },
            { label: 'Annulées', value: stats.cancelledMissions, icon: XCircle, bgColor: 'bg-red-100', iconColor: 'text-red-600' },
            { label: 'Factures', value: stats.totalInvoices, icon: FileText, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
            { label: 'Payées', value: stats.paidInvoices, icon: CheckCircle, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' },
            { label: 'Distance', value: `${(stats.totalDistance/1000).toFixed(0)}k`, icon: Navigation2, bgColor: 'bg-cyan-100', iconColor: 'text-cyan-600', isString: true },
          ].map((item) => (
            <motion.div
              key={item.label}
              className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 hover:shadow-md transition-all"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1.5 ${item.bgColor} rounded-lg`}>
                  <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                </div>
                <span className={`text-xl font-bold ${item.iconColor}`}>
                  {item.isString ? item.value : <AnimatedNumber value={item.value as number} />}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium truncate">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts & Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div 
            className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-teal-600" />
                  Évolution sur 6 mois
                </h2>
                <p className="text-sm text-slate-500">Missions et revenus</p>
              </div>
              <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
                  Missions
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                  Revenus
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 h-52">
              {monthlyData.map((data, index) => {
                const missionHeight = maxMissions > 0 ? (data.missions / maxMissions) * 100 : 0;
                const revenueHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="flex items-end gap-1 h-40 w-full">
                      <motion.div
                        className="flex-1 rounded-t-md bg-gradient-to-t from-teal-500 to-cyan-400 relative"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(missionHeight, 8)}%` }}
                        transition={{ duration: 0.6, delay: index * 0.08 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {data.missions}
                        </span>
                      </motion.div>
                      <motion.div
                        className="flex-1 rounded-t-md bg-gradient-to-t from-purple-500 to-pink-400"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(revenueHeight, 8)}%` }}
                        transition={{ duration: 0.6, delay: index * 0.08 + 0.05 }}
                        whileHover={{ scale: 1.05 }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-600 capitalize">{data.month}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Missions */}
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-600" />
                Récentes
              </h2>
              <Link to="/missions" className="text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recentMissions.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Truck className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium text-sm">Aucune mission</p>
                <Link to="/missions/new" className="text-teal-600 text-sm font-semibold hover:underline mt-2 inline-block">
                  Créer une mission
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMissions.map((mission, i) => {
                  const config = getStatusConfig(mission.status);
                  const Icon = config.icon;
                  
                  return (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Link
                        to="/missions"
                        className="block bg-slate-50 hover:bg-slate-100 rounded-xl p-3 transition-all border border-transparent hover:border-teal-200 group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-md ${config.bg}`}>
                              <Icon className={`w-3 h-3 ${config.color}`} />
                            </div>
                            <span className="font-semibold text-slate-800 text-sm">{mission.reference}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{getTimeAgo(mission.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1.5 truncate">
                          {mission.vehicle_brand} {mission.vehicle_model}
                        </p>
                        <div className="flex items-center justify-between">
                          {mission.price > 0 && (
                            <span className="text-sm font-bold text-teal-600">{mission.price}€</span>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          variants={containerVariants}
        >
          <motion.div 
            className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-5 shadow-lg text-white"
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium">Ce mois</p>
                <p className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString('fr-FR')}€</p>
              </div>
            </div>
            <p className="text-sm text-white/80">
              Semaine: {stats.weeklyRevenue.toFixed(0)}€ • {stats.missionsToday} aujourd'hui
            </p>
          </motion.div>

          <motion.div 
            className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-5 shadow-lg text-white"
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium">Crédits utilisés</p>
                <p className="text-2xl font-bold">{stats.usedCredits}</p>
              </div>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <motion.div 
                className="bg-white rounded-full h-2"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((stats.usedCredits / Math.max(creditInfo.balance, 1)) * 100, 100)}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </motion.div>

          <motion.div 
            className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-5 shadow-lg text-white"
            variants={itemVariants}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-white/20 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium">Factures</p>
                <p className="text-2xl font-bold">{stats.totalInvoices}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {stats.paidInvoices} payées
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {stats.pendingInvoices} en attente
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
