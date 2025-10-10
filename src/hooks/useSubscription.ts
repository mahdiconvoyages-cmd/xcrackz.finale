import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  creditsBalance: number;
  expiresAt: string | null;
  daysRemaining: number | null;
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    creditsBalance: 0,
    expiresAt: null,
    daysRemaining: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        hasActiveSubscription: false,
        creditsBalance: 0,
        expiresAt: null,
        daysRemaining: null,
        loading: false,
      });
      return;
    }

    loadSubscriptionStatus();
  }, [user]);

  const loadSubscriptionStatus = async () => {
    try {
      // Charger crédits ET abonnement en parallèle
      const [creditsResult, subscriptionResult] = await Promise.all([
        supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('subscriptions')
          .select('status, plan, current_period_end')
          .eq('user_id', user!.id)
          .maybeSingle()
      ]);

      if (creditsResult.error && creditsResult.error.code !== 'PGRST116') {
        console.error('Error fetching credits:', creditsResult.error);
      }

      if (subscriptionResult.error && subscriptionResult.error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionResult.error);
      }

      const creditsBalance = creditsResult.data?.balance || 0;
      const subscription = subscriptionResult.data;

      const now = new Date();
      const expiresAt = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
      const hasActiveSubscription = subscription?.status === 'active' && expiresAt ? expiresAt > now : false;

      let daysRemaining = null;
      if (expiresAt && hasActiveSubscription) {
        const diffTime = expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      setStatus({
        hasActiveSubscription,
        plan: subscription?.plan,
        creditsBalance,
        expiresAt: subscription?.current_period_end || null,
        daysRemaining,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setStatus({
        hasActiveSubscription: false,
        creditsBalance: 0,
        expiresAt: null,
        daysRemaining: null,
        loading: false,
      });
    }
  };

  return status;
}
