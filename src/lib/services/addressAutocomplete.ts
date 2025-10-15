// Service d'Auto-complétion d'Adresses Françaises
// API: api-adresse.data.gouv.fr (100% GRATUIT, sans limite!)
// Documentation: https://adresse.data.gouv.fr/api-doc/adresse

export interface AddressSuggestion {
  label: string // Adresse complète formatée
  name: string // Nom de la rue
  postcode: string // Code postal
  city: string // Ville
  context: string // Contexte (département, région)
  type: string // Type (housenumber, street, locality, municipality)
  importance: number // Score de pertinence
  coordinates: {
    lat: number
    lon: number
  }
  // Données brutes
  properties: {
    label: string
    score: number
    housenumber?: string
    id: string
    name: string
    postcode: string
    citycode: string
    x: number
    y: number
    city: string
    context: string
    type: string
    importance: number
  }
}

export interface GeocodingResult {
  address: string
  latitude: number
  longitude: number
  postcode: string
  city: string
  fullData: AddressSuggestion
}

/**
 * Recherche d'adresses avec auto-complétion
 * @param query Texte de recherche (ex: "8 Boulevard du Palais, Paris")
 * @param limit Nombre maximum de résultats (défaut: 5)
 * @returns Liste de suggestions d'adresses
 */
export async function searchAddress(
  query: string,
  limit: number = 5
): Promise<AddressSuggestion[]> {
  if (!query || query.length < 3) {
    return []
  }

  try {
    const url = new URL('https://api-adresse.data.gouv.fr/search/')
    url.searchParams.append('q', query)
    url.searchParams.append('limit', limit.toString())
    url.searchParams.append('autocomplete', '1')

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error('Address API error:', response.status)
      return []
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return []
    }

    // Transformer les résultats
    return data.features.map((feature: any) => ({
      label: feature.properties.label,
      name: feature.properties.name,
      postcode: feature.properties.postcode,
      city: feature.properties.city,
      context: feature.properties.context,
      type: feature.properties.type,
      importance: feature.properties.importance,
      coordinates: {
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
      },
      properties: feature.properties,
    }))
  } catch (error) {
    console.error('Error searching address:', error)
    return []
  }
}

/**
 * Géocodage inverse: trouve l'adresse à partir de coordonnées GPS
 * @param lat Latitude
 * @param lon Longitude
 * @returns Adresse trouvée
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<AddressSuggestion | null> {
  try {
    const url = new URL('https://api-adresse.data.gouv.fr/reverse/')
    url.searchParams.append('lat', lat.toString())
    url.searchParams.append('lon', lon.toString())

    const response = await fetch(url.toString())

    if (!response.ok) {
      console.error('Reverse geocoding error:', response.status)
      return null
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return null
    }

    const feature = data.features[0]
    return {
      label: feature.properties.label,
      name: feature.properties.name,
      postcode: feature.properties.postcode,
      city: feature.properties.city,
      context: feature.properties.context,
      type: feature.properties.type,
      importance: feature.properties.importance,
      coordinates: {
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
      },
      properties: feature.properties,
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error)
    return null
  }
}

/**
 * Géocode une adresse (texte → coordonnées GPS)
 * @param address Adresse à géocoder
 * @returns Résultat avec adresse et coordonnées
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  const results = await searchAddress(address, 1)

  if (results.length === 0) {
    return null
  }

  const result = results[0]
  return {
    address: result.label,
    latitude: result.coordinates.lat,
    longitude: result.coordinates.lon,
    postcode: result.postcode,
    city: result.city,
    fullData: result,
  }
}

/**
 * Formatte une adresse de manière lisible
 * @param suggestion Suggestion d'adresse
 * @returns Adresse formatée
 */
export function formatAddress(suggestion: AddressSuggestion): string {
  return suggestion.label
}

/**
 * Extrait le code postal d'une adresse
 * @param suggestion Suggestion d'adresse
 * @returns Code postal
 */
export function getPostcode(suggestion: AddressSuggestion): string {
  return suggestion.postcode
}

/**
 * Extrait la ville d'une adresse
 * @param suggestion Suggestion d'adresse
 * @returns Ville
 */
export function getCity(suggestion: AddressSuggestion): string {
  return suggestion.city
}
