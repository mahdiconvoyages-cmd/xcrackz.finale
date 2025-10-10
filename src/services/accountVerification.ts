import { supabase } from '../lib/supabase';

interface ExistingUserCheck {
  exists: boolean;
  userId: string | null;
  matchedBy: 'email' | 'phone' | null;
}

export const accountVerificationService = {
  async checkExistingUser(email: string, phone?: string): Promise<ExistingUserCheck> {
    try {
      const { data, error } = await supabase.rpc('check_existing_user', {
        p_email: email.toLowerCase().trim(),
        p_phone: phone?.trim() || null,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        return {
          exists: result.user_exists,
          userId: result.user_id,
          matchedBy: result.matched_by,
        };
      }

      return {
        exists: false,
        userId: null,
        matchedBy: null,
      };
    } catch (error) {
      console.error('Error checking existing user:', error);
      return {
        exists: false,
        userId: null,
        matchedBy: null,
      };
    }
  },

  async logAccountCreationAttempt(
    email: string,
    phone: string,
    success: boolean,
    errorMessage?: string,
    duplicateDetected: boolean = false,
    existingUserId?: string
  ): Promise<void> {
    try {
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      await supabase.rpc('log_account_creation_attempt', {
        p_email: email.toLowerCase().trim(),
        p_phone: phone.trim(),
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_success: success,
        p_error_message: errorMessage || null,
        p_duplicate_detected: duplicateDetected,
        p_existing_user_id: existingUserId || null,
      });
    } catch (error) {
      console.error('Error logging account creation attempt:', error);
    }
  },

  async detectSuspiciousBehavior(
    email: string,
    phone: string
  ): Promise<void> {
    try {
      const ipAddress = await this.getClientIP();

      await supabase.rpc('detect_suspicious_behavior', {
        p_email: email.toLowerCase().trim(),
        p_phone: phone.trim(),
        p_ip_address: ipAddress,
      });
    } catch (error) {
      console.error('Error detecting suspicious behavior:', error);
    }
  },

  async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  },

  getErrorMessage(matchedBy: 'email' | 'phone' | null): string {
    if (matchedBy === 'email') {
      return 'Un compte existe déjà avec cette adresse email. Veuillez vous connecter ou utiliser une autre adresse.';
    }
    if (matchedBy === 'phone') {
      return 'Un compte existe déjà avec ce numéro de téléphone. Veuillez vous connecter ou utiliser un autre numéro.';
    }
    return 'Un compte existe déjà avec ces informations.';
  },
};
