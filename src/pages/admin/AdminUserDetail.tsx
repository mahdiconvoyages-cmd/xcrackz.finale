// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Package, CreditCard, Users, Activity,
  Shield, BadgeCheck, Trash2, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/Toast';
import { UserProfile, SubscriptionInfo, ShopPlan, DEFAULT_SHOP_PLANS } from './types';
import { useSubscriptionActions } from './hooks/useSubscriptionActions';
import UserProfileTab from './tabs/UserProfileTab';
import UserSubscriptionTab from './tabs/UserSubscriptionTab';
import UserCreditsTab from './tabs/UserCreditsTab';
import UserReferralTab from './tabs/UserReferralTab';
import UserActivityTab from './tabs/UserActivityTab';

const TABS = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'subscription', label: 'Abonnement', icon: Package },
  { id: 'credits', label: 'Crédits', icon: CreditCard },
  { id: 'referral', label: 'Parrainage', icon: Users },
  { id: 'activity', label: 'Activité', icon: Activity },
];

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [shopPlans, setShopPlans] = useState<ShopPlan[]>([]);

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, phone, company_name, company_siret, user_type, is_admin, is_verified, credits, avatar_url, created_at, updated_at, base_city, onboarding_completed, fcm_token, referral_code, referred_by')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        showToast('error', 'Utilisateur introuvable');
        navigate('/admin/users');
        return;
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, plan, status, current_period_start, current_period_end, auto_renew, payment_method, notes')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: referralStats } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referrer_id', userId);

      let referred_by_name = '';
      if (profile.referred_by) {
        const { data: referrer } = await supabase.from('profiles').select('full_name, email').eq('id', profile.referred_by).maybeSingle();
        if (referrer) referred_by_name = referrer.full_name || referrer.email;
      }

      setUser({
        ...profile,
        credits: profile.credits || 0,
        subscription: sub || null,
        referred_by_name,
        referral_count: referralStats?.length || 0,
      });
    } catch (err) {
      console.error('Erreur chargement utilisateur:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  const loadShopPlans = async () => {
    const { data } = await supabase.from('shop_items').select('name, credits_amount, price').eq('item_type', 'subscription').eq('is_active', true).order('display_order');
    setShopPlans(data?.length ? data : DEFAULT_SHOP_PLANS);
  };

  useEffect(() => {
    loadUser();
    loadShopPlans();
    const ch = supabase
      .channel(`admin-user-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => loadUser())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}` }, () => loadUser())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadUser]);

  const { toggleAdmin, toggleVerified, deleteUser, handleCreditAction, handleGrantSubscription, cancelSubscription, expireSubscription, toggleAutoRenew } = useSubscriptionActions(loadUser);

  const handleDelete = async () => {
    if (!user) return;
    const deleted = await deleteUser(user);
    if (deleted) navigate('/admin/users');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
    </div>
  );

  if (!user) return (
    <div className="text-center py-20">
      <p className="text-slate-400 text-lg">Utilisateur introuvable</p>
      <button onClick={() => navigate('/admin/users')} className="mt-4 text-teal-600 font-bold hover:underline">← Retour</button>
    </div>
  );

  return (
    <div className="max-w-[1000px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/users')} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-500/20">
              {user.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">{user.full_name || user.email}</h1>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button onClick={loadUser} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition" title="Actualiser">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => toggleAdmin(user)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition ${user.is_admin ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
          >
            <Shield className="w-3.5 h-3.5" /> {user.is_admin ? 'Retirer admin' : 'Admin'}
          </button>
          <button
            onClick={() => toggleVerified(user)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition ${user.is_verified ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          >
            <BadgeCheck className="w-3.5 h-3.5" /> {user.is_verified ? 'Dé-vérifier' : 'Vérifier'}
          </button>
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition">
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'profile' && <UserProfileTab user={user} />}
        {activeTab === 'subscription' && (
          <UserSubscriptionTab
            user={user}
            shopPlans={shopPlans}
            onGrant={handleGrantSubscription}
            onCancel={cancelSubscription}
            onExpire={expireSubscription}
            onToggleAutoRenew={toggleAutoRenew}
          />
        )}
        {activeTab === 'credits' && <UserCreditsTab user={user} onCreditAction={handleCreditAction} />}
        {activeTab === 'referral' && <UserReferralTab user={user} />}
        {activeTab === 'activity' && <UserActivityTab user={user} />}
      </div>
    </div>
  );
}
