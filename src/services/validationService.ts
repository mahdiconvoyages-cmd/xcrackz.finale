/**
 * Service de validation pour l'inscription intelligente
 * Version Web - Identique au mobile Flutter
 * 
 * Validations :
 * - Email (format + disposable detection)
 * - Téléphone (format français)
 * - SIRET (14 chiffres + checksum Luhn + API INSEE)
 * - Mot de passe (force)
 * - IBAN (format basique)
 */

import { supabase } from '../lib/supabase';

// Liste des domaines d'emails jetables communs
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail', 'temp-mail', '10minutemail', 'guerrillamail', 
  'mailinator', 'throwaway', 'trashmail', 'fakeinbox',
  'yopmail', 'maildrop', 'getairmail', 'temp-mail.org'
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestion?: string;
}

export interface SiretValidationResult extends ValidationResult {
  isFormatValid: boolean;
  isChecksumValid: boolean;
  companyName?: string;
  isActive?: boolean;
}

export interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'medium' | 'strong';
  suggestions: string[];
}

class ValidationService {
  private inseeApiKey: string | null = null;

  /**
   * Configure l'API INSEE (optionnel mais recommandé)
   */
  setInseeApiKey(apiKey: string) {
    this.inseeApiKey = apiKey;
  }

  /**
   * Valide le format d'un email
   */
  validateEmail(email: string): ValidationResult {
    if (!email || email.trim() === '') {
      return { isValid: false, error: 'Email requis' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Format email invalide' };
    }

    // Vérifier si c'est un email jetable
    const domain = email.split('@')[1]?.toLowerCase();
    const isDisposable = DISPOSABLE_EMAIL_DOMAINS.some(d => 
      domain?.includes(d)
    );

    if (isDisposable) {
      return {
        isValid: false,
        error: 'Les emails jetables ne sont pas autorisés',
        suggestion: 'Utilisez une adresse email professionnelle ou personnelle permanente'
      };
    }

    return { isValid: true };
  }

  /**
   * Vérifie si un email est disponible (pas déjà utilisé)
   */
  async checkEmailAvailability(email: string): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase
        .rpc('check_email_available', { p_email: email });

      if (error) throw error;

      if (!data) {
        return {
          isValid: false,
          error: 'Cette adresse email est déjà utilisée'
        };
      }

      return { isValid: true };
    } catch (error: any) {
      console.error('Error checking email:', error);
      return {
        isValid: false,
        error: 'Erreur lors de la vérification de l\'email'
      };
    }
  }

  /**
   * Valide le format d'un numéro de téléphone français
   */
  validatePhone(phone: string): ValidationResult {
    if (!phone || phone.trim() === '') {
      return { isValid: false, error: 'Numéro de téléphone requis' };
    }

    // Enlever les espaces, points, tirets
    const cleaned = phone.replace(/[\s.\-]/g, '');

    // Format français : 06/07 ou +33
    const frenchMobileRegex = /^(?:(?:\+33|0033|0)[67]\d{8})$/;
    
    if (!frenchMobileRegex.test(cleaned)) {
      return {
        isValid: false,
        error: 'Format invalide',
        suggestion: 'Format attendu: 06 12 34 56 78 ou +33 6 12 34 56 78'
      };
    }

    return { isValid: true };
  }

  /**
   * Formate un numéro de téléphone au format français
   */
  formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s.\-]/g, '');
    
    // Si commence par +33
    if (cleaned.startsWith('+33')) {
      const number = cleaned.substring(3);
      return `+33 ${number[0]} ${number.substring(1, 3)} ${number.substring(3, 5)} ${number.substring(5, 7)} ${number.substring(7)}`;
    }
    
    // Si commence par 0
    if (cleaned.startsWith('0')) {
      return `${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`;
    }

    return phone;
  }

  /**
   * Vérifie combien de fois un téléphone est utilisé
   */
  async checkPhoneUsage(phone: string): Promise<{ count: number; warning?: string }> {
    try {
      const cleaned = phone.replace(/[\s.\-]/g, '');
      
      const { data, error } = await supabase
        .rpc('check_phone_usage_count', { p_phone: cleaned });

      if (error) throw error;

      const count = data || 0;
      
      if (count >= 3) {
        return {
          count,
          warning: 'Ce numéro est associé à plusieurs comptes existants'
        };
      } else if (count >= 1) {
        return {
          count,
          warning: 'Ce numéro est déjà utilisé sur un autre compte'
        };
      }

      return { count: 0 };
    } catch (error) {
      console.error('Error checking phone usage:', error);
      return { count: 0 };
    }
  }

  /**
   * Algorithme de Luhn pour valider le SIRET
   */
  private luhnCheck(siret: string): boolean {
    let sum = 0;
    let shouldDouble = false;

    for (let i = siret.length - 1; i >= 0; i--) {
      let digit = parseInt(siret[i]);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Valide le format et checksum d'un SIRET
   */
  validateSiretFormat(siret: string): Pick<SiretValidationResult, 'isValid' | 'isFormatValid' | 'isChecksumValid' | 'error'> {
    if (!siret || siret.trim() === '') {
      return {
        isValid: false,
        isFormatValid: false,
        isChecksumValid: false,
        error: 'SIRET requis'
      };
    }

    const cleaned = siret.replace(/[\s]/g, '');

    // Doit contenir exactement 14 chiffres
    if (!/^\d{14}$/.test(cleaned)) {
      return {
        isValid: false,
        isFormatValid: false,
        isChecksumValid: false,
        error: 'Le SIRET doit contenir 14 chiffres'
      };
    }

    // Vérifier le checksum Luhn
    const isChecksumValid = this.luhnCheck(cleaned);
    
    if (!isChecksumValid) {
      return {
        isValid: false,
        isFormatValid: true,
        isChecksumValid: false,
        error: 'SIRET invalide (erreur de checksum)'
      };
    }

    return {
      isValid: true,
      isFormatValid: true,
      isChecksumValid: true
    };
  }

  /**
   * Valide un SIRET via l'API INSEE (si configurée)
   */
  async validateSiretWithInsee(siret: string): Promise<SiretValidationResult> {
    const formatCheck = this.validateSiretFormat(siret);
    
    if (!formatCheck.isValid) {
      return { ...formatCheck, isValid: false };
    }

    // Si pas de clé API INSEE, retourner validation format uniquement
    if (!this.inseeApiKey) {
      return {
        ...formatCheck,
        warning: 'Validation SIRET basique (API INSEE non configurée)'
      };
    }

    try {
      const cleaned = siret.replace(/[\s]/g, '');
      
      const response = await fetch(
        `https://api.insee.fr/entreprises/sirene/V3.11/siret/${cleaned}`,
        {
          headers: {
            'Authorization': `Bearer ${this.inseeApiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 404) {
        return {
          ...formatCheck,
          isValid: false,
          error: 'SIRET non trouvé dans la base INSEE'
        };
      }

      if (!response.ok) {
        throw new Error(`INSEE API error: ${response.status}`);
      }

      const data = await response.json();
      const etablissement = data.etablissement;

      return {
        ...formatCheck,
        isValid: true,
        companyName: etablissement.uniteLegale?.denominationUniteLegale || 
                     etablissement.uniteLegale?.prenomUsuelUniteLegale + ' ' + 
                     etablissement.uniteLegale?.nomUniteLegale,
        isActive: etablissement.periodesEtablissement?.[0]?.etatAdministratifEtablissement === 'A'
      };
    } catch (error) {
      console.error('INSEE API error:', error);
      return {
        ...formatCheck,
        warning: 'Impossible de vérifier le SIRET auprès de l\'INSEE'
      };
    }
  }

  /**
   * Vérifie si un SIRET est disponible (pas déjà utilisé)
   */
  async checkSiretAvailability(siret: string): Promise<ValidationResult> {
    try {
      const cleaned = siret.replace(/[\s]/g, '');
      
      const { data, error } = await supabase
        .rpc('check_siret_available', { p_siret: cleaned });

      if (error) throw error;

      if (!data) {
        return {
          isValid: false,
          error: 'Ce SIRET est déjà associé à un compte existant'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error checking SIRET:', error);
      return {
        isValid: false,
        error: 'Erreur lors de la vérification du SIRET'
      };
    }
  }

  /**
   * Formate un SIRET (ajoute espace tous les 3 chiffres)
   */
  formatSiret(siret: string): string {
    const cleaned = siret.replace(/[\s]/g, '');
    return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
  }

  /**
   * Évalue la force d'un mot de passe
   */
  evaluatePasswordStrength(password: string): PasswordStrength {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length === 0) {
      return { score: 0, level: 'weak', suggestions: ['Entrez un mot de passe'] };
    }

    // Longueur (max 40 points)
    score += Math.min(password.length * 3, 40);

    // Contient des minuscules (10 points)
    if (/[a-z]/.test(password)) {
      score += 10;
    } else {
      suggestions.push('Ajoutez des lettres minuscules');
    }

    // Contient des majuscules (10 points)
    if (/[A-Z]/.test(password)) {
      score += 10;
    } else {
      suggestions.push('Ajoutez des lettres majuscules');
    }

    // Contient des chiffres (10 points)
    if (/\d/.test(password)) {
      score += 10;
    } else {
      suggestions.push('Ajoutez des chiffres');
    }

    // Contient des caractères spéciaux (20 points)
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 20;
    } else {
      suggestions.push('Ajoutez des caractères spéciaux (!@#$%...)');
    }

    // Bonus longueur > 12 (10 points)
    if (password.length >= 12) {
      score += 10;
    } else if (password.length < 8) {
      suggestions.push('Utilisez au moins 8 caractères');
    }

    // Déterminer le niveau
    let level: 'weak' | 'medium' | 'strong';
    if (score < 40) {
      level = 'weak';
    } else if (score < 70) {
      level = 'medium';
    } else {
      level = 'strong';
    }

    return { score, level, suggestions };
  }

  /**
   * Valide un IBAN (format basique)
   */
  validateIban(iban: string): ValidationResult {
    if (!iban || iban.trim() === '') {
      return { isValid: true }; // IBAN optionnel
    }

    const cleaned = iban.replace(/[\s]/g, '').toUpperCase();

    // Format IBAN français : FR76 suivi de 23 chiffres
    if (!cleaned.startsWith('FR')) {
      return {
        isValid: false,
        error: 'Seuls les IBAN français (FR) sont acceptés'
      };
    }

    if (cleaned.length !== 27) {
      return {
        isValid: false,
        error: 'IBAN français invalide (doit contenir 27 caractères)'
      };
    }

    if (!/^FR\d{25}$/.test(cleaned)) {
      return {
        isValid: false,
        error: 'Format IBAN invalide'
      };
    }

    return { isValid: true };
  }

  /**
   * Formate un IBAN (ajoute espace tous les 4 caractères)
   */
  formatIban(iban: string): string {
    const cleaned = iban.replace(/[\s]/g, '').toUpperCase();
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }
}

export const validationService = new ValidationService();
