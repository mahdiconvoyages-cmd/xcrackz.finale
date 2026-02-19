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
  deductCredits: (amount: number, reason: string, referenceType?: string, referenceId?: string) => Promise<{ success: boolean; error?: string }>;
  hasEnoughCredits: (amount: number) => boolean;
  refreshCredits: () => Promise<void>;
} {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Charger crédits initiaux
  const loadCredits = async () => {
    if (!user) {
      setCredits(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCredits((data as any)?.credits || 0);
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

    const channel = supabase
      .channel(`user_credits_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('💰 Crédits mis à jour (realtime):', payload.new.credits);
          setCredits(payload.new.credits || 0);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime crédits status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Déduire des crédits
  const deductCredits = async (amount: number, reason: string, referenceType?: string, referenceId?: string) => {
    if (!user) {
      return { success: false, error: 'Non connecté' };
    }

    console.log(`💳 Déduction de ${amount} crédit(s) pour: ${reason}`);

    try {
      const { data, error } = await (supabase.rpc as any)('spend_credits_atomic', {
        p_user_id: user.id,
        p_amount: amount,
        p_description: reason,
        p_reference_type: referenceType || null,
        p_reference_id: referenceId || null,
      });

      if (error) {
        console.error('❌ RPC spend_credits_atomic erreur:', error);
        throw error;
      }

      console.log('📊 Réponse RPC spend_credits_atomic:', data);

      if (!data.success) {
        console.error('❌ Déduction refusée:', data.error);
        return { success: false, error: data.error };
      }

      // Mettre à jour localement (realtime fera le reste)
      console.log(`✅ Déduction réussie! Nouveau solde: ${data.new_balance}`);
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
