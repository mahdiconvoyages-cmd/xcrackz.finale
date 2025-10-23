// Service de gestion des demandes de contact
import { supabase } from '../lib/supabase';

export interface ContactRequest {
  id: string;
  requester_id: string;
  target_email: string;
  target_name?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
}

export interface PendingContactRequest extends ContactRequest {
  requester_email: string;
  requester_first_name?: string;
  requester_last_name?: string;
}

export interface ContactRequestResult {
  success: boolean;
  requestId?: string;
  request?: ContactRequest;
  message?: string;
  error?: string;
}

/**
 * Créer une demande d'ajout de contact
 */
export async function createContactRequest(
  requesterId: string,
  targetEmail: string,
  targetName?: string,
  message?: string
): Promise<ContactRequestResult> {
  try {
    // Vérifier que l'email cible existe dans les profiles
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('email', targetEmail)
      .single();

    if (profileError || !targetProfile) {
      return {
        success: false,
        message: `❌ Aucun utilisateur trouvé avec l'email: ${targetEmail}`,
        error: 'User not found',
      };
    }

    // Utiliser la fonction SQL pour créer la demande
    const { data: requestId, error } = await supabase.rpc('create_contact_request', {
      p_requester_id: requesterId,
      p_target_email: targetEmail,
      p_target_name: targetName || `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.trim(),
      p_message: message || 'Souhaite vous ajouter comme contact',
    });

    if (error) {
      console.error('❌ Erreur création demande contact:', error);
      return { success: false, error: error.message };
    }

    // Récupérer la demande créée
    const { data: request, error: fetchError } = await supabase
      .from('contact_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError) {
      console.error('❌ Erreur récupération demande:', fetchError);
      return { 
        success: true, 
        requestId,
        message: `✅ Demande de contact envoyée à ${targetEmail}`,
      };
    }

    console.log('✅ Demande de contact créée:', request);
    return {
      success: true,
      requestId,
      request: request as ContactRequest,
      message: `✅ Demande de contact envoyée à ${targetEmail}. Vous serez notifié(e) quand ${targetProfile.first_name || 'cette personne'} acceptera votre demande.`,
    };
  } catch (err: any) {
    console.error('❌ Erreur createContactRequest:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Accepter une demande de contact
 */
export async function acceptContactRequest(
  requestId: string,
  userId: string
): Promise<ContactRequestResult> {
  try {
    // Vérifier que la demande existe et concerne cet utilisateur
    const { data: request, error: fetchError } = await supabase
      .from('contact_requests')
      .select('*, profiles!contact_requests_requester_id_fkey(email, first_name, last_name)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return {
        success: false,
        message: '❌ Demande de contact introuvable',
        error: 'Request not found',
      };
    }

    // Vérifier que c'est bien pour cet utilisateur
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (userProfile?.email !== request.target_email) {
      return {
        success: false,
        message: '❌ Cette demande ne vous concerne pas',
        error: 'Unauthorized',
      };
    }

    // Accepter la demande
    const { data: success, error } = await supabase.rpc('accept_contact_request', {
      p_request_id: requestId,
    });

    if (error || !success) {
      console.error('❌ Erreur acceptation demande:', error);
      return { success: false, error: error?.message };
    }

    // Créer le contact dans la table contacts
    // Pour que l'utilisateur qui accepte puisse voir ce nouveau contact dans sa liste
    const requesterName = `${request.profiles.first_name || ''} ${request.profiles.last_name || ''}`.trim() || request.profiles.email;
    
    // Récupérer le profil du requester pour avoir son user_id
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', request.profiles.email)
      .single();
    
    if (requesterProfile) {
      // Créer le contact dans la liste de celui qui accepte
      await supabase.from('contacts').insert({
        user_id: userId,  // Propriétaire de la liste (celui qui accepte)
        invited_user_id: requesterProfile.id,  // ✅ User ID du profil du contact (celui qui a envoyé la demande)
        type: 'customer',
        name: requesterName,
        email: request.profiles.email,
        is_active: true,
      });
    }

    console.log('✅ Demande de contact acceptée et contact créé');
    return {
      success: true,
      message: `✅ Vous avez accepté la demande de ${requesterName}. Le contact a été ajouté à votre liste.`,
    };
  } catch (err: any) {
    console.error('❌ Erreur acceptContactRequest:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Rejeter une demande de contact
 */
export async function rejectContactRequest(
  requestId: string,
  userId: string
): Promise<ContactRequestResult> {
  try {
    // Vérifier que c'est bien pour cet utilisateur
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('contact_requests')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('target_email', userProfile?.email || '');

    if (error) {
      console.error('❌ Erreur rejet demande:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Demande de contact rejetée');
    return {
      success: true,
      message: '❌ Demande de contact rejetée',
    };
  } catch (err: any) {
    console.error('❌ Erreur rejectContactRequest:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Annuler sa propre demande de contact
 */
export async function cancelContactRequest(
  requestId: string,
  userId: string
): Promise<ContactRequestResult> {
  try {
    const { error } = await supabase
      .from('contact_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('requester_id', userId);

    if (error) {
      console.error('❌ Erreur annulation demande:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Demande de contact annulée');
    return {
      success: true,
      message: '❌ Demande de contact annulée',
    };
  } catch (err: any) {
    console.error('❌ Erreur cancelContactRequest:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Obtenir les demandes de contact en attente pour un utilisateur
 */
export async function getPendingContactRequests(
  userId: string
): Promise<{ success: boolean; requests: PendingContactRequest[]; error?: string }> {
  try {
    // Récupérer l'email de l'utilisateur
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (!userProfile) {
      return { success: false, requests: [], error: 'User not found' };
    }

    // Récupérer les demandes en attente
    const { data, error } = await supabase
      .from('pending_contact_requests')
      .select('*')
      .eq('target_email', userProfile.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération demandes:', error);
      return { success: false, requests: [], error: error.message };
    }

    return { success: true, requests: data as PendingContactRequest[] };
  } catch (err: any) {
    console.error('❌ Erreur getPendingContactRequests:', err);
    return { success: false, requests: [], error: err.message };
  }
}

/**
 * Obtenir les demandes envoyées par un utilisateur
 */
export async function getSentContactRequests(
  userId: string
): Promise<{ success: boolean; requests: ContactRequest[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération demandes envoyées:', error);
      return { success: false, requests: [], error: error.message };
    }

    return { success: true, requests: data as ContactRequest[] };
  } catch (err: any) {
    console.error('❌ Erreur getSentContactRequests:', err);
    return { success: false, requests: [], error: err.message };
  }
}

/**
 * Vérifier le statut d'une demande de contact par email
 */
export async function checkContactRequestStatus(
  userId: string,
  targetEmail: string
): Promise<{ success: boolean; status?: string; request?: ContactRequest; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*')
      .eq('requester_id', userId)
      .eq('target_email', targetEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('❌ Erreur vérification statut:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return {
        success: true,
        status: 'none',
        error: 'Aucune demande trouvée',
      };
    }

    return {
      success: true,
      status: data.status,
      request: data as ContactRequest,
    };
  } catch (err: any) {
    console.error('❌ Erreur checkContactRequestStatus:', err);
    return { success: false, error: err.message };
  }
}
