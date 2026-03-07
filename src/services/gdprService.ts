import { supabase } from '../lib/supabase';

export const gdprService = {
  async exportUserData(userId: string) {
    try {
      const userData: Record<string, any> = {};

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      userData.profile = profile;

      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId);

      userData.missions = missions;

      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId);

      userData.contacts = contacts;

      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId);

      userData.invoices = invoices;

      const { data: inspections } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('inspector_id', userId);

      userData.inspections = inspections;

      // GPS tracking data
      const { data: gpsTracking } = await supabase
        .from('gps_tracking')
        .select('*')
        .eq('user_id', userId);

      userData.gps_tracking = gpsTracking;

      // Credit transactions
      const { data: creditTransactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId);

      userData.credit_transactions = creditTransactions;

      // Support tickets
      const { data: supportTickets } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', userId);

      userData.support_tickets = supportTickets;

      // Notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      userData.notifications = notifications;

      const blob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CHECKSFLEET-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting data:', error);
      return { success: false, error };
    }
  },

  async requestAccountDeletion(userId: string, reason?: string) {
    try {
      const { error } = await supabase.from('deletion_requests').insert({
        user_id: userId,
        reason: reason || 'User requested account deletion',
        requested_at: new Date().toISOString(),
        status: 'pending',
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error requesting deletion:', error);
      return { success: false, error };
    }
  },

  async updateConsent(userId: string, consents: {
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  }) {
    try {
      const { error } = await supabase
        .from('user_consents')
        .upsert({
          user_id: userId,
          analytics: consents.analytics,
          marketing: consents.marketing,
          functional: consents.functional,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating consent:', error);
      return { success: false, error };
    }
  },

  async getConsentHistory(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_consents')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching consent history:', error);
      return { success: false, error };
    }
  },
};
