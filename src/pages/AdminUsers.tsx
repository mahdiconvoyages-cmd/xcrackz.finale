// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
import {
  Users, Search, Shield, Trash2, Download, CreditCard,
  Package, ChevronLeft, ChevronRight, Eye, X, Phone, Building2,
  Plus, Minus, Clock, ArrowUpDown, RefreshCw, Filter,
  Calendar, MapPin, Zap, Edit3, Hash, BadgeCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  company_siret?: string;
  user_type: string;
  is_admin: boolean;
  is_verified: boolean;
  credits: number;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
  base_city?: string;
  onboarding_completed?: boolean;
  fcm_token?: string;
  subscription?: SubscriptionInfo | null;
}

interface SubscriptionInfo {
  id: string;
  plan: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  auto_renew: boolean;
  payment_method?: string;
  notes?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZES = [25, 50, 100];
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700',
  essentiel: 'bg-green-100 text-green-700',
  starter: 'bg-green-100 text-green-700',
  basic: 'bg-green-100 text-green-700',
  pro: 'bg-teal-100 text-teal-700',
  business: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-700',
  canceled: 'bg-orange-100 text-orange-700',
  trial: 'bg-sky-100 text-sky-700',
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'credits' | 'full_name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // User detail drawer
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Credit modal
  const [creditModal, setCreditModal] = useState<{ user: UserProfile; mode: 'add' | 'remove' } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  // Subscription modal
  const [subModal, setSubModal] = useState<UserProfile | null>(null);
  const [subPlan, setSubPlan] = useState('essentiel');
  const [subDuration, setSubDuration] = useState('30');
  const [subAutoRenew, setSubAutoRenew] = useState(true);
  const [subCustomCredits, setSubCustomCredits] = useState('');

  // Shop plans
  const [shopPlans, setShopPlans] = useState<{ name: string; credits_amount: number; price: number }[]>([]);

  // ─── Data Loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadInitial();
    const ch = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => loadUsers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadInitial = async () => {
    try {
      await Promise.all([loadUsers(), loadShopPlans()]);
    } finally { setLoading(false); }
  };

  const loadShopPlans = async () => {
    const { data } = await supabase.from('shop_items').select('name, credits_amount, price').eq('item_type', 'subscription').eq('is_active', true).order('display_order');
    if (data?.length) setShopPlans(data);
    else setShopPlans([
      { name: 'essentiel', credits_amount: 10, price: 10 },
      { name: 'pro', credits_amount: 20, price: 20 },
      { name: 'business', credits_amount: 100, price: 50 },
      { name: 'enterprise', credits_amount: 0, price: 0 },
    ]);
  };

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, phone, company_name, company_siret, user_type, is_admin, is_verified, credits, avatar_url, created_at, updated_at, base_city, onboarding_completed, fcm_token')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, current_period_start, current_period_end, auto_renew, payment_method, notes');

      const subsMap = new Map<string, SubscriptionInfo>();
      subs?.forEach(s => subsMap.set(s.user_id, s));

      setUsers((profiles || []).map(p => ({
        ...p,
        credits: p.credits || 0,
        subscription: subsMap.get(p.id) || null,
      })));
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setTimeout(() => setRefreshing(false), 500);
  };

  // ─── Filtering & Sorting ──────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let f = [...users];

    if (search) {
      const q = search.toLowerCase();
      f = f.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.company_name?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.id.includes(q)
      );
    }

    if (planFilter !== 'all') {
      if (planFilter === 'none') f = f.filter(u => !u.subscription || u.subscription.status !== 'active');
      else f = f.filter(u => u.subscription?.plan === planFilter && u.subscription?.status === 'active');
    }

    if (typeFilter !== 'all') f = f.filter(u => u.user_type === typeFilter);

    if (statusFilter === 'verified') f = f.filter(u => u.is_verified);
    else if (statusFilter === 'admin') f = f.filter(u => u.is_admin);
    else if (statusFilter === 'with_credits') f = f.filter(u => u.credits > 0);
    else if (statusFilter === 'no_credits') f = f.filter(u => u.credits === 0);
    else if (statusFilter === 'expired') f = f.filter(u => u.subscription?.status === 'expired');

    f.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'credits') cmp = a.credits - b.credits;
      else if (sortBy === 'full_name') cmp = (a.full_name || '').localeCompare(b.full_name || '');
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return f;
  }, [users, search, planFilter, typeFilter, statusFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => filteredUsers.slice((page - 1) * pageSize, page * pageSize), [filteredUsers, page, pageSize]);

  useEffect(() => { setPage(1); }, [search, planFilter, typeFilter, statusFilter, pageSize]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = users.length;
    const totalCredits = users.reduce((s, u) => s + u.credits, 0);
    const withCredits = users.filter(u => u.credits > 0).length;
    const activeSubs = users.filter(u => u.subscription?.status === 'active').length;
    const expiredSubs = users.filter(u => u.subscription?.status === 'expired').length;
    const admins = users.filter(u => u.is_admin).length;
    const verified = users.filter(u => u.is_verified).length;
    const drivers = users.filter(u => u.user_type === 'driver').length;
    return { total, totalCredits, withCredits, activeSubs, expiredSubs, admins, verified, drivers };
  }, [users]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const toggleAdmin = async (user: UserProfile) => {
    const me = (await supabase.auth.getUser()).data.user;
    if (me?.id === user.id) return showToast('warning', 'Action impossible', 'Vous ne pouvez pas modifier votre propre rôle admin.');
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
    loadUsers();
  };

  const toggleVerified = async (user: UserProfile) => {
    await supabase.from('profiles').update({ is_verified: !user.is_verified }).eq('id', user.id);
    loadUsers();
  };

  const deleteUser = async (user: UserProfile) => {
    const me = (await supabase.auth.getUser()).data.user;
    if (me?.id === user.id) return showToast('warning', 'Action impossible', 'Vous ne pouvez pas supprimer votre propre compte.');
    if (!confirm(`Supprimer définitivement ${user.email} ?\nCette action est irréversible. Toutes les données associées seront supprimées.`)) return;
    if (prompt('Tapez SUPPRIMER pour confirmer :') !== 'SUPPRIMER') return;

    // Use RPC function that deletes profile (CASCADE) + auth.users
    const { error } = await supabase.rpc('delete_user_completely', { target_user_id: user.id });
    if (error) {
      console.error('Erreur suppression:', error);
      showToast('error', 'Erreur', error.message);
      return;
    }
    setDrawerOpen(false);
    setSelectedUser(null);
    loadUsers();
    showToast('success', 'Utilisateur supprimé', `${user.email} supprimé définitivement.`);
  };

  const handleCreditAction = async () => {
    if (!creditModal) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) return showToast('warning', 'Montant invalide');

    const { user, mode } = creditModal;
    const newBalance = mode === 'add' ? user.credits + amount : Math.max(0, user.credits - amount);

    await supabase.from('profiles').update({ credits: newBalance, updated_at: new Date().toISOString() }).eq('id', user.id);

    // Log transaction
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: mode === 'add' ? amount : -amount,
      transaction_type: mode === 'add' ? 'admin_grant' : 'admin_deduction',
      description: creditReason || (mode === 'add' ? 'Crédits ajoutés par admin' : 'Crédits retirés par admin'),
      balance_after: newBalance,
    });

    // Sync user_credits table
    const { data: uc } = await supabase.from('user_credits').select('balance').eq('user_id', user.id).single();
    if (uc) await supabase.from('user_credits').update({ balance: newBalance }).eq('user_id', user.id);
    else await supabase.from('user_credits').insert({ user_id: user.id, balance: newBalance });

    await loadUsers();
    setCreditModal(null);
    setCreditAmount('');
    setCreditReason('');
  };

  const handleGrantSubscription = async () => {
    if (!subModal) return;
    const days = parseInt(subDuration);
    if (isNaN(days) || days <= 0) return alert('Durée invalide');

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const planInfo = shopPlans.find(p => p.name === subPlan);
    const creditsToAdd = subPlan === 'enterprise'
      ? (parseInt(subCustomCredits) || 0)
      : (planInfo?.credits_amount || 0);

    const { data: existing } = await supabase.from('subscriptions').select('id').eq('user_id', subModal.id).maybeSingle();

    if (existing) {
      await supabase.from('subscriptions').update({
        plan: subPlan,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        payment_method: 'admin_manual',
        auto_renew: subAutoRenew,
        updated_at: new Date().toISOString(),
      }).eq('user_id', subModal.id);
    } else {
      await supabase.from('subscriptions').insert({
        user_id: subModal.id,
        plan: subPlan,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: endDate.toISOString(),
        payment_method: 'admin_manual',
        auto_renew: subAutoRenew,
      });
    }

    // Add credits
    if (creditsToAdd > 0) {
      const newBal = subModal.credits + creditsToAdd;
      await supabase.from('profiles').update({ credits: newBal, updated_at: new Date().toISOString() }).eq('id', subModal.id);
      await supabase.from('credit_transactions').insert({
        user_id: subModal.id,
        amount: creditsToAdd,
        transaction_type: 'subscription_grant',
        description: `Abonnement ${subPlan.toUpperCase()} attribué — ${days}j`,
        balance_after: newBal,
      });
    }

    await loadUsers();
    setSubModal(null);
    setSubPlan('essentiel');
    setSubDuration('30');
    setSubAutoRenew(true);
    setSubCustomCredits('');
  };

  const cancelSubscription = async (user: UserProfile) => {
    if (!user.subscription) return;
    if (!confirm(`Annuler l'abonnement ${user.subscription.plan.toUpperCase()} de ${user.email} ?`)) return;
    await supabase.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', user.id);
    loadUsers();
  };

  const expireSubscription = async (user: UserProfile) => {
    if (!user.subscription) return;
    if (!confirm(`Expirer l'abonnement et remettre les crédits de ${user.email} à 0 ?`)) return;
    await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', user.id);
    await supabase.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (user.credits > 0) {
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -user.credits,
        transaction_type: 'admin_expiration',
        description: 'Abonnement expiré par admin — crédits remis à 0',
        balance_after: 0,
      });
    }
    loadUsers();
  };

  const toggleAutoRenew = async (user: UserProfile) => {
    if (!user.subscription) return;
    await supabase.from('subscriptions').update({
      auto_renew: !user.subscription.auto_renew,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
    loadUsers();
  };

  // ─── Export ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const esc = (v: any) => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [
      ['Email', 'Nom', 'Téléphone', 'Entreprise', 'Type', 'Crédits', 'Plan', 'Statut abo', 'Expiration', 'Vérifié', 'Admin', 'Inscription'].join(','),
      ...filteredUsers.map(u => [
        esc(u.email), esc(u.full_name), esc(u.phone), esc(u.company_name),
        u.user_type || 'client', u.credits,
        u.subscription?.plan || '-', u.subscription?.status || '-',
        u.subscription?.current_period_end ? new Date(u.subscription.current_period_end).toLocaleDateString('fr-FR') : '-',
        u.is_verified ? 'Oui' : 'Non', u.is_admin ? 'Oui' : 'Non',
        new Date(u.created_at).toLocaleDateString('fr-FR'),
      ].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8' }));
    a.download = `utilisateurs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const openUserDrawer = (user: UserProfile) => { setSelectedUser(user); setDrawerOpen(true); };
  const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setSelectedUser(null), 300); };

  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatDateTime = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const getSubStatusLabel = (s?: string) => {
    if (s === 'active') return 'Actif';
    if (s === 'expired') return 'Expiré';
    if (s === 'canceled') return 'Annulé';
    if (s === 'trial') return 'Essai';
    return 'Aucun';
  };

  const getDaysRemaining = (end?: string | null) => {
    if (!end) return null;
    const diff = new Date(end).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
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
            <Users className="w-8 h-8 text-teal-500" />
            Gestion Utilisateurs
          </h1>
          <p className="text-slate-500 mt-1">
            {stats.total} comptes · {stats.totalCredits} crédits · {stats.activeSubs} abonnements actifs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className={`p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition ${refreshing ? 'animate-spin' : ''}`} title="Actualiser">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/25 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Users, gradient: 'from-slate-600 to-slate-700' },
          { label: 'Crédits', value: stats.totalCredits, icon: CreditCard, gradient: 'from-amber-500 to-orange-500' },
          { label: 'Avec crédits', value: stats.withCredits, icon: Plus, gradient: 'from-blue-500 to-cyan-500' },
          { label: 'Abo. actifs', value: stats.activeSubs, icon: Package, gradient: 'from-emerald-500 to-green-600' },
          { label: 'Expirés', value: stats.expiredSubs, icon: Clock, gradient: 'from-red-500 to-pink-500' },
          { label: 'Admins', value: stats.admins, icon: Shield, gradient: 'from-purple-500 to-indigo-500' },
          { label: 'Vérifiés', value: stats.verified, icon: BadgeCheck, gradient: 'from-teal-500 to-cyan-500' },
          { label: 'Chauffeurs', value: stats.drivers, icon: MapPin, gradient: 'from-sky-500 to-blue-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:shadow-md transition-all group">
            <div className={`p-2 bg-gradient-to-br ${c.gradient} rounded-lg w-fit shadow-sm mb-2`}>
              <c.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-slate-900">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, entreprise, téléphone, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-sm"
            />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm min-w-[130px]">
            <option value="all">Tous plans</option>
            {shopPlans.map(p => <option key={p.name} value={p.name}>{p.name.toUpperCase()}</option>)}
            <option value="none">Sans plan actif</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous types</option>
            <option value="client">Clients</option>
            <option value="driver">Chauffeurs</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous statuts</option>
            <option value="verified">Vérifiés</option>
            <option value="admin">Admins</option>
            <option value="with_credits">Avec crédits</option>
            <option value="no_credits">Sans crédits</option>
            <option value="expired">Abo. expiré</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
          <Filter className="w-3 h-3" />
          {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                  <button onClick={() => toggleSort('full_name')} className="flex items-center gap-1 hover:text-teal-600 transition">
                    Utilisateur <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Type</th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                  <button onClick={() => toggleSort('credits')} className="flex items-center gap-1 hover:text-teal-600 transition">
                    Crédits <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Abonnement</th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Badges</th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-teal-600 transition">
                    Inscrit <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Users className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-semibold text-lg">Aucun utilisateur</p>
                    <p className="text-sm text-slate-300 mt-1">Modifiez vos filtres</p>
                  </td>
                </tr>
              )}
              {paginatedUsers.map(user => {
                const daysLeft = getDaysRemaining(user.subscription?.current_period_end);
                return (
                  <tr key={user.id} className="hover:bg-teal-50/30 transition-colors cursor-pointer group" onClick={() => openUserDrawer(user)}>
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{user.full_name || '—'}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</p>
                          {user.company_name && <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{user.company_name}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${user.user_type === 'driver' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {user.user_type === 'driver' ? 'CHAUFFEUR' : 'CLIENT'}
                      </span>
                    </td>

                    {/* Credits */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${user.credits > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {user.credits}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setCreditModal({ user, mode: 'add' })} className="p-1 hover:bg-green-100 rounded-lg transition" title="Ajouter">
                            <Plus className="w-3.5 h-3.5 text-green-600" />
                          </button>
                          <button onClick={() => setCreditModal({ user, mode: 'remove' })} className="p-1 hover:bg-red-100 rounded-lg transition" title="Retirer">
                            <Minus className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Subscription */}
                    <td className="py-3.5 px-4">
                      {user.subscription?.status === 'active' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${PLAN_COLORS[user.subscription.plan] || PLAN_COLORS.free}`}>
                              {user.subscription.plan.toUpperCase()}
                            </span>
                            {user.subscription.auto_renew && (
                              <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          {daysLeft !== null && (
                            <p className={`text-[10px] font-semibold ${daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {daysLeft < 0 ? `Expiré il y a ${-daysLeft}j` : `${daysLeft}j restants`}
                            </p>
                          )}
                        </div>
                      ) : user.subscription?.status === 'expired' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">EXPIRÉ</span>
                      ) : user.subscription?.status === 'canceled' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-600">ANNULÉ</span>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">—</span>
                      )}
                    </td>

                    {/* Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {user.is_admin && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-700">ADMIN</span>}
                        {user.is_verified && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-700">VÉRIFIÉ</span>}
                        {user.fcm_token && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-700">PUSH</span>}
                      </div>
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-slate-600 font-medium">{formatDate(user.created_at)}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openUserDrawer(user)} className="p-1.5 hover:bg-teal-50 rounded-lg transition" title="Détails">
                          <Eye className="w-4 h-4 text-teal-600" />
                        </button>
                        <button onClick={() => toggleAdmin(user)} className={`p-1.5 rounded-lg transition ${user.is_admin ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'hover:bg-slate-100 text-slate-400'}`} title={user.is_admin ? 'Retirer admin' : 'Rendre admin'}>
                          <Shield className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleVerified(user)} className={`p-1.5 rounded-lg transition ${user.is_verified ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'hover:bg-slate-100 text-slate-400'}`} title={user.is_verified ? 'Retirer vérification' : 'Vérifier'}>
                          <BadgeCheck className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteUser(user)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-400 hover:text-red-600" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="font-medium">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredUsers.length)} sur {filteredUsers.length}</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}/page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition text-xs font-bold text-slate-500">1</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn: number;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === pn ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'hover:bg-slate-200 text-slate-600'}`}>{pn}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition text-xs font-bold text-slate-500">{totalPages}</button>
          </div>
        </div>
      </div>

      {/* ─── User Detail Drawer ─────────────────────────────────────────────── */}
      {selectedUser && (
        <>
          <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={closeDrawer} />
          <div className={`fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
            <div className="sticky top-0 bg-white z-10 border-b border-slate-200">
              <div className="flex items-center justify-between p-5">
                <h2 className="text-xl font-black text-slate-900">Profil utilisateur</h2>
                <button onClick={closeDrawer} className="p-2 hover:bg-slate-100 rounded-xl transition">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Identity */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-teal-500/20">
                  {selectedUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedUser.full_name || '—'}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    {selectedUser.is_admin && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">ADMIN</span>}
                    {selectedUser.is_verified && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700">VÉRIFIÉ</span>}
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${selectedUser.user_type === 'driver' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {selectedUser.user_type === 'driver' ? 'CHAUFFEUR' : 'CLIENT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Hash, label: 'ID', value: selectedUser.id.slice(0, 8) + '…', full: selectedUser.id },
                  { icon: Phone, label: 'Téléphone', value: selectedUser.phone || '—' },
                  { icon: Building2, label: 'Entreprise', value: selectedUser.company_name || '—' },
                  { icon: Hash, label: 'SIRET', value: selectedUser.company_siret || '—' },
                  { icon: MapPin, label: 'Ville', value: selectedUser.base_city || '—' },
                  { icon: Calendar, label: 'Inscrit', value: formatDate(selectedUser.created_at) },
                  { icon: Clock, label: 'Dernière MAJ', value: formatDateTime(selectedUser.updated_at) },
                  { icon: Zap, label: 'Push FCM', value: selectedUser.fcm_token ? 'Activé' : 'Non' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon className="w-3 h-3 text-slate-400" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 truncate" title={item.full || item.value}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Credits Section */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-amber-500" /> Crédits
                  </h4>
                  <span className="text-3xl font-black text-amber-600">{selectedUser.credits}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreditModal({ user: selectedUser, mode: 'add' })}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-600 transition"
                  >
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                  <button
                    onClick={() => setCreditModal({ user: selectedUser, mode: 'remove' })}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 transition"
                  >
                    <Minus className="w-4 h-4" /> Retirer
                  </button>
                </div>
              </div>

              {/* Subscription Section */}
              <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-5 border border-teal-200/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-teal-500" /> Abonnement
                  </h4>
                  {selectedUser.subscription ? (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[selectedUser.subscription.status] || STATUS_COLORS.expired}`}>
                      {getSubStatusLabel(selectedUser.subscription.status)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Aucun</span>
                  )}
                </div>

                {selectedUser.subscription ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Plan</p>
                        <p className="text-sm font-black text-slate-900">{selectedUser.subscription.plan.toUpperCase()}</p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Auto-renew</p>
                        <p className="text-sm font-black text-slate-900">{selectedUser.subscription.auto_renew ? 'Oui' : 'Non'}</p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Début</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(selectedUser.subscription.current_period_start)}</p>
                      </div>
                      <div className="bg-white/60 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Expiration</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(selectedUser.subscription.current_period_end)}</p>
                      </div>
                    </div>

                    {(() => {
                      const dl = getDaysRemaining(selectedUser.subscription.current_period_end);
                      if (dl === null) return null;
                      return (
                        <div className={`p-3 rounded-xl text-center font-bold text-sm ${dl < 0 ? 'bg-red-100 text-red-700' : dl < 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {dl < 0 ? `Expiré depuis ${-dl} jour${-dl > 1 ? 's' : ''}` : `${dl} jour${dl > 1 ? 's' : ''} restant${dl > 1 ? 's' : ''}`}
                        </div>
                      );
                    })()}

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setSubModal(selectedUser)} className="flex-1 flex items-center justify-center gap-1.5 bg-teal-500 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-teal-600 transition">
                        <Edit3 className="w-3.5 h-3.5" /> Modifier
                      </button>
                      <button onClick={() => toggleAutoRenew(selectedUser)} className="flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-yellow-600 transition">
                        <Zap className="w-3.5 h-3.5" /> {selectedUser.subscription.auto_renew ? 'Désact.' : 'Act.'} renew
                      </button>
                      {selectedUser.subscription.status === 'active' && (
                        <>
                          <button onClick={() => cancelSubscription(selectedUser)} className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-orange-600 transition">
                            <X className="w-3.5 h-3.5" /> Annuler
                          </button>
                          <button onClick={() => expireSubscription(selectedUser)} className="flex items-center gap-1.5 bg-red-500 text-white px-3 py-2 rounded-xl font-bold text-xs hover:bg-red-600 transition">
                            <Clock className="w-3.5 h-3.5" /> Expirer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setSubModal(selectedUser)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-4 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition">
                    <Plus className="w-4 h-4" /> Attribuer un abonnement
                  </button>
                )}
              </div>

              {/* Admin Actions */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-purple-500" /> Actions admin
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => toggleAdmin(selectedUser)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${selectedUser.is_admin ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
                    <Shield className="w-4 h-4" /> {selectedUser.is_admin ? 'Retirer admin' : 'Rendre admin'}
                  </button>
                  <button onClick={() => toggleVerified(selectedUser)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${selectedUser.is_verified ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    <BadgeCheck className="w-4 h-4" /> {selectedUser.is_verified ? 'Dé-vérifier' : 'Vérifier'}
                  </button>
                </div>
                <button onClick={() => deleteUser(selectedUser)} className="w-full flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 transition mt-2">
                  <Trash2 className="w-4 h-4" /> Supprimer le compte
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Credit Modal ───────────────────────────────────────────────────── */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setCreditModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              {creditModal.mode === 'add' ? '➕ Ajouter des crédits' : '➖ Retirer des crédits'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">{creditModal.user.email} — Solde actuel: <strong>{creditModal.user.credits}</strong></p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Montant</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  min="1"
                  placeholder="10"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Raison (optionnel)</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  placeholder="Ex: Bonus fidélité, correction erreur..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-sm"
                />
              </div>
              {creditAmount && !isNaN(parseInt(creditAmount)) && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-slate-600">Nouveau solde: <strong className="text-lg">{creditModal.mode === 'add' ? creditModal.user.credits + parseInt(creditAmount) : Math.max(0, creditModal.user.credits - parseInt(creditAmount))}</strong></p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setCreditModal(null); setCreditAmount(''); setCreditReason(''); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
              <button
                onClick={handleCreditAction}
                className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl hover:shadow-lg transition ${creditModal.mode === 'add' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}
              >
                {creditModal.mode === 'add' ? 'Ajouter' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Subscription Modal ─────────────────────────────────────────────── */}
      {subModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setSubModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-1">📦 Gérer l'abonnement</h3>
            <p className="text-sm text-slate-500 mb-4">{subModal.email}</p>

            {subModal.subscription && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-slate-600">Actuel :</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${STATUS_COLORS[subModal.subscription.status] || 'bg-slate-100 text-slate-700'}`}>
                    {getSubStatusLabel(subModal.subscription.status)}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${PLAN_COLORS[subModal.subscription.plan] || PLAN_COLORS.free}`}>
                    {subModal.subscription.plan.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {shopPlans.map(p => (
                    <button
                      key={p.name}
                      onClick={() => setSubPlan(p.name)}
                      className={`p-3 rounded-xl border-2 text-left transition ${subPlan === p.name
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-black text-slate-900 uppercase">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.credits_amount} cr · {p.price}€</p>
                    </button>
                  ))}
                </div>
              </div>

              {subPlan === 'enterprise' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Crédits sur mesure</label>
                  <input type="number" value={subCustomCredits} onChange={e => setSubCustomCredits(e.target.value)} min="0" placeholder="200" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-medium" />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Durée</label>
                <div className="flex gap-2">
                  {[{ d: 7, l: '7j' }, { d: 30, l: '1m' }, { d: 90, l: '3m' }, { d: 180, l: '6m' }, { d: 365, l: '1an' }].map(({ d, l }) => (
                    <button
                      key={d}
                      onClick={() => setSubDuration(String(d))}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition ${subDuration === String(d)
                        ? 'bg-teal-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={subDuration}
                  onChange={e => setSubDuration(e.target.value)}
                  min="1"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium mt-2"
                  placeholder="Ou saisir un nombre de jours..."
                />
              </div>

              <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition">
                <input type="checkbox" checked={subAutoRenew} onChange={e => setSubAutoRenew(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded" />
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-semibold text-slate-700">Renouvellement automatique</span>
              </label>

              {/* Preview */}
              <div className="bg-teal-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-teal-700">Récapitulatif :</p>
                <p className="text-sm text-slate-700">
                  Plan <strong>{subPlan.toUpperCase()}</strong> · {subDuration} jours
                  {(() => {
                    const pi = shopPlans.find(p => p.name === subPlan);
                    const cr = subPlan === 'enterprise' ? (parseInt(subCustomCredits) || 0) : (pi?.credits_amount || 0);
                    return cr > 0 ? ` · +${cr} crédits` : '';
                  })()}
                  {subAutoRenew ? ' · Auto-renew' : ''}
                </p>
                <p className="text-xs text-slate-500">Expire le {new Date(Date.now() + parseInt(subDuration || '30') * 86400000).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setSubModal(null)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
              <button onClick={handleGrantSubscription} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
