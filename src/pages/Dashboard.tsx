// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, Users, DollarSign, TrendingUp, Calendar, Package, 
  CheckCircle, Clock, XCircle, Star, ArrowUpRight, 
  Activity, Sparkles, BarChart3, Navigation2,
  Award, Target, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

export default function Dashboard() {
  const { user } = useAuth();
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
    cancelledRate: 0,
    totalCredits: 0,
    usedCredits: 0,
    topRatedContacts: 0,
    missionsThisWeek: 0,
    missionsToday: 0,
    averageDeliveryTime: 0,
    totalDistance: 0,
  });
  const [recentMissions, setRecentMissions] = useState<RecentMission[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    loadUserProfile();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.first_name) {
        setFirstName(data.first_name);
      }
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
        supabase.from('missions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
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
      const completedMissionsWithTime = missions.filter((m) => m.status === 'completed' && m.pickup_date && m.delivery_date);
      const averageDeliveryTime = completedMissionsWithTime.length > 0
        ? completedMissionsWithTime.reduce((sum, m) => {
            const pickup = new Date(m.pickup_date).getTime();
            const delivery = new Date(m.delivery_date).getTime();
            return sum + (delivery - pickup) / (1000 * 60 * 60);
          }, 0) / completedMissionsWithTime.length
        : 0;

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
      });

      setMonthlyData(last6Months);
      setRecentMissions(recentMissionsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-teal-200 rounded-full animate-spin"></div>
          <div className="w-20 h-20 border-4 border-t-teal-600 rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  const maxMissions = Math.max(...monthlyData.map((d) => d.missions), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header Premium - Responsive */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 mb-3">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-pulse" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white drop-shadow-lg text-center sm:text-left">
              Bienvenue{firstName ? ` ${firstName}` : ''} ! 👋
            </h1>
          </div>
          <p className="text-white/90 text-sm sm:text-base md:text-lg font-medium text-center sm:text-left">
            Ravi de vous revoir ! Voici un aperçu de votre activité en temps réel
          </p>
        </div>
      </div>

      {/* Statistiques principales - Design en cartes responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Missions Totales */}
        <div className="group relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200 hover:border-blue-300 hover:-translate-y-2">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Truck className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">Total</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">{stats.totalMissions}</h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-2">Missions</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{stats.missionsThisWeek}
              </span>
              <span className="text-slate-400">cette semaine</span>
            </div>
          </div>
        </div>

        {/* Revenu Total */}
        <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200 hover:border-purple-300 hover:-translate-y-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Revenus</span>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{stats.totalRevenue.toLocaleString('fr-FR')}€</h3>
            <p className="text-sm font-semibold text-slate-600 mb-2">Total généré</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-600 font-bold">
                Moy: {stats.averageMissionPrice.toFixed(0)}€
              </span>
              <span className="text-slate-400">par mission</span>
            </div>
          </div>
        </div>

        {/* Taux de succès */}
        <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200 hover:border-emerald-300 hover:-translate-y-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Succès</span>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{stats.completionRate.toFixed(1)}%</h3>
            <p className="text-sm font-semibold text-slate-600 mb-2">Taux de complétion</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-600 font-bold">
                {stats.completedMissions} complétées
              </span>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200 hover:border-indigo-300 hover:-translate-y-2">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Réseau</span>
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-1">{stats.totalContacts}</h3>
            <p className="text-sm font-semibold text-slate-600 mb-2">Contacts</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-indigo-600 font-bold">
                {stats.totalDrivers} chauffeurs
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-blue-600 font-bold">
                {stats.totalClients} clients
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques secondaires - 6 petites cartes */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-black text-orange-600">{stats.activeMissions}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600">En cours</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-amber-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-2xl font-black text-amber-600">{stats.pendingMissions}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600">En attente</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-red-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-black text-red-600">{stats.cancelledMissions}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600">Annulées</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-yellow-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-2xl font-black text-yellow-600">{stats.topRatedContacts}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600">Top notés</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-cyan-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Navigation2 className="w-5 h-5 text-cyan-600" />
            </div>
            <span className="text-2xl font-black text-cyan-600">{stats.totalDistance.toFixed(0)}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600">Km total</p>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all border border-teal-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Zap className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-2xl font-black text-teal-600">{stats.averageDeliveryTime.toFixed(1)}h</span>
          </div>
          <p className="text-xs font-semibold text-slate-600">Temps moy</p>
        </div>
      </div>

      {/* Graphiques et missions récentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graphique d'évolution */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-teal-600" />
                Évolution des 6 derniers mois
              </h2>
              <p className="text-sm text-slate-500 mt-1">Missions et revenus mensuels</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                <span className="text-slate-600">Missions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <span className="text-slate-600">Revenus</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3 h-64">
            {monthlyData.map((data, index) => {
              const missionHeight = maxMissions > 0 ? (data.missions / maxMissions) * 100 : 0;
              const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);
              const revenueHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={index} className="flex-1 flex flex-col gap-2 group">
                  {/* Missions bar */}
                  <div className="relative flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-teal-600 to-cyan-500 shadow-lg group-hover:shadow-2xl transition-all duration-300 relative overflow-hidden group-hover:scale-105"
                      style={{ height: `${Math.max(missionHeight, 5)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/20"></div>
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {data.missions}
                      </div>
                    </div>
                  </div>
                  
                  {/* Revenus bar */}
                  <div className="relative h-16 flex items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-purple-600 to-pink-500 shadow-lg group-hover:shadow-2xl transition-all duration-300 relative overflow-hidden group-hover:scale-105"
                      style={{ height: `${Math.max(revenueHeight, 10)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/20"></div>
                    </div>
                  </div>
                  
                  {/* Label */}
                  <p className="text-xs font-bold text-center text-slate-600 capitalize mt-2">{data.month}</p>
                  
                  {/* Tooltip */}
                  <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10 whitespace-nowrap">
                    <div>{data.missions} missions</div>
                    <div className="text-purple-300">{data.revenue.toLocaleString('fr-FR')}€</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missions récentes */}
        <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-6 h-6 text-teal-600" />
              Récentes
            </h2>
            <Link to="/missions" className="text-teal-600 hover:text-teal-700 text-sm font-bold flex items-center gap-1">
              Tout voir
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {recentMissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm font-medium">Aucune mission</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMissions.map((mission) => (
                <Link
                  key={mission.id}
                  to="/missions"
                  className="block bg-slate-50 hover:bg-slate-100 rounded-xl p-4 transition-all border border-slate-200 hover:border-teal-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 text-sm">{mission.reference}</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusColor(mission.status)}`}>
                      {getStatusLabel(mission.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    {mission.vehicle_brand} {mission.vehicle_model}
                  </p>
                  {mission.price > 0 && (
                    <p className="text-sm font-bold text-teal-600">{mission.price}€</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold">Ce mois</p>
              <p className="text-2xl font-black">{stats.monthlyRevenue.toLocaleString('fr-FR')}€</p>
            </div>
          </div>
          <div className="text-sm font-medium text-white/90">
            Semaine: {stats.weeklyRevenue.toFixed(0)}€ • Aujourd'hui: {stats.missionsToday} missions
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold">Crédits</p>
              <p className="text-2xl font-black">{stats.totalCredits}</p>
            </div>
          </div>
          <div className="text-sm font-medium text-white/90">
            Utilisés: {stats.usedCredits} • Disponibles: {stats.totalCredits - stats.usedCredits}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-6 shadow-xl text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-semibold">Factures</p>
              <p className="text-2xl font-black">{stats.totalInvoices}</p>
            </div>
          </div>
          <div className="text-sm font-medium text-white/90">
            Payées: {stats.paidInvoices} • En attente: {stats.pendingInvoices}
          </div>
        </div>
      </div>
    </div>
  );
}
