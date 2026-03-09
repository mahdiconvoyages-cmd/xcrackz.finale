// @ts-nocheck
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserProfile, SubscriptionInfo, ShopPlan, DEFAULT_SHOP_PLANS } from '../types';

export function useAdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopPlans, setShopPlans] = useState<ShopPlan[]>([]);

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
    else setShopPlans(DEFAULT_SHOP_PLANS);
  };

  const loadUsers = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, phone, company_name, company_siret, user_type, is_admin, is_verified, credits, avatar_url, created_at, updated_at, base_city, onboarding_completed, fcm_token, referral_code, referred_by')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, current_period_start, current_period_end, auto_renew, payment_method, notes');

      const { data: referralStats } = await supabase
        .from('referrals')
        .select('referrer_id, status');

      const referralCountMap = new Map<string, number>();
      referralStats?.forEach(r => {
        const count = referralCountMap.get(r.referrer_id) || 0;
        referralCountMap.set(r.referrer_id, count + 1);
      });

      const subsMap = new Map<string, SubscriptionInfo>();
      subs?.forEach(s => subsMap.set(s.user_id, s));

      const profileMap = new Map<string, string>();
      profiles?.forEach(p => profileMap.set(p.id, p.full_name || p.email));

      setUsers((profiles || []).map(p => ({
        ...p,
        credits: p.credits || 0,
        subscription: subsMap.get(p.id) || null,
        referred_by_name: p.referred_by ? profileMap.get(p.referred_by) || '' : '',
        referral_count: referralCountMap.get(p.id) || 0,
      })));
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setTimeout(() => setRefreshing(false), 500);
  }, [loadUsers]);

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

  // ─── Export ────────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
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
  }, [filteredUsers]);

  const toggleSort = useCallback((col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }, [sortBy]);

  return {
    // Data
    users,
    loading,
    refreshing,
    shopPlans,
    filteredUsers,
    paginatedUsers,
    totalPages,
    stats,

    // Filters
    search, setSearch,
    planFilter, setPlanFilter,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    sortBy, sortDir,
    toggleSort,

    // Pagination
    page, setPage,
    pageSize, setPageSize,

    // Actions
    loadUsers,
    handleRefresh,
    exportCSV,
  };
}
