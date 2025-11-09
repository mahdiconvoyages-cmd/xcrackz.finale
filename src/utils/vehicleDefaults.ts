/**
 * Utilitaires pour gérer les images par défaut des véhicules
 * selon leur type (VL/VU/PL)
 */

/**
 * Retourne l'image par défaut selon le type de véhicule
 * Utilisé quand vehicle_image_url est null/undefined
 */
export const getDefaultVehicleImage = (vehicleType: 'VL' | 'VU' | 'PL' = 'VL') => {
  const defaultPhotos = {
    'VL': require('../../assets/vehicles/avant.png'),
    'VU': require('../../assets/vehicles/master avant.png'),
    'PL': require('../../assets/vehicles/scania-avant.png'),
  };
  
  return defaultPhotos[vehicleType] || defaultPhotos['VL'];
};

/**
 * Retourne la source d'image avec fallback sur photo par défaut
 * Compatible avec React Native Image component
 */
export const getVehicleImageSource = (
  imageUrl: string | null | undefined,
  vehicleType: 'VL' | 'VU' | 'PL' = 'VL'
) => {
  if (imageUrl) {
    return { uri: imageUrl };
  }
  return getDefaultVehicleImage(vehicleType);
};
