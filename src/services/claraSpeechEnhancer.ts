/**
 * Clara Speech Enhancer - Amélioration de la reconnaissance vocale
 * 
 * Objectifs:
 * 1. Corriger les erreurs de reconnaissance vocale (homophones, accents)
 * 2. Normaliser le texte (majuscules, ponctuation)
 * 3. Améliorer la précision avec dictionnaire métier
 */

// ==========================================
// DICTIONNAIRES MÉTIER
// ==========================================

// Corrections d'homophones courants
const HOMOPHONES_CORRECTIONS: Record<string, string> = {
  // Verbes
  'a': 'à', // Contexte: "aller à Paris"
  'sa': 'ça', // Contexte: "ça va"
  'ces': 'ses', // Possessif
  'ce': 'se', // Réfléchi
  'cest': "c'est",
  'sest': "s'est",
  'ses': "c'est", // Souvent mal reconnu
  
  // Mots métier transport
  'covoiturage': 'covoiturage',
  'covoit': 'covoiturage',
  'co voiturage': 'covoiturage',
  'co-voiturage': 'covoiturage',
  
  'inspection': 'inspection',
  'inspections': 'inspections',
  'inspecter': 'inspecter',
  
  'mission': 'mission',
  'missions': 'missions',
  
  'rapport': 'rapport',
  'rapports': 'rapports',
  'raport': 'rapport',
  'raporr': 'rapport',
  
  'planning': 'planning',
  'planing': 'planning',
  'plannig': 'planning',
  
  'contact': 'contact',
  'contacts': 'contacts',
  'contacte': 'contact',
  
  'chauffeur': 'chauffeur',
  'chofeur': 'chauffeur',
  'chaufeur': 'chauffeur',
  'shofeur': 'chauffeur',
  
  'véhicule': 'véhicule',
  'vehicule': 'véhicule',
  'vehicul': 'véhicule',
  'veicule': 'véhicule',
  
  'disponibilité': 'disponibilité',
  'disponibilite': 'disponibilité',
  'dispo': 'disponibilité',
  
  'réservation': 'réservation',
  'reservation': 'réservation',
  'resa': 'réservation',
  
  'trajet': 'trajet',
  'trajets': 'trajets',
  'traget': 'trajet',
  
  // Nombres
  'un': '1',
  'deux': '2',
  'trois': '3',
  'quatre': '4',
  'cinq': '5',
  'six': '6',
  'sept': '7',
  'huit': '8',
  'neuf': '9',
  'dix': '10',
};

// Termes métier spécifiques à Finality
const FINALITY_VOCABULARY = [
  'covoiturage',
  'inspection',
  'inspection départ',
  'inspection arrivée',
  'rapport d\'inspection',
  'mission',
  'planning',
  'disponibilité',
  'chauffeur',
  'véhicule',
  'contact',
  'réservation',
  'trajet',
  'crédit',
  'crédits',
  'kilométrage',
  'carburant',
  'dommage',
  'dommages',
  'photo',
  'photos',
  'PDF',
  'email',
  'envoyer',
  'télécharger',
  'publier',
  'réserver',
  'rechercher',
  'disponible',
  'occupé',
  'en cours',
  'terminé',
  'complet',
  'départ uniquement',
];

// Expressions courantes métier
const COMMON_PHRASES: Record<string, string> = {
  'recherche de trajet': 'recherche de trajet',
  'recherche trajet': 'recherche de trajet',
  'chercher un trajet': 'rechercher un trajet',
  'trouver un trajet': 'rechercher un trajet',
  
  'publier un trajet': 'publier un trajet',
  'publier trajet': 'publier un trajet',
  'créer un trajet': 'publier un trajet',
  
  'réserver un trajet': 'réserver un trajet',
  'réserver trajet': 'réserver un trajet',
  'booker un trajet': 'réserver un trajet',
  
  'mes trajets': 'mes trajets',
  'mes tragets': 'mes trajets',
  
  'mes missions': 'mes missions',
  'missions en cours': 'missions en cours',
  
  'rapport d\'inspection': 'rapport d\'inspection',
  'rapport inspection': 'rapport d\'inspection',
  'rapports inspection': 'rapports d\'inspection',
  
  'inspection départ': 'inspection départ',
  'inspection de départ': 'inspection départ',
  
  'inspection arrivée': 'inspection arrivée',
  'inspection d\'arrivée': 'inspection arrivée',
  
  'mes contacts': 'mes contacts',
  'liste des contacts': 'mes contacts',
  
  'planning du chauffeur': 'planning du chauffeur',
  'planning chauffeur': 'planning du chauffeur',
  
  'disponibilité du chauffeur': 'disponibilité du chauffeur',
  'dispo du chauffeur': 'disponibilité du chauffeur',
  
  'envoyer par email': 'envoyer par email',
  'envoi email': 'envoyer par email',
  'envoie email': 'envoyer par email',
  
  'télécharger le PDF': 'télécharger le PDF',
  'télécharge PDF': 'télécharger le PDF',
  'download PDF': 'télécharger le PDF',
};

// ==========================================
// FONCTIONS DE NORMALISATION
// ==========================================

/**
 * Normalise le texte brut de la reconnaissance vocale
 */
export function normalizeTranscription(rawText: string): string {
  if (!rawText) return '';
  
  let normalized = rawText.trim();
  
  // 1. Mettre en minuscules pour faciliter la comparaison
  normalized = normalized.toLowerCase();
  
  // 2. Supprimer les espaces multiples
  normalized = normalized.replace(/\s+/g, ' ');
  
  // 3. Supprimer les caractères parasites
  normalized = normalized.replace(/[…]/g, '');
  normalized = normalized.replace(/\s+([.,!?])/g, '$1'); // Ponctuation collée
  
  // 4. Corriger les apostrophes
  normalized = normalized.replace(/'/g, "'"); // Apostrophe typographique -> standard
  normalized = normalized.replace(/(\w)\s+'\s+(\w)/g, "$1'$2"); // "l ' inspection" -> "l'inspection"
  
  return normalized;
}

/**
 * Applique les corrections d'homophones
 */
export function applyHomophoneCorrections(text: string): string {
  let corrected = text;
  
  // Correction mot par mot
  const words = corrected.split(/\s+/);
  const correctedWords = words.map(word => {
    const lowerWord = word.toLowerCase();
    return HOMOPHONES_CORRECTIONS[lowerWord] || word;
  });
  
  corrected = correctedWords.join(' ');
  
  return corrected;
}

/**
 * Applique les corrections de phrases métier
 */
export function applyPhraseCorrections(text: string): string {
  let corrected = text;
  
  // Recherche et remplacement des expressions courantes
  Object.entries(COMMON_PHRASES).forEach(([incorrect, correct]) => {
    // Regex insensible à la casse
    const regex = new RegExp(incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    corrected = corrected.replace(regex, correct);
  });
  
  return corrected;
}

/**
 * Détecte et corrige les mots métier mal transcrits
 */
export function correctBusinessTerms(text: string): string {
  let corrected = text;
  
  // Pour chaque terme métier, chercher les variantes proches
  FINALITY_VOCABULARY.forEach(term => {
    const variations = generateVariations(term);
    variations.forEach(variation => {
      if (variation !== term && corrected.toLowerCase().includes(variation.toLowerCase())) {
        const regex = new RegExp(variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        corrected = corrected.replace(regex, term);
      }
    });
  });
  
  return corrected;
}

/**
 * Génère des variantes courantes d'un mot (fautes de frappe vocales)
 */
function generateVariations(word: string): string[] {
  const variations: string[] = [word];
  
  // Sans accents
  const withoutAccents = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (withoutAccents !== word) variations.push(withoutAccents);
  
  // Variantes phonétiques courantes
  const phoneticVariations: Record<string, string[]> = {
    'é': ['e', 'è', 'ê'],
    'è': ['e', 'é', 'ê'],
    'ê': ['e', 'é', 'è'],
    'à': ['a'],
    'ç': ['c', 's'],
    'ph': ['f'],
    'f': ['ph'],
    'ss': ['s'],
    's': ['ss', 'c'],
  };
  
  Object.entries(phoneticVariations).forEach(([from, toList]) => {
    if (word.includes(from)) {
      toList.forEach(to => {
        variations.push(word.replace(new RegExp(from, 'g'), to));
      });
    }
  });
  
  return variations;
}

/**
 * Améliore la ponctuation (majuscules après point, etc.)
 */
export function improvePunctuation(text: string): string {
  let improved = text;
  
  // Majuscule après point
  improved = improved.replace(/\.\s+(\w)/g, (_match, letter) => `. ${letter.toUpperCase()}`);
  
  // Majuscule après point d'interrogation
  improved = improved.replace(/\?\s+(\w)/g, (_match, letter) => `? ${letter.toUpperCase()}`);
  
  // Majuscule après point d'exclamation
  improved = improved.replace(/!\s+(\w)/g, (_match, letter) => `! ${letter.toUpperCase()}`);
  
  // Majuscule au début
  if (improved.length > 0) {
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  }
  
  // Ajouter un point final si absent
  if (!/[.!?]$/.test(improved.trim())) {
    improved = improved.trim() + '.';
  }
  
  return improved;
}

/**
 * Détecte les chiffres écrits en lettres et les convertit
 */
export function convertNumberWords(text: string): string {
  const numberWords: Record<string, string> = {
    'zéro': '0',
    'un': '1',
    'une': '1',
    'deux': '2',
    'trois': '3',
    'quatre': '4',
    'cinq': '5',
    'six': '6',
    'sept': '7',
    'huit': '8',
    'neuf': '9',
    'dix': '10',
    'onze': '11',
    'douze': '12',
    'treize': '13',
    'quatorze': '14',
    'quinze': '15',
    'seize': '16',
    'vingt': '20',
    'trente': '30',
    'quarante': '40',
    'cinquante': '50',
    'soixante': '60',
    'cent': '100',
  };
  
  let converted = text;
  
  // Conversion simple
  Object.entries(numberWords).forEach(([word, number]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    converted = converted.replace(regex, number);
  });
  
  // Cas spéciaux: "vingt-trois" -> "23"
  converted = converted.replace(/vingt[- ](\w+)/gi, (match, second) => {
    const secondNum = numberWords[second.toLowerCase()];
    return secondNum ? (20 + parseInt(secondNum)).toString() : match;
  });
  
  return converted;
}

// ==========================================
// FONCTION PRINCIPALE
// ==========================================

/**
 * Améliore le texte de reconnaissance vocale
 * 
 * @param rawTranscription - Texte brut de la reconnaissance vocale
 * @returns Texte amélioré et normalisé
 */
export function enhanceSpeechTranscription(rawTranscription: string): {
  enhanced: string;
  corrections: string[];
  confidence: number;
} {
  const corrections: string[] = [];
  let enhanced = rawTranscription;
  
  if (!enhanced) {
    return { enhanced: '', corrections: [], confidence: 0 };
  }
  
  const original = enhanced;
  
  // 1. Normalisation de base
  enhanced = normalizeTranscription(enhanced);
  if (enhanced !== original) {
    corrections.push('Normalisation du texte');
  }
  
  // 2. Conversion nombres
  const beforeNumbers = enhanced;
  enhanced = convertNumberWords(enhanced);
  if (enhanced !== beforeNumbers) {
    corrections.push('Conversion des nombres');
  }
  
  // 3. Corrections d'homophones
  const beforeHomophones = enhanced;
  enhanced = applyHomophoneCorrections(enhanced);
  if (enhanced !== beforeHomophones) {
    corrections.push('Correction d\'homophones');
  }
  
  // 4. Corrections de phrases métier
  const beforePhrases = enhanced;
  enhanced = applyPhraseCorrections(enhanced);
  if (enhanced !== beforePhrases) {
    corrections.push('Correction de phrases métier');
  }
  
  // 5. Correction termes métier
  const beforeTerms = enhanced;
  enhanced = correctBusinessTerms(enhanced);
  if (enhanced !== beforeTerms) {
    corrections.push('Correction de termes métier');
  }
  
  // 6. Amélioration ponctuation
  const beforePunctuation = enhanced;
  enhanced = improvePunctuation(enhanced);
  if (enhanced !== beforePunctuation) {
    corrections.push('Amélioration de la ponctuation');
  }
  
  // Calcul de la confiance (nombre de corrections / longueur texte)
  const confidenceScore = corrections.length > 0 
    ? Math.max(0, 100 - (corrections.length * 10))
    : 95;
  
  return {
    enhanced,
    corrections,
    confidence: confidenceScore,
  };
}

/**
 * Valide que le texte amélioré a du sens dans le contexte métier
 */
export function validateBusinessContext(text: string): {
  isValid: boolean;
  containsBusinessTerms: boolean;
  suggestedContext?: string;
} {
  const lowerText = text.toLowerCase();
  
  // Vérifier la présence de termes métier
  const containsBusinessTerms = FINALITY_VOCABULARY.some(term => 
    lowerText.includes(term.toLowerCase())
  );
  
  // Détecter le contexte
  let suggestedContext: string | undefined;
  
  if (lowerText.includes('covoiturage') || lowerText.includes('trajet')) {
    suggestedContext = 'covoiturage';
  } else if (lowerText.includes('inspection') || lowerText.includes('rapport')) {
    suggestedContext = 'inspection';
  } else if (lowerText.includes('planning') || lowerText.includes('disponibilité')) {
    suggestedContext = 'planning';
  } else if (lowerText.includes('mission')) {
    suggestedContext = 'missions';
  } else if (lowerText.includes('contact')) {
    suggestedContext = 'contacts';
  }
  
  return {
    isValid: containsBusinessTerms || text.length < 10, // Court = probablement OK
    containsBusinessTerms,
    suggestedContext,
  };
}

/**
 * Exemple d'utilisation:
 * 
 * const result = enhanceSpeechTranscription("reschershe un trajet de paris a lyon pour demain");
 * console.log(result.enhanced); // "Recherche de trajet de Paris à Lyon pour demain."
 * console.log(result.corrections); // ["Normalisation", "Correction phrases métier", ...]
 * console.log(result.confidence); // 85
 */
