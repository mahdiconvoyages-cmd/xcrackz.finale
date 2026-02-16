// Service de suggestion intelligente de chauffeur pour missions
import { supabase } from '../lib/supabase';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  license_type?: string; // 'light' (léger) ou 'heavy' (poids lourd)
  available?: boolean;
  notes?: string;
}

export interface DriverAvailability {
  driver_id: string;
  date: string;
  is_available: boolean;
  reason?: string; // "En mission", "Congés", etc.
}

export interface DriverSuggestion {
  driver: Driver;
  score: number; // Score de pertinence (0-100)
  reasons: string[]; // Raisons de la suggestion
  warnings: string[]; // Avertissements éventuels
  distance_from_pickup?: number; // Distance en km
  has_correct_license: boolean;
  is_available: boolean;
}

export interface SuggestionCriteria {
  pickup_address: string;
  pickup_city: string;
  delivery_address: string;
  delivery_city: string;
  pickup_date?: string;
  vehicle_type: 'light' | 'heavy'; // Léger ou poids lourd
}

/**
 * Extraire la ville d'une adresse
 */
function extractCity(address: string): string {
  if (!address) return '';
  
  // Rechercher code postal + ville (ex: "75001 Paris")
  const cityMatch = address.match(/\d{5}\s+([A-Za-zÀ-ÿ\s-]+)/);
  if (cityMatch) {
    return cityMatch[1].trim();
  }
  
  // Sinon, prendre le dernier élément après une virgule
  const parts = address.split(',');
  if (parts.length > 0) {
    return parts[parts.length - 1].trim();
  }
  
  return address;
}

/**
 * Calculer la distance approximative entre deux villes (en km)
 * Note: Version simplifiée, pourrait utiliser une API de géolocalisation
 */
function calculateCityDistance(city1: string, city2: string): number {
  // Normaliser les noms de villes
  const c1 = city1.toLowerCase().trim();
  const c2 = city2.toLowerCase().trim();
  
  if (c1 === c2) return 0;
  
  // Distances approximatives entre grandes villes françaises
  const cityDistances: { [key: string]: { [key: string]: number } } = {
    'paris': { 'lyon': 465, 'marseille': 775, 'toulouse': 680, 'nice': 930, 'bordeaux': 580 },
    'lyon': { 'paris': 465, 'marseille': 315, 'toulouse': 535, 'nice': 470, 'bordeaux': 555 },
    'marseille': { 'paris': 775, 'lyon': 315, 'toulouse': 405, 'nice': 200, 'bordeaux': 650 },
    'toulouse': { 'paris': 680, 'lyon': 535, 'marseille': 405, 'nice': 575, 'bordeaux': 245 },
    'nice': { 'paris': 930, 'lyon': 470, 'marseille': 200, 'toulouse': 575, 'bordeaux': 850 },
    'bordeaux': { 'paris': 580, 'lyon': 555, 'marseille': 650, 'toulouse': 245, 'nice': 850 },
  };
  
  // Chercher dans les distances pré-calculées
  if (cityDistances[c1] && cityDistances[c1][c2]) {
    return cityDistances[c1][c2];
  }
  
  // Par défaut, distance "inconnue" = 100km
  return 100;
}

/**
 * Vérifier la disponibilité d'un chauffeur à une date donnée
 */
async function checkDriverAvailability(
  driverId: string,
  date?: string
): Promise<{ available: boolean; reason?: string }> {
  if (!date) {
    return { available: true }; // Pas de date spécifiée = disponible par défaut
  }
  
  try {
    // Vérifier si le chauffeur a déjà une mission ce jour-là
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const { data: missions, error } = await supabase
      .from('missions')
      .select('id, reference, status, pickup_date, delivery_date')
      .eq('driver_id', driverId)
      .in('status', ['pending', 'in_progress'])
      .or(`pickup_date.gte.${startOfDay.toISOString()},pickup_date.lte.${endOfDay.toISOString()}`);
    
    if (error) {
      console.warn('⚠️ Erreur vérification disponibilité:', error);
      return { available: true }; // En cas d'erreur, on considère disponible
    }
    
    if (missions && missions.length > 0) {
      return {
        available: false,
        reason: `En mission: ${missions[0].reference}`,
      };
    }
    
    return { available: true };
  } catch (err) {
    console.warn('⚠️ Erreur checkDriverAvailability:', err);
    return { available: true };
  }
}

/**
 * Récupérer tous les chauffeurs
 */
async function getAllDrivers(userId: string): Promise<Driver[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'driver');
    
    if (error) {
      console.error('❌ Erreur récupération chauffeurs:', error);
      return [];
    }
    
    return (data || []).map((contact) => ({
      id: contact.id,
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone,
      address: contact.address,
      city: extractCity(contact.address || ''),
      license_type: contact.notes?.includes('poids lourd') || contact.notes?.includes('heavy') ? 'heavy' : 'light',
      available: true,
      notes: contact.notes,
    }));
  } catch (err) {
    console.error('❌ Erreur getAllDrivers:', err);
    return [];
  }
}

/**
 * Suggérer le meilleur chauffeur pour une mission
 */
export async function suggestBestDriver(
  userId: string,
  criteria: SuggestionCriteria
): Promise<{ success: boolean; suggestions: DriverSuggestion[]; message?: string; error?: string }> {
  try {
    console.log('🔍 Recherche chauffeur optimal...', criteria);
    
    // 1. Récupérer tous les chauffeurs
    const drivers = await getAllDrivers(userId);
    
    if (drivers.length === 0) {
      return {
        success: false,
        suggestions: [],
        message: '❌ Aucun chauffeur trouvé dans vos contacts. Ajoutez d\'abord des chauffeurs !',
        error: 'No drivers found',
      };
    }
    
    console.log(`📋 ${drivers.length} chauffeur(s) trouvé(s)`);
    
    // 2. Analyser chaque chauffeur
    const suggestions: DriverSuggestion[] = [];
    
    for (const driver of drivers) {
      const reasons: string[] = [];
      const warnings: string[] = [];
      let score = 0;
      
      // Vérifier disponibilité
      const availability = await checkDriverAvailability(driver.id, criteria.pickup_date);
      const isAvailable = availability.available;
      
      if (!isAvailable) {
        warnings.push(`⚠️ Non disponible: ${availability.reason}`);
      } else {
        score += 30;
        reasons.push('✅ Disponible à cette date');
      }
      
      // Vérifier permis (léger vs poids lourd)
      const hasCorrectLicense = driver.license_type === criteria.vehicle_type;
      
      if (hasCorrectLicense) {
        score += 40;
        reasons.push(
          criteria.vehicle_type === 'heavy'
            ? '✅ Possède le permis poids lourd'
            : '✅ Permis léger adapté'
        );
      } else {
        warnings.push(
          criteria.vehicle_type === 'heavy'
            ? '⚠️ Pas de permis poids lourd'
            : '⚠️ Surqualifié (permis poids lourd pour véhicule léger)'
        );
      }
      
      // Vérifier proximité de la ville de départ
      if (driver.city) {
        const distance = calculateCityDistance(driver.city, criteria.pickup_city);
        
        if (distance === 0) {
          score += 30;
          reasons.push(`✅ Basé à ${driver.city} (ville de départ)`);
        } else if (distance <= 50) {
          score += 20;
          reasons.push(`✅ Proche du départ (${distance} km de ${criteria.pickup_city})`);
        } else if (distance <= 100) {
          score += 10;
          reasons.push(`ℹ️ À ${distance} km de ${criteria.pickup_city}`);
        } else {
          warnings.push(`⚠️ Éloigné (${distance} km de ${criteria.pickup_city})`);
        }
      } else {
        warnings.push('ℹ️ Ville non renseignée');
      }
      
      suggestions.push({
        driver,
        score,
        reasons,
        warnings,
        distance_from_pickup: driver.city ? calculateCityDistance(driver.city, criteria.pickup_city) : undefined,
        has_correct_license: hasCorrectLicense,
        is_available: isAvailable,
      });
    }
    
    // 3. Trier par score décroissant
    suggestions.sort((a, b) => b.score - a.score);
    
    console.log('✅ Suggestions générées:', suggestions.length);
    
    return {
      success: true,
      suggestions,
      message: `${suggestions.length} chauffeur(s) analysé(s)`,
    };
  } catch (err: any) {
    console.error('❌ Erreur suggestBestDriver:', err);
    return {
      success: false,
      suggestions: [],
      error: err.message,
    };
  }
}
