/**
 * Service de prévention de fraude pour l'inscription
 * Version Web - Identique au mobile Flutter
 * 
 * Fonctionnalités :
 * - Device fingerprinting (navigateur)
 * - Détection IP
 * - Vérification blacklist
 * - Score de fraude (0-100)
 * - Logging des tentatives
 */

import { supabase } from '../lib/supabase';

export interface FraudCheckResult {
  fraudScore: number; // 0-100
  isSuspicious: boolean;
  flags: FraudFlag[];
  recommendation: 'allow' | 'manual_review' | 'block';
}

export interface FraudFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
}

export interface SignupAttempt {
  email: string;
  phone?: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  stepReached: number;
  success: boolean;
  failureReason?: string;
}

class FraudPreventionService {
  private deviceFingerprint: string | null = null;
  private userIpAddress: string | null = null;

  /**
   * Génère une empreinte unique du navigateur
   */
  async generateDeviceFingerprint(): Promise<string> {
    if (this.deviceFingerprint) {
      return this.deviceFingerprint;
    }

    const components: string[] = [];

    // User Agent
    components.push(navigator.userAgent);

    // Langue
    components.push(navigator.language);

    // Fuseau horaire
    components.push(String(new Date().getTimezoneOffset()));

    // Résolution écran
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

    // Plugins (si disponible)
    if (navigator.plugins && navigator.plugins.length > 0) {
      const plugins = Array.from(navigator.plugins)
        .map(p => p.name)
        .sort()
        .join(',');
      components.push(plugins);
    }

    // Canvas fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f00';
        ctx.fillRect(0, 0, 100, 50);
        ctx.fillStyle = '#069';
        ctx.fillText('ChecksFleet', 2, 15);
        components.push(canvas.toDataURL());
      }
    } catch (e) {
      // Canvas peut être bloqué par la politique de sécurité
      components.push('canvas-blocked');
    }

    // WebGL fingerprint
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      components.push('webgl-blocked');
    }

    // Platform
    components.push(navigator.platform);

    // Do Not Track
    components.push(String(navigator.doNotTrack));

    // Hardware concurrency (nombre de CPU)
    if (navigator.hardwareConcurrency) {
      components.push(String(navigator.hardwareConcurrency));
    }

    // Device memory (si disponible)
    if ('deviceMemory' in navigator) {
      components.push(String((navigator as any).deviceMemory));
    }

    // Générer hash simple
    const fingerprint = await this.simpleHash(components.join('|'));
    this.deviceFingerprint = fingerprint;
    
    return fingerprint;
  }

  /**
   * Hash simple (non cryptographique mais suffisant pour fingerprinting)
   */
  private async simpleHash(str: string): Promise<string> {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convertir en string hexadécimal
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Récupère l'adresse IP de l'utilisateur
   */
  async getUserIpAddress(): Promise<string> {
    if (this.userIpAddress) {
      return this.userIpAddress;
    }

    try {
      // Utiliser un service gratuit pour obtenir l'IP
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      this.userIpAddress = data.ip;
      return data.ip;
    } catch (error) {
      console.error('Error getting IP:', error);
      // Fallback : utiliser une valeur par défaut
      this.userIpAddress = 'unknown';
      return 'unknown';
    }
  }

  /**
   * Vérifie si un email est jetable/temporaire
   */
  isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail', 'temp-mail', '10minutemail', 'guerrillamail',
      'mailinator', 'throwaway', 'trashmail', 'fakeinbox',
      'yopmail', 'maildrop', 'getairmail', 'temp-mail.org',
      'sharklasers', 'grr.la', 'guerrillamailblock.com'
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.some(d => domain?.includes(d));
  }

  /**
   * Effectue une vérification complète de fraude
   */
  async checkSignupFraud(
    email: string,
    phone?: string,
    siret?: string
  ): Promise<FraudCheckResult> {
    try {
      const deviceFingerprint = await this.generateDeviceFingerprint();
      const ipAddress = await this.getUserIpAddress();

      // Appeler la fonction PostgreSQL
      const { data, error } = await supabase.rpc('check_signup_fraud', {
        p_email: email,
        p_phone: phone || null,
        p_siret: siret || null,
        p_device_fingerprint: deviceFingerprint,
        p_ip_address: ipAddress
      });

      if (error) throw error;

      return {
        fraudScore: data.fraud_score,
        isSuspicious: data.is_suspicious,
        flags: data.flags || [],
        recommendation: data.recommendation
      };
    } catch (error) {
      console.error('Fraud check error:', error);
      // En cas d'erreur, retourner un résultat permissif
      return {
        fraudScore: 0,
        isSuspicious: false,
        flags: [],
        recommendation: 'allow'
      };
    }
  }

  /**
   * Enregistre une tentative d'inscription
   */
  async logSignupAttempt(attempt: SignupAttempt): Promise<void> {
    try {
      const { error } = await supabase
        .from('signup_attempts')
        .insert({
          email: attempt.email,
          phone: attempt.phone,
          device_fingerprint: attempt.deviceFingerprint,
          ip_address: attempt.ipAddress,
          user_agent: attempt.userAgent,
          step_reached: attempt.stepReached,
          success: attempt.success,
          failure_reason: attempt.failureReason
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging signup attempt:', error);
      // Ne pas bloquer l'inscription si le logging échoue
    }
  }

  /**
   * Vérifie si un email est disponible
   */
  async checkEmailAvailable(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('check_email_available', { p_email: email });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  /**
   * Vérifie si un SIRET est disponible
   */
  async checkSiretAvailable(siret: string): Promise<boolean> {
    try {
      const cleaned = siret.replace(/[\s]/g, '');
      
      const { data, error } = await supabase
        .rpc('check_siret_available', { p_siret: cleaned });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error checking SIRET:', error);
      return false;
    }
  }

  /**
   * Obtient le nombre d'utilisations d'un téléphone
   */
  async getPhoneUsageCount(phone: string): Promise<number> {
    try {
      const cleaned = phone.replace(/[\s.\-]/g, '');
      
      const { data, error } = await supabase
        .rpc('check_phone_usage_count', { p_phone: cleaned });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error checking phone:', error);
      return 0;
    }
  }

  /**
   * Calcule un score de fraude local basique
   */
  async calculateLocalFraudScore(
    email: string,
    phone?: string
  ): Promise<number> {
    let score = 0;

    // Email jetable (+50 points)
    if (this.isDisposableEmail(email)) {
      score += 50;
    }

    // Email suspect (test, fake, etc.)
    if (/test|fake|spam|trash/i.test(email)) {
      score += 30;
    }

    // Téléphone réutilisé
    if (phone) {
      const phoneCount = await this.getPhoneUsageCount(phone);
      if (phoneCount >= 3) {
        score += 40;
      } else if (phoneCount >= 1) {
        score += 20;
      }
    }

    return score;
  }

  /**
   * Réinitialise le cache (pour tests)
   */
  resetCache() {
    this.deviceFingerprint = null;
    this.userIpAddress = null;
  }
}

export const fraudPreventionService = new FraudPreventionService();
