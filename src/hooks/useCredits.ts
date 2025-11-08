import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CreditInfo {
  credits: number;
  loading: boolean;
}

/**
 * Hook pour suivre les crédits de l'utilisateur en temps réel
 */
export function useCredits(): CreditInfo & {
  deductCredits: (amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  hasEnoughCredits: (amount: number) => boolean;
  refreshCredits: () => Promise<void>;
} {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Charger crédits initiaux
  const loadCredits = async () => {
    if (!user) {
      console.log('⚠️ useCredits: Aucun utilisateur connecté');
      setCredits(0);
      setLoading(false);
      return;
    }

    console.log('🔄 useCredits: Chargement crédits pour user:', user.id);
    
    try {
      // Charger depuis user_credits (table web) ET profiles.credits (fallback)
      const [userCreditsResult, profileResult] = await Promise.all([
        supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('credits')
          .eq('id', user.id)
          .single()
      ]);

      // Priorité à user_credits (système web d'abonnements)
      if (userCreditsResult.data) {
        console.log('✅ useCredits: Crédits depuis user_credits (abonnement web):', userCreditsResult.data.balance);
        setCredits(userCreditsResult.data.balance || 0);
      } else if (profileResult.data) {
        console.log('✅ useCredits: Crédits depuis profiles (système mobile):', profileResult.data.credits);
        setCredits(profileResult.data.credits || 0);
      } else {
        console.log('⚠️ useCredits: Aucun crédit trouvé, défaut à 0');
        setCredits(0);
      }
      
      console.log('💰 useCredits: Crédits finaux =', userCreditsResult.data?.balance || profileResult.data?.credits || 0);
      
    } catch (error) {
      console.error('❌ Erreur chargement crédits:', error);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime
  useEffect(() => {
    loadCredits();

    if (!user) return;

    // Écouter les changements sur user_credits (système web d'abonnements)
    const userCreditsChannel = supabase
      .channel(`user_credits_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('💰 Crédits mis à jour (realtime user_credits):', (payload.new as any)?.balance || (payload.old as any)?.balance);
          if ((payload.new as any)?.balance !== undefined) {
            setCredits((payload.new as any).balance);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime user_credits status:', status);
      });

    // Fallback: écouter aussi profiles.credits
    const profilesChannel = supabase
      .channel(`profiles_credits_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('💰 Crédits mis à jour (realtime profiles):', (payload.new as any)?.credits);
          if ((payload.new as any)?.credits !== undefined) {
            setCredits((payload.new as any).credits);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime profiles status:', status);
      });

    return () => {
      supabase.removeChannel(userCreditsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [user]);

  // Déduire des crédits
  const deductCredits = async (amount: number, reason: string) => {
    if (!user) {
      return { success: false, error: 'Non connecté' };
    }

    try {
      const { data, error } = await supabase.rpc('deduct_credits', {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
      });

      if (error) throw error;

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Mettre à jour localement (realtime fera le reste)
      setCredits(data.new_balance);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur déduction crédits:', error);
      return { success: false, error: error.message };
    }
  };

  // Vérifier si suffisant
  const hasEnoughCredits = (amount: number): boolean => {
    return credits >= amount;
  };

  // Rafraîchir manuellement
  const refreshCredits = async () => {
    setLoading(true);
    await loadCredits();
  };

  return {
    credits,
    loading,
    deductCredits,
    hasEnoughCredits,
    refreshCredits,
  };
}
