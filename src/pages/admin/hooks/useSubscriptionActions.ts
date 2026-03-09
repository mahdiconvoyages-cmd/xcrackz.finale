// @ts-nocheck
import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { showToast } from '../../../components/Toast';
import { UserProfile, ShopPlan } from '../types';

interface GrantSubscriptionParams {
  user: UserProfile;
  plan: string;
  duration: string;
  autoRenew: boolean;
  customCredits: string;
  shopPlans: ShopPlan[];
}

export function useSubscriptionActions(loadUsers: () => Promise<void>) {

  // ─── Admin Role ────────────────────────────────────────────────────────────
  const toggleAdmin = useCallback(async (user: UserProfile) => {
    const me = (await supabase.auth.getUser()).data.user;
    if (me?.id === user.id) return showToast('warning', 'Action impossible', 'Vous ne pouvez pas modifier votre propre rôle admin.');
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
    loadUsers();
  }, [loadUsers]);

  const toggleVerified = useCallback(async (user: UserProfile) => {
    await supabase.from('profiles').update({ is_verified: !user.is_verified }).eq('id', user.id);
    loadUsers();
  }, [loadUsers]);

  // ─── Delete User ──────────────────────────────────────────────────────────
  const deleteUser = useCallback(async (user: UserProfile) => {
    const me = (await supabase.auth.getUser()).data.user;
    if (me?.id === user.id) return showToast('warning', 'Action impossible', 'Vous ne pouvez pas supprimer votre propre compte.');
    if (!confirm(`Supprimer définitivement ${user.email} ?\nCette action est irréversible. Toutes les données associées seront supprimées.`)) return;
    if (prompt('Tapez SUPPRIMER pour confirmer :') !== 'SUPPRIMER') return;

    const { error } = await supabase.rpc('delete_user_completely', { target_user_id: user.id });
    if (error) {
      console.error('Erreur suppression:', error);
      showToast('error', 'Erreur', error.message);
      return false;
    }
    loadUsers();
    showToast('success', 'Utilisateur supprimé', `${user.email} supprimé définitivement.`);
    return true;
  }, [loadUsers]);

  // ─── Credits ──────────────────────────────────────────────────────────────
  const handleCreditAction = useCallback(async (user: UserProfile, mode: 'add' | 'remove', amount: number, reason: string) => {
    if (isNaN(amount) || amount <= 0) return showToast('warning', 'Montant invalide');

    const newBalance = mode === 'add' ? user.credits + amount : Math.max(0, user.credits - amount);

    await supabase.from('profiles').update({ credits: newBalance, updated_at: new Date().toISOString() }).eq('id', user.id);

    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: mode === 'add' ? amount : -amount,
      transaction_type: mode === 'add' ? 'addition' : 'deduction',
      description: reason || (mode === 'add' ? 'Crédits ajoutés par admin' : 'Crédits retirés par admin'),
      balance_after: newBalance,
    });

    const { data: uc } = await supabase.from('user_credits').select('balance').eq('user_id', user.id).maybeSingle();
    if (uc) await supabase.from('user_credits').update({ balance: newBalance }).eq('user_id', user.id);
    else await supabase.from('user_credits').insert({ user_id: user.id, balance: newBalance });

    await loadUsers();
  }, [loadUsers]);

  // ─── Grant Subscription ──────────────────────────────────────────────────
  const handleGrantSubscription = useCallback(async ({ user, plan, duration, autoRenew, customCredits, shopPlans }: GrantSubscriptionParams) => {
    const days = parseInt(duration);
    if (isNaN(days) || days <= 0) {
      showToast('warning', 'Durée invalide', 'Veuillez saisir un nombre de jours valide.');
      return false;
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const planInfo = shopPlans.find(p => p.name === plan);
    const creditsToGrant = plan === 'enterprise'
      ? (parseInt(customCredits) || 0)
      : (planInfo?.credits_amount || 0);

    if (plan === 'enterprise' && creditsToGrant <= 0) {
      showToast('warning', 'Crédits requis', 'Veuillez saisir le nombre de crédits sur mesure pour le plan Enterprise.');
      return false;
    }

    const targetUserId = user.id;
    const targetEmail = user.email;

    // 1. Upsert subscription WITH credits_per_period
    //    The DB trigger assign_credits_for_plan() (SECURITY DEFINER) will handle
    //    setting profiles.credits + user_credits.balance automatically
    const subData = {
      plan,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: endDate.toISOString(),
      payment_method: 'admin_manual',
      auto_renew: autoRenew,
      credits_per_period: creditsToGrant,
      credits_renewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase.from('subscriptions').select('id, plan').eq('user_id', targetUserId).maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase.from('subscriptions').update(subData).eq('user_id', targetUserId);
      if (updateErr) {
        showToast('error', 'Erreur abonnement', updateErr.message);
        return false;
      }
    } else {
      const { error: insertErr } = await supabase.from('subscriptions').insert({ user_id: targetUserId, ...subData });
      if (insertErr) {
        showToast('error', 'Erreur abonnement', insertErr.message);
        return false;
      }
    }

    // 2. Log credit transaction (trigger handles the actual credit sync)
    if (creditsToGrant > 0) {
      await supabase.from('credit_transactions').insert({
        user_id: targetUserId,
        amount: creditsToGrant,
        transaction_type: 'addition',
        description: `Abonnement ${plan.toUpperCase()} attribué par admin — ${days}j — ${creditsToGrant} crédits/mois`,
        balance_after: creditsToGrant,
      });
    }

    // 3. Push notification to target user ONLY
    try {
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: targetUserId,
          title: '🎉 Abonnement activé !',
          message: `Votre abonnement ${plan.toUpperCase()} a été activé pour ${days} jours.${creditsToGrant > 0 ? ` ${creditsToGrant} crédits disponibles.` : ''}`,
          data: { plan, credits: String(creditsToGrant), type: 'subscription' },
        },
      });
    } catch (pushErr) {
      console.warn('Push abonnement échoué (non-bloquant):', pushErr);
    }

    // 4. Persistent notification in DB
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        notification_type: 'system',
        title: '🎉 Abonnement activé !',
        message: `Votre abonnement ${plan.toUpperCase()} a été activé pour ${days} jours.${creditsToGrant > 0 ? ` ${creditsToGrant} crédits disponibles.` : ''}`,
      });
    } catch (notifErr) {
      console.warn('Notification persistante échouée:', notifErr);
    }

    // 5. Referral reward
    if (plan !== 'free') {
      try {
        const { data: rewardResult, error: rewardErr } = await supabase.rpc('grant_referral_reward', {
          p_filleul_id: targetUserId,
          p_reward_amount: 10,
        });

        if (rewardErr) {
          console.error('[PARRAINAGE] RPC échoué:', rewardErr.message);
        } else if (rewardResult?.success) {
          showToast('success', 'Parrainage récompensé',
            `+10 crédits pour ${rewardResult.referrer_name} (parrain) et ${rewardResult.filleul_name} (filleul)`);

          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                userId: rewardResult.referrer_id,
                title: '🎉 +10 Crédits de parrainage !',
                message: `Votre filleul ${rewardResult.filleul_name} a souscrit un abonnement. +10 crédits de récompense !`,
                data: { credits: '10', type: 'referral_reward' },
              },
            });
          } catch (pushErr) {
            console.warn('[PARRAINAGE] Push parrain échoué:', pushErr);
          }
        }
      } catch (refErr) {
        console.error('[PARRAINAGE] ERREUR:', refErr);
      }
    }

    await loadUsers();
    showToast('success', 'Abonnement attribué', `${plan.toUpperCase()} activé pour ${targetEmail} — ${days}j`);
    return true;
  }, [loadUsers]);

  // ─── Cancel / Expire / AutoRenew ─────────────────────────────────────────
  const cancelSubscription = useCallback(async (user: UserProfile) => {
    if (!user.subscription) return;
    if (!confirm(`Annuler l'abonnement ${user.subscription.plan.toUpperCase()} de ${user.email} ?`)) return;
    await supabase.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('user_id', user.id);
    loadUsers();
  }, [loadUsers]);

  const expireSubscription = useCallback(async (user: UserProfile) => {
    if (!user.subscription) return;
    if (!confirm(`Expirer l'abonnement et remettre les crédits de ${user.email} à 0 ?`)) return;
    await supabase.from('subscriptions').update({ status: 'expired', updated_at: new Date().toISOString() }).eq('user_id', user.id);
    await supabase.from('profiles').update({ credits: 0, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (user.credits > 0) {
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -user.credits,
        transaction_type: 'deduction',
        description: 'Abonnement expiré par admin — crédits remis à 0',
        balance_after: 0,
      });
    }
    loadUsers();
  }, [loadUsers]);

  const toggleAutoRenew = useCallback(async (user: UserProfile) => {
    if (!user.subscription) return;
    await supabase.from('subscriptions').update({
      auto_renew: !user.subscription.auto_renew,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);
    loadUsers();
  }, [loadUsers]);

  return {
    toggleAdmin,
    toggleVerified,
    deleteUser,
    handleCreditAction,
    handleGrantSubscription,
    cancelSubscription,
    expireSubscription,
    toggleAutoRenew,
  };
}
