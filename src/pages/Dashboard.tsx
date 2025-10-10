import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Users, FileText, TrendingUp, Calendar, AlertCircle, CheckCircle, DollarSign, MapPin, ArrowUpRight, ArrowDownRight, Activity, Sparkles, Target, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PlanCreditsCard from '../components/PlanCreditsCard';
import WeatherTimeCard from '../components/WeatherTimeCard';

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

export default function Dashboard() {
  const { user } = useAuth();
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

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [missionsRes, contactsRes, invoicesRes, recentMissionsRes] = await Promise.all([
        supabase.from('missions').select('status, price, created_at, company_commission, bonus_amount', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('contacts').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('invoices').select('status, total', { count: 'exact' }).eq('user_id', user.id),
        supabase
          .from('missions')
          .select('*')
          .eq('user_id', user.id)
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
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'in_progress': return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'pending': return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
      case 'cancelled': return 'text-red-600 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-600 bg-slate-500/10 border-slate-500/30';
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
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  const maxMissions = Math.max(...monthlyData.map((d) => d.missions), 1);

  const pendingMissions = stats.totalMissions - stats.completedMissions - stats.activeMissions - stats.cancelledMissions;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-left duration-500">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-teal-500 animate-float" />
          Tableau de bord
        </h1>
        <p className="text-slate-600 text-lg">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom duration-700">
        <StatCard
          icon={<Truck className="w-6 h-6" />}
          label="Missions totales"
          value={stats.totalMissions}
          color="from-blue-500 to-cyan-500"
          bgColor="from-blue-500/20 to-cyan-500/20"
          borderColor="border-blue-400/30"
          trend={stats.monthlyRevenue > 0 ? '+12%' : ''}
        />

        <PlanCreditsCard />

        <StatCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Revenu ce mois"
          value={`${stats.monthlyRevenue.toLocaleString('fr-FR')}€`}
          color="from-violet-500 to-purple-500"
          bgColor="from-violet-500/20 to-purple-500/20"
          borderColor="border-violet-400/30"
          trend="+15%"
        />

        <WeatherTimeCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover-lift animate-in slide-in-from-left duration-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  Évolution des missions (6 mois)
                </h2>
              </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-64 px-4">
              {monthlyData.map((data, index) => {
                const percentage = maxMissions > 0 ? (data.missions / maxMissions) * 100 : 0;
                const height = Math.max(percentage, 8);
                const isCurrentMonth = index === monthlyData.length - 1;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10 whitespace-nowrap shadow-2xl border border-white/10">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                          <span className="text-cyan-300">{data.missions} mission{data.missions > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                          <span className="text-emerald-300">{data.revenue.toLocaleString('fr-FR')}€</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2.5 h-2.5 bg-slate-900/95 border-r border-b border-white/10"></div>
                    </div>

                    <div className="relative w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className={`w-full rounded-t-2xl transition-all duration-500 hover:scale-110 cursor-pointer relative overflow-hidden shadow-lg group-hover:shadow-2xl ${
                          isCurrentMonth
                            ? 'bg-gradient-to-t from-emerald-500 via-cyan-500 to-blue-500 animate-pulse shadow-emerald-500/50 group-hover:shadow-emerald-500/70'
                            : 'bg-gradient-to-t from-blue-600 via-cyan-500 to-cyan-400 shadow-blue-500/50 group-hover:shadow-cyan-500/70'
                        }`}
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-white/0 via-white/30 to-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                        {isCurrentMonth && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                        )}

                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                            {data.missions}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-xs font-bold capitalize transition-colors ${
                      isCurrentMonth ? 'text-emerald-600' : 'text-slate-700 group-hover:text-cyan-600'
                    }`}>
                      {data.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-blue-500/10 border border-teal-400/30 shadow-xl shadow-teal-500/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-teal-500/30 transition-all duration-300 hover-lift animate-in slide-in-from-left duration-700" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Missions récentes
                </h2>
              </div>
              <Link
                to="/missions"
                className="text-teal-600 hover:text-teal-700 text-sm font-bold flex items-center gap-1 group"
              >
                Voir tout
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
            </div>

            {recentMissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur">
                  <Truck className="w-8 h-8 text-teal-600 animate-float" />
                </div>
                <p className="text-slate-600 mb-4 font-medium">Aucune mission pour le moment</p>
                <Link
                  to="/missions/create"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 rounded-xl font-bold text-white hover:shadow-2xl hover:shadow-teal-500/60 transition-all hover:-translate-y-0.5"
                >
                  Créer une mission
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMissions.map((mission, index) => (
                  <Link
                    key={mission.id}
                    style={{ animationDelay: `${index * 50}ms` }}
                    to="/team-missions"
                    className="block backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl p-4 hover:bg-white/80 hover:shadow-xl hover:shadow-slate-400/20 transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur rounded-xl flex items-center justify-center border border-teal-500/30 group-hover:scale-110 transition-transform duration-300">
                          <Truck className="w-6 h-6 text-teal-600 group-hover:rotate-12 transition-transform duration-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{mission.reference}</p>
                          <p className="text-sm text-slate-600">
                            {mission.vehicle_brand} {mission.vehicle_model}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur ${getStatusColor(mission.status)}`}>
                          {getStatusLabel(mission.status)}
                        </span>
                        {mission.price > 0 && (
                          <p className="text-sm font-bold text-teal-600 mt-1">{mission.price}€</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600 ml-15 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-400/60"></div>
                        <span className="line-clamp-1">{mission.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-400/60"></div>
                        <span className="line-clamp-1">{mission.delivery_address}</span>
                      </div>
                      {mission.pickup_date && (
                        <div className="flex items-center gap-2 mt-2 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="backdrop-blur-xl bg-gradient-to-br from-violet-500/10 via-purple-500/10 to-pink-500/10 border border-violet-400/30 shadow-xl shadow-violet-500/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-violet-500/30 transition-all duration-300 hover-lift animate-in slide-in-from-right duration-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">Répartition</h2>
            </div>

            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="12"
                  opacity="0.2"
                />
                {stats.totalMissions > 0 && (
                  <>
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#gradient-green)"
                      strokeWidth="12"
                      strokeDasharray={`${(stats.completedMissions / stats.totalMissions) * 251.2} 251.2`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#gradient-blue)"
                      strokeWidth="12"
                      strokeDasharray={`${(stats.activeMissions / stats.totalMissions) * 251.2} 251.2`}
                      strokeDashoffset={`-${(stats.completedMissions / stats.totalMissions) * 251.2}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#gradient-yellow)"
                      strokeWidth="12"
                      strokeDasharray={`${(pendingMissions / stats.totalMissions) * 251.2} 251.2`}
                      strokeDashoffset={`-${((stats.completedMissions + stats.activeMissions) / stats.totalMissions) * 251.2}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </>
                )}
                <defs>
                  <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <linearGradient id="gradient-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-black bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    {stats.totalMissions}
                  </p>
                  <p className="text-xs font-bold text-slate-600">Total</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-500/10 backdrop-blur rounded-xl border border-green-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-emerald-600"></div>
                  <span className="text-sm font-semibold text-slate-700">Complétées</span>
                </div>
                <span className="text-lg font-black text-green-600">{stats.completedMissions}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-500/10 backdrop-blur rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600"></div>
                  <span className="text-sm font-semibold text-slate-700">En cours</span>
                </div>
                <span className="text-lg font-black text-blue-600">{stats.activeMissions}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-500/10 backdrop-blur rounded-xl border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600"></div>
                  <span className="text-sm font-semibold text-slate-700">En attente</span>
                </div>
                <span className="text-lg font-black text-yellow-600">{pendingMissions}</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-pink-500/10 via-rose-500/10 to-red-500/10 border border-pink-400/30 shadow-xl shadow-pink-500/20 rounded-2xl p-6 hover:shadow-2xl hover:shadow-pink-500/30 transition-all duration-300 hover-lift animate-in slide-in-from-right duration-700" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">Liens rapides</h2>
            </div>
            <div className="space-y-2">
              <Link
                to="/missions/create"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-teal-500/10 backdrop-blur border border-transparent hover:border-teal-500/30 transition-all duration-300 group"
              >
                <span className="text-slate-700 group-hover:text-teal-700 font-semibold text-sm">Nouvelle mission</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-teal-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
              <Link
                to="/contacts"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-500/10 backdrop-blur border border-transparent hover:border-blue-500/30 transition-all duration-300 group"
              >
                <span className="text-slate-700 group-hover:text-blue-700 font-semibold text-sm">Gérer contacts</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
              <Link
                to="/billing"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-green-500/10 backdrop-blur border border-transparent hover:border-green-500/30 transition-all duration-300 group"
              >
                <span className="text-slate-700 group-hover:text-green-700 font-semibold text-sm">Voir factures</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-green-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
              <Link
                to="/reports"
                className="flex items-center justify-between p-3 rounded-xl hover:bg-orange-500/10 backdrop-blur border border-transparent hover:border-orange-500/30 transition-all duration-300 group"
              >
                <span className="text-slate-700 group-hover:text-orange-700 font-semibold text-sm">Rapports</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-orange-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
  borderColor: string;
  trend?: string;
}

function StatCard({ icon, label, value, color, bgColor, borderColor, trend }: StatCardProps) {
  return (
    <div className={`backdrop-blur-xl bg-gradient-to-br ${bgColor} border ${borderColor} shadow-xl rounded-2xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group perspective-card`}>
      <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
        <div className="text-white">
          {icon}
        </div>
      </div>
      <p className="text-slate-600 text-sm font-semibold mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-black text-slate-800">{value}</p>
        {trend && (
          <span className="text-xs text-green-600 flex items-center font-bold px-2 py-0.5 bg-green-500/10 rounded-full">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
