/**
 * Utilitaires pour gérer les images par défaut des véhicules
 * selon leur type (VL/VU/PL) - Version Web
 */

/**
 * Retourne l'URL de l'image par défaut selon le type de véhicule
 * Utilisé quand vehicle_image_url est null/undefined
 */
export const getDefaultVehicleImage = (vehicleType: 'VL' | 'VU' | 'PL' = 'VL'): string => {
  const defaultPhotos = {
    'VL': '/images/vehicles/vl-default.png',
    'VU': '/images/vehicles/vu-default.png',
    'PL': '/images/vehicles/pl-default.png',
  };
  
  return defaultPhotos[vehicleType] || defaultPhotos['VL'];
};

/**
 * Retourne l'URL de l'image avec fallback sur photo par défaut
 */
export const getVehicleImageUrl = (
  imageUrl: string | null | undefined,
  vehicleType: 'VL' | 'VU' | 'PL' = 'VL'
): string => {
  return imageUrl || getDefaultVehicleImage(vehicleType);
};
