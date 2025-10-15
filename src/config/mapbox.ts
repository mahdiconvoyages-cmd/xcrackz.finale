import Constants from 'expo-constants';
import { supabase } from './supabase';

/**
 * Récupère le token Mapbox de manière sécurisée
 * 
 * Ordre de priorité :
 * 1. Supabase Edge Function (recommandé en production)
 * 2. Variables d'environnement Expo
 * 3. Configuration app.json
 * 4. Token de fallback (à éviter)
 * 
 * @returns {Promise<string>} Token Mapbox
 */
export async function getMapboxToken(): Promise<string> {
  try {
    // 1. Essayer de récupérer depuis Supabase secrets via Edge Function
    const { data, error } = await supabase.functions.invoke('get-mapbox-token');
    
    if (!error && data?.token) {
      console.log('[Mapbox] Token récupéré depuis Supabase secrets');
      return data.token;
    }
    
    if (error) {
      console.warn('[Mapbox] Erreur Supabase Edge Function:', error.message);
    }
  } catch (err) {
    console.warn('[Mapbox] Impossible de récupérer le token depuis Supabase:', err);
  }
  
  // 2. Fallback vers les variables d'environnement Expo
  const envToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (envToken) {
    console.log('[Mapbox] Token récupéré depuis EXPO_PUBLIC_MAPBOX_TOKEN');
    return envToken;
  }
  
  // 3. Fallback vers app.json extra
  const configToken = Constants?.expoConfig?.extra?.MAPBOX_TOKEN;
  if (configToken) {
    console.log('[Mapbox] Token récupéré depuis app.json');
    return configToken;
  }
  
  // 4. Token de secours (à utiliser uniquement en développement)
  console.warn('[Mapbox] ⚠️ Utilisation du token de secours - NON recommandé en production');
  return 'pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w';
}

/**
 * Récupère le token Mapbox de manière synchrone (uniquement depuis config locale)
 * Utile pour l'initialisation rapide
 * 
 * @returns {string} Token Mapbox depuis config locale uniquement
 */
export function getMapboxTokenSync(): string {
  return (
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
    Constants?.expoConfig?.extra?.MAPBOX_TOKEN ||
    'pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w'
  );
}
