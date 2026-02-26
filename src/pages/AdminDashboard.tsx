// @ts-nocheck
import { useEffect, useState } from 'react';
import { Users, Truck, DollarSign, CreditCard, TrendingUp, Package, ShoppingCart, UserCheck, Activity, Zap, Clock, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Statistics {
  total_users: number;
  total_missions: number;
  missions_in_progress: number;
  missions_completed: number;
  total_transactions: number;
  total_revenue: number;
  total_credits_distributed: number;
  total_contacts: number;
  active_users_today: number;
  new_users_this_week: number;
  revenue_this_month: number;
  missions_this_month: number;
}

interface Transaction {
  id: string;
  amount: number;
  credits: number;
  payment_status: string;
  created_at: string;
  profiles: { email: string } | { email: string }[];
}

export default function AdminDashboard() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ plan: string; count: number }[]>([]);
  const [subAlerts, setSubAlerts] = useState<{ expiringIn7: number; overdue: number; totalActive: number }>({ expiringIn7: 0, overdue: 0, totalActive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const ch = supabase
      .channel('admin-dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => loadStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { loadStats(); loadTransactions(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadDashboard = async () => {
    try {
      await Promise.all([loadStats(), loadTransactions(), loadPlanDistribution(), loadRecentUsers()]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [
      { count: totalUsers },
      { count: totalMissions },
      { count: missionsInProgress },
      { count: missionsCompleted },
      { count: totalTransactions },
      { data: revenueData },
      { data: creditsData },
      { count: totalContacts },
      { count: newUsersThisWeek },
      { count: activeUsersToday },
      { data: revenueThisMonth },
      { count: missionsThisMonth },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true }),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('missions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('transactions').select('*', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('payment_status', 'paid'),
      supabase.from('profiles').select('id, credits'),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      // last_sign_in_at may not exist — use created_at as fallback for active today count
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabase.from('transactions').select('amount').eq('payment_status', 'paid').gte('created_at', monthStart.toISOString()),
      supabase.from('missions').select('*', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    ]);

    setStatistics({
      total_users: totalUsers || 0,
      total_missions: totalMissions || 0,
      missions_in_progress: missionsInProgress || 0,
      missions_completed: missionsCompleted || 0,
      total_transactions: totalTransactions || 0,
      total_revenue: revenueData?.reduce((s, t) => s + Number(t.amount), 0) || 0,
      total_credits_distributed: creditsData?.reduce((s, p) => s + Number(p.credits || 0), 0) || 0,
      total_contacts: totalContacts || 0,
      active_users_today: activeUsersToday || 0,
      new_users_this_week: newUsersThisWeek || 0,
      revenue_this_month: revenueThisMonth?.reduce((s, t) => s + Number(t.amount), 0) || 0,
      missions_this_month: missionsThisMonth || 0,
    });
  };

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('id, amount, credits, payment_status, created_at, profiles(email)')
      .order('created_at', { ascending: false })
      .limit(8);
    const formatted = (data || []).map(t => ({
      ...t,
      profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles,
    }));
    setRecentTransactions(formatted as Transaction[]);
  };

  const loadPlanDistribution = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('status', 'active');
    const counts: Record<string, number> = {};
    let expiringIn7 = 0, overdue = 0;
    (data || []).forEach(s => {
      counts[s.plan] = (counts[s.plan] || 0) + 1;
      if (s.current_period_end) {
        const daysLeft = Math.ceil((new Date(s.current_period_end).getTime() - Date.now()) / 86400000);
        if (daysLeft < 0) overdue++;
        else if (daysLeft <= 7) expiringIn7++;
      }
    });
    setPlanDistribution(Object.entries(counts).map(([plan, count]) => ({ plan, count })).sort((a, b) => b.count - a.count));
    setSubAlerts({ expiringIn7, overdue, totalActive: (data || []).length });
  };

  const loadRecentUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_type, is_verified, is_admin, credits, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentUsers(data || []);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    { label: 'Utilisateurs', value: statistics?.total_users || 0, icon: Users, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
    { label: 'Missions', value: statistics?.total_missions || 0, icon: Truck, color: 'from-teal-500 to-green-500', bg: 'bg-teal-50' },
    { label: 'Revenus', value: `${(statistics?.total_revenue || 0).toLocaleString('fr-FR')}€`, icon: DollarSign, color: 'from-green-500 to-emerald-500', bg: 'bg-green-50' },
    { label: 'Crédits distribués', value: statistics?.total_credits_distributed || 0, icon: CreditCard, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
    { label: 'En cours', value: statistics?.missions_in_progress || 0, icon: TrendingUp, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50' },
    { label: 'Terminées', value: statistics?.missions_completed || 0, icon: Package, color: 'from-pink-500 to-rose-500', bg: 'bg-pink-50' },
    { label: 'Transactions', value: statistics?.total_transactions || 0, icon: ShoppingCart, color: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50' },
    { label: 'Contacts', value: statistics?.total_contacts || 0, icon: UserCheck, color: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-50' },
  ];

  const realtimeStats = [
    { label: "Actifs aujourd'hui", value: statistics?.active_users_today || 0, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Nouveaux cette semaine', value: statistics?.new_users_this_week || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Revenus ce mois', value: `${(statistics?.revenue_this_month || 0).toLocaleString('fr-FR')}€`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Missions ce mois', value: statistics?.missions_this_month || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de votre plateforme</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-5 border border-white/80 hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 bg-gradient-to-br ${stat.color} rounded-xl shadow-sm`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className={`text-2xl font-black bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>{stat.value}</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Subscription Alerts */}
      {(subAlerts.expiringIn7 > 0 || subAlerts.overdue > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subAlerts.overdue > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500 rounded-xl"><AlertTriangle className="w-5 h-5 text-white" /></div>
                <div>
                  <p className="text-lg font-black text-red-700">{subAlerts.overdue} abonnement(s) dépassé(s)</p>
                  <p className="text-xs text-red-500">Actifs mais date d'expiration passée — action requise</p>
                </div>
              </div>
              <Link to="/admin/subscriptions" className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-800 bg-white px-4 py-2 rounded-xl border border-red-200 hover:shadow transition-all">
                Gérer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          {subAlerts.expiringIn7 > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 rounded-xl"><Clock className="w-5 h-5 text-white" /></div>
                <div>
                  <p className="text-lg font-black text-amber-700">{subAlerts.expiringIn7} expire(nt) sous 7 jours</p>
                  <p className="text-xs text-amber-500">Abonnements actifs proches de l'expiration</p>
                </div>
              </div>
              <Link to="/admin/subscriptions?tab=analytics" className="flex items-center gap-1 text-sm font-bold text-amber-600 hover:text-amber-800 bg-white px-4 py-2 rounded-xl border border-amber-200 hover:shadow transition-all">
                Voir détails <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick Admin Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Gestion utilisateurs', desc: `${statistics?.total_users || 0} utilisateurs`, icon: Users, to: '/admin/users', gradient: 'from-blue-500 to-indigo-500' },
          { label: 'Abonnements', desc: `${subAlerts.totalActive} actifs`, icon: Package, to: '/admin/subscriptions', gradient: 'from-purple-500 to-pink-500' },
          { label: 'Missions GPS', desc: `${statistics?.missions_in_progress || 0} en cours`, icon: Truck, to: '/admin/tracking', gradient: 'from-teal-500 to-green-500' },
          { label: 'Support', desc: 'Conversations', icon: Activity, to: '/admin/support', gradient: 'from-orange-500 to-red-500' },
        ].map(link => (
          <Link key={link.to} to={link.to} className="bg-white rounded-2xl p-4 border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all group">
            <div className={`p-2 bg-gradient-to-br ${link.gradient} rounded-lg w-fit shadow-sm mb-3 group-hover:scale-110 transition-transform`}>
              <link.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-slate-900">{link.label}</p>
            <p className="text-[11px] text-slate-500">{link.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Realtime */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
            <Zap className="w-5 h-5 text-yellow-500" />
            Temps réel
          </h2>
          <div className="space-y-3">
            {realtimeStats.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <span className="text-sm font-semibold text-slate-700">{s.label}</span>
                <span className={`text-lg font-black ${s.color} ${s.bg} px-3 py-1 rounded-lg`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Abonnements actifs
            </h2>
            <Link to="/admin/subscriptions" className="flex items-center gap-1 text-sm font-bold text-purple-600 hover:text-purple-700 transition">
              Gérer <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {planDistribution.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Aucun abonnement actif</p>
          ) : (
            <div className="space-y-3">
              {planDistribution.map(p => {
                const total = planDistribution.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                return (
                  <div key={p.plan}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-700 uppercase">{p.plan}</span>
                      <span className="text-sm font-black text-slate-900">{p.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className="bg-gradient-to-r from-teal-500 to-blue-500 h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
          <Activity className="w-5 h-5 text-green-500" />
          Transactions récentes
        </h2>
        {recentTransactions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Aucune transaction</p>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map(t => {
              const email = (Array.isArray(t.profiles) ? t.profiles[0]?.email : t.profiles?.email) || '?';
              return (
                <div key={t.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{email}</p>
                      <p className="text-xs text-slate-500">{t.credits} crédits · {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-green-600">{Number(t.amount).toFixed(2)}€</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      t.payment_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>{t.payment_status.toUpperCase()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent users */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Derniers utilisateurs
          </h2>
          <Link to="/admin/users" className="flex items-center gap-1 text-sm font-bold text-teal-600 hover:text-teal-700 transition">
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {recentUsers.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Aucun utilisateur</p>
        ) : (
          <div className="space-y-2">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-500">{u.email} · {u.user_type || 'client'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-amber-600">{u.credits || 0} cr</span>
                  {u.is_verified && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-700">VÉRIFIÉ</span>}
                  {u.is_admin && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-700">ADMIN</span>}
                  <span className="text-[10px] text-slate-400">{new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
