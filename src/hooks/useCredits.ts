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
      // MÊME LOGIQUE QUE WEB: utiliser profiles.credits uniquement
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      const creditAmount = (data as any)?.credits || 0;
      console.log('✅ useCredits: Crédits chargés depuis profiles:', creditAmount);
      setCredits(creditAmount);
      
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

    // MÊME LOGIQUE QUE WEB: écouter profiles.credits uniquement
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
          console.log('💰 Crédits mis à jour (realtime profiles):', (payload.new as any)?.credits);
          if ((payload.new as any)?.credits !== undefined) {
            setCredits((payload.new as any).credits);
          }
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
