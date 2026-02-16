/**
 * Utilitaires géographiques pour calculs de distance et gestion de coordonnées
 */

/**
 * Calcule la distance entre deux points GPS en utilisant la formule de Haversine
 * 
 * @param from Coordonnées de départ [longitude, latitude]
 * @param to Coordonnées d'arrivée [longitude, latitude]
 * @returns Distance en kilomètres (arrondie)
 * 
 * @example
 * const distance = calculateDistance(
 *   [2.3522, 48.8566],  // Paris
 *   [4.8357, 45.7640]   // Lyon
 * );
 * console.log(distance); // ~465 km
 */
export const calculateDistance = (
  from: [number, number],
  to: [number, number]
): number => {
  const R = 6371; // Rayon de la Terre en km
  
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const dLat = ((to[1] - from[1]) * Math.PI) / 180;
  const dLon = ((to[0] - from[0]) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
};

/**
 * Estime le temps de trajet en fonction de la distance
 * Utilise une vitesse moyenne de 90 km/h (autoroute)
 * 
 * @param distanceKm Distance en kilomètres
 * @param speedKmh Vitesse moyenne (défaut: 90 km/h)
 * @returns Durée en minutes
 * 
 * @example
 * const duration = estimateDuration(465); // Paris-Lyon
 * console.log(duration); // ~310 minutes (5h10)
 */
export const estimateDuration = (
  distanceKm: number,
  speedKmh: number = 90
): number => {
  return Math.round((distanceKm / speedKmh) * 60);
};

/**
 * Formate une durée en minutes en format lisible (HhMM)
 * 
 * @param minutes Durée en minutes
 * @returns Chaîne formatée (ex: "4h30", "1h15", "45min")
 * 
 * @example
 * formatDuration(270);  // "4h30"
 * formatDuration(75);   // "1h15"
 * formatDuration(45);   // "45min"
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}min`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h${mins.toString().padStart(2, '0')}`;
};

/**
 * Calcule le prix suggéré pour un trajet en covoiturage
 * Basé sur le barème BlaBlaCar: ~0.08€/km/passager
 * 
 * @param distanceKm Distance en kilomètres
 * @param pricePerKm Prix par kilomètre (défaut: 0.08€)
 * @returns Prix suggéré arrondi
 * 
 * @example
 * const price = calculateSuggestedPrice(465); // Paris-Lyon
 * console.log(price); // ~25€ (arrondi de 37.2€)
 */
export const calculateSuggestedPrice = (
  distanceKm: number,
  pricePerKm: number = 0.08
): number => {
  const basePrice = distanceKm * pricePerKm;
  
  // Arrondir au multiple de 5 le plus proche
  return Math.round(basePrice / 5) * 5;
};

/**
 * Valide des coordonnées GPS
 * 
 * @param coords Coordonnées [longitude, latitude]
 * @returns true si valides, false sinon
 * 
 * @example
 * isValidCoordinates([2.3522, 48.8566]); // true
 * isValidCoordinates([200, 100]); // false
 */
export const isValidCoordinates = (
  coords: [number, number] | null
): coords is [number, number] => {
  if (!coords || coords.length !== 2) return false;
  
  const [lng, lat] = coords;
  
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

/**
 * Génère une BoundingBox pour Mapbox depuis deux points
 * 
 * @param point1 Premier point [lng, lat]
 * @param point2 Deuxième point [lng, lat]
 * @param padding Padding en degrés (défaut: 0.1)
 * @returns BoundingBox [minLng, minLat, maxLng, maxLat]
 * 
 * @example
 * const bbox = getBoundingBox(parisCoords, lyonCoords);
 * // Utilisable avec Mapbox fitBounds()
 */
export const getBoundingBox = (
  point1: [number, number],
  point2: [number, number],
  padding: number = 0.1
): [number, number, number, number] => {
  const minLng = Math.min(point1[0], point2[0]) - padding;
  const maxLng = Math.max(point1[0], point2[0]) + padding;
  const minLat = Math.min(point1[1], point2[1]) - padding;
  const maxLat = Math.max(point1[1], point2[1]) + padding;
  
  return [minLng, minLat, maxLng, maxLat];
};

/**
 * Calcule le point central entre deux coordonnées
 * 
 * @param point1 Premier point [lng, lat]
 * @param point2 Deuxième point [lng, lat]
 * @returns Point central [lng, lat]
 * 
 * @example
 * const center = getCenterPoint(parisCoords, lyonCoords);
 * // Utile pour centrer une carte Mapbox
 */
export const getCenterPoint = (
  point1: [number, number],
  point2: [number, number]
): [number, number] => {
  return [
    (point1[0] + point2[0]) / 2,
    (point1[1] + point2[1]) / 2,
  ];
};

/**
 * Formate une distance en format lisible
 * 
 * @param meters Distance en mètres
 * @returns Chaîne formatée (ex: "1.5 km", "350 m")
 * 
 * @example
 * formatDistance(1500);   // "1.5 km"
 * formatDistance(350);    // "350 m"
 */
export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  }
  return `${Math.round(meters)} m`;
};

/**
 * Détermine le niveau de confort suggéré selon la distance
 * 
 * @param distanceKm Distance en kilomètres
 * @returns Niveau de confort ('basic' | 'comfort' | 'premium')
 * 
 * @example
 * getSuggestedComfortLevel(50);   // 'basic'
 * getSuggestedComfortLevel(200);  // 'comfort'
 * getSuggestedComfortLevel(500);  // 'premium'
 */
export const getSuggestedComfortLevel = (
  distanceKm: number
): 'basic' | 'comfort' | 'premium' => {
  if (distanceKm < 100) return 'basic';
  if (distanceKm < 300) return 'comfort';
  return 'premium';
};

/**
 * Vérifie si deux points sont proches (dans un rayon donné)
 * 
 * @param point1 Premier point [lng, lat]
 * @param point2 Deuxième point [lng, lat]
 * @param radiusKm Rayon en kilomètres (défaut: 10 km)
 * @returns true si les points sont proches, false sinon
 * 
 * @example
 * const isNearby = arePointsNearby(parisCoords, nearby Coords, 5);
 */
export const arePointsNearby = (
  point1: [number, number],
  point2: [number, number],
  radiusKm: number = 10
): boolean => {
  const distance = calculateDistance(point1, point2);
  return distance <= radiusKm;
};
