import { supabase } from '../lib/supabase';

// ===== TYPES =====
export type VehicleType = 'light' | 'utility' | 'heavy';

export interface PricingGrid {
  id: string;
  user_id: string;
  client_id: string | null;
  is_global: boolean;
  name: string;
  
  // Paliers véhicule léger
  tier_1_50_light: number;
  tier_51_100_light: number;
  tier_101_150_light: number;
  tier_151_300_light: number;
  rate_per_km_light: number;
  
  // Paliers véhicule utilitaire
  tier_1_50_utility: number;
  tier_51_100_utility: number;
  tier_101_150_utility: number;
  tier_151_300_utility: number;
  rate_per_km_utility: number;
  
  // Paliers véhicule lourd
  tier_1_50_heavy: number;
  tier_51_100_heavy: number;
  tier_101_150_heavy: number;
  tier_151_300_heavy: number;
  rate_per_km_heavy: number;
  
  // Marges et TVA
  margin_percentage: number;
  fixed_supplement: number;
  supplement_notes: string | null;
  vat_rate: number;
  
  created_at: string;
  updated_at: string;
}

export interface QuoteCalculation {
  distance: number;
  vehicleType: VehicleType;
  basePrice: number;
  marginPercentage: number;
  marginAmount: number;
  fixedSupplement: number;
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
  gridName: string;
  tier: string;
  formula: string;
}

// ===== CRUD OPERATIONS =====

/**
 * Récupérer la grille globale d'un utilisateur
 */
export async function getGlobalPricingGrid(userId: string): Promise<PricingGrid | null> {
  const { data, error } = await supabase
    .from('pricing_grids')
    .select('*')
    .eq('user_id', userId)
    .eq('is_global', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching global pricing grid:', error);
    return null;
  }

  return data;
}

/**
 * Récupérer la grille spécifique d'un client
 */
export async function getClientPricingGrid(userId: string, clientId: string): Promise<PricingGrid | null> {
  const { data, error } = await supabase
    .from('pricing_grids')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching client pricing grid:', error);
    return null;
  }

  return data;
}

/**
 * Récupérer toutes les grilles d'un utilisateur
 */
export async function getAllPricingGrids(userId: string): Promise<PricingGrid[]> {
  const { data, error } = await supabase
    .from('pricing_grids')
    .select('*')
    .eq('user_id', userId)
    .order('is_global', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pricing grids:', error);
    return [];
  }

  return data || [];
}

/**
 * Créer une nouvelle grille tarifaire
 */
export async function createPricingGrid(grid: Partial<PricingGrid>): Promise<PricingGrid | null> {
  const { data, error } = await supabase
    .from('pricing_grids')
    .insert([grid])
    .select()
    .single();

  if (error) {
    console.error('Error creating pricing grid:', error);
    throw error;
  }

  return data;
}

/**
 * Mettre à jour une grille tarifaire
 */
export async function updatePricingGrid(gridId: string, updates: Partial<PricingGrid>): Promise<PricingGrid | null> {
  const { data, error } = await supabase
    .from('pricing_grids')
    .update(updates)
    .eq('id', gridId)
    .select()
    .single();

  if (error) {
    console.error('Error updating pricing grid:', error);
    throw error;
  }

  return data;
}

/**
 * Supprimer une grille tarifaire
 */
export async function deletePricingGrid(gridId: string): Promise<boolean> {
  const { error } = await supabase
    .from('pricing_grids')
    .delete()
    .eq('id', gridId);

  if (error) {
    console.error('Error deleting pricing grid:', error);
    return false;
  }

  return true;
}

// ===== CALCUL DEVIS =====

/**
 * Calculer un devis basé sur la grille tarifaire
 */
export function calculateQuote(params: {
  distance: number;
  vehicleType: VehicleType;
  grid: PricingGrid;
}): QuoteCalculation {
  const { distance, vehicleType, grid } = params;

  // 1. Déterminer le prix de base selon la distance et le type de véhicule
  let basePrice = 0;
  let tier = '';
  
  if (distance <= 50) {
    basePrice = grid[`tier_1_50_${vehicleType}`];
    tier = '1-50 km';
  } else if (distance <= 100) {
    basePrice = grid[`tier_51_100_${vehicleType}`];
    tier = '51-100 km';
  } else if (distance <= 150) {
    basePrice = grid[`tier_101_150_${vehicleType}`];
    tier = '101-150 km';
  } else if (distance <= 300) {
    basePrice = grid[`tier_151_300_${vehicleType}`];
    tier = '151-300 km';
  } else {
    // 301km+ → au kilomètre
    const ratePerKm = grid[`rate_per_km_${vehicleType}`];
    basePrice = distance * ratePerKm;
    tier = `301+ km (${distance}km × ${ratePerKm}€/km)`;
  }

  // 2. Appliquer la marge
  const marginAmount = (basePrice * grid.margin_percentage) / 100;
  const priceWithMargin = basePrice + marginAmount;

  // 3. Ajouter supplément fixe
  const totalHT = priceWithMargin + grid.fixed_supplement;

  // 4. Calculer TVA
  const vatAmount = (totalHT * grid.vat_rate) / 100;
  const totalTTC = totalHT + vatAmount;

  // 5. Générer formule explicative
  const formula = generateFormulaExplanation({
    basePrice,
    marginPercentage: grid.margin_percentage,
    marginAmount,
    fixedSupplement: grid.fixed_supplement,
    totalHT,
    vatRate: grid.vat_rate,
    vatAmount,
    totalTTC
  });

  return {
    distance,
    vehicleType,
    basePrice,
    marginPercentage: grid.margin_percentage,
    marginAmount,
    fixedSupplement: grid.fixed_supplement,
    totalHT,
    vatRate: grid.vat_rate,
    vatAmount,
    totalTTC,
    gridName: grid.name,
    tier,
    formula
  };
}

/**
 * Générer une explication de la formule de calcul
 */
function generateFormulaExplanation(calc: {
  basePrice: number;
  marginPercentage: number;
  marginAmount: number;
  fixedSupplement: number;
  totalHT: number;
  vatRate: number;
  vatAmount: number;
  totalTTC: number;
}): string {
  let formula = `Prix de base: ${calc.basePrice.toFixed(2)}€`;
  
  if (calc.marginPercentage > 0) {
    formula += `\n+ Marge (${calc.marginPercentage}%): ${calc.marginAmount.toFixed(2)}€`;
  }
  
  if (calc.fixedSupplement > 0) {
    formula += `\n+ Supplément: ${calc.fixedSupplement.toFixed(2)}€`;
  }
  
  formula += `\n= Total HT: ${calc.totalHT.toFixed(2)}€`;
  formula += `\n+ TVA (${calc.vatRate}%): ${calc.vatAmount.toFixed(2)}€`;
  formula += `\n= Total TTC: ${calc.totalTTC.toFixed(2)}€`;
  
  return formula;
}

/**
 * Récupérer la grille applicable pour un client
 * (grille spécifique si existe, sinon grille globale)
 */
export async function getApplicableGrid(userId: string, clientId?: string): Promise<PricingGrid | null> {
  // 1. Si clientId fourni, chercher grille spécifique
  if (clientId) {
    const clientGrid = await getClientPricingGrid(userId, clientId);
    if (clientGrid) return clientGrid;
  }

  // 2. Fallback: grille globale
  return await getGlobalPricingGrid(userId);
}

/**
 * Créer une grille par défaut (template)
 */
export function getDefaultGridTemplate(): Partial<PricingGrid> {
  return {
    name: 'Nouvelle Grille',
    
    // Véhicule léger - Tarifs par défaut
    tier_1_50_light: 120,
    tier_51_100_light: 180,
    tier_101_150_light: 250,
    tier_151_300_light: 350,
    rate_per_km_light: 1.5,
    
    // Véhicule utilitaire - Tarifs par défaut (+30%)
    tier_1_50_utility: 156,
    tier_51_100_utility: 234,
    tier_101_150_utility: 325,
    tier_151_300_utility: 455,
    rate_per_km_utility: 1.95,
    
    // Véhicule lourd - Tarifs par défaut (+60%)
    tier_1_50_heavy: 192,
    tier_51_100_heavy: 288,
    tier_101_150_heavy: 400,
    tier_151_300_heavy: 560,
    rate_per_km_heavy: 2.4,
    
    margin_percentage: 0,
    fixed_supplement: 0,
    supplement_notes: '',
    vat_rate: 20.0,
  };
}

/**
 * Copier une grille existante (pour créer grille client depuis globale)
 */
export function copyGrid(sourceGrid: PricingGrid, targetClientId?: string): Partial<PricingGrid> {
  return {
    ...sourceGrid,
    id: undefined,
    client_id: targetClientId || null,
    is_global: !targetClientId, // false si client_id fourni
    name: targetClientId ? `${sourceGrid.name} (Copie)` : sourceGrid.name,
    created_at: undefined,
    updated_at: undefined,
  };
}
