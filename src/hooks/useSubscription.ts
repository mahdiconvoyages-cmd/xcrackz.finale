import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  creditsBalance: number;
  expiresAt: string | null;
  daysRemaining: number | null;
  timeRemainingText: string | null;
  autoRenew: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    creditsBalance: 0,
    expiresAt: null,
    daysRemaining: null,
    timeRemainingText: null,
    autoRenew: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setStatus({
        hasActiveSubscription: false,
        creditsBalance: 0,
        expiresAt: null,
        daysRemaining: null,
        timeRemainingText: null,
        autoRenew: false,
        loading: false,
      });
      return;
    }

    loadSubscriptionStatus();
  }, [user]);

  const loadSubscriptionStatus = async () => {
    try {
      // Charger crédits depuis profiles (source unique) ET abonnement en parallèle
      const [creditsResult, subscriptionResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('credits')
          .eq('id', user!.id)
          .single(),
        supabase
          .from('subscriptions')
          .select('status, plan, current_period_end, auto_renew')
          .eq('user_id', user!.id)
          .maybeSingle()
      ]);

      if (creditsResult.error) {
        console.error('Error fetching credits:', creditsResult.error);
      }

      if (subscriptionResult.error && subscriptionResult.error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionResult.error);
      }

      const creditsBalance = (creditsResult.data as any)?.credits || 0;
      const subscription = subscriptionResult.data as any;

      const now = new Date();
      let expiresAt = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
      
      // Si current_period_end est NULL, l'abonnement n'a pas de date d'expiration fixe
      // (plan free ou abonnement sans période définie) — actif tant qu'il y a des crédits
      const isExpiredByDate = expiresAt ? expiresAt <= now : false;
      
      // Si l'abonnement est expiré par date mais status encore 'active', corriger en DB
      if (isExpiredByDate && subscription?.status === 'active' && user) {
        // Mettre à jour le statut en 'expired' et réinitialiser les crédits
        await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('status', 'active');
        await supabase.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', user.id);
        console.log('⏰ Abonnement expiré détecté — crédits remis à 0');
      }

      const hasActiveSubscription = subscription?.status === 'active' && !isExpiredByDate && creditsBalance > 0;

      let daysRemaining: number | null = null;
      let timeRemainingText: string | null = null;
      if (expiresAt && hasActiveSubscription) {
        const diffMs = expiresAt.getTime() - now.getTime();
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const days = Math.floor(totalMinutes / (60 * 24));
        const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
        const minutes = totalMinutes % 60;
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        // Texte précis: "15j 3h 20min" ou "3h 20min" ou "20min"
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}j`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0 || parts.length === 0) parts.push(`${minutes}min`);
        timeRemainingText = parts.join(' ');
      }

      setStatus({
        hasActiveSubscription,
        plan: subscription?.plan,
        creditsBalance,
        expiresAt: subscription?.current_period_end || null,
        daysRemaining,
        timeRemainingText,
        autoRenew: subscription?.auto_renew || false,
        loading: false,
      });
    } catch (error) {
      console.error('Error loading subscription status:', error);
      setStatus({
        hasActiveSubscription: false,
        creditsBalance: 0,
        expiresAt: null,
        daysRemaining: null,
        timeRemainingText: null,
        autoRenew: false,
        loading: false,
      });
    }
  };

  return status;
}
