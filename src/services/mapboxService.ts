/**
 * Service Mapbox - Calcul de distance entre deux adresses
 * Utilise l'API Mapbox Geocoding + Directions
 */

// Clé API Mapbox - À configurer dans .env
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

interface Coordinates {
  longitude: number;
  latitude: number;
}

interface GeocodeResult {
  coordinates: Coordinates;
  place_name: string;
}

interface DistanceResult {
  distance_km: number;
  duration_minutes: number;
  from_address: string;
  to_address: string;
  route_geometry?: any; // GeoJSON geometry pour affichage sur carte
}

/**
 * Geocode une adresse en coordonnées GPS
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('❌ MAPBOX_ACCESS_TOKEN non configuré dans .env');
    throw new Error('Mapbox token manquant. Ajoutez VITE_MAPBOX_ACCESS_TOKEN dans votre fichier .env');
  }

  if (!address || address.trim() === '') {
    throw new Error('Adresse vide');
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&country=FR&limit=1`;

    console.log('🔍 Geocoding:', address);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn('⚠️ Adresse non trouvée:', address);
      return null;
    }

    const feature = data.features[0];
    const [longitude, latitude] = feature.center;

    console.log('✅ Geocoded:', feature.place_name);

    return {
      coordinates: { longitude, latitude },
      place_name: feature.place_name
    };
  } catch (error) {
    console.error('❌ Erreur geocoding:', error);
    throw error;
  }
}

/**
 * Calcule la distance et le temps de trajet entre deux adresses
 * Utilise l'API Mapbox Directions
 */
export async function calculateDistance(
  fromAddress: string,
  toAddress: string
): Promise<DistanceResult> {
  if (!MAPBOX_TOKEN) {
    throw new Error('Mapbox token manquant. Ajoutez VITE_MAPBOX_ACCESS_TOKEN dans votre fichier .env');
  }

  console.log('🚗 Calcul distance:', fromAddress, '→', toAddress);

  try {
    // 1. Geocoder les deux adresses
    const [fromGeocode, toGeocode] = await Promise.all([
      geocodeAddress(fromAddress),
      geocodeAddress(toAddress)
    ]);

    if (!fromGeocode || !toGeocode) {
      throw new Error('Une ou plusieurs adresses n\'ont pas pu être géocodées');
    }

    // 2. Appeler l'API Directions
    const { longitude: fromLon, latitude: fromLat } = fromGeocode.coordinates;
    const { longitude: toLon, latitude: toLat } = toGeocode.coordinates;

    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLon},${fromLat};${toLon},${toLat}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;

    console.log('🛣️ Récupération itinéraire...');
    const response = await fetch(directionsUrl);

    if (!response.ok) {
      throw new Error(`Mapbox Directions API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('Aucun itinéraire trouvé entre ces deux adresses');
    }

    const route = data.routes[0];
    const distanceMeters = route.distance;
    const durationSeconds = route.duration;

    // Convertir en km et minutes
    const distance_km = Math.round(distanceMeters / 1000);
    const duration_minutes = Math.round(durationSeconds / 60);

    console.log(`✅ Distance calculée: ${distance_km} km (${duration_minutes} min)`);

    return {
      distance_km,
      duration_minutes,
      from_address: fromGeocode.place_name,
      to_address: toGeocode.place_name,
      route_geometry: route.geometry
    };
  } catch (error) {
    console.error('❌ Erreur calcul distance:', error);
    throw error;
  }
}

/**
 * Valide si une adresse peut être géocodée
 * Utile pour autocomplétion et validation
 */
export async function validateAddress(address: string): Promise<boolean> {
  try {
    const result = await geocodeAddress(address);
    return result !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Recherche d'adresses avec suggestions (autocomplete)
 */
export async function searchAddresses(query: string, limit: number = 5): Promise<string[]> {
  if (!MAPBOX_TOKEN) {
    console.error('❌ MAPBOX_ACCESS_TOKEN non configuré');
    return [];
  }

  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&country=FR&limit=${limit}&types=address,place`;

    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature: any) => feature.place_name);
  } catch (error) {
    console.error('❌ Erreur recherche adresses:', error);
    return [];
  }
}

/**
 * Calcule la distance "à vol d'oiseau" (haversine)
 * Utile pour estimation rapide sans appel API
 */
export function calculateStraightDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Exemple d'utilisation:
 * 
 * // Calcul distance
 * const result = await calculateDistance(
 *   "10 Rue de Rivoli, Paris",
 *   "Tour Eiffel, Paris"
 * );
 * console.log(`Distance: ${result.distance_km} km`);
 * console.log(`Durée: ${result.duration_minutes} minutes`);
 * 
 * // Recherche adresses (autocomplete)
 * const suggestions = await searchAddresses("10 rue");
 * console.log(suggestions); // ["10 Rue de...", "10 Rue du...", ...]
 * 
 * // Validation adresse
 * const isValid = await validateAddress("Paris, France");
 * console.log(isValid); // true
 */
