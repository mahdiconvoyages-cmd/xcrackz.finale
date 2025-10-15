// Service OpenRouteService pour les tracés GPS
// API Key: eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0=

const OPENROUTESERVICE_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM1YTdjMDg1NGMxNjQ2NDM5NDBhMTZlMDY5YmI4MWM4IiwiaCI6Im11cm11cjY0In0='

export interface RouteCoordinates {
  latitude: number
  longitude: number
}

export interface RouteResponse {
  coordinates: RouteCoordinates[]
  distance: number // en mètres
  duration: number // en secondes
  geometry: {
    type: string
    coordinates: number[][] // [lon, lat]
  }
}

/**
 * Récupère le tracé GPS optimal entre deux points via OpenRouteService
 * @param startLat Latitude de départ
 * @param startLng Longitude de départ
 * @param endLat Latitude d'arrivée
 * @param endLng Longitude d'arrivée
 * @param profile Profile de conduite ('driving-car' ou 'driving-hgv')
 * @returns Tracé GPS avec coordonnées, distance et durée
 */
export async function getRouteFromOpenRouteService(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  profile: 'driving-car' | 'driving-hgv' = 'driving-car'
): Promise<RouteResponse | null> {
  try {
    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': OPENROUTESERVICE_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json'
      },
      body: JSON.stringify({
        coordinates: [
          [startLng, startLat], // OpenRouteService utilise [lon, lat]
          [endLng, endLat]
        ],
        elevation: false,
        instructions: false,
        preference: 'recommended'
      })
    })

    if (!response.ok) {
      console.error('OpenRouteService error:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    
    if (!data.features || data.features.length === 0) {
      console.error('No route found')
      return null
    }

    const route = data.features[0]
    const geometry = route.geometry
    const properties = route.properties
    const summary = properties.summary

    // Convertir les coordonnées [lon, lat] en [lat, lon] pour Leaflet
    const coordinates: RouteCoordinates[] = geometry.coordinates.map((coord: number[]) => ({
      latitude: coord[1],
      longitude: coord[0]
    }))

    return {
      coordinates,
      distance: summary.distance, // en mètres
      duration: summary.duration, // en secondes
      geometry
    }
  } catch (error) {
    console.error('Error fetching route from OpenRouteService:', error)
    return null
  }
}

/**
 * Formatte la distance en km
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`
}

/**
 * Formatte la durée en heures et minutes
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours === 0) {
    return `${minutes} min`
  }
  
  return `${hours}h ${minutes}min`
}

/**
 * Calcule la distance entre deux points (formule de Haversine)
 * Utilisé comme fallback si OpenRouteService échoue
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance en mètres
}
