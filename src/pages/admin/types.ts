// ─── Admin Shared Types & Constants ──────────────────────────────────────────

export interface UserProfile {
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
  referral_code?: string;
  referred_by?: string;
  referred_by_name?: string;
  referral_count?: number;
}

export interface SubscriptionInfo {
  id: string;
  plan: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  auto_renew: boolean;
  payment_method?: string;
  notes?: string;
  credits_per_period?: number;
  credits_renewed_at?: string;
}

export interface ShopPlan {
  name: string;
  credits_amount: number;
  price: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
  profiles?: { email: string; full_name: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const PAGE_SIZES = [25, 50, 100];

export const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700',
  essentiel: 'bg-green-100 text-green-700',
  starter: 'bg-green-100 text-green-700',
  basic: 'bg-green-100 text-green-700',
  pro: 'bg-teal-100 text-teal-700',
  business: 'bg-blue-100 text-blue-700',
  premium: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-red-100 text-red-700',
  canceled: 'bg-orange-100 text-orange-700',
  trial: 'bg-sky-100 text-sky-700',
};

export const DEFAULT_SHOP_PLANS: ShopPlan[] = [
  { name: 'pro', credits_amount: 20, price: 20 },
  { name: 'business', credits_amount: 60, price: 50 },
  { name: 'premium', credits_amount: 150, price: 79.99 },
  { name: 'enterprise', credits_amount: 0, price: 0 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const getSubStatusLabel = (s?: string) => {
  if (s === 'active') return 'Actif';
  if (s === 'expired') return 'Expiré';
  if (s === 'canceled') return 'Annulé';
  if (s === 'trial') return 'Essai';
  return 'Aucun';
};

export const getDaysRemaining = (end?: string | null) => {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
