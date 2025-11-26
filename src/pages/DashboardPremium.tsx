// @ts-nocheck - Dashboard Premium avec design moderne avancé
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Users, DollarSign, TrendingUp, Calendar, Package, 
  CheckCircle, Clock, XCircle, Star, ArrowUpRight, ArrowDownRight,
  Activity, Sparkles, BarChart3, Navigation2, MapPin,
  Award, Target, Zap, ChevronRight, Eye, FileText,
  CreditCard, Wallet, PieChart, LineChart, Bell, Settings,
  RefreshCw, Filter, Download, Plus, MoreHorizontal,
  TrendingDown, ArrowRight, Briefcase, Globe, Shield
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
  cancelledRate: number;
  totalCredits: number;
  usedCredits: number;
  topRatedContacts: number;
  missionsThisWeek: number;
  missionsToday: number;
  averageDeliveryTime: number;
  totalDistance: number;
  growthRate: number;
  previousMonthRevenue: number;
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
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

const floatAnimation = {
  y: [0, -8, 0],
  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
};

// Composant compteur animé
function AnimatedCounter({ value, duration = 1.5, prefix = '', suffix = '' }: { 
  value: number; 
  duration?: number; 
  prefix?: string; 
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    
    const incrementTime = (duration * 1000) / end;
    const timer = setInterval(() => {
      start += Math.ceil(end / 50);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);
    
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return <span>{prefix}{count.toLocaleString('fr-FR')}{suffix}</span>;
}

// Composant Progress Ring
function ProgressRing({ progress, size = 120, strokeWidth = 10, color = '#14b8a6' }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        stroke="#e2e8f0"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <motion.circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        r={radius}
        cx={size / 2}
        cy={size / 2}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{ strokeDasharray: circumference }}
      />
    </svg>
  );
}

// Composant Mini Sparkline
function MiniSparkline({ data, color = '#14b8a6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - (value / max) * 80;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-12">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.polygon
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      />
    </svg>
  );
}

export default function DashboardPremium() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0, activeMissions: 0, completedMissions: 0, cancelledMissions: 0,
    pendingMissions: 0, totalContacts: 0, totalDrivers: 0, totalClients: 0,
    pendingInvoices: 0, paidInvoices: 0, totalInvoices: 0, totalRevenue: 0,
    monthlyRevenue: 0, weeklyRevenue: 0, averageMissionPrice: 0, completionRate: 0,
    cancelledRate: 0, totalCredits: 0, usedCredits: 0, topRatedContacts: 0,
    missionsThisWeek: 0, missionsToday: 0, averageDeliveryTime: 0, totalDistance: 0,
    growthRate: 0, previousMonthRevenue: 0,
  });
  const [recentMissions, setRecentMissions] = useState<RecentMission[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Données pour sparklines
  const sparklineData = useMemo(() => monthlyData.map(d => d.missions), [monthlyData]);
  const revenueSparkline = useMemo(() => monthlyData.map(d => d.revenue), [monthlyData]);

  useEffect(() => {
    loadDashboardData();
    loadUserProfile();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    let timer: any;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadDashboardData(), 300);
    };

    const channel = supabase
      .channel('realtime-dashboard-premium')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${user.id}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${user.id}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts', filter: `user_id=eq.${user.id}` }, scheduleReload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timer) clearTimeout(timer);
    };
  }, [user?.id]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle();
      if (data?.first_name) setFirstName(data.first_name);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [missionsRes, contactsRes, invoicesRes, recentMissionsRes, creditsRes] = await Promise.all([
        supabase.from('missions').select('status, price, created_at, company_commission, bonus_amount, pickup_date, delivery_date, distance_km', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('contacts').select('id, type, is_driver, rating_average', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('invoices').select('status, total, created_at', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('missions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
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
      const cancelledRate = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

      const totalRevenue = missions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const monthlyMissions = missions.filter((m) => {
        const d = new Date(m.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const previousMonthMissions = missions.filter((m) => {
        const d = new Date(m.created_at);
        return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
      });

      const weeklyMissions = missions.filter((m) => new Date(m.created_at) >= startOfWeek);
      const todayMissions = missions.filter((m) => new Date(m.created_at) >= startOfToday);

      const monthlyRevenue = monthlyMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
      const previousMonthRevenue = previousMonthMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
      const weeklyRevenue = weeklyMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);

      const growthRate = previousMonthRevenue > 0 ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

      const avgPrice = completedCount > 0 ? totalRevenue / completedCount : 0;

      const totalDrivers = contacts.filter((c) => c.is_driver).length;
      const totalClients = contacts.filter((c) => c.type === 'customer').length;
      const topRatedContacts = contacts.filter((c) => c.rating_average >= 4).length;

      const paidInvoices = invoices.filter((i) => i.status === 'paid').length;
      const pendingInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length;

      const totalDistance = missions.reduce((sum, m) => sum + (m.distance_km || 0), 0);
      const completedMissionsWithTime = missions.filter((m) => m.status === 'completed' && m.pickup_date && m.delivery_date);
      const averageDeliveryTime = completedMissionsWithTime.length > 0
        ? completedMissionsWithTime.reduce((sum, m) => {
            const pickup = new Date(m.pickup_date).getTime();
            const delivery = new Date(m.delivery_date).getTime();
            return sum + (delivery - pickup) / (1000 * 60 * 60);
          }, 0) / completedMissionsWithTime.length
        : 0;

      const totalCredits = creditsRes.data?.balance || 0;

      // Données des 6 derniers mois
      const last6Months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('fr-FR', { month: 'short' });
        const monthMissions = missions.filter((m) => {
          const missionDate = new Date(m.created_at);
          return missionDate.getMonth() === date.getMonth() && missionDate.getFullYear() === date.getFullYear();
        });
        const revenue = monthMissions.filter((m) => m.status === 'completed').reduce((sum, m) => sum + (m.company_commission || 0) + (m.bonus_amount || 0), 0);
        const completed = monthMissions.filter((m) => m.status === 'completed').length;
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
        cancelledRate,
        totalCredits,
        usedCredits: totalCount,
        topRatedContacts,
        missionsThisWeek: weeklyMissions.length,
        missionsToday: todayMissions.length,
        averageDeliveryTime,
        totalDistance,
        growthRate,
        previousMonthRevenue,
      });

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
      completed: { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle, label: 'Terminée' },
      in_progress: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Activity, label: 'En cours' },
      pending: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock, label: 'En attente' },
      cancelled: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle, label: 'Annulée' },
    };
    return configs[status] || configs.pending;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `il y a ${days}j`;
    if (hours > 0) return `il y a ${hours}h`;
    return 'À l\'instant';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div 
          className="relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-24 h-24 rounded-full border-4 border-teal-500/30 border-t-teal-500 animate-spin" />
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Sparkles className="w-8 h-8 text-teal-400" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  const maxMissions = Math.max(...monthlyData.map((d) => d.missions), 1);
  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue), 1);

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header Premium */}
      <motion.header 
        className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50"
        variants={itemVariants}
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-teal-500/10 via-transparent to-purple-500/10 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
        </div>
        
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Welcome section */}
              <div className="flex items-center gap-4">
                <motion.div 
                  className="relative"
                  animate={floatAnimation}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/30">
                    <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
                
                <div>
                  <motion.h1 
                    className="text-2xl sm:text-3xl lg:text-4xl font-black text-white"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Bonjour{firstName ? `, ${firstName}` : ''} 👋
                  </motion.h1>
                  <motion.p 
                    className="text-slate-400 text-sm sm:text-base mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </motion.p>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={handleRefresh}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm border border-white/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </motion.button>
                
                <Link to="/missions/new">
                  <motion.button
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Nouvelle mission</span>
                  </motion.button>
                </Link>
              </div>
            </div>

            {/* Quick stats bar */}
            <motion.div 
              className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
              variants={containerVariants}
            >
              {[
                { label: "Aujourd'hui", value: stats.missionsToday, icon: Calendar, color: 'from-teal-400 to-cyan-400' },
                { label: 'Cette semaine', value: stats.missionsThisWeek, icon: TrendingUp, color: 'from-purple-400 to-pink-400' },
                { label: 'En cours', value: stats.activeMissions, icon: Activity, color: 'from-orange-400 to-amber-400' },
                { label: 'En attente', value: stats.pendingMissions, icon: Clock, color: 'from-blue-400 to-indigo-400' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="bg-white/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/10"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color}`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xl sm:text-2xl font-black text-white">{item.value}</p>
                      <p className="text-xs text-slate-400">{item.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto space-y-6">
        
        {/* Stats Grid Premium */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          variants={containerVariants}
        >
          {/* Total Missions */}
          <motion.div 
            className="group relative bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/30"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Truck className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  +{stats.missionsThisWeek}
                </div>
              </div>
              
              <h3 className="text-3xl sm:text-4xl font-black text-slate-800 mb-1">
                <AnimatedCounter value={stats.totalMissions} />
              </h3>
              <p className="text-sm font-semibold text-slate-500">Missions totales</p>
              
              <div className="mt-4">
                <MiniSparkline data={sparklineData} color="#3b82f6" />
              </div>
            </div>
          </motion.div>

          {/* Revenue */}
          <motion.div 
            className="group relative bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg shadow-purple-500/30"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <DollarSign className="w-6 h-6 text-white" />
                </motion.div>
                <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  stats.growthRate >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                }`}>
                  {stats.growthRate >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
                </div>
              </div>
              
              <h3 className="text-3xl sm:text-4xl font-black text-slate-800 mb-1">
                <AnimatedCounter value={stats.totalRevenue} suffix="€" />
              </h3>
              <p className="text-sm font-semibold text-slate-500">Revenus totaux</p>
              
              <div className="mt-4">
                <MiniSparkline data={revenueSparkline} color="#a855f7" />
              </div>
            </div>
          </motion.div>

          {/* Completion Rate */}
          <motion.div 
            className="group relative bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative flex items-center gap-4">
              <div className="relative">
                <ProgressRing progress={stats.completionRate} size={90} color="#10b981" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-black text-slate-800">{stats.completionRate.toFixed(0)}%</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold text-slate-500 mb-1">Taux de succès</p>
                <p className="text-2xl font-black text-emerald-600">{stats.completedMissions}</p>
                <p className="text-xs text-slate-400">missions terminées</p>
              </div>
            </div>
          </motion.div>

          {/* Contacts */}
          <motion.div 
            className="group relative bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
            
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl shadow-lg shadow-indigo-500/30"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Users className="w-6 h-6 text-white" />
                </motion.div>
              </div>
              
              <h3 className="text-3xl sm:text-4xl font-black text-slate-800 mb-1">
                <AnimatedCounter value={stats.totalContacts} />
              </h3>
              <p className="text-sm font-semibold text-slate-500 mb-3">Contacts</p>
              
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-slate-600 font-medium">{stats.totalDrivers} chauffeurs</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-600 font-medium">{stats.totalClients} clients</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Secondary Stats */}
        <motion.div 
          className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4"
          variants={containerVariants}
        >
          {[
            { label: 'En cours', value: stats.activeMissions, icon: Activity, color: 'orange' },
            { label: 'En attente', value: stats.pendingMissions, icon: Clock, color: 'amber' },
            { label: 'Annulées', value: stats.cancelledMissions, icon: XCircle, color: 'red' },
            { label: 'Top notés', value: stats.topRatedContacts, icon: Star, color: 'yellow' },
            { label: 'Distance', value: `${(stats.totalDistance/1000).toFixed(0)}k`, icon: Navigation2, color: 'cyan', isString: true },
            { label: 'Temps moy', value: `${stats.averageDeliveryTime.toFixed(0)}h`, icon: Zap, color: 'teal', isString: true },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className={`bg-white rounded-xl p-3 sm:p-4 shadow-lg border border-${item.color}-100 hover:border-${item.color}-300 transition-all`}
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className={`p-1.5 sm:p-2 bg-${item.color}-100 rounded-lg`}>
                  <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${item.color}-600`} />
                </div>
                <span className={`text-lg sm:text-2xl font-black text-${item.color}-600`}>
                  {item.isString ? item.value : <AnimatedCounter value={item.value as number} />}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-600 truncate">{item.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Charts and Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div 
            className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-slate-100"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-teal-600" />
                  Évolution sur 6 mois
                </h2>
                <p className="text-sm text-slate-500 mt-1">Missions et revenus</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" />
                  <span className="text-slate-600">Missions</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                  <span className="text-slate-600">Revenus</span>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 sm:gap-4 h-64">
              {monthlyData.map((data, index) => {
                const missionHeight = maxMissions > 0 ? (data.missions / maxMissions) * 100 : 0;
                const revenueHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <motion.div 
                    key={index} 
                    className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-end gap-1 h-48 w-full">
                      {/* Missions bar */}
                      <motion.div
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-teal-600 to-cyan-400 shadow-lg relative overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(missionHeight, 8)}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                        <motion.div 
                          className="absolute inset-x-0 top-1 text-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {data.missions}
                        </motion.div>
                      </motion.div>
                      
                      {/* Revenue bar */}
                      <motion.div
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-purple-600 to-pink-400 shadow-lg relative overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(revenueHeight, 8)}%` }}
                        transition={{ duration: 0.8, delay: index * 0.1 + 0.1, ease: "easeOut" }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
                      </motion.div>
                    </div>
                    
                    <p className="text-xs font-bold text-slate-600 capitalize">{data.month}</p>
                    
                    {/* Tooltip */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-20 whitespace-nowrap">
                      <div>{data.missions} missions</div>
                      <div className="text-purple-300">{data.revenue.toLocaleString('fr-FR')}€</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Missions */}
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-6 h-6 text-teal-600" />
                Récentes
              </h2>
              <Link 
                to="/missions" 
                className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
              >
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {recentMissions.length === 0 ? (
              <div className="text-center py-12">
                <motion.div 
                  className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Truck className="w-8 h-8 text-slate-400" />
                </motion.div>
                <p className="text-slate-500 font-medium">Aucune mission</p>
                <Link to="/missions/new" className="text-teal-600 text-sm font-semibold hover:underline mt-2 inline-block">
                  Créer une mission
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {recentMissions.slice(0, 5).map((mission, i) => {
                    const statusConfig = getStatusConfig(mission.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <motion.div
                        key={mission.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link
                          to="/missions"
                          className="block bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-all border border-slate-200 hover:border-teal-300 hover:shadow-md group"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${statusConfig.bg}`}>
                                <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color}`} />
                              </div>
                              <span className="font-bold text-slate-800 text-sm">{mission.reference}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {getTimeAgo(mission.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-600 mb-2 truncate">
                            {mission.vehicle_brand} {mission.vehicle_model}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            {mission.price > 0 && (
                              <p className="text-sm font-bold text-teal-600">{mission.price}€</p>
                            )}
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

        {/* Performance Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
          variants={containerVariants}
        >
          <motion.div 
            className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 rounded-2xl p-6 shadow-xl text-white"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Ce mois</p>
                  <p className="text-3xl font-black">{stats.monthlyRevenue.toLocaleString('fr-FR')}€</p>
                </div>
              </div>
              <div className="text-sm font-medium text-white/90 flex items-center gap-2">
                <span>Semaine: {stats.weeklyRevenue.toFixed(0)}€</span>
                <span className="w-1 h-1 rounded-full bg-white/50" />
                <span>{stats.missionsToday} aujourd'hui</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 rounded-2xl p-6 shadow-xl text-white"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Crédits</p>
                  <p className="text-3xl font-black">{stats.totalCredits}</p>
                </div>
              </div>
              <div className="text-sm font-medium text-white/90">
                <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                  <motion.div 
                    className="bg-white rounded-full h-2"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.usedCredits / Math.max(stats.totalCredits, 1)) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <span>{stats.usedCredits} utilisés</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 rounded-2xl p-6 shadow-xl text-white"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Factures</p>
                  <p className="text-3xl font-black">{stats.totalInvoices}</p>
                </div>
              </div>
              <div className="text-sm font-medium text-white/90 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {stats.paidInvoices} payées
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {stats.pendingInvoices} en attente
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </motion.div>
  );
}
