// Service: Distance Calculation via OpenRouteService
// Description: Calcule les distances réelles de trajet

import { supabase } from '../supabase'

export interface Coordinates {
  lat: number
  lon: number
}

export interface DistanceResult {
  distance: number // en km
  duration: number // en secondes
  route?: any // géométrie GeoJSON de la route
}

export type VehicleProfile = 'driving-car' | 'driving-hgv'

/**
 * Calcule la distance entre deux points via OpenRouteService
 * @param origin Point de départ { lat, lon }
 * @param destination Point d'arrivée { lat, lon }
 * @param profile Type de véhicule ('driving-car' pour léger/utilitaire, 'driving-hgv' pour poids lourd)
 * @returns Distance en km, durée en secondes, et géométrie de la route
 */
export async function calculateDistance(
  origin: Coordinates,
  destination: Coordinates,
  profile: VehicleProfile = 'driving-car'
): Promise<DistanceResult> {
  try {
    const { data, error } = await supabase.functions.invoke('calculate-distance', {
      body: {
        origin,
        destination,
        profile
      }
    })

    if (error) {
      console.error('Error calling calculate-distance function:', error)
      throw new Error(`Failed to calculate distance: ${error.message}`)
    }

    if (data.error) {
      throw new Error(data.error)
    }

    return {
      distance: data.distance,
      duration: data.duration,
      route: data.route
    }
  } catch (error) {
    console.error('Distance calculation error:', error)
    throw error
  }
}

/**
 * Convertit une adresse en coordonnées (géocodage)
 * Note: Nécessite une API de géocodage (Nominatim, Google Maps, etc.)
 * Cette fonction est un placeholder - à implémenter selon vos besoins
 */
export async function geocodeAddress(_address: string): Promise<Coordinates> {
  // TODO: Implémenter le géocodage avec Nominatim ou autre service
  // Pour l'instant, retourne un placeholder
  throw new Error('Geocoding not yet implemented')
}

/**
 * Formatte la durée en heures et minutes
 * @param seconds Durée en secondes
 * @returns String formaté (ex: "2h 30min")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours === 0) {
    return `${minutes}min`
  }
  
  return `${hours}h ${minutes}min`
}

/**
 * Détermine le palier de distance pour une grille tarifaire
 * @param distance Distance en km
 * @returns Nom du palier ('tier_1_50', 'tier_51_100', etc.)
 */
export function getDistanceTier(distance: number): string {
  if (distance <= 50) return 'tier_1_50'
  if (distance <= 100) return 'tier_51_100'
  if (distance <= 150) return 'tier_101_150'
  if (distance <= 300) return 'tier_151_300'
  return 'rate_per_km' // Au-delà de 300km, tarif au km
}

/**
 * Calcule le prix basé sur la distance et une grille tarifaire
 * @param distance Distance en km
 * @param pricingGrid Grille tarifaire
 * @param vehicleType Type de véhicule ('light', 'utility', 'heavy')
 * @returns Prix HT calculé
 */
export function calculatePrice(
  distance: number,
  pricingGrid: any,
  vehicleType: 'light' | 'utility' | 'heavy'
): number {
  let basePrice = 0
  
  if (distance <= 50) {
    basePrice = pricingGrid[`tier_1_50_${vehicleType}`] || 0
  } else if (distance <= 100) {
    basePrice = pricingGrid[`tier_51_100_${vehicleType}`] || 0
  } else if (distance <= 150) {
    basePrice = pricingGrid[`tier_101_150_${vehicleType}`] || 0
  } else if (distance <= 300) {
    basePrice = pricingGrid[`tier_151_300_${vehicleType}`] || 0
  } else {
    // Au-delà de 300km: tarif au km
    const ratePerKm = pricingGrid[`rate_per_km_${vehicleType}`] || 0
    basePrice = distance * ratePerKm
  }
  
  // Applique la marge
  const margin = pricingGrid.margin_percentage || 0
  const priceWithMargin = basePrice * (1 + margin / 100)
  
  // Ajoute le supplément fixe
  const fixedSupplement = pricingGrid.fixed_supplement || 0
  const totalHT = priceWithMargin + fixedSupplement
  
  return Math.round(totalHT * 100) / 100 // Arrondi à 2 décimales
}

/**
 * Calcule le prix TTC
 * @param priceHT Prix HT
 * @param vatRate Taux de TVA en pourcentage (défaut: 20)
 * @returns Prix TTC
 */
export function calculatePriceTTC(priceHT: number, vatRate: number = 20): number {
  return Math.round(priceHT * (1 + vatRate / 100) * 100) / 100
}
