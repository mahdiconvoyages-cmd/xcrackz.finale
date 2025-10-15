/**
 * Service de gestion des mentions légales françaises
 * selon le régime fiscal et l'assujettissement à la TVA
 */

export type VatRegime = 'normal' | 'franchise' | 'micro';

export interface LegalMentionsConfig {
  vatLiable: boolean;
  vatRegime: VatRegime;
  customMentions?: string;
}

/**
 * Textes des mentions légales selon la réglementation française
 */
const LEGAL_MENTIONS_TEMPLATES = {
  // Micro-entreprise (Article 293 B CGI)
  micro: `TVA non applicable - Article 293 B du Code Général des Impôts.
Micro-entrepreneur bénéficiant du régime fiscal de la micro-entreprise.
En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
Aucun escompte en cas de paiement anticipé.`,

  // Franchise en base de TVA (Article 293 B CGI)
  franchise: `TVA non applicable - Article 293 B du Code Général des Impôts (franchise en base de TVA).
En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
Pénalités de retard en cas de paiement tardif : taux BCE + 10 points.
Aucun escompte en cas de paiement anticipé.`,

  // TVA normale - Assujetti
  normalVat: `TVA applicable selon le taux en vigueur.
En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
Pénalités de retard en cas de paiement tardif : taux BCE + 10 points.
Aucun escompte en cas de paiement anticipé.
Règlement par virement bancaire ou chèque.`,

  // TVA normale - Non assujetti (exonération)
  normalNoVat: `TVA non applicable - Prestation de service exonérée.
En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
Aucun escompte en cas de paiement anticipé.`,
};

/**
 * Descriptions des régimes fiscaux pour l'UI
 */
export const VAT_REGIME_INFO = {
  normal: {
    label: 'TVA normale',
    description: 'Entreprise assujettie à la TVA avec taux standard',
    icon: '📊',
  },
  franchise: {
    label: 'Franchise en base TVA',
    description: 'Article 293 B du CGI - Pas de TVA facturée ni récupérée',
    icon: '🏪',
  },
  micro: {
    label: 'Micro-entreprise',
    description: 'Régime simplifié - TVA non applicable (Art. 293 B CGI)',
    icon: '🚀',
  },
};

/**
 * Génère les mentions légales automatiques selon le régime fiscal
 */
export function generateLegalMentions(config: LegalMentionsConfig): string {
  // Si mentions personnalisées, les utiliser
  if (config.customMentions && config.customMentions.trim()) {
    return config.customMentions;
  }

  // Sinon, générer automatiquement selon le régime
  switch (config.vatRegime) {
    case 'micro':
      return LEGAL_MENTIONS_TEMPLATES.micro;

    case 'franchise':
      return LEGAL_MENTIONS_TEMPLATES.franchise;

    case 'normal':
    default:
      return config.vatLiable
        ? LEGAL_MENTIONS_TEMPLATES.normalVat
        : LEGAL_MENTIONS_TEMPLATES.normalNoVat;
  }
}

/**
 * Calcule la TVA selon le régime et le taux
 */
export function calculateVAT(
  subtotal: number,
  config: LegalMentionsConfig,
  taxRate: number = 20
): {
  taxRate: number;
  taxAmount: number;
  total: number;
} {
  // Pas de TVA pour micro-entreprise ou franchise
  if (config.vatRegime === 'micro' || config.vatRegime === 'franchise') {
    return {
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
    };
  }

  // Pas de TVA si non assujetti
  if (!config.vatLiable) {
    return {
      taxRate: 0,
      taxAmount: 0,
      total: subtotal,
    };
  }

  // Calcul TVA normale
  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total = parseFloat((subtotal + taxAmount).toFixed(2));

  return {
    taxRate,
    taxAmount,
    total,
  };
}

/**
 * Vérifie si la TVA doit être affichée/calculée
 */
export function shouldApplyVAT(config: LegalMentionsConfig): boolean {
  return config.vatLiable && config.vatRegime === 'normal';
}

/**
 * Retourne le texte à afficher pour "TVA non applicable"
 */
export function getVATExemptionReason(config: LegalMentionsConfig): string {
  if (config.vatRegime === 'micro') {
    return 'TVA non applicable (Art. 293 B CGI - Micro-entreprise)';
  }

  if (config.vatRegime === 'franchise') {
    return 'TVA non applicable (Art. 293 B CGI - Franchise en base)';
  }

  if (!config.vatLiable) {
    return 'TVA non applicable (Prestation exonérée)';
  }

  return '';
}

/**
 * Valide la configuration TVA
 */
export function validateVATConfig(config: LegalMentionsConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Micro et franchise doivent avoir vatLiable = false logiquement
  if ((config.vatRegime === 'micro' || config.vatRegime === 'franchise') && config.vatLiable) {
    errors.push(
      'Incohérence : Le régime micro-entreprise ou franchise en base implique une non-application de la TVA.'
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Retourne les options de régime fiscal pour un select
 */
export function getVATRegimeOptions() {
  return [
    {
      value: 'normal' as VatRegime,
      label: VAT_REGIME_INFO.normal.label,
      description: VAT_REGIME_INFO.normal.description,
      icon: VAT_REGIME_INFO.normal.icon,
    },
    {
      value: 'franchise' as VatRegime,
      label: VAT_REGIME_INFO.franchise.label,
      description: VAT_REGIME_INFO.franchise.description,
      icon: VAT_REGIME_INFO.franchise.icon,
    },
    {
      value: 'micro' as VatRegime,
      label: VAT_REGIME_INFO.micro.label,
      description: VAT_REGIME_INFO.micro.description,
      icon: VAT_REGIME_INFO.micro.icon,
    },
  ];
}
