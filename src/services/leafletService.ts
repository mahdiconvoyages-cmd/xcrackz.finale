/**
 * Service Leaflet - Calcul de distance entre deux adresses
 * Utilise l'API Nominatim (OpenStreetMap) pour le géocodage - 100% gratuit et open source
 */

// API Nominatim (OpenStreetMap) - Pas de clé requise !
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
}

/**
 * Géocode une adresse en coordonnées GPS
 * Utilise Nominatim (OpenStreetMap) - Gratuit et sans limite stricte
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim().length === 0) {
    console.warn('⚠️ Adresse vide fournie au géocodage');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    
    // Nominatim Search API
    const url = `${NOMINATIM_URL}/search?q=${encodedAddress}&format=json&countrycodes=fr&limit=1&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FinaleApp/1.0 (contact@finale.com)', // User-Agent requis par Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim Geocoding API error: ${response.status}`);
    }

    const data: GeocodingResult[] = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      };
    }

    console.warn('⚠️ Aucun résultat trouvé pour l\'adresse:', address);
    return null;
  } catch (error) {
    console.error('❌ Erreur lors du géocodage avec Nominatim:', error);
    return null;
  }
}

/**
 * Calcule la distance routière entre deux points GPS
 * Utilise OSRM (Open Source Routing Machine) - Gratuit et open source
 */
export async function calculateRouteDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<{ distance: number; duration: number } | null> {
  try {
    // OSRM Demo Server (gratuit, open source)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;

    const response = await fetch(osrmUrl);

    if (!response.ok) {
      throw new Error(`OSRM Routing API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance / 1000, // mètres → km
        duration: route.duration / 60,   // secondes → minutes
      };
    }

    console.warn('⚠️ Aucune route trouvée entre les points');
    return null;
  } catch (error) {
    console.error('❌ Erreur lors du calcul de la route avec OSRM:', error);
    return null;
  }
}

/**
 * Calcule la distance à vol d'oiseau entre deux points GPS (formule de Haversine)
 * Utilisé comme fallback si OSRM échoue
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Fonction principale : calcule la distance entre deux adresses
 * 1. Géocode les deux adresses avec Nominatim
 * 2. Calcule la distance routière avec OSRM
 * 3. Fallback sur distance à vol d'oiseau si OSRM échoue
 */
export async function calculateDistanceBetweenAddresses(
  fromAddress: string,
  toAddress: string
): Promise<{ distance: number; duration?: number; method: 'route' | 'haversine' } | null> {
  try {
    // Étape 1: Géocoder les deux adresses
    console.log('🔍 Géocodage des adresses...');
    const [fromCoords, toCoords] = await Promise.all([
      geocodeAddress(fromAddress),
      geocodeAddress(toAddress),
    ]);

    if (!fromCoords || !toCoords) {
      console.error('❌ Impossible de géocoder les adresses');
      return null;
    }

    console.log('✅ Coordonnées obtenues:', { fromCoords, toCoords });

    // Étape 2: Essayer de calculer la distance routière avec OSRM
    const routeData = await calculateRouteDistance(
      fromCoords.lat,
      fromCoords.lng,
      toCoords.lat,
      toCoords.lng
    );

    if (routeData) {
      console.log('✅ Distance routière calculée:', routeData.distance, 'km');
      return {
        distance: routeData.distance,
        duration: routeData.duration,
        method: 'route',
      };
    }

    // Étape 3: Fallback sur distance à vol d'oiseau
    console.log('⚠️ OSRM échoué, utilisation de la distance à vol d\'oiseau');
    const haversineDistance = calculateHaversineDistance(
      fromCoords.lat,
      fromCoords.lng,
      toCoords.lat,
      toCoords.lng
    );

    return {
      distance: haversineDistance,
      method: 'haversine',
    };
  } catch (error) {
    console.error('❌ Erreur lors du calcul de distance:', error);
    return null;
  }
}

/**
 * Fonction utilitaire pour obtenir les suggestions d'adresse
 * Utilise Nominatim Autocomplete
 */
export async function searchAddresses(query: string, limit: number = 5): Promise<any[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `${NOMINATIM_URL}/search?q=${encodedQuery}&format=json&countrycodes=fr&limit=${limit}&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FinaleApp/1.0 (contact@finale.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim Search error: ${response.status}`);
    }

    const data: GeocodingResult[] = await response.json();

    return data.map((result) => ({
      id: result.lat + result.lon,
      label: result.display_name,
      value: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.address,
    }));
  } catch (error) {
    console.error('❌ Erreur lors de la recherche d\'adresses:', error);
    return [];
  }
}
