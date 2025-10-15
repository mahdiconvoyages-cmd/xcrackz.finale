// Clara CRM Actions - Fonctionnalités Prioritaires
// 🥇 Génération Devis Automatique
// 🥈 Grilles Tarifaires Personnalisées
// 📊 Analytics CA & Performances
// 📅 Planning Missions Optimisé

import { supabase } from './supabase';

// ============================================
// 1. GÉNÉRATION DEVIS AUTOMATIQUE 🥇
// ============================================

export interface QuoteParams {
  clientId: string;
  clientName?: string;
  missions: {
    type: string;
    quantity: number;
    city?: string;
    description?: string;
  }[];
  validityDays?: number;
  customPricing?: boolean;
}

export interface QuoteResult {
  quoteId: string;
  quoteNumber: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    service: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  validUntil: string;
  pdfUrl?: string;
}

export async function generateAutoQuote(params: QuoteParams): Promise<QuoteResult> {
  try {
    // 1. Récupérer les informations du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, company_name, email, phone, address')
      .eq('id', params.clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client non trouvé: ${params.clientId}`);
    }

    // 2. Récupérer la grille tarifaire (personnalisée ou par défaut)
    let pricing;
    if (params.customPricing) {
      const { data: customPricing } = await supabase
        .from('custom_pricing_grids')
        .select('*')
        .eq('client_id', params.clientId)
        .eq('is_active', true)
        .single();
      
      pricing = customPricing || await getDefaultPricing();
    } else {
      pricing = await getDefaultPricing();
    }

    // 3. Calculer les lignes du devis
    const items = params.missions.map(mission => {
      const unitPrice = calculateMissionPrice(mission, pricing);
      return {
        service: `${mission.type} - ${mission.city || 'National'}`,
        description: mission.description || '',
        quantity: mission.quantity,
        unitPrice,
        total: unitPrice * mission.quantity
      };
    });

    // 4. Calculer totaux
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.20; // TVA 20%
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // 5. Générer numéro de devis
    const quoteNumber = await generateQuoteNumber();

    // 6. Date de validité
    const validityDays = params.validityDays || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // 7. Enregistrer le devis en base
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        client_id: params.clientId,
        items: JSON.stringify(items),
        subtotal,
        tax,
        tax_rate: taxRate,
        total,
        valid_until: validUntil.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (quoteError) {
      throw new Error(`Erreur création devis: ${quoteError.message}`);
    }

    // 8. Générer PDF (optionnel)
    // const pdfUrl = await generateQuotePDF(quote);

    return {
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      client: {
        id: client.id,
        name: client.company_name,
        email: client.email
      },
      items,
      subtotal,
      tax,
      taxRate,
      total,
      validUntil: validUntil.toISOString()
    };

  } catch (error) {
    console.error('Erreur génération devis automatique:', error);
    throw error;
  }
}

// ============================================
// 2. GRILLES TARIFAIRES PERSONNALISÉES 🥈
// ============================================

export interface PricingGridParams {
  clientId: string;
  gridName: string;
  discount?: number; // Pourcentage de remise globale
  customPrices?: {
    serviceType: string;
    price: number;
  }[];
}

export interface PricingGrid {
  id: string;
  clientId: string;
  name: string;
  services: Array<{
    type: string;
    basePrice: number;
    customPrice: number;
    discount: number;
  }>;
  globalDiscount: number;
  createdAt: string;
}

export async function createCustomPricingGrid(params: PricingGridParams): Promise<PricingGrid> {
  try {
    // 1. Récupérer tarifs par défaut
    const defaultPricing = await getDefaultPricing();

    // 2. Appliquer modifications
    const services = defaultPricing.map(service => {
      // Chercher si prix personnalisé existe
      const customPrice = params.customPrices?.find(
        cp => cp.serviceType === service.type
      );

      let finalPrice = service.price;
      let discount = 0;

      if (customPrice) {
        // Prix personnalisé spécifique
        finalPrice = customPrice.price;
        discount = ((service.price - finalPrice) / service.price) * 100;
      } else if (params.discount) {
        // Remise globale
        finalPrice = service.price * (1 - params.discount / 100);
        discount = params.discount;
      }

      return {
        type: service.type,
        basePrice: service.price,
        customPrice: Math.round(finalPrice * 100) / 100,
        discount: Math.round(discount * 100) / 100
      };
    });

    // 3. Enregistrer la grille en base
    const { data: grid, error } = await supabase
      .from('custom_pricing_grids')
      .insert({
        client_id: params.clientId,
        grid_name: params.gridName,
        services: JSON.stringify(services),
        global_discount: params.discount || 0,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur création grille: ${error.message}`);
    }

    return {
      id: grid.id,
      clientId: grid.client_id,
      name: grid.grid_name,
      services,
      globalDiscount: params.discount || 0,
      createdAt: grid.created_at
    };

  } catch (error) {
    console.error('Erreur création grille tarifaire:', error);
    throw error;
  }
}

// ============================================
// 3. ANALYTICS CA & PERFORMANCES 📊
// ============================================

export interface AnalyticsParams {
  period: 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsResult {
  revenue: {
    total: number;
    byPeriod: Array<{
      period: string;
      amount: number;
    }>;
    growth: number; // Pourcentage croissance
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
    topClients: Array<{
      id: string;
      name: string;
      revenue: number;
    }>;
  };
  quotes: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    conversionRate: number;
  };
  services: {
    mostSold: Array<{
      type: string;
      quantity: number;
      revenue: number;
    }>;
  };
}

export async function getAnalytics(params: AnalyticsParams): Promise<AnalyticsResult> {
  try {
    const { startDate, endDate } = calculateDateRange(params.period, params.startDate, params.endDate);

    // 1. CA Total et par période
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, created_at, client_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .eq('status', 'paid');

    const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;

    // 2. Clients actifs vs inactifs
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, company_name');

    const { data: activeClients } = await supabase
      .from('missions')
      .select('client_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const activeClientIds = new Set(activeClients?.map(m => m.client_id) || []);

    // 3. Top clients par CA
    const clientRevenue = new Map<string, { name: string; revenue: number }>();
    invoices?.forEach(inv => {
      const client = allClients?.find(c => c.id === inv.client_id);
      if (client) {
        const current = clientRevenue.get(inv.client_id) || { name: client.company_name, revenue: 0 };
        current.revenue += inv.total;
        clientRevenue.set(inv.client_id, current);
      }
    });

    const topClients = Array.from(clientRevenue.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 4. Statistiques devis
    const { data: quotes } = await supabase
      .from('quotes')
      .select('status')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const quotesStats = {
      total: quotes?.length || 0,
      pending: quotes?.filter(q => q.status === 'pending').length || 0,
      accepted: quotes?.filter(q => q.status === 'accepted').length || 0,
      rejected: quotes?.filter(q => q.status === 'rejected').length || 0
    };

    const conversionRate = quotesStats.total > 0
      ? (quotesStats.accepted / quotesStats.total) * 100
      : 0;

    // 5. Services les plus vendus
    const { data: missions } = await supabase
      .from('missions')
      .select('service_type, price')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const servicesMap = new Map<string, { quantity: number; revenue: number }>();
    missions?.forEach(m => {
      const current = servicesMap.get(m.service_type) || { quantity: 0, revenue: 0 };
      current.quantity += 1;
      current.revenue += m.price || 0;
      servicesMap.set(m.service_type, current);
    });

    const mostSold = Array.from(servicesMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      revenue: {
        total: totalRevenue,
        byPeriod: [], // À implémenter selon besoin
        growth: 0 // À calculer vs période précédente
      },
      clients: {
        total: allClients?.length || 0,
        active: activeClientIds.size,
        inactive: (allClients?.length || 0) - activeClientIds.size,
        topClients
      },
      quotes: {
        ...quotesStats,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      services: {
        mostSold
      }
    };

  } catch (error) {
    console.error('Erreur analytics:', error);
    throw error;
  }
}

// ============================================
// 4. PLANNING MISSIONS OPTIMISÉ 📅
// ============================================

export interface OptimizePlanningParams {
  date: string;
  missions: Array<{
    id: string;
    address: string;
    priority: 'low' | 'medium' | 'high';
    estimatedDuration: number; // minutes
  }>;
  teams: Array<{
    id: string;
    name: string;
    currentLocation?: string;
    workingHours: { start: string; end: string };
  }>;
}

export interface OptimizedPlanning {
  assignments: Array<{
    teamId: string;
    teamName: string;
    missions: Array<{
      missionId: string;
      order: number;
      estimatedStart: string;
      estimatedEnd: string;
      travelTime: number; // minutes
    }>;
    totalDistance: number; // km
    totalDuration: number; // minutes
  }>;
  unassignedMissions: string[];
  optimizationScore: number; // 0-100
}

export async function optimizePlanning(params: OptimizePlanningParams): Promise<OptimizedPlanning> {
  try {
    // Algorithme simple d'optimisation
    // TODO: Intégrer API routing (Google Maps, OpenRouteService, etc.)

    const assignments: OptimizedPlanning['assignments'] = [];
    const unassignedMissions: string[] = [];

    // Trier missions par priorité
    const sortedMissions = [...params.missions].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // Assigner missions aux équipes
    for (const team of params.teams) {
      const teamAssignment = {
        teamId: team.id,
        teamName: team.name,
        missions: [] as any[],
        totalDistance: 0,
        totalDuration: 0
      };

      let currentTime = new Date(`${params.date}T${team.workingHours.start}`);
      const endTime = new Date(`${params.date}T${team.workingHours.end}`);

      // Assigner missions tant qu'il y a du temps disponible
      for (const mission of sortedMissions) {
        const missionEnd = new Date(currentTime.getTime() + mission.estimatedDuration * 60000);

        if (missionEnd <= endTime) {
          teamAssignment.missions.push({
            missionId: mission.id,
            order: teamAssignment.missions.length + 1,
            estimatedStart: currentTime.toISOString(),
            estimatedEnd: missionEnd.toISOString(),
            travelTime: 15 // TODO: Calculer temps réel
          });

          teamAssignment.totalDuration += mission.estimatedDuration + 15;
          currentTime = new Date(missionEnd.getTime() + 15 * 60000); // +15min trajet

          // Retirer mission de la liste
          const index = sortedMissions.indexOf(mission);
          if (index > -1) sortedMissions.splice(index, 1);
        }
      }

      assignments.push(teamAssignment);
    }

    // Missions non assignées
    unassignedMissions.push(...sortedMissions.map(m => m.id));

    // Score d'optimisation
    const totalMissions = params.missions.length;
    const assignedMissions = totalMissions - unassignedMissions.length;
    const optimizationScore = (assignedMissions / totalMissions) * 100;

    return {
      assignments,
      unassignedMissions,
      optimizationScore: Math.round(optimizationScore)
    };

  } catch (error) {
    console.error('Erreur optimisation planning:', error);
    throw error;
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

async function getDefaultPricing() {
  const { data } = await supabase
    .from('service_pricing')
    .select('*')
    .eq('is_default', true);
  
  return data || [];
}

function calculateMissionPrice(mission: any, pricing: any[]): number {
  const service = pricing.find(p => p.type === mission.type);
  return service?.price || 100; // Prix par défaut
}

async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .like('quote_number', `${year}-%`);
  
  const nextNumber = (count || 0) + 1;
  return `${year}-${String(nextNumber).padStart(4, '0')}`;
}

function calculateDateRange(period: string, startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date();
  let start: Date;

  switch (period) {
    case 'week':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(end.getMonth() / 3);
      start = new Date(end.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    default:
      start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
}
