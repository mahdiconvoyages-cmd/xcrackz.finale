// Clara CRM Integration - Commandes et Intent Recognition
// Intègre les 4 fonctionnalités prioritaires dans ChatAssistant

import { 
  type QuoteParams,
  type PricingGridParams,
  type AnalyticsParams,
  type OptimizePlanningParams
} from './clara-crm-actions';

// ============================================
// INTENT RECOGNITION - Détection intention utilisateur
// ============================================

export interface ClaraIntent {
  type: 'quote' | 'pricing' | 'analytics' | 'planning' | 'unknown';
  confidence: number;
  params: any;
  suggestedAction: string;
}

export function detectIntent(userMessage: string): ClaraIntent {
  const message = userMessage.toLowerCase();

  // 1. GÉNÉRATION DEVIS
  if (
    message.includes('devis') ||
    message.includes('génère') && message.includes('quote') ||
    message.includes('créer') && message.includes('devis') ||
    message.includes('facture') && message.includes('client')
  ) {
    return {
      type: 'quote',
      confidence: 0.9,
      params: extractQuoteParams(userMessage),
      suggestedAction: 'Je peux générer un devis automatiquement. Quel client et quels services ?'
    };
  }

  // 2. GRILLE TARIFAIRE
  if (
    message.includes('grille') && message.includes('tarif') ||
    message.includes('prix') && message.includes('personnalisé') ||
    message.includes('remise') || message.includes('discount') ||
    message.includes('tarification') && message.includes('client')
  ) {
    return {
      type: 'pricing',
      confidence: 0.85,
      params: extractPricingParams(userMessage),
      suggestedAction: 'Je peux créer une grille tarifaire personnalisée. Pour quel client et avec quelle remise ?'
    };
  }

  // 3. ANALYTICS
  if (
    message.includes('chiffre') && message.includes('affaires') ||
    message.includes('ca ') || message.includes('c.a') ||
    message.includes('analyse') || message.includes('performance') ||
    message.includes('statistique') || message.includes('rapport') ||
    message.includes('meilleur') && message.includes('client')
  ) {
    return {
      type: 'analytics',
      confidence: 0.8,
      params: extractAnalyticsParams(userMessage),
      suggestedAction: 'Je peux analyser vos performances. Quelle période souhaitez-vous ?'
    };
  }

  // 4. PLANNING
  if (
    message.includes('planifie') || message.includes('planning') ||
    message.includes('organise') && message.includes('mission') ||
    message.includes('affecte') || message.includes('assigne') ||
    message.includes('optimise') && message.includes('tournée')
  ) {
    return {
      type: 'planning',
      confidence: 0.75,
      params: extractPlanningParams(userMessage),
      suggestedAction: 'Je peux optimiser votre planning missions. Pour quelle date ?'
    };
  }

  return {
    type: 'unknown',
    confidence: 0,
    params: {},
    suggestedAction: 'Comment puis-je vous aider avec votre CRM ?'
  };
}

// ============================================
// EXTRACTION PARAMÈTRES
// ============================================

function extractQuoteParams(message: string): Partial<QuoteParams> {
  const params: Partial<QuoteParams> = {
    missions: []
  };

  // Extraire client (patterns: "pour X", "client X")
  const clientMatch = message.match(/(?:pour|client)\s+([a-zA-ZÀ-ÿ\s]+?)(?:\s+avec|\s+et|$)/i);
  if (clientMatch) {
    params.clientName = clientMatch[1].trim();
  }

  // Extraire quantité missions
  const quantityMatch = message.match(/(\d+)\s+missions?/i);
  if (quantityMatch) {
    params.missions?.push({
      type: 'transport', // Type par défaut
      quantity: parseInt(quantityMatch[1]),
      description: ''
    });
  }

  // Extraire ville
  const cityMatch = message.match(/à\s+([a-zA-ZÀ-ÿ\s]+?)(?:\s|$)/i);
  if (cityMatch && params.missions && params.missions.length > 0) {
    params.missions[0].city = cityMatch[1].trim();
  }

  return params;
}

function extractPricingParams(message: string): Partial<PricingGridParams> {
  const params: Partial<PricingGridParams> = {};

  // Extraire client
  const clientMatch = message.match(/(?:pour|client)\s+([a-zA-ZÀ-ÿ\s]+?)(?:\s+avec|\s+et|$)/i);
  if (clientMatch) {
    params.gridName = `Grille ${clientMatch[1].trim()}`;
  }

  // Extraire remise (patterns: "-10%", "10%", "remise 10")
  const discountMatch = message.match(/-?(\d+)\s*%|remise\s+(\d+)/i);
  if (discountMatch) {
    params.discount = parseInt(discountMatch[1] || discountMatch[2]);
  }

  return params;
}

function extractAnalyticsParams(message: string): Partial<AnalyticsParams> {
  const params: Partial<AnalyticsParams> = {
    period: 'month' // Par défaut
  };

  if (message.includes('semaine')) params.period = 'week';
  if (message.includes('mois')) params.period = 'month';
  if (message.includes('trimestre')) params.period = 'quarter';
  if (message.includes('année') || message.includes('annuel')) params.period = 'year';

  return params;
}

function extractPlanningParams(message: string): Partial<OptimizePlanningParams> {
  const params: Partial<OptimizePlanningParams> = {};

  // Extraire date
  const dateMatch = message.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dateMatch) {
    params.date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
  } else if (message.includes('aujourd\'hui')) {
    params.date = new Date().toISOString().split('T')[0];
  } else if (message.includes('demain')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    params.date = tomorrow.toISOString().split('T')[0];
  }

  return params;
}

// ============================================
// SUGGESTIONS CONTEXTUELLES
// ============================================

export const claraSuggestions = {
  CRM: [
    {
      icon: '📄',
      text: 'Générer un devis pour un client',
      command: 'Génère un devis pour [Client] avec [X] missions à [Ville]',
      category: 'quote'
    },
    {
      icon: '💰',
      text: 'Créer une grille tarifaire personnalisée',
      command: 'Crée une grille tarifaire pour [Client] avec -[X]% de remise',
      category: 'pricing'
    },
    {
      icon: '👥',
      text: 'Liste mes clients inactifs',
      command: 'Quels clients n\'ont pas eu de mission depuis 30 jours ?',
      category: 'analytics'
    },
    {
      icon: '📊',
      text: 'Analyser mon CA du mois',
      command: 'Quel est mon chiffre d\'affaires ce mois ?',
      category: 'analytics'
    }
  ],
  Missions: [
    {
      icon: '📅',
      text: 'Optimiser mon planning',
      command: 'Optimise le planning de demain',
      category: 'planning'
    },
    {
      icon: '🚗',
      text: 'Assigner des missions',
      command: 'Assigne les missions du jour automatiquement',
      category: 'planning'
    }
  ],
  Analytics: [
    {
      icon: '🏆',
      text: 'Top 10 clients par CA',
      command: 'Qui sont mes meilleurs clients ce trimestre ?',
      category: 'analytics'
    },
    {
      icon: '📈',
      text: 'Évolution du CA',
      command: 'Analyse l\'évolution de mon CA sur 6 mois',
      category: 'analytics'
    },
    {
      icon: '💡',
      text: 'Recommandations commerciales',
      command: 'Quelles sont les opportunités commerciales ?',
      category: 'analytics'
    }
  ]
};

// ============================================
// FORMATEUR RÉPONSES CLARA
// ============================================

export function formatQuoteResponse(result: any): string {
  return `✅ **Devis ${result.quoteNumber} créé avec succès !**

📋 **Détails :**
- Client : ${result.client.name}
- Nombre de services : ${result.items.length}
- Total HT : ${result.subtotal.toFixed(2)}€
- TVA (${(result.taxRate * 100).toFixed(0)}%) : ${result.tax.toFixed(2)}€
- **Total TTC : ${result.total.toFixed(2)}€**
- Validité : ${new Date(result.validUntil).toLocaleDateString('fr-FR')}

**Services inclus :**
${result.items.map((item: any, i: number) => 
  `${i + 1}. ${item.service} × ${item.quantity} = ${item.total.toFixed(2)}€`
).join('\n')}

**Actions disponibles :**
1️⃣ Envoyer par email au client
2️⃣ Télécharger le PDF
3️⃣ Modifier le devis
4️⃣ Convertir en facture`;
}

export function formatPricingResponse(result: any): string {
  const totalDiscount = result.services.reduce((sum: number, s: any) => sum + s.discount, 0) / result.services.length;
  
  return `✅ **Grille tarifaire "${result.name}" créée !**

📊 **Récapitulatif :**
- Client : ${result.clientId}
- Remise moyenne : ${totalDiscount.toFixed(1)}%
- Services : ${result.services.length}

**Tarifs personnalisés :**
${result.services.slice(0, 5).map((s: any) => 
  `• ${s.type} : ~~${s.basePrice}€~~ → **${s.customPrice}€** (-${s.discount.toFixed(0)}%)`
).join('\n')}
${result.services.length > 5 ? `\n... et ${result.services.length - 5} autres services` : ''}

La grille est maintenant active et sera utilisée automatiquement pour ce client.`;
}

export function formatAnalyticsResponse(result: any): string {
  return `📊 **Analyse de vos performances**

💰 **Chiffre d'Affaires :**
- Total : **${result.revenue.total.toFixed(2)}€**
- Croissance : ${result.revenue.growth > 0 ? '📈' : '📉'} ${Math.abs(result.revenue.growth).toFixed(1)}%

👥 **Clients :**
- Total : ${result.clients.total}
- Actifs : ${result.clients.active} (${((result.clients.active / result.clients.total) * 100).toFixed(0)}%)
- Inactifs : ${result.clients.inactive}

🏆 **Top 5 Clients par CA :**
${result.clients.topClients.slice(0, 5).map((c: any, i: number) => 
  `${i + 1}. ${c.name} : **${c.revenue.toFixed(2)}€**`
).join('\n')}

📄 **Devis :**
- Total : ${result.quotes.total}
- Taux de conversion : **${result.quotes.conversionRate.toFixed(1)}%**
- Acceptés : ${result.quotes.accepted} | En attente : ${result.quotes.pending}

🎯 **Services les plus vendus :**
${result.services.mostSold.slice(0, 3).map((s: any, i: number) => 
  `${i + 1}. ${s.type} : ${s.quantity} ventes - ${s.revenue.toFixed(2)}€`
).join('\n')}`;
}

export function formatPlanningResponse(result: any): string {
  return `📅 **Planning optimisé avec succès !**

Score d'optimisation : ${result.optimizationScore}%

**Affectations :**
${result.assignments.map((a: any) => 
  `👨‍💼 **${a.teamName}** :
  - ${a.missions.length} missions assignées
  - Durée totale : ${Math.floor(a.totalDuration / 60)}h${a.totalDuration % 60}min
  - Distance : ${a.totalDistance.toFixed(1)} km`
).join('\n\n')}

${result.unassignedMissions.length > 0 
  ? `⚠️ **${result.unassignedMissions.length} missions non assignées** (capacité insuffisante)` 
  : '✅ Toutes les missions ont été assignées'}`;
}

// ============================================
// COMMANDES RAPIDES CLARA
// ============================================

export const quickCommands = [
  {
    trigger: '/devis',
    description: 'Générer un devis rapidement',
    example: '/devis client:TotalEnergies missions:5 ville:Paris'
  },
  {
    trigger: '/grille',
    description: 'Créer une grille tarifaire',
    example: '/grille client:Carrefour remise:15'
  },
  {
    trigger: '/ca',
    description: 'Voir le CA de la période',
    example: '/ca mois'
  },
  {
    trigger: '/top',
    description: 'Top clients par CA',
    example: '/top 10'
  },
  {
    trigger: '/planning',
    description: 'Optimiser le planning',
    example: '/planning demain'
  }
];
