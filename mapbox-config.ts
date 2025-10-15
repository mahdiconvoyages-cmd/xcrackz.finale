/**
 * Configuration Google Maps
 */

export const MAPBOX_CONFIG = {
  accessToken: 'AIzaSyCdeN_VJpvLb_9Pigkwd_o2WGxDqagKq_Q', // Google Maps API Key
  style: 'standard', // Google Maps style
  navigationProfile: 'driving', // Google Maps navigation profile
};

export function validateMapboxConfig(): boolean {
  return !!(MAPBOX_CONFIG.accessToken && MAPBOX_CONFIG.accessToken.startsWith('AIza'));
}
