import { supabase } from '../lib/supabase';

export interface Assignment {
  id: string;
  mission_id: string;
  user_id: string;
  assigned_by: string;
  contact_id: string | null;
  payment_ht: number;
  commission: number;
  notes: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assigned_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AssignmentWithDetails extends Assignment {
  mission?: any;
  assignee?: {
    id: string;
    email: string;
    full_name?: string;
  };
  assigner?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface CreateAssignmentParams {
  mission_id: string;
  user_id: string;
  assigned_by: string;
  payment_ht?: number;
  commission?: number;
  notes?: string;
}

/**
 * Créer une nouvelle assignation de mission
 * RADICAL SOLUTION: contact_id = null, on utilise uniquement user_id (profile.id)
 */
export async function createAssignment(params: CreateAssignmentParams): Promise<{ success: boolean; data?: Assignment; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('mission_assignments')
      .insert([{
        mission_id: params.mission_id,
        user_id: params.user_id,
        assigned_by: params.assigned_by,
        contact_id: null, // 🔥 RADICAL: On n'utilise plus la table contacts
        payment_ht: params.payment_ht || 0,
        commission: params.commission || 0,
        notes: params.notes || null,
        status: 'assigned',
      }])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer toutes les assignations reçues par un utilisateur
 */
export async function getReceivedAssignments(userId: string): Promise<{ success: boolean; data?: AssignmentWithDetails[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('mission_assignments')
      .select(`
        *,
        mission:missions(*),
        assignee:profiles!mission_assignments_user_id_fkey(id, email, full_name),
        assigner:profiles!mission_assignments_assigned_by_fkey(id, email, full_name)
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching received assignments:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer toutes les assignations créées par un utilisateur
 */
export async function getCreatedAssignments(userId: string): Promise<{ success: boolean; data?: AssignmentWithDetails[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('mission_assignments')
      .select(`
        *,
        mission:missions(*),
        assignee:profiles!mission_assignments_user_id_fkey(id, email, full_name),
        assigner:profiles!mission_assignments_assigned_by_fkey(id, email, full_name)
      `)
      .eq('assigned_by', userId)
      .order('assigned_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching created assignments:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer une assignation par ID
 */
export async function getAssignmentById(assignmentId: string): Promise<{ success: boolean; data?: AssignmentWithDetails; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('mission_assignments')
      .select(`
        *,
        mission:missions(*),
        assignee:profiles!mission_assignments_user_id_fkey(id, email, full_name),
        assigner:profiles!mission_assignments_assigned_by_fkey(id, email, full_name)
      `)
      .eq('id', assignmentId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error fetching assignment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mettre à jour le statut d'une assignation
 */
export async function updateAssignmentStatus(
  assignmentId: string, 
  status: Assignment['status']
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('mission_assignments')
      .update(updates)
      .eq('id', assignmentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating assignment status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mettre à jour les informations financières d'une assignation
 */
export async function updateAssignmentPayment(
  assignmentId: string,
  payment_ht: number,
  commission: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('mission_assignments')
      .update({ payment_ht, commission })
      .eq('id', assignmentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating assignment payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Supprimer une assignation (annulation)
 */
export async function deleteAssignment(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('mission_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Réassigner une mission à un autre utilisateur
 * (supprime l'ancienne assignation et en crée une nouvelle)
 */
export async function reassignMission(
  missionId: string,
  newUserId: string,
  assignedBy: string,
  payment_ht?: number,
  commission?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Supprimer l'ancienne assignation
    const { error: deleteError } = await supabase
      .from('mission_assignments')
      .delete()
      .eq('mission_id', missionId);

    if (deleteError) throw deleteError;

    // Créer la nouvelle assignation
    const result = await createAssignment({
      mission_id: missionId,
      user_id: newUserId,
      assigned_by: assignedBy,
      payment_ht,
      commission,
      notes,
    });

    return result;
  } catch (error: any) {
    console.error('Error reassigning mission:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Compter le nombre d'assignations reçues non lues (pour le badge)
 */
export async function getUnreadAssignmentsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('mission_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'assigned'); // Uniquement les nouvelles assignations

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error counting unread assignments:', error);
    return 0;
  }
}
