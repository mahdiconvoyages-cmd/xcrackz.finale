// Service de gestion des revenus par mission
import { supabase } from '../lib/supabase';

export interface RevenueLog {
  id: string;
  mission_id: string;
  user_id: string;
  mission_reference: string;
  revenue_type: 'received_mission' | 'assigned_commission';
  amount: number;
  description?: string;
  month_key: string;
  created_at: string;
}

export interface RevenueBreakdown {
  revenue_type: string;
  total_amount: number;
  count_missions: number;
}

export interface MonthlyRevenueResult {
  success: boolean;
  total: number;
  breakdown?: RevenueBreakdown[];
  error?: string;
}

/**
 * Enregistre un revenu de mission (mission reçue à 300€)
 */
export async function logReceivedMissionRevenue(
  missionId: string,
  userId: string,
  missionReference: string,
  amount: number,
  description?: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('log_mission_revenue', {
      p_mission_id: missionId,
      p_user_id: userId,
      p_mission_reference: missionReference,
      p_revenue_type: 'received_mission',
      p_amount: amount,
      p_description: description || `Mission reçue: ${missionReference} - ${amount}€ HT`,
    });

    if (error) {
      console.error('❌ Erreur log revenu mission reçue:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Revenu mission reçue enregistré:', amount, '€');
    return { success: true, logId: data };
  } catch (err: any) {
    console.error('❌ Erreur log_mission_revenue:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Enregistre une commission d'assignation (commission de 100€ gagnée)
 */
export async function logAssignedCommissionRevenue(
  missionId: string,
  userId: string,
  missionReference: string,
  commission: number,
  description?: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('log_mission_revenue', {
      p_mission_id: missionId,
      p_user_id: userId,
      p_mission_reference: missionReference,
      p_revenue_type: 'assigned_commission',
      p_amount: commission,
      p_description: description || `Commission sur mission assignée: ${commission}€ HT`,
    });

    if (error) {
      console.error('❌ Erreur log commission:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Commission enregistrée:', commission, '€');
    return { success: true, logId: data };
  } catch (err: any) {
    console.error('❌ Erreur log_mission_revenue:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtenir le revenu total du mois en cours
 */
export async function getMonthlyRevenue(
  userId: string,
  monthKey?: string
): Promise<MonthlyRevenueResult> {
  try {
    const { data, error } = await supabase.rpc('get_monthly_revenue', {
      p_user_id: userId,
      p_month_key: monthKey || null,
    });

    if (error) {
      console.error('❌ Erreur get_monthly_revenue:', error);
      return { success: false, total: 0, error: error.message };
    }

    const total = Number(data) || 0;
    console.log('💰 Revenu du mois:', total, '€');
    
    return { success: true, total };
  } catch (err: any) {
    console.error('❌ Erreur getMonthlyRevenue:', err);
    return { success: false, total: 0, error: err.message };
  }
}

/**
 * Obtenir le détail des revenus par type (missions reçues vs commissions)
 */
export async function getRevenueBreakdown(
  userId: string,
  monthKey?: string
): Promise<MonthlyRevenueResult> {
  try {
    const { data, error } = await supabase.rpc('get_revenue_breakdown', {
      p_user_id: userId,
      p_month_key: monthKey || null,
    });

    if (error) {
      console.error('❌ Erreur get_revenue_breakdown:', error);
      return { success: false, total: 0, error: error.message };
    }

    const breakdown = data as RevenueBreakdown[];
    const total = breakdown.reduce((sum, item) => sum + Number(item.total_amount), 0);

    console.log('📊 Détail revenus:', breakdown);
    return { success: true, total, breakdown };
  } catch (err: any) {
    console.error('❌ Erreur getRevenueBreakdown:', err);
    return { success: false, total: 0, error: err.message };
  }
}

/**
 * Obtenir les logs de revenus pour un utilisateur
 */
export async function getRevenueLogs(
  userId: string,
  limit: number = 50
): Promise<{ success: boolean; logs: RevenueLog[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('mission_revenue_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erreur récupération logs:', error);
      return { success: false, logs: [], error: error.message };
    }

    return { success: true, logs: data as RevenueLog[] };
  } catch (err: any) {
    console.error('❌ Erreur getRevenueLogs:', err);
    return { success: false, logs: [], error: err.message };
  }
}

/**
 * Mettre à jour une mission avec les montants HT
 */
export async function updateMissionAmounts(
  missionId: string,
  missionTotalHT: number,
  providerAmountHT: number,
  companyCommission: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('missions')
      .update({
        mission_total_ht: missionTotalHT,
        provider_amount_ht: providerAmountHT,
        company_commission: companyCommission,
        updated_at: new Date().toISOString(),
      })
      .eq('id', missionId);

    if (error) {
      console.error('❌ Erreur mise à jour montants mission:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Montants mission mis à jour:', {
      total: missionTotalHT,
      provider: providerAmountHT,
      commission: companyCommission,
    });

    return { success: true };
  } catch (err: any) {
    console.error('❌ Erreur updateMissionAmounts:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Workflow complet: Enregistrer une mission reçue
 * Exemple: Mission reçue à 300€
 */
export async function registerReceivedMission(
  missionId: string,
  userId: string,
  missionReference: string,
  totalAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Mettre à jour la mission
    const updateResult = await updateMissionAmounts(
      missionId,
      totalAmount,
      0, // Pas de prestataire (mission pas encore assignée)
      totalAmount // Toute la mission = revenu pour l'instant
    );

    if (!updateResult.success) {
      return updateResult;
    }

    // 2. Enregistrer le revenu
    const logResult = await logReceivedMissionRevenue(
      missionId,
      userId,
      missionReference,
      totalAmount,
      `Mission reçue: ${totalAmount}€ HT`
    );

    if (!logResult.success) {
      return { success: false, error: logResult.error };
    }

    console.log('✅ Mission reçue enregistrée:', missionReference, '-', totalAmount, '€');
    return { success: true };
  } catch (err: any) {
    console.error('❌ Erreur registerReceivedMission:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Workflow complet: Assigner une mission avec commission
 * Exemple: Mission de 300€, prestataire reçoit 200€, vous gardez 100€ de commission
 */
export async function assignMissionWithCommission(
  missionId: string,
  userId: string,
  missionReference: string,
  missionTotal: number,
  providerAmount: number,
  yourCommission: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Mettre à jour la mission
    const updateResult = await updateMissionAmounts(
      missionId,
      missionTotal,
      providerAmount,
      yourCommission
    );

    if (!updateResult.success) {
      return updateResult;
    }

    // 2. Enregistrer la commission comme revenu
    const logResult = await logAssignedCommissionRevenue(
      missionId,
      userId,
      missionReference,
      yourCommission,
      `Commission sur assignation: ${yourCommission}€ HT (Total: ${missionTotal}€, Prestataire: ${providerAmount}€)`
    );

    if (!logResult.success) {
      return { success: false, error: logResult.error };
    }

    console.log('✅ Mission assignée avec commission:', {
      reference: missionReference,
      total: missionTotal,
      provider: providerAmount,
      commission: yourCommission,
    });

    return { success: true };
  } catch (err: any) {
    console.error('❌ Erreur assignMissionWithCommission:', err);
    return { success: false, error: err.message };
  }
}
