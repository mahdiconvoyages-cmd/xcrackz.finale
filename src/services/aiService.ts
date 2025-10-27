// @ts-nocheck - Type definitions for fetch headers may be outdated
// Service AI avec DeepSeek V3 (100x moins cher que GPT-4!)
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Fallback OpenRouter (si besoin)
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  message?: string;
  error?: string;
  provider?: 'deepseek' | 'openrouter';
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export async function sendAIMessage(
  messages: AIMessage[],
  provider: 'deepseek' | 'openrouter' = 'deepseek',
  model?: string
): Promise<AIResponse> {
  try {
    // Configuration par provider
    const config = provider === 'deepseek' ? {
      url: DEEPSEEK_API_URL,
      apiKey: DEEPSEEK_API_KEY,
      model: model || 'deepseek-chat',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    } : {
      url: OPENROUTER_API_URL,
      apiKey: OPENROUTER_API_KEY,
      model: model || 'anthropic/claude-3.5-sonnet',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'xcrackz AI Assistant',
      }
    };

    console.log(`🤖 Appel ${provider.toUpperCase()} avec modèle: ${config.model}`);

    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    console.log(`✅ Réponse reçue (${data.usage?.total_tokens || 0} tokens)`);

    return {
      success: true,
      message: assistantMessage,
      provider,
      tokens: data.usage ? {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error(`❌ ${provider.toUpperCase()} Error:`, error);

    // Fallback automatique sur OpenRouter si DeepSeek échoue
    if (provider === 'deepseek' && OPENROUTER_API_KEY) {
      console.log('🔄 Fallback vers OpenRouter...');
      return sendAIMessage(messages, 'openrouter', model);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      provider,
    };
  }
}

// Assistant conversationnel pour xcrackz
export async function askXcrackzAssistant(
  userQuestion: string,
  context?: any,
  conversationHistory?: AIMessage[]
): Promise<string> {
  const systemPrompt = `Tu es l'assistant IA de xcrackz, une plateforme de gestion de flotte de véhicules.

🎯 TES COMPÉTENCES:
- Gestion de missions de transport
- Facturation et devis
- Optimisation de tournées
- Suivi de flotte
- Analyse de données
- Conseils business

📊 CONTEXTE UTILISATEUR:
${context ? JSON.stringify(context, null, 2) : 'Aucun contexte fourni'}

💡 TON STYLE:
- Réponds en français
- Sois concis et actionnable
- Utilise des exemples concrets
- Propose des étapes claires
- Utilise des emojis pertinents

🚫 INTERDICTIONS:
- Ne pas inventer de fausses données
- Ne pas faire de promesses impossibles
- Ne pas partager d'infos confidentielles`;

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(conversationHistory || []),
    { role: 'user', content: userQuestion },
  ];

  const response = await sendAIMessage(messages, 'deepseek');

  if (response.success && response.message) {
    return response.message;
  }

  return '❌ Désolé, je n\'ai pas pu traiter votre demande. Veuillez réessayer.';
}

// Analyser une demande et extraire l'intention
export async function analyzeIntent(userInput: string): Promise<{
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  action?: string;
}> {
  const systemPrompt = `Tu es un système d'analyse d'intentions pour xcrackz.

INTENTIONS POSSIBLES:
- create_mission: Créer une nouvelle mission
- find_driver: Trouver un chauffeur
- generate_invoice: Créer une facture
- track_vehicle: Suivre un véhicule
- analyze_data: Analyser des données
- optimize_route: Optimiser un trajet
- question: Question générale

ENTITÉS À EXTRAIRE:
- client: nom du client
- date: date (format ISO)
- time: heure (format HH:MM)
- location: lieu (départ/arrivée)
- amount: montant en euros
- vehicle: véhicule
- driver: chauffeur

Réponds UNIQUEMENT avec un JSON valide:
{
  "intent": "...",
  "entities": {...},
  "confidence": 0.0-1.0,
  "action": "description de l'action à faire"
}`;

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyse cette demande: "${userInput}"` },
  ];

  const response = await sendAIMessage(messages, 'deepseek');

  if (response.success && response.message) {
    try {
      // Extraire le JSON (au cas où il y a du texte autour)
      const jsonMatch = response.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || 'question',
          entities: parsed.entities || {},
          confidence: parsed.confidence || 0.5,
          action: parsed.action,
        };
      }
    } catch (e) {
      console.error('Failed to parse AI intent response:', e);
    }
  }

  return {
    intent: 'question',
    entities: {},
    confidence: 0,
  };
}

// Suggérer des optimisations
export async function suggestOptimizations(data: {
  missions?: any[];
  vehicles?: any[];
  drivers?: any[];
  invoices?: any[];
  stats?: any;
}): Promise<string[]> {
  const systemPrompt = `Tu es un consultant en optimisation de flotte.

Analyse les données fournies et suggère 5 optimisations concrètes et actionnables.

FORMAT DE RÉPONSE:
- Une suggestion par ligne
- Commence chaque ligne par un tiret (-)
- Sois spécifique et quantifié quand possible
- Priorise par impact business

EXEMPLES:
- Regrouper les livraisons dans le secteur Nord pour économiser 15% de carburant
- Former 2 chauffeurs supplémentaires pour couvrir les pics de demande
- Automatiser la facturation pour gagner 5h/semaine`;

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyse ces données et suggère des optimisations:\n\n${JSON.stringify(data, null, 2)}` },
  ];

  const response = await sendAIMessage(messages, 'deepseek');

  if (response.success && response.message) {
    const suggestions = response.message
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(s => s.length > 0);

    return suggestions.slice(0, 5);
  }

  return [
    'Analyser vos données pour identifier les opportunités d\'optimisation',
    'Regrouper les livraisons par zone géographique',
    'Automatiser les tâches répétitives',
  ];
}

// Prédire la durée d'une mission
export async function predictMissionDuration(mission: {
  origin: string;
  destination: string;
  distance: number;
  traffic?: string;
  weather?: string;
  vehicleType?: string;
}): Promise<{
  estimated_minutes: number;
  confidence: number;
  factors: string[];
  breakdown?: {
    base_time: number;
    traffic_delay: number;
    weather_delay: number;
    stops_time: number;
  };
}> {
  const prompt = `Estime la durée d'une mission de transport avec précision.

📦 MISSION:
- Origine: ${mission.origin}
- Destination: ${mission.destination}
- Distance: ${mission.distance} km
- Trafic: ${mission.traffic || 'normal'}
- Météo: ${mission.weather || 'bonne'}
- Type véhicule: ${mission.vehicleType || 'utilitaire'}

⚠️ FACTEURS À CONSIDÉRER:
- Vitesse moyenne selon type de route (autoroute 110 km/h, nationale 80 km/h, ville 30 km/h)
- Impact trafic (+10% à +50%)
- Impact météo (+5% à +30%)
- Temps arrêts/pauses (+15 min/2h de conduite)
- Temps chargement/déchargement

Réponds avec un JSON:
{
  "estimated_minutes": nombre,
  "confidence": 0.0-1.0,
  "factors": ["facteur1", "facteur2"],
  "breakdown": {
    "base_time": nombre,
    "traffic_delay": nombre,
    "weather_delay": nombre,
    "stops_time": nombre
  }
}`;

  const messages: AIMessage[] = [
    { role: 'user', content: prompt },
  ];

  const response = await sendAIMessage(messages, 'deepseek');

  if (response.success && response.message) {
    try {
      const jsonMatch = response.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          estimated_minutes: parsed.estimated_minutes || 0,
          confidence: parsed.confidence || 0.7,
          factors: parsed.factors || [],
          breakdown: parsed.breakdown,
        };
      }
    } catch (e) {
      console.error('Failed to parse prediction:', e);
    }
  }

  // Fallback: estimation simple
  const baseMinutes = (mission.distance / 70) * 60; // 70 km/h moyenne
  const trafficMultiplier = mission.traffic === 'dense' ? 1.3 : 1.1;
  const estimated = Math.round(baseMinutes * trafficMultiplier);

  return {
    estimated_minutes: estimated,
    confidence: 0.6,
    factors: ['Estimation basée sur vitesse moyenne', 'Trafic pris en compte'],
    breakdown: {
      base_time: Math.round(baseMinutes),
      traffic_delay: Math.round(baseMinutes * (trafficMultiplier - 1)),
      weather_delay: 0,
      stops_time: Math.round(mission.distance / 200) * 15, // 15min tous les 200km
    },
  };
}

// Générer un résumé intelligent d'une facture
export async function generateInvoiceSummary(invoice: any): Promise<string> {
  const prompt = `Génère un résumé professionnel de cette facture en 2-3 phrases:

${JSON.stringify(invoice, null, 2)}

Le résumé doit inclure:
- Montant total
- Client
- Date d'échéance
- Statut
- Conseil si nécessaire (relance, etc.)`;

  const messages: AIMessage[] = [
    { role: 'user', content: prompt },
  ];

  const response = await sendAIMessage(messages, 'deepseek');

  if (response.success && response.message) {
    return response.message;
  }

  return `Facture de ${invoice.total}€ pour ${invoice.client_name}, échéance le ${invoice.due_date}.`;
}

// Détecter des anomalies dans les données
export async function detectAnomalies(data: {
  missions?: any[];
  expenses?: any[];
  tracking?: any[];
}): Promise<Array<{
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  recommendation: string;
}>> {
  const prompt = `Analyse ces données et détecte des anomalies:

${JSON.stringify(data, null, 2)}

Cherche:
- Coûts anormalement élevés
- Retards inhabituels
- Trajets inefficaces
- Patterns suspects

Réponds avec un JSON array:
[
  {
    "type": "high_cost",
    "severity": "high",
    "description": "Mission #42 coûte 3x la moyenne",
    "recommendation": "Vérifier les frais, revoir le tarif"
  }
]`;

  const messages: AIMessage[] = [
    { role: 'user', content: prompt },
  ];

  const response = await sendAIMessage(messages, 'deepseek');

  if (response.success && response.message) {
    try {
      const jsonMatch = response.message.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.slice(0, 5);
      }
    } catch (e) {
      console.error('Failed to parse anomalies:', e);
    }
  }

  return [];
}
