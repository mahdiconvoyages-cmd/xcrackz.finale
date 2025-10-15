// Service pour gérer les limites de requêtes IA selon l'abonnement
import { supabase } from '../lib/supabase';

export interface AILimitStatus {
  canUseAI: boolean;
  requestsUsed: number;
  requestsLimit: number;
  isUnlimited: boolean;
  plan: string;
  message?: string;
}

// Limites par plan d'abonnement
const AI_LIMITS: Record<string, number> = {
  free: 0,           // Pas d'accès
  starter: 10,       // 10 requêtes/mois
  basic: 20,         // 20 requêtes/mois
  pro: -1,           // Illimité
  business: -1,      // Illimité
  enterprise: -1,    // Illimité
};

/**
 * Vérifier si l'utilisateur peut utiliser l'IA
 */
export async function checkAILimit(userId: string): Promise<AILimitStatus> {
  try {
    // 1. Récupérer le plan de l'utilisateur
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription) {
      return {
        canUseAI: false,
        requestsUsed: 0,
        requestsLimit: 0,
        isUnlimited: false,
        plan: 'free',
        message: '❌ Aucun abonnement actif. Prends au minimum un abonnement Basic pour utiliser Clara ! 💼',
      };
    }

    const plan = subscription.plan.toLowerCase();
    const limit = AI_LIMITS[plan] || 0;

    // 2. Si plan illimité
    if (limit === -1) {
      return {
        canUseAI: true,
        requestsUsed: 0,
        requestsLimit: -1,
        isUnlimited: true,
        plan,
        message: '✅ Accès illimité à Clara ! 🎉',
      };
    }

    // 3. Si plan sans accès (free)
    if (limit === 0) {
      return {
        canUseAI: false,
        requestsUsed: 0,
        requestsLimit: 0,
        isUnlimited: false,
        plan,
        message: '❌ Ton plan gratuit ne permet pas d\'utiliser Clara. Upgrade vers Basic pour débloquer 20 requêtes/mois ! 🚀',
      };
    }

    // 4. Récupérer le nombre de requêtes ce mois
    const { data: requestCount } = await supabase
      .rpc('get_ai_requests_count', { p_user_id: userId });

    const used = requestCount || 0;

    // 5. Vérifier si limite atteinte
    if (used >= limit) {
      return {
        canUseAI: false,
        requestsUsed: used,
        requestsLimit: limit,
        isUnlimited: false,
        plan,
        message: `❌ Tu as atteint ta limite de ${limit} requêtes ce mois-ci. Upgrade vers Pro pour un accès illimité ! 💪`,
      };
    }

    // 6. Utilisateur peut utiliser l'IA
    return {
      canUseAI: true,
      requestsUsed: used,
      requestsLimit: limit,
      isUnlimited: false,
      plan,
      message: `✅ ${limit - used} requêtes restantes ce mois-ci (${used}/${limit} utilisées)`,
    };

  } catch (error) {
    console.error('Error checking AI limit:', error);
    return {
      canUseAI: false,
      requestsUsed: 0,
      requestsLimit: 0,
      isUnlimited: false,
      plan: 'unknown',
      message: '❌ Erreur lors de la vérification de ton abonnement.',
    };
  }
}

/**
 * Incrémenter le compteur de requêtes
 */
export async function incrementAIRequest(userId: string): Promise<number> {
  try {
    const { data: newCount, error } = await supabase
      .rpc('increment_ai_request', { p_user_id: userId });

    if (error) {
      console.error('Error incrementing AI request:', error);
      return 0;
    }

    return newCount || 0;
  } catch (error) {
    console.error('Error incrementing AI request:', error);
    return 0;
  }
}

/**
 * Obtenir le message d'upgrade selon le plan actuel
 */
export function getUpgradeMessage(plan: string): string {
  const messages: Record<string, string> = {
    free: `
🚀 **Débloquer Clara avec un abonnement !**

Pour utiliser Clara, ton assistante IA personnelle, tu as besoin d'un abonnement :

📦 **BASIC** - 20 requêtes/mois
💼 **PRO** - Accès illimité ⭐
🏢 **BUSINESS** - Accès illimité + fonctionnalités avancées
🌟 **ENTERPRISE** - Accès illimité + support premium

👉 **Upgrade maintenant** pour commencer à utiliser Clara !
    `,
    starter: `
⚡ **Upgrade pour plus de requêtes !**

Tu as actuellement le plan **STARTER** (10 requêtes/mois).

Passe au plan supérieur :

📦 **BASIC** - 20 requêtes/mois (+10)
💼 **PRO** - Accès **illimité** ⭐
🏢 **BUSINESS** - Illimité + fonctionnalités avancées
🌟 **ENTERPRISE** - Illimité + support premium

👉 **Upgrade maintenant** !
    `,
    basic: `
💪 **Passe à l'illimité avec Pro !**

Tu as actuellement le plan **BASIC** (20 requêtes/mois).

Passe au **PRO** pour un accès **illimité** à Clara :

💼 **PRO** - Accès illimité ⭐
🏢 **BUSINESS** - Illimité + fonctionnalités avancées
🌟 **ENTERPRISE** - Illimité + support premium

👉 **Upgrade maintenant** !
    `,
  };

  return messages[plan] || messages.free;
}

/**
 * Obtenir les statistiques d'utilisation
 */
export async function getAIUsageStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('ai_requests_usage')
      .select('*')
      .eq('user_id', userId)
      .order('month_key', { ascending: false })
      .limit(6); // 6 derniers mois

    if (error) {
      console.error('Error fetching AI usage stats:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching AI usage stats:', error);
    return [];
  }
}
