import { supabase } from '../lib/supabase';

export interface Availability {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  status: 'available' | 'unavailable' | 'partially_available';
  start_time?: string; // HH:MM
  end_time?: string; // HH:MM
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactAvailability {
  contact_id: string;
  viewer_id: string;
  contact_user_id: string;
  contact_name: string;
  contact_email: string;
  contact_type: string;
  has_calendar_access: boolean;
  availability_id?: string;
  date?: string;
  status?: 'available' | 'unavailable' | 'partially_available';
  start_time?: string;
  end_time?: string;
  notes?: string;
}

/**
 * Définir la disponibilité pour une date
 */
export async function setAvailability(
  userId: string,
  date: string,
  status: 'available' | 'unavailable' | 'partially_available',
  startTime?: string,
  endTime?: string,
  notes?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('set_availability', {
      p_user_id: userId,
      p_date: date,
      p_status: status,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
      p_notes: notes || null,
    });

    if (error) throw error;
    return data?.success || false;
  } catch (error) {
    console.error('Error setting availability:', error);
    return false;
  }
}

/**
 * Définir la disponibilité pour une plage de dates
 */
export async function setAvailabilityRange(
  userId: string,
  startDate: string,
  endDate: string,
  status: 'available' | 'unavailable' | 'partially_available',
  startTime?: string,
  endTime?: string,
  notes?: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('set_availability_range', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_status: status,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
      p_notes: notes || null,
    });

    if (error) throw error;
    return data?.days_updated || 0;
  } catch (error) {
    console.error('Error setting availability range:', error);
    return 0;
  }
}

/**
 * Récupérer mes disponibilités pour un mois
 */
export async function getMyAvailabilities(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Availability[]> {
  try {
    const { data, error } = await supabase
      .from('availability_calendar')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting my availabilities:', error);
    return [];
  }
}

/**
 * Récupérer les disponibilités d'un contact
 */
export async function getContactAvailabilities(
  contactUserId: string,
  startDate: Date,
  endDate: Date
): Promise<Availability[]> {
  try {
    const { data, error } = await supabase
      .from('availability_calendar')
      .select('*')
      .eq('user_id', contactUserId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting contact availabilities:', error);
    return [];
  }
}

/**
 * Récupérer les disponibilités de tous mes contacts avec accès
 */
export async function getAllContactsAvailabilities(
  viewerId: string,
  startDate: Date,
  endDate: Date
): Promise<ContactAvailability[]> {
  try {
    const { data, error } = await supabase
      .from('contact_availability')
      .select('*')
      .eq('viewer_id', viewerId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting all contacts availabilities:', error);
    return [];
  }
}

/**
 * Supprimer une disponibilité
 */
export async function deleteAvailability(
  userId: string,
  date: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('delete_availability', {
      p_user_id: userId,
      p_date: date,
    });

    if (error) throw error;
    return data?.success || false;
  } catch (error) {
    console.error('Error deleting availability:', error);
    return false;
  }
}

/**
 * Récupérer la disponibilité pour une date spécifique
 */
export async function getAvailabilityForDate(
  userId: string,
  date: string
): Promise<Availability | null> {
  try {
    const { data, error } = await supabase
      .from('availability_calendar')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting availability for date:', error);
    return null;
  }
}

/**
 * Basculer l'accès aux disponibilités pour un contact
 */
export async function toggleAvailabilityAccess(
  contactId: string,
  hasAccess: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ has_calendar_access: hasAccess })
      .eq('id', contactId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error toggling availability access:', error);
    return false;
  }
}
