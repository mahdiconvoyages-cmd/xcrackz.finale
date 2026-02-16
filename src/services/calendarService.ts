import { supabase } from '../lib/supabase';

export interface CalendarPermission {
  id: string;
  owner_id: string;
  shared_with_id: string;
  permission_level: 'view' | 'edit' | 'full';
  is_active: boolean;
  owner_name?: string;
  shared_with_name?: string;
}

export interface CalendarEvent {
  id: string;
  owner_id: string;
  created_by_id: string | null;
  title: string;
  description: string | null;
  event_type: 'mission' | 'appointment' | 'personal' | 'other';
  start_time: string;
  end_time: string;
  location: string | null;
  mission_id: string | null;
  color: string;
  is_all_day: boolean;
  reminder_minutes: number | null;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface CalendarAccess {
  calendar_owner_id: string;
  calendar_owner_name: string;
  permission_level: 'view' | 'edit' | 'full';
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export async function getMyCalendarPermissions(): Promise<CalendarPermission[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_permissions')
      .select(`
        *,
        owner:profiles!calendar_permissions_owner_id_fkey(id, first_name, last_name, full_name)
      `)
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((perm: any) => ({
      ...perm,
      owner_name: perm.owner?.full_name || `${perm.owner?.first_name} ${perm.owner?.last_name}`,
    }));
  } catch (error) {
    console.error('Error fetching calendar permissions:', error);
    return [];
  }
}

export async function getSharedWithMe(): Promise<CalendarPermission[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('calendar_permissions')
      .select(`
        *,
        owner:profiles!calendar_permissions_owner_id_fkey(id, first_name, last_name, full_name)
      `)
      .eq('shared_with_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((perm: any) => ({
      ...perm,
      owner_name: perm.owner?.full_name || `${perm.owner?.first_name} ${perm.owner?.last_name}`,
    }));
  } catch (error) {
    console.error('Error fetching shared calendars:', error);
    return [];
  }
}

export async function getMySharedPermissions(): Promise<CalendarPermission[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('calendar_permissions')
      .select(`
        *,
        shared:profiles!calendar_permissions_shared_with_id_fkey(id, first_name, last_name, full_name)
      `)
      .eq('owner_id', user.id)
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((perm: any) => ({
      ...perm,
      shared_with_name: perm.shared?.full_name || `${perm.shared?.first_name} ${perm.shared?.last_name}`,
    }));
  } catch (error) {
    console.error('Error fetching my shared permissions:', error);
    return [];
  }
}

export async function shareCalendarWithContact(
  contactId: string,
  permissionLevel: 'view' | 'edit' | 'full' = 'view'
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: contact } = await supabase
      .from('contacts')
      .select('email')
      .eq('id', contactId)
      .single();

    if (!contact) throw new Error('Contact not found');

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', contact.email)
      .single();

    if (!targetUser) throw new Error('User not found for this contact');

    const { error } = await supabase
      .from('calendar_permissions')
      .upsert({
        owner_id: user.id,
        shared_with_id: targetUser.id,
        permission_level: permissionLevel,
        is_active: true,
      }, {
        onConflict: 'owner_id,shared_with_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sharing calendar:', error);
    return false;
  }
}

export async function revokeCalendarAccess(permissionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('calendar_permissions')
      .update({ is_active: false })
      .eq('id', permissionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error revoking calendar access:', error);
    return false;
  }
}

export async function getCalendarEvents(
  ownerId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('owner_id', ownerId)
      .gte('start_time', startDate.toISOString())
      .lte('end_time', endDate.toISOString())
      .order('start_time');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

export async function createCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
): Promise<CalendarEvent | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([{
        ...event,
        created_by_id: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .update(updates)
      .eq('id', eventId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

export async function checkCalendarAvailability(
  ownerId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from('calendar_events')
      .select('id')
      .eq('owner_id', ownerId)
      .neq('status', 'cancelled')
      .neq('status', 'completed')
      .or(`and(start_time.lte.${startTime.toISOString()},end_time.gt.${startTime.toISOString()}),and(start_time.lt.${endTime.toISOString()},end_time.gte.${endTime.toISOString()}),and(start_time.gte.${startTime.toISOString()},end_time.lte.${endTime.toISOString()})`);

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).length === 0;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
}

export async function getContactCalendarAccess(contactId: string): Promise<CalendarAccess | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: contact } = await supabase
      .from('contacts')
      .select('email')
      .eq('id', contactId)
      .single();

    if (!contact) return null;

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name')
      .eq('email', contact.email)
      .single();

    if (!targetUser) return null;

    const { data: permission } = await supabase
      .from('calendar_permissions')
      .select('*')
      .eq('owner_id', targetUser.id)
      .eq('shared_with_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!permission) return null;

    return {
      calendar_owner_id: targetUser.id,
      calendar_owner_name: targetUser.full_name || `${targetUser.first_name} ${targetUser.last_name}`,
      permission_level: permission.permission_level,
      can_view: true,
      can_edit: ['edit', 'full'].includes(permission.permission_level),
      can_delete: permission.permission_level === 'full',
    };
  } catch (error) {
    console.error('Error getting contact calendar access:', error);
    return null;
  }
}
