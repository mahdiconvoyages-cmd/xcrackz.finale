// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
import {
  Package, Search, ChevronLeft, ChevronRight, CreditCard, Users, Clock,
  Zap, RefreshCw, Filter, TrendingUp, ArrowUpDown, Calendar, XCircle,
  AlertTriangle, CheckCircle, BarChart3, DollarSign, Activity, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  auto_renew: boolean;
  payment_method?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // joined from profiles
  email?: string;
  full_name?: string;
  credits?: number;
  company_name?: string;
  phone?: string;
}

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
  reference_type?: string;
  email?: string;
  full_name?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  essentiel: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  starter: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  basic: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  pro: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  business: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  enterprise: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  active: { label: 'Actif', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  expired: { label: 'Expiré', bg: 'bg-red-100', text: 'text-red-700', icon: Clock },
  canceled: { label: 'Annulé', bg: 'bg-orange-100', text: 'text-orange-700', icon: XCircle },
  trial: { label: 'Essai', bg: 'bg-sky-100', text: 'text-sky-700', icon: Zap },
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'transactions' | 'analytics'>('subscriptions');

  // Filters
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'current_period_end' | 'plan'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Transaction filters
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [txPage, setTxPage] = useState(1);

  // ─── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel('admin-subs-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => loadSubscriptions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions' }, () => loadTransactions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadSubscriptions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadAll = async () => {
    try {
      await Promise.all([loadSubscriptions(), loadTransactions()]);
    } finally { setLoading(false); }
  };

  const loadSubscriptions = async () => {
    try {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, credits, company_name, phone');

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.id, p));

      setSubscriptions((subs || []).map(s => ({
        ...s,
        email: profileMap.get(s.user_id)?.email,
        full_name: profileMap.get(s.user_id)?.full_name,
        credits: profileMap.get(s.user_id)?.credits || 0,
        company_name: profileMap.get(s.user_id)?.company_name,
        phone: profileMap.get(s.user_id)?.phone,
      })));
    } catch (err) {
      console.error('Erreur chargement abonnements:', err);
    }
  };

  const loadTransactions = async () => {
    try {
      const { data: txs } = await supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.id, p));

      setTransactions((txs || []).map(t => ({
        ...t,
        email: profileMap.get(t.user_id)?.email,
        full_name: profileMap.get(t.user_id)?.full_name,
      })));
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setTimeout(() => setRefreshing(false), 500);
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleBulkExpire = async () => {
    const expired = subscriptions.filter(s =>
      s.status === 'active' && s.current_period_end && new Date(s.current_period_end) < new Date()
    );
    if (expired.length === 0) return alert('Aucun abonnement actif expiré à traiter.');
    if (!confirm(`Expirer ${expired.length} abonnement(s) dont la date est passée et remettre leurs crédits à 0 ?`)) return;

    for (const sub of expired) {
      await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', sub.id);
      if (sub.credits && sub.credits > 0) {
        await supabase.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', sub.user_id);
        await supabase.from('credit_transactions').insert({
          user_id: sub.user_id,
          amount: -sub.credits,
          transaction_type: 'bulk_expiration',
          description: 'Expiration automatique (action admin bulk)',
          balance_after: 0,
        });
      }
    }
    await loadSubscriptions();
    alert(`✅ ${expired.length} abonnement(s) expirés avec succès.`);
  };

  const handleQuickCancel = async (sub: SubscriptionRow) => {
    if (!confirm(`Annuler l'abonnement ${sub.plan.toUpperCase()} de ${sub.email} ?`)) return;
    await supabase.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('id', sub.id);
    loadSubscriptions();
  };

  const handleQuickExpire = async (sub: SubscriptionRow) => {
    if (!confirm(`Expirer et remettre les crédits de ${sub.email} à 0 ?`)) return;
    await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('id', sub.id);
    await supabase.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', sub.user_id);
    if (sub.credits && sub.credits > 0) {
      await supabase.from('credit_transactions').insert({
        user_id: sub.user_id,
        amount: -sub.credits,
        transaction_type: 'admin_expiration',
        description: 'Abonnement expiré par admin — crédits à 0',
        balance_after: 0,
      });
    }
    loadSubscriptions();
  };

  const handleReactivate = async (sub: SubscriptionRow) => {
    const days = prompt('Réactiver pour combien de jours ?', '30');
    if (!days) return;
    const d = parseInt(days);
    if (isNaN(d) || d <= 0) return alert('Durée invalide');
    const end = new Date(); end.setDate(end.getDate() + d);
    await supabase.from('subscriptions').update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: end.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    loadSubscriptions();
  };

  const handleToggleAutoRenew = async (sub: SubscriptionRow) => {
    await supabase.from('subscriptions').update({
      auto_renew: !sub.auto_renew,
      updated_at: new Date().toISOString(),
    }).eq('id', sub.id);
    loadSubscriptions();
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredSubs = useMemo(() => {
    let f = [...subscriptions];
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(s => s.email?.toLowerCase().includes(q) || s.full_name?.toLowerCase().includes(q) || s.company_name?.toLowerCase().includes(q) || s.user_id.includes(q));
    }
    if (planFilter !== 'all') f = f.filter(s => s.plan === planFilter);
    if (statusFilter !== 'all') f = f.filter(s => s.status === statusFilter);

    f.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'current_period_end') {
        cmp = new Date(a.current_period_end || 0).getTime() - new Date(b.current_period_end || 0).getTime();
      } else if (sortBy === 'plan') {
        cmp = (a.plan || '').localeCompare(b.plan || '');
      } else {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return f;
  }, [subscriptions, search, planFilter, statusFilter, sortBy, sortDir]);

  const filteredTxs = useMemo(() => {
    let f = [...transactions];
    if (txSearch) {
      const q = txSearch.toLowerCase();
      f = f.filter(t => t.email?.toLowerCase().includes(q) || t.full_name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (txTypeFilter !== 'all') f = f.filter(t => t.transaction_type === txTypeFilter);
    return f;
  }, [transactions, txSearch, txTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / pageSize));
  const paginatedSubs = filteredSubs.slice((page - 1) * pageSize, page * pageSize);
  const txTotalPages = Math.max(1, Math.ceil(filteredTxs.length / pageSize));
  const paginatedTxs = filteredTxs.slice((txPage - 1) * pageSize, txPage * pageSize);

  useEffect(() => { setPage(1); }, [search, planFilter, statusFilter]);
  useEffect(() => { setTxPage(1); }, [txSearch, txTypeFilter]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'active').length;
    const expired = subscriptions.filter(s => s.status === 'expired').length;
    const canceled = subscriptions.filter(s => s.status === 'canceled').length;
    const expiringIn7 = subscriptions.filter(s => {
      if (s.status !== 'active' || !s.current_period_end) return false;
      const days = Math.ceil((new Date(s.current_period_end).getTime() - Date.now()) / 86400000);
      return days > 0 && days <= 7;
    }).length;
    const overdue = subscriptions.filter(s => {
      if (s.status !== 'active' || !s.current_period_end) return false;
      return new Date(s.current_period_end) < new Date();
    }).length;
    const withAutoRenew = subscriptions.filter(s => s.status === 'active' && s.auto_renew).length;
    const totalCredits = subscriptions.filter(s => s.status === 'active').reduce((sum, s) => sum + (s.credits || 0), 0);

    // Plan distribution
    const planDist: Record<string, number> = {};
    subscriptions.filter(s => s.status === 'active').forEach(s => { planDist[s.plan] = (planDist[s.plan] || 0) + 1; });

    // Revenue estimate
    const revenue = transactions.filter(t => t.amount > 0 && t.transaction_type === 'purchase').reduce((sum, t) => sum + t.amount, 0);

    // Transaction types
    const txTypes = new Set(transactions.map(t => t.transaction_type));

    return { total, active, expired, canceled, expiringIn7, overdue, withAutoRenew, totalCredits, planDist, revenue, txTypes: Array.from(txTypes) };
  }, [subscriptions, transactions]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  const getDaysRemaining = (end?: string | null) => {
    if (!end) return null;
    return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  };

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-purple-500" />
            Abonnements & Crédits
          </h1>
          <p className="text-slate-500 mt-1">
            {stats.active} actifs · {stats.expired} expirés · {stats.expiringIn7} expirent sous 7j
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className={`p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition ${refreshing ? 'animate-spin' : ''}`}>
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
          {stats.overdue > 0 && (
            <button onClick={handleBulkExpire} className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all">
              <AlertTriangle className="w-4 h-4" /> Expirer {stats.overdue} dépassés
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Package, gradient: 'from-slate-600 to-slate-700' },
          { label: 'Actifs', value: stats.active, icon: CheckCircle, gradient: 'from-emerald-500 to-green-600' },
          { label: 'Expirés', value: stats.expired, icon: Clock, gradient: 'from-red-500 to-pink-500' },
          { label: 'Annulés', value: stats.canceled, icon: XCircle, gradient: 'from-orange-500 to-amber-500' },
          { label: 'Expire < 7j', value: stats.expiringIn7, icon: AlertTriangle, gradient: 'from-amber-500 to-yellow-500' },
          { label: 'Dépassés', value: stats.overdue, icon: AlertTriangle, gradient: 'from-rose-500 to-red-600' },
          { label: 'Auto-renew', value: stats.withAutoRenew, icon: Zap, gradient: 'from-yellow-500 to-orange-500' },
          { label: 'Crédits actifs', value: stats.totalCredits, icon: CreditCard, gradient: 'from-blue-500 to-cyan-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:shadow-md transition-all">
            <div className={`p-2 bg-gradient-to-br ${c.gradient} rounded-lg w-fit shadow-sm mb-2`}>
              <c.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-slate-900">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'subscriptions', label: 'Abonnements', icon: Package, count: subscriptions.length },
          { id: 'transactions', label: 'Transactions', icon: Activity, count: transactions.length },
          { id: 'analytics', label: 'Analytique', icon: BarChart3 },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab: Subscriptions ──────────────────────────────────────────────── */}
      {activeTab === 'subscriptions' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[260px] relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Rechercher par nom, email, entreprise..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium text-sm" />
              </div>
              <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
                <option value="all">Tous plans</option>
                <option value="free">FREE</option>
                <option value="essentiel">ESSENTIEL</option>
                <option value="pro">PRO</option>
                <option value="business">BUSINESS</option>
                <option value="enterprise">ENTERPRISE</option>
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
                <option value="all">Tous statuts</option>
                <option value="active">Actifs</option>
                <option value="expired">Expirés</option>
                <option value="canceled">Annulés</option>
                <option value="trial">Essai</option>
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
              <Filter className="w-3 h-3" /> {filteredSubs.length} abonnement{filteredSubs.length > 1 ? 's' : ''}
            </p>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Utilisateur</th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                      <button onClick={() => toggleSort('plan')} className="flex items-center gap-1 hover:text-purple-600 transition">
                        Plan <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Statut</th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Crédits</th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                      <button onClick={() => toggleSort('current_period_end')} className="flex items-center gap-1 hover:text-purple-600 transition">
                        Expiration <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Options</th>
                    <th className="text-right py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSubs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <Package className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-semibold text-lg">Aucun abonnement</p>
                      </td>
                    </tr>
                  )}
                  {paginatedSubs.map(sub => {
                    const daysLeft = getDaysRemaining(sub.current_period_end);
                    const sc = STATUS_CONFIG[sub.status] || STATUS_CONFIG.expired;
                    const pc = PLAN_COLORS[sub.plan] || PLAN_COLORS.free;
                    const isOverdue = sub.status === 'active' && daysLeft !== null && daysLeft < 0;

                    return (
                      <tr key={sub.id} className={`hover:bg-purple-50/30 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                        {/* User */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                              {sub.full_name?.charAt(0)?.toUpperCase() || sub.email?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate max-w-[180px]">{sub.full_name || '—'}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[180px]">{sub.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${pc.bg} ${pc.text}`}>
                            {sub.plan.toUpperCase()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <sc.icon className={`w-3.5 h-3.5 ${sc.text}`} />
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${sc.bg} ${sc.text}`}>
                              {sc.label}
                            </span>
                          </div>
                          {isOverdue && (
                            <p className="text-[10px] text-red-500 font-bold mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Dépassé de {-daysLeft}j
                            </p>
                          )}
                        </td>

                        {/* Credits */}
                        <td className="py-3.5 px-4">
                          <span className={`text-lg font-black ${(sub.credits || 0) > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                            {sub.credits || 0}
                          </span>
                        </td>

                        {/* Expiration */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="text-xs text-slate-600 font-medium">{formatDate(sub.current_period_end)}</p>
                            {daysLeft !== null && sub.status === 'active' && (
                              <p className={`text-[10px] font-semibold ${daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {daysLeft < 0 ? `Expiré ${-daysLeft}j` : `${daysLeft}j restants`}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Options */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {sub.auto_renew && (
                              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700">
                                <Zap className="w-3 h-3 fill-current" /> Auto
                              </span>
                            )}
                            {sub.payment_method && (
                              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-600">
                                {sub.payment_method}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleToggleAutoRenew(sub)} className={`p-1.5 rounded-lg transition ${sub.auto_renew ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'hover:bg-slate-100 text-slate-400'}`} title="Auto-renew">
                              <Zap className={`w-4 h-4 ${sub.auto_renew ? 'fill-current' : ''}`} />
                            </button>
                            {sub.status === 'active' && (
                              <>
                                <button onClick={() => handleQuickCancel(sub)} className="p-1.5 hover:bg-orange-50 rounded-lg transition text-orange-500" title="Annuler">
                                  <XCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleQuickExpire(sub)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500" title="Expirer">
                                  <Clock className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(sub.status === 'expired' || sub.status === 'canceled') && (
                              <button onClick={() => handleReactivate(sub)} className="p-1.5 hover:bg-green-50 rounded-lg transition text-green-600" title="Réactiver">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50/50">
              <span className="text-sm text-slate-500 font-medium">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSubs.length)} sur {filteredSubs.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === pn ? 'bg-purple-500 text-white shadow-md' : 'hover:bg-slate-200 text-slate-600'}`}>{pn}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Tab: Transactions ───────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <>
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[260px] relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Rechercher..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium text-sm" />
              </div>
              <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
                <option value="all">Tous types</option>
                {stats.txTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-400 mt-2">{filteredTxs.length} transaction{filteredTxs.length > 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3. px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Utilisateur</th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Type</th>
                    <th className="text-right py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Montant</th>
                    <th className="text-right py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Solde après</th>
                    <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTxs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <Activity className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-semibold">Aucune transaction</p>
                      </td>
                    </tr>
                  )}
                  {paginatedTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-600 font-medium">{formatDateTime(tx.created_at)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{tx.full_name || tx.email || '—'}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{tx.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          tx.transaction_type.includes('grant') || tx.transaction_type === 'subscription_grant' ? 'bg-green-100 text-green-700' :
                          tx.transaction_type.includes('deduction') || tx.transaction_type.includes('expiration') || tx.transaction_type === 'spend' ? 'bg-red-100 text-red-700' :
                          tx.transaction_type === 'purchase' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-bold text-slate-700">{tx.balance_after}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-500 truncate max-w-[200px]" title={tx.description}>{tx.description || '—'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50/50">
              <span className="text-sm text-slate-500 font-medium">{(txPage - 1) * pageSize + 1}–{Math.min(txPage * pageSize, filteredTxs.length)} sur {filteredTxs.length}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs font-bold text-slate-600 px-2">{txPage}/{txTotalPages}</span>
                <button onClick={() => setTxPage(p => Math.min(txTotalPages, p + 1))} disabled={txPage === txTotalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Tab: Analytics ──────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
              <BarChart3 className="w-5 h-5 text-purple-500" /> Répartition par plan
            </h3>
            {Object.keys(stats.planDist).length === 0 ? (
              <p className="text-slate-400 text-center py-8">Aucun abonnement actif</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.planDist).sort(([,a], [,b]) => b - a).map(([plan, count]) => {
                  const total = Object.values(stats.planDist).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const pc = PLAN_COLORS[plan] || PLAN_COLORS.free;
                  return (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${pc.bg} ${pc.text}`}>{plan.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{count} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className={`${pc.bg} h-3 rounded-full transition-all duration-700`} style={{ width: `${pct}%`, minWidth: pct > 0 ? '8px' : '0' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Résumé des statuts
            </h3>
            <div className="space-y-3">
              {([
                { label: 'Actifs', count: stats.active, color: 'bg-emerald-500', icon: CheckCircle },
                { label: 'Expirés', count: stats.expired, color: 'bg-red-500', icon: Clock },
                { label: 'Annulés', count: stats.canceled, color: 'bg-orange-500', icon: XCircle },
                { label: 'Expire bientôt (< 7j)', count: stats.expiringIn7, color: 'bg-amber-500', icon: AlertTriangle },
                { label: 'Dépassés (actifs expirés)', count: stats.overdue, color: 'bg-rose-600', icon: AlertTriangle },
              ]).map(item => (
                <div key={item.label} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expiring Soon List */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Expirent bientôt
            </h3>
            {(() => {
              const expiring = subscriptions
                .filter(s => {
                  if (s.status !== 'active' || !s.current_period_end) return false;
                  const d = getDaysRemaining(s.current_period_end);
                  return d !== null && d >= 0 && d <= 14;
                })
                .sort((a, b) => new Date(a.current_period_end!).getTime() - new Date(b.current_period_end!).getTime());

              if (expiring.length === 0) return <p className="text-slate-400 text-center py-8">Aucun abonnement n'expire dans les 14 prochains jours</p>;

              return (
                <div className="space-y-2">
                  {expiring.map(s => {
                    const dl = getDaysRemaining(s.current_period_end);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {s.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{s.full_name || s.email}</p>
                            <p className="text-xs text-slate-500">{s.plan.toUpperCase()} · {s.credits || 0} crédits</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-lg text-sm font-bold ${dl! <= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {dl === 0 ? "Aujourd'hui" : `${dl}j`}
                          </div>
                          <span className="text-xs text-slate-400">{formatDate(s.current_period_end)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
