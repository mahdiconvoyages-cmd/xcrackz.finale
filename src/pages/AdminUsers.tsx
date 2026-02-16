// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
import { Users, Search, Plus, Shield, Trash2, CheckCircle, XCircle, Gift, AlertTriangle, Download, Zap, CreditCard, Package, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserWithCredits {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_admin: boolean;
  is_verified: boolean;
  user_type: string;
  company_name?: string;
  phone?: string;
  banned?: boolean;
  ban_reason?: string;
  banned_at?: string;
  last_sign_in_at?: string;
  credits?: { balance: number } | null;
  subscription?: { status: string; plan: string; current_period_end: string; auto_renew?: boolean } | null;
}

const PLANS_FALLBACK = [
  { name: 'essentiel', credits_amount: 10, price: 10 },
  { name: 'pro', credits_amount: 20, price: 20 },
  { name: 'business', credits_amount: 100, price: 50 },
  { name: 'enterprise', credits_amount: 0, price: 0 },
];

const PLAN_CREDITS: Record<string, number> = {
  free: 0, essentiel: 10, pro: 20, business: 100, enterprise: 0,
};

const PAGE_SIZES = [25, 50, 100];

export default function AdminUsers() {
  const [allUsers, setAllUsers] = useState<UserWithCredits[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [shopPlans, setShopPlans] = useState(PLANS_FALLBACK);

  // Grant modal
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [grantType, setGrantType] = useState<'credits' | 'subscription'>('credits');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantPlan, setGrantPlan] = useState('essentiel');
  const [grantDuration, setGrantDuration] = useState('30');
  const [grantAutoRenew, setGrantAutoRenew] = useState(true);
  const [grantCustomCredits, setGrantCustomCredits] = useState('');

  useEffect(() => {
    loadData();
    const ch = supabase
      .channel('admin-users-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadAllUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => loadAllUsers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadAllUsers(), loadShopPlans()]);
    } finally { setLoading(false); }
  };

  const loadShopPlans = async () => {
    const { data } = await supabase.from('shop_items').select('name, credits_amount, price').eq('item_type', 'subscription').eq('is_active', true).order('display_order');
    setShopPlans(data && data.length > 0 ? data : PLANS_FALLBACK);
  };

  const loadAllUsers = async () => {
    try {
      const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, email, full_name, created_at, is_admin, is_verified, user_type, company_name, phone, banned, ban_reason, banned_at, last_sign_in_at, credits').order('created_at', { ascending: false });
      if (profErr) {
        console.error('❌ Erreur chargement profiles:', profErr);
        throw profErr;
      }
      console.log(`✅ ${profiles?.length || 0} profils chargés`);
      const { data: subs } = await supabase.from('subscriptions').select('user_id, status, plan, current_period_end, auto_renew');
      const subsMap = new Map();
      subs?.forEach(s => subsMap.set(s.user_id, s));
      const users = (profiles || []).map(p => ({ ...p, credits: { balance: p.credits || 0 }, subscription: subsMap.get(p.id) || null }));
      setAllUsers(users);
    } catch (err) {
      console.error('❌ Erreur loadAllUsers, fallback:', err);
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      setAllUsers((data || []).map(u => ({ ...u, credits: { balance: u.credits || 0 }, subscription: null })));
    }
  };

  // Filtering
  const filteredUsers = useMemo(() => {
    let f = allUsers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(u => u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q) || u.company_name?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q));
    }
    if (subscriptionFilter !== 'all') {
      f = subscriptionFilter === 'none'
        ? f.filter(u => !u.subscription || u.subscription.status !== 'active')
        : f.filter(u => u.subscription?.plan === subscriptionFilter && u.subscription?.status === 'active');
    }
    if (userTypeFilter !== 'all') f = f.filter(u => u.user_type === userTypeFilter);
    if (statusFilter === 'verified') f = f.filter(u => u.is_verified);
    else if (statusFilter === 'banned') f = f.filter(u => u.banned);
    else if (statusFilter === 'admin') f = f.filter(u => u.is_admin);
    return f;
  }, [allUsers, searchQuery, subscriptionFilter, userTypeFilter, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => filteredUsers.slice((page - 1) * pageSize, page * pageSize), [filteredUsers, page, pageSize]);
  useEffect(() => { setPage(1); }, [searchQuery, subscriptionFilter, userTypeFilter, statusFilter, pageSize]);

  // Handlers
  const handleToggleAdmin = async (userId: string, cur: boolean) => {
    await supabase.from('profiles').update({ is_admin: !cur }).eq('id', userId);
    loadAllUsers();
  };
  const handleToggleVerification = async (userId: string, cur: boolean) => {
    await supabase.from('profiles').update({ is_verified: !cur }).eq('id', userId);
    loadAllUsers();
  };
  const handleBanUser = async (userId: string, email: string, banned: boolean) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    if (me?.id === userId) return alert('⛔ Vous ne pouvez pas vous bannir vous-même.');
    const reason = banned ? null : prompt(`Raison du bannissement de ${email}:`);
    if (!banned && !reason) return;
    await supabase.from('profiles').update({ banned: !banned, ban_reason: reason, banned_at: banned ? null : new Date().toISOString() }).eq('id', userId);
    loadAllUsers();
  };
  const handleDeleteUser = async (userId: string, email: string) => {
    const { data: { user: me } } = await supabase.auth.getUser();
    if (me?.id === userId) return alert('⛔ Vous ne pouvez pas supprimer votre propre compte.');
    if (!confirm(`⚠️ SUPPRIMER ${email} ?`)) return;
    if (prompt('Tapez "SUPPRIMER" pour confirmer:') !== 'SUPPRIMER') return alert('Annulé');
    await supabase.from('profiles').delete().eq('id', userId);
    loadAllUsers();
  };

  const handleGrantCredits = async () => {
    if (!selectedUser || !grantAmount) return;
    const amount = parseInt(grantAmount);
    if (isNaN(amount) || amount <= 0) return alert('Montant invalide');
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', selectedUser.id).single();
    const cur = (profile as any)?.credits || 0;
    const { error: updateErr } = await supabase.from('profiles').update({ credits: cur + amount }).eq('id', selectedUser.id);
    if (updateErr) { console.error('Erreur ajout crédits:', updateErr); return alert(`❌ Erreur: ${updateErr.message}`); }
    // Legacy sync
    const { data: ex } = await supabase.from('user_credits').select('balance').eq('user_id', selectedUser.id).single();
    if (ex) await supabase.from('user_credits').update({ balance: ex.balance + amount }).eq('user_id', selectedUser.id);
    else await supabase.from('user_credits').insert([{ user_id: selectedUser.id, balance: amount }]);
    await loadAllUsers();
    alert(`✅ ${amount} crédits ajoutés à ${selectedUser.email}`);
    closeGrantModal();
  };

  const handleGrantSubscription = async () => {
    if (!selectedUser || !grantPlan || !grantDuration) return alert('Remplir tous les champs');
    const days = parseInt(grantDuration);
    if (isNaN(days) || days <= 0) return alert('Durée invalide');
    const endDate = new Date(); endDate.setDate(endDate.getDate() + days);
    // Use shopPlans (from DB or fallback) as single source of truth for credits
    const planInfo = shopPlans.find(p => p.name === grantPlan);
    const creditsToAdd = grantPlan === 'enterprise' ? (parseInt(grantCustomCredits) || 0) : (planInfo?.credits_amount || PLAN_CREDITS[grantPlan] || 0);
    const { data: existingSub } = await supabase.from('subscriptions').select('*').eq('user_id', selectedUser.id).maybeSingle();
    const isNew = !existingSub;
    if (existingSub) {
      const { error: updateErr } = await supabase.from('subscriptions').update({ plan: grantPlan, status: 'active', current_period_end: endDate.toISOString(), payment_method: 'manual', auto_renew: grantAutoRenew, updated_at: new Date().toISOString() }).eq('user_id', selectedUser.id);
      if (updateErr) { console.error('Erreur update subscription:', updateErr); return alert(`❌ Erreur mise à jour abonnement: ${updateErr.message}`); }
    } else {
      const { error: insertErr } = await supabase.from('subscriptions').insert({ user_id: selectedUser.id, plan: grantPlan, status: 'active', current_period_start: new Date().toISOString(), current_period_end: endDate.toISOString(), payment_method: 'manual', auto_renew: grantAutoRenew });
      if (insertErr) { console.error('Erreur insert subscription:', insertErr); return alert(`❌ Erreur création abonnement: ${insertErr.message}`); }
    }
    let addedCredits = false;
    if (creditsToAdd > 0) {
      const shouldAdd = isNew || confirm(`Ajouter ${creditsToAdd} crédits en plus du changement de plan ?`);
      if (shouldAdd) {
        const { data: profile } = await supabase.from('profiles').select('credits').eq('id', selectedUser.id).single();
        const { error: credErr } = await supabase.from('profiles').update({ credits: ((profile as any)?.credits || 0) + creditsToAdd }).eq('id', selectedUser.id);
        if (credErr) { console.error('Erreur ajout crédits:', credErr); alert(`⚠️ Abonnement attribué mais erreur crédits: ${credErr.message}`); }
        else addedCredits = true;
      }
    }
    await loadAllUsers();
    alert(`✅ ${grantPlan.toUpperCase()} attribué pour ${days} jours${addedCredits ? ` + ${creditsToAdd} crédits` : ''}${grantAutoRenew ? ' (renouvellement auto)' : ''}`);
    closeGrantModal();
  };

  const handleRemoveCredits = async (user: UserWithCredits) => {
    const amt = prompt(`Retirer combien de crédits à ${user.email} ? (solde: ${user.credits?.balance || 0})`);
    if (!amt) return;
    const n = parseInt(amt);
    if (isNaN(n) || n <= 0) return alert('Montant invalide');
    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
    const cur = (profile as any)?.credits || 0;
    if (cur < n && !confirm(`Solde actuel: ${cur}. Retirer ${n} donnera ${cur - n}. Continuer ?`)) return;
    await supabase.from('profiles').update({ credits: cur - n }).eq('id', user.id);
    await loadAllUsers();
    alert(`✅ ${n} crédits retirés. Nouveau solde: ${cur - n}`);
  };

  const handleCancelSubscription = async (user: UserWithCredits) => {
    if (!user.subscription) return;
    if (!confirm(`Annuler l'abonnement ${user.subscription.plan.toUpperCase()} de ${user.email} ?`)) return;
    await supabase.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', user.id);
    await loadAllUsers();
    alert('✅ Abonnement annulé');
  };

  const handleToggleAutoRenew = async (userId: string, email: string, cur: boolean) => {
    if (!confirm(`${cur ? 'Désactiver' : 'Activer'} le renouvellement auto pour ${email} ?`)) return;
    await supabase.from('subscriptions').update({ auto_renew: !cur, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('status', 'active');
    await loadAllUsers();
  };

  const closeGrantModal = () => {
    setShowGrantModal(false); setSelectedUser(null); setGrantAmount(''); setGrantPlan('essentiel'); setGrantDuration('30'); setGrantAutoRenew(true); setGrantCustomCredits('');
  };

  const csvEscape = (val: any) => {
    const s = String(val ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const exportCSV = () => {
    const csv = [
      ['Email', 'Nom', 'Téléphone', 'Type', 'Crédits', 'Plan', 'Expiration', 'Vérifié', 'Admin', 'Dernière connexion', 'Inscription'].join(','),
      ...filteredUsers.map(u => [csvEscape(u.email), csvEscape(u.full_name), csvEscape(u.phone), csvEscape(u.user_type || 'client'), u.credits?.balance || 0, u.subscription?.plan || 'aucun', u.subscription?.current_period_end ? new Date(u.subscription.current_period_end).toLocaleDateString('fr-FR') : '-', u.is_verified ? 'Oui' : 'Non', u.is_admin ? 'Oui' : 'Non', u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('fr-FR') : 'Jamais', new Date(u.created_at).toLocaleDateString('fr-FR')].join(','))
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" /></div>;

  // Summary stats
  const totalCredits = allUsers.reduce((s, u) => s + (u.credits?.balance || 0), 0);
  const withCredits = allUsers.filter(u => (u.credits?.balance || 0) > 0).length;
  const activeSubs = allUsers.filter(u => u.subscription?.status === 'active').length;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Utilisateurs</h1>
          <p className="text-slate-500 mt-1">{allUsers.length} comptes · {totalCredits} crédits · {activeSubs} abonnements</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Crédits totaux', value: totalCredits, icon: CreditCard, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
          { label: 'Avec crédits', value: withCredits, icon: Users, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50' },
          { label: 'Abonnements actifs', value: activeSubs, icon: Package, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-5 border border-white/80`}>
            <div className={`p-2 bg-gradient-to-br ${c.color} rounded-xl w-fit shadow-sm mb-3`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className={`text-2xl font-black bg-gradient-to-br ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
            <p className="text-xs font-semibold text-slate-600 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-sm" />
          </div>
          <select value={subscriptionFilter} onChange={e => setSubscriptionFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous plans</option>
            {shopPlans.map(p => <option key={p.name} value={p.name}>{p.name.toUpperCase()}</option>)}
            <option value="none">Sans plan</option>
          </select>
          <select value={userTypeFilter} onChange={e => setUserTypeFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous types</option>
            <option value="client">Clients</option>
            <option value="driver">Chauffeurs</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous statuts</option>
            <option value="verified">Vérifiés</option>
            <option value="banned">Bannis</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2">{filteredUsers.length} résultats</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-bold text-xs text-slate-600 uppercase">Utilisateur</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-slate-600 uppercase">Type</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-slate-600 uppercase">Crédits</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-slate-600 uppercase">Plan</th>
                <th className="text-left py-3 px-4 font-bold text-xs text-slate-600 uppercase">Statut</th>
                <th className="text-right py-3 px-4 font-bold text-xs text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-semibold">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-slate-300 mt-1">Modifiez vos filtres ou vérifiez la connexion</p>
                  </td>
                </tr>
              )}
              {paginatedUsers.map(user => (
                <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{user.full_name || 'N/A'}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        {user.company_name && <p className="text-[10px] text-slate-400">{user.company_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700">{user.user_type || 'client'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-black text-slate-900">{user.credits?.balance || 0}</span>
                      <button onClick={() => { setSelectedUser(user); setGrantType('credits'); setShowGrantModal(true); }} className="p-1 hover:bg-green-50 rounded transition" title="Ajouter"><Plus className="w-4 h-4 text-green-600" /></button>
                      <button onClick={() => handleRemoveCredits(user)} className="p-1 hover:bg-red-50 rounded transition" title="Retirer"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {user.subscription?.status === 'active' ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex flex-col">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full w-fit ${
                            user.subscription.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                            user.subscription.plan === 'business' ? 'bg-blue-100 text-blue-700' :
                            user.subscription.plan === 'pro' ? 'bg-teal-100 text-teal-700' :
                            'bg-green-100 text-green-700'
                          }`}>{user.subscription.plan?.toUpperCase()}</span>
                          {user.subscription.current_period_end && (
                            <span className={`text-[10px] mt-0.5 ${new Date(user.subscription.current_period_end) < new Date() ? 'text-red-500 font-bold' : new Date(user.subscription.current_period_end) < new Date(Date.now() + 7 * 86400000) ? 'text-amber-500' : 'text-slate-400'}`}>
                              exp. {new Date(user.subscription.current_period_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleToggleAutoRenew(user.id, user.email, user.subscription?.auto_renew || false)} className={`p-1 rounded transition ${user.subscription?.auto_renew ? 'bg-yellow-50 text-yellow-600' : 'text-slate-300 hover:text-slate-500'}`} title="Auto-renew">
                          <Zap className={`w-3.5 h-3.5 ${user.subscription?.auto_renew ? 'fill-current' : ''}`} />
                        </button>
                        <button onClick={() => { setSelectedUser(user); setGrantType('subscription'); setShowGrantModal(true); }} className="p-1 hover:bg-teal-50 rounded transition" title="Modifier"><Gift className="w-3.5 h-3.5 text-teal-600" /></button>
                        <button onClick={() => handleCancelSubscription(user)} className="p-1 hover:bg-red-50 rounded transition" title="Annuler"><XCircle className="w-3.5 h-3.5 text-red-500" /></button>
                      </div>
                    ) : (
                      <button onClick={() => { setSelectedUser(user); setGrantType('subscription'); setShowGrantModal(true); }} className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Attribuer
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1 flex-wrap">
                      {user.is_admin && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-700">ADMIN</span>}
                      {user.is_verified && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-700">VÉRIFIÉ</span>}
                      {user.banned && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-orange-100 text-orange-700">BANNI</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleToggleAdmin(user.id, user.is_admin)} className={`p-1.5 rounded-lg transition ${user.is_admin ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`} title={user.is_admin ? 'Retirer admin' : 'Admin'}>
                        <Shield className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleVerification(user.id, user.is_verified)} className={`p-1.5 rounded-lg transition ${user.is_verified ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`} title={user.is_verified ? 'Retirer' : 'Vérifier'}>
                        {user.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleBanUser(user.id, user.email, user.banned || false)} className={`p-1.5 rounded-lg transition ${user.banned ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600'}`} title={user.banned ? 'Débannir' : 'Bannir'}>
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id, user.email)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredUsers.length)} sur {filteredUsers.length}</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="ml-2 px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}/page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === pageNum ? 'bg-teal-500 text-white shadow' : 'hover:bg-slate-200 text-slate-600'}`}>{pageNum}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Grant Modal */}
      {showGrantModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              {grantType === 'credits' ? '💰 Ajouter des crédits' : '🎁 Gérer l\'abonnement'}
            </h3>
            <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-1">
              <p className="text-xs text-slate-500">Utilisateur</p>
              <p className="font-bold text-slate-900 text-sm">{selectedUser.email}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                <span>💰 {selectedUser.credits?.balance || 0} crédits</span>
                {selectedUser.subscription?.status === 'active' ? (
                  <span className="text-teal-600 font-semibold">📦 {selectedUser.subscription.plan?.toUpperCase()} — exp. {new Date(selectedUser.subscription.current_period_end).toLocaleDateString('fr-FR')}</span>
                ) : (
                  <span className="text-slate-400">Aucun abonnement</span>
                )}
              </div>
            </div>
            {grantType === 'credits' ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de crédits</label>
                <input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} min="1" placeholder="100" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Plan</label>
                  <select value={grantPlan} onChange={e => setGrantPlan(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium">
                    {shopPlans.map(p => <option key={p.name} value={p.name}>{p.name.toUpperCase()} — {p.credits_amount} crédits ({p.price}€)</option>)}
                  </select>
                </div>
                {grantPlan === 'enterprise' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Crédits sur mesure</label>
                    <input type="number" value={grantCustomCredits} onChange={e => setGrantCustomCredits(e.target.value)} min="0" placeholder="200, 500..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Durée (jours)</label>
                  <input type="number" value={grantDuration} onChange={e => setGrantDuration(e.target.value)} min="1" placeholder="30" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl font-medium" />
                </div>
                <label className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-200 cursor-pointer">
                  <input type="checkbox" checked={grantAutoRenew} onChange={e => setGrantAutoRenew(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded" />
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-semibold text-slate-700">Renouvellement automatique</span>
                </label>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={closeGrantModal} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
              <button onClick={grantType === 'credits' ? handleGrantCredits : handleGrantSubscription} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
