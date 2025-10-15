/**
 * 🛡️ Clara Data Validator - Validation stricte des données
 * 
 * RÈGLE ABSOLUE: Clara ne donne JAMAIS de données moquées
 * Toutes les données doivent exister dans la base de données Supabase
 * 
 * Fonctionnalités:
 * - Validation existence dans DB avant affichage
 * - Interdiction des données fictives/moques
 * - Vérification des permissions utilisateur
 * - Formatage sécurisé des réponses
 * - Détection automatique de données suspectes
 * 
 * AMÉLIORATIONS v2:
 * - Détection de patterns de données moquées
 * - Validation renforcée avec mots suspects
 * - Messages d'erreur clairs pour Clara
 */

import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  data?: any;
  error?: string;
  source: 'database' | 'cache' | 'none';
}

export interface DataQuery {
  table: string;
  filters?: Record<string, any>;
  userId?: string;
  limit?: number;
}

// ============================================
// VALIDATEURS PAR TYPE DE DONNÉES
// ============================================

/**
 * ✅ Valider l'existence d'une mission
 */
export async function validateMission(missionId: string, userId: string): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .or(`user_id.eq.${userId},driver_id.eq.${userId}`)
      .single();

    if (error || !data) {
      return {
        isValid: false,
        error: "❌ Mission introuvable ou accès non autorisé",
        source: 'none'
      };
    }

    return {
      isValid: true,
      data,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur lors de la validation: ${err}`,
      source: 'none'
    };
  }
}

/**
 * ✅ Valider l'existence d'un contact
 */
export async function validateContact(contactEmail: string, userId: string): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_email', contactEmail)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        isValid: false,
        error: "❌ Contact introuvable dans votre liste de contacts",
        source: 'none'
      };
    }

    return {
      isValid: true,
      data,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur lors de la validation: ${err}`,
      source: 'none'
    };
  }
}

/**
 * ✅ Valider l'existence d'un client
 */
export async function validateClient(clientId: string, userId: string): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        isValid: false,
        error: "❌ Client introuvable dans votre base clients",
        source: 'none'
      };
    }

    return {
      isValid: true,
      data,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur lors de la validation: ${err}`,
      source: 'none'
    };
  }
}

/**
 * ✅ Valider l'existence d'un rapport d'inspection
 */
export async function validateInspectionReport(reportId: string, userId: string): Promise<ValidationResult> {
  try {
    // Vérifier dans la table inspections (unifiée)
    const { data: inspectionData, error } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', reportId)
      .single();

    // Si erreur ou pas de données
    if (error || !inspectionData) {
      return {
        isValid: false,
        error: error?.message || "❌ Rapport d'inspection introuvable",
        source: 'none'
      };
    }

    // Vérifier les permissions
    if (inspectionData.user_id !== userId) {
      return {
        isValid: false,
        error: "❌ Accès non autorisé à ce rapport",
        source: 'none'
      };
    }

    return {
      isValid: true,
      data: inspectionData,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur lors de la validation: ${err}`,
      source: 'none'
    };
  }
}

/**
 * ✅ Valider l'existence d'un trajet covoiturage
 */
export async function validateCarpoolTrip(tripId: string): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('carpooling')
      .select('*')
      .eq('id', tripId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return {
        isValid: false,
        error: "❌ Trajet de covoiturage introuvable ou inactif",
        source: 'none'
      };
    }

    return {
      isValid: true,
      data,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur lors de la validation: ${err}`,
      source: 'none'
    };
  }
}

/**
 * ✅ Valider les crédits disponibles
 */
export async function validateCredits(userId: string, requiredCredits: number): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return {
        isValid: false,
        error: "❌ Impossible de vérifier le solde de crédits",
        source: 'none'
      };
    }

    const currentCredits = data.credits || 0;
    const isValid = currentCredits >= requiredCredits;

    return {
      isValid,
      data: {
        current: currentCredits,
        required: requiredCredits,
        sufficient: isValid
      },
      error: isValid ? undefined : `❌ Crédits insuffisants (vous avez ${currentCredits}, il faut ${requiredCredits})`,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur lors de la validation: ${err}`,
      source: 'none'
    };
  }
}

// ============================================
// REQUÊTES GÉNÉRIQUES VALIDÉES
// ============================================

/**
 * 🔍 Récupérer des données de manière sécurisée
 * GARANTIE: Retourne uniquement des données réelles de la DB
 */
export async function getValidatedData(query: DataQuery): Promise<ValidationResult> {
  try {
    let supabaseQuery = supabase.from(query.table).select('*');

    // Appliquer les filtres
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value);
      });
    }

    // Filtrer par utilisateur si spécifié
    if (query.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }

    // Limiter les résultats
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }

    const { data, error } = await supabaseQuery;

    if (error) {
      return {
        isValid: false,
        error: `❌ Erreur lors de la récupération des données: ${error.message}`,
        source: 'none'
      };
    }

    if (!data || data.length === 0) {
      return {
        isValid: false,
        error: "❌ Aucune donnée trouvée",
        source: 'none'
      };
    }

    return {
      isValid: true,
      data,
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur inattendue: ${err}`,
      source: 'none'
    };
  }
}

/**
 * 📊 Compter des enregistrements de manière validée
 */
export async function getValidatedCount(query: DataQuery): Promise<ValidationResult> {
  try {
    let supabaseQuery = supabase.from(query.table).select('*', { count: 'exact', head: true });

    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        supabaseQuery = supabaseQuery.eq(key, value);
      });
    }

    if (query.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }

    const { count, error } = await supabaseQuery;

    if (error) {
      return {
        isValid: false,
        error: `❌ Erreur lors du comptage: ${error.message}`,
        source: 'none'
      };
    }

    return {
      isValid: true,
      data: { count: count || 0 },
      source: 'database'
    };
  } catch (err) {
    return {
      isValid: false,
      error: `Erreur inattendue: ${err}`,
      source: 'none'
    };
  }
}

// ============================================
// FORMATAGE SÉCURISÉ DES RÉPONSES
// ============================================

/**
 * 📝 Formater une réponse pour Clara
 * GARANTIE: Pas de données moquées, seulement des infos réelles
 */
export function formatClaraResponse(validationResult: ValidationResult, _context?: string): string {
  if (!validationResult.isValid) {
    return `❌ ${validationResult.error || 'Données non disponibles'}

💡 **Je ne peux afficher que des informations réelles de votre compte.**
Si cette information devrait exister, vérifiez qu'elle est bien enregistrée dans votre base de données.`;
  }

  return '✅ Données validées et récupérées depuis votre base de données.';
}

/**
 * 🚫 Bloquer les réponses avec données fictives
 */
export function blockMockData(response: string): boolean {
  const mockIndicators = [
    /exemple?/i,
    /fictif/i,
    /test(?!er)/i, // "test" mais pas "tester"
    /demo/i,
    /sample/i,
    /placeholder/i,
    /lorem ipsum/i,
    /xxx/i,
    /\[.*\]/,  // [placeholder]
    /\{.*\}/,  // {placeholder}
    /TODO/i,
    /à définir/i,
    /non renseigné/i,
  ];

  return mockIndicators.some(pattern => pattern.test(response));
}

/**
 * 🔍 Vérifier si une donnée existe avant de la mentionner
 */
export async function checkDataExists(
  table: string,
  field: string,
  value: any,
  userId?: string
): Promise<boolean> {
  try {
    let query = supabase
      .from(table)
      .select('id')
      .eq(field, value);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    return !error && !!data;
  } catch {
    return false;
  }
}

// ============================================
// DÉTECTION DE DONNÉES MOQUÉES (NOUVEAU v2)
// ============================================

/**
 * 🚨 Détecte si des données semblent être moquées/factices
 * INTERDICTION ABSOLUE de retourner des données moquées
 */
export function detectMockData(data: any): {
  isMock: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  if (!data) {
    return { isMock: false, reasons: [] };
  }
  
  const dataStr = JSON.stringify(data).toLowerCase();
  
  // 1. Mots suspects dans les données
  const mockIndicators = [
    'test',
    'mock',
    'fake',
    'example',
    'sample',
    'demo',
    'lorem ipsum',
    'xxx',
    'yyy',
    'zzz',
    'placeholder',
    'dummy',
    'fictif',
    'exemple',
  ];
  
  mockIndicators.forEach(indicator => {
    if (dataStr.includes(indicator)) {
      reasons.push(`Contient le terme suspect: "${indicator}"`);
    }
  });
  
  // 2. Emails suspects
  const suspectEmails = [
    'test@test',
    'example@example',
    'user@example.com',
    'admin@admin',
    'demo@demo',
  ];
  
  suspectEmails.forEach(email => {
    if (dataStr.includes(email)) {
      reasons.push(`Email suspect: ${email}`);
    }
  });
  
  // 3. Patterns suspects dans les IDs
  if (data.id && typeof data.id === 'string') {
    if (/^(test|mock|fake|demo)-/.test(data.id)) {
      reasons.push('ID avec préfixe suspect');
    }
    
    if (/^(111|222|333|999)/.test(data.id)) {
      reasons.push('ID avec pattern répétitif suspect');
    }
  }
  
  // 4. Dates suspectes (année 1970, 2000, 2099)
  if (data.created_at || data.date) {
    const dateStr = data.created_at || data.date;
    if (dateStr.includes('1970') || dateStr.includes('2000') || dateStr.includes('2099')) {
      reasons.push('Date suspecte (année par défaut)');
    }
  }
  
  // 5. Valeurs par défaut suspectes
  if (data.reference && /^(REF|MIS|INS)-0{3,}/.test(data.reference)) {
    reasons.push('Référence avec pattern par défaut');
  }
  
  return {
    isMock: reasons.length > 0,
    reasons,
  };
}

/**
 * 🛡️ Valide les données ET rejette si moquées
 */
export async function validateAndRejectMock(
  query: DataQuery
): Promise<ValidationResult> {
  // 1. Validation normale
  const result = await getValidatedData(query);
  
  if (!result.isValid || !result.data) {
    return result;
  }
  
  // 2. Détection de données moquées
  const mockDetection = detectMockData(result.data);
  
  if (mockDetection.isMock) {
    console.warn('⚠️ [Clara] DONNÉES MOQUÉES DÉTECTÉES:', mockDetection.reasons);
    return {
      isValid: false,
      error: `Données suspectes détectées et rejetées: ${mockDetection.reasons.join(', ')}`,
      source: 'none',
    };
  }
  
  // 3. Données réelles et valides ✅
  return result;
}

/**
 * 📊 Formatte un message d'erreur clair pour Clara
 */
export function formatErrorForClara(validation: ValidationResult): string {
  if (validation.isValid) {
    return '';
  }
  
  if (validation.source === 'none') {
    return "Je n'ai trouvé aucune information correspondante dans votre compte.";
  }
  
  if (validation.error) {
    if (validation.error.includes('suspect')) {
      return "Les données trouvées ne semblent pas valides. Veuillez vérifier votre compte.";
    }
    
    if (validation.error.includes('manquants')) {
      return "Les informations sont incomplètes. Certains détails sont manquants.";
    }
    
    if (validation.error.includes('permission')) {
      return "Vous n'avez pas accès à ces informations.";
    }
    
    return validation.error;
  }
  
  return "Une erreur s'est produite lors de la vérification des données.";
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Validateurs spécifiques
  validateMission,
  validateContact,
  validateClient,
  validateInspectionReport,
  validateCarpoolTrip,
  validateCredits,
  
  // Requêtes génériques
  getValidatedData,
  getValidatedCount,
  
  // Formatage
  formatClaraResponse,
  blockMockData,
  checkDataExists,
  
  // Nouveaux (v2)
  detectMockData,
  validateAndRejectMock,
  formatErrorForClara,
};
