import { supabase } from '../lib/supabase';

export interface ContactInvitation {
  id: string;
  user_id: string;
  invited_by: string;
  invited_user_id: string;
  type: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  invitation_status: 'pending' | 'accepted' | 'rejected';
  invitation_sent_at: string;
  invitation_responded_at?: string;
  inviter_name?: string;
  inviter_email?: string;
  inviter_phone?: string;
}

/**
 * Send a contact invitation to another user
 */
export const sendContactInvitation = async (
  inviterId: string,
  invitedUserId: string,
  type: 'customer' | 'driver' | 'supplier',
  name: string,
  email: string,
  phone: string,
  company: string
) => {
  try {
    // Méthode 1: Essayer via la fonction SQL
    const { data, error } = await supabase.rpc('create_contact_invitation', {
      p_inviter_id: inviterId,
      p_invited_user_id: invitedUserId,
      p_contact_type: type,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_company: company
    });

    // Si la fonction RPC fonctionne, retourner le résultat
    if (!error && data) {
      return data;
    }

    // Méthode 2: Fallback - Insertion directe si la fonction n'existe pas (404)
    console.warn('RPC function not found, using direct insert fallback:', error);
    
    // Vérifier si une invitation existe déjà
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', inviterId)
      .eq('invited_user_id', invitedUserId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: 'Invitation déjà envoyée'
      };
    }

    // Créer l'invitation directement
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        user_id: inviterId,
        invited_by: inviterId,
        invited_user_id: invitedUserId,
        type: type,
        name: name,
        email: email,
        phone: phone,
        company: company || '',
        invitation_status: 'pending',
        invitation_sent_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      success: true,
      contact_id: newContact.id,
      message: 'Invitation envoyée avec succès'
    };
  } catch (error) {
    console.error('Error sending contact invitation:', error);
    throw error;
  }
};

/**
 * Get all pending invitations received by the user
 */
export const getReceivedInvitations = async (userId: string): Promise<ContactInvitation[]> => {
  try {
    const { data, error } = await supabase
      .from('contact_invitations_received')
      .select('*')
      .eq('invited_user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting received invitations:', error);
    return [];
  }
};

/**
 * Accept a contact invitation
 */
export const acceptContactInvitation = async (contactId: string, userId: string) => {
  try {
    const { data, error} = await supabase.rpc('accept_contact_invitation', {
      p_contact_id: contactId,
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Reject a contact invitation
 */
export const rejectContactInvitation = async (contactId: string, userId: string) => {
  try {
    const { data, error } = await supabase.rpc('reject_contact_invitation', {
      p_contact_id: contactId,
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    throw error;
  }
};

/**
 * Get count of pending invitations for a user
 */
export const getPendingInvitationsCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('invited_user_id', userId)
      .eq('invitation_status', 'pending');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting invitations count:', error);
    return 0;
  }
};
