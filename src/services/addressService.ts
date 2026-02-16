// Service d'autocomplete d'adresses via l'API Adresse Gouv
// API 100% gratuite, données officielles françaises (BAN)

const API_BASE_URL = 'https://api-adresse.data.gouv.fr';

export interface AddressFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    label: string; // Adresse complète formatée
    score: number; // Score de pertinence (0-1)
    housenumber?: string;
    id: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number; // longitude
    y: number; // latitude
    city: string;
    context: string; // Département, région
    type: string; // housenumber, street, locality, municipality
    importance: number;
    street?: string;
  };
}

export interface AddressSearchResponse {
  type: string;
  version: string;
  features: AddressFeature[];
  attribution: string;
  licence: string;
  query: string;
  limit: number;
}

export interface FormattedAddress {
  fullAddress: string;
  street: string;
  city: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  context: string;
}

/**
 * Recherche d'adresses via l'API Adresse Gouv
 * @param query - Texte de recherche
 * @param limit - Nombre de résultats max (défaut: 5)
 * @returns Liste d'adresses correspondantes
 */
export async function searchAddresses(
  query: string,
  limit: number = 5
): Promise<AddressFeature[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: limit.toString(),
      autocomplete: '1', // Mode autocomplete activé
    });

    const response = await fetch(`${API_BASE_URL}/search/?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: AddressSearchResponse = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error searching addresses:', error);
    return [];
  }
}

/**
 * Recherche d'adresses avec filtre par code postal
 * @param query - Texte de recherche
 * @param postcode - Code postal pour filtrer
 * @param limit - Nombre de résultats max
 */
export async function searchAddressesByPostcode(
  query: string,
  postcode: string,
  limit: number = 5
): Promise<AddressFeature[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      postcode: postcode,
      limit: limit.toString(),
      autocomplete: '1',
    });

    const response = await fetch(`${API_BASE_URL}/search/?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: AddressSearchResponse = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error searching addresses by postcode:', error);
    return [];
  }
}

/**
 * Géocodage inverse : obtenir l'adresse depuis des coordonnées
 * @param lat - Latitude
 * @param lon - Longitude
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<AddressFeature | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/reverse/?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: AddressSearchResponse = await response.json();
    return data.features[0] || null;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return null;
  }
}

/**
 * Formatte une feature de l'API en objet simplifié
 * @param feature - Feature de l'API
 */
export function formatAddress(feature: AddressFeature): FormattedAddress {
  return {
    fullAddress: feature.properties.label,
    street: feature.properties.street || feature.properties.name,
    city: feature.properties.city,
    postalCode: feature.properties.postcode,
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
    context: feature.properties.context,
  };
}

/**
 * Extrait les composants d'une adresse (numéro, rue, ville, CP)
 * @param feature - Feature de l'API
 */
export function extractAddressComponents(feature: AddressFeature) {
  return {
    number: feature.properties.housenumber || '',
    street: feature.properties.street || feature.properties.name || '',
    city: feature.properties.city || '',
    postalCode: feature.properties.postcode || '',
    department: feature.properties.context?.split(',')[0]?.trim() || '',
    region: feature.properties.context?.split(',')[2]?.trim() || '',
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
  };
}
