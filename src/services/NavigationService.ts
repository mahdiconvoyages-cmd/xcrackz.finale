/**
 * Service de Navigation GPS
 * 
 * Gère les sessions de navigation Mapbox avec:
 * - Calcul d'itinéraire optimisé
 * - Tracking progression
 * - Monitoring quota
 * - Cache intelligent
 */

import { supabase } from '../lib/supabase';
import { MAPBOX_CONFIG, validateMapboxConfig } from '../../mapbox-config';

export interface NavigationRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry: any; // GeoJSON
  steps: NavigationStep[];
  alternatives?: NavigationRoute[];
}

export interface NavigationStep {
  distance: number;
  duration: number;
  instruction: string;
  maneuver: {
    type: string;
    modifier?: string;
    bearing_after: number;
    bearing_before: number;
    location: [number, number];
  };
  voice_instructions?: VoiceInstruction[];
}

export interface VoiceInstruction {
  distanceAlongGeometry: number;
  announcement: string;
  ssmlAnnouncement: string;
}

export interface NavigationProgress {
  distanceRemaining: number;
  durationRemaining: number;
  currentStepIndex: number;
  currentInstruction: string;
  percentComplete: number;
}

class NavigationService {
  private activeSessionId: string | null = null;
  private routeCache: Map<string, NavigationRoute> = new Map();
  
  /**
   * Démarrer une session de navigation
   */
  async startNavigationSession(params: {
    origin: [number, number]; // [lng, lat]
    destination: [number, number];
    missionId: string;
    waypoints?: [number, number][]; // Points intermédiaires
  }): Promise<NavigationRoute> {
    // Valider configuration
    if (!validateMapboxConfig()) {
      throw new Error('Configuration Mapbox invalide');
    }
    
    try {
      // 1. Vérifier quota mensuel
      await this.checkQuota();
      
      // 2. Vérifier cache
      const cacheKey = this.getCacheKey(params.origin, params.destination);
      const cachedRoute = await this.getCachedRoute(cacheKey);
      
      if (cachedRoute) {
        console.log('✅ Route récupérée du cache');
        await this.createSession(params.missionId, cachedRoute, true);
        return cachedRoute;
      }
      
      // 3. Calculer itinéraire
      const route = await this.calculateRoute(params);
      
      // 4. Créer session en BDD
      await this.createSession(params.missionId, route, false);
      
      // 5. Mettre en cache
      await this.cacheRoute(cacheKey, route);
      
      return route;
      
    } catch (error: any) {
      console.error('❌ Erreur session navigation:', error);
      throw new Error(`Navigation error: ${error.message}`);
    }
  }
  
  /**
   * Vérifier le quota mensuel Mapbox
   */
  private async checkQuota(): Promise<void> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('navigation_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString());
    
    if (error) {
      console.error('Erreur vérification quota:', error);
      return;
    }
    
    const sessionsUsed = count || 0;
    const percentUsed = (sessionsUsed / MAPBOX_CONFIG.limits.maxSessionsPerMonth) * 100;
    
    console.log(`📊 Quota Mapbox: ${sessionsUsed}/${MAPBOX_CONFIG.limits.maxSessionsPerMonth} sessions (${percentUsed.toFixed(1)}%)`);
    
    // Alertes
    if (sessionsUsed >= MAPBOX_CONFIG.limits.criticalThreshold) {
      console.error(`🚨 CRITIQUE: ${sessionsUsed} sessions utilisées (>96%)`);
      // TODO: Notifier admin
    } else if (sessionsUsed >= MAPBOX_CONFIG.limits.warningThreshold) {
      console.warn(`⚠️ ATTENTION: ${sessionsUsed} sessions utilisées (>80%)`);
    }
    
    // Bloquer si quota dépassé
    if (sessionsUsed >= MAPBOX_CONFIG.limits.maxSessionsPerMonth) {
      throw new Error(
        `Quota Mapbox atteint (${sessionsUsed}/${MAPBOX_CONFIG.limits.maxSessionsPerMonth}). ` +
        'Les nouvelles navigations seront facturées 0.50$/session.'
      );
    }
  }
  
  /**
   * Calculer un itinéraire optimisé
   */
  private async calculateRoute(params: {
    origin: [number, number];
    destination: [number, number];
    waypoints?: [number, number][];
  }): Promise<NavigationRoute> {
    // Construire les coordonnées
    const coordinates = [
      params.origin,
      ...(params.waypoints || []),
      params.destination,
    ].map(coord => coord.join(',')).join(';');
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/${MAPBOX_CONFIG.navigation.routeProfile}/${coordinates}`;
    
    const queryParams = new URLSearchParams({
      access_token: MAPBOX_CONFIG.accessToken,
      alternatives: MAPBOX_CONFIG.navigation.alternatives ? 'true' : 'false',
      geometries: 'geojson',
      steps: 'true',
      banner_instructions: 'true',
      voice_instructions: 'true',
      voice_units: MAPBOX_CONFIG.navigation.voiceUnits,
      language: MAPBOX_CONFIG.navigation.language,
      overview: 'full',
      continue_straight: 'true',
    });
    
    console.log('🗺️ Calcul itinéraire Mapbox...');
    const response = await fetch(`${url}?${queryParams}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mapbox API error: ${error.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('Aucun itinéraire trouvé');
    }
    
    const primaryRoute = data.routes[0];
    const alternatives = data.routes.slice(1);
    
    return {
      distance: primaryRoute.distance,
      duration: primaryRoute.duration,
      geometry: primaryRoute.geometry,
      steps: primaryRoute.legs[0].steps.map((step: any) => ({
        distance: step.distance,
        duration: step.duration,
        instruction: step.maneuver.instruction,
        maneuver: step.maneuver,
        voice_instructions: step.voiceInstructions,
      })),
      alternatives: alternatives.map((alt: any) => ({
        distance: alt.distance,
        duration: alt.duration,
        geometry: alt.geometry,
        steps: alt.legs[0].steps,
      })),
    };
  }
  
  /**
   * Créer une session en base de données
   */
  private async createSession(
    missionId: string, 
    route: NavigationRoute,
    fromCache: boolean
  ): Promise<void> {
    const { data, error } = await supabase
      .from('navigation_sessions')
      .insert({
        mission_id: missionId,
        started_at: new Date().toISOString(),
        status: 'active',
        distance_meters: route.distance,
        estimated_duration_seconds: route.duration,
        from_cache: fromCache,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Erreur création session:', error);
      throw error;
    }
    
    this.activeSessionId = data.id;
    console.log(`✅ Session navigation créée: ${data.id}`);
  }
  
  /**
   * Mettre à jour la progression
   */
  async updateProgress(progress: NavigationProgress): Promise<void> {
    if (!this.activeSessionId) return;
    
    await supabase
      .from('navigation_sessions')
      .update({
        distance_remaining_meters: progress.distanceRemaining,
        duration_remaining_seconds: progress.durationRemaining,
        percent_complete: progress.percentComplete,
        last_update: new Date().toISOString(),
      })
      .eq('id', this.activeSessionId);
  }
  
  /**
   * Terminer une session
   */
  async endNavigationSession(arrived: boolean): Promise<void> {
    if (!this.activeSessionId) return;
    
    await supabase
      .from('navigation_sessions')
      .update({
        ended_at: new Date().toISOString(),
        status: arrived ? 'completed' : 'cancelled',
      })
      .eq('id', this.activeSessionId);
    
    console.log(`✅ Session terminée: ${arrived ? 'Arrivé' : 'Annulée'}`);
    this.activeSessionId = null;
  }
  
  /**
   * Gestion du cache
   */
  private getCacheKey(origin: [number, number], destination: [number, number]): string {
    return `route_${origin.join(',')}_${destination.join(',')}`;
  }
  
  private async getCachedRoute(key: string): Promise<NavigationRoute | null> {
    if (!MAPBOX_CONFIG.cache.enabled) return null;
    
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { route, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // Vérifier TTL
      if (age > MAPBOX_CONFIG.cache.ttl * 1000) {
        localStorage.removeItem(key);
        return null;
      }
      
      return route;
    } catch {
      return null;
    }
  }
  
  private async cacheRoute(key: string, route: NavigationRoute): Promise<void> {
    if (!MAPBOX_CONFIG.cache.enabled) return;
    
    try {
      localStorage.setItem(key, JSON.stringify({
        route,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Erreur cache route:', error);
    }
  }
  
  /**
   * Obtenir statistiques du mois
   */
  async getMonthlyStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    totalDistance: number;
    totalDuration: number;
    quotaUsed: number;
    quotaRemaining: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('navigation_sessions')
      .select('*')
      .gte('created_at', startOfMonth.toISOString());
    
    if (error || !data) {
      throw error;
    }
    
    const totalSessions = data.length;
    const activeSessions = data.filter(s => s.status === 'active').length;
    const completedSessions = data.filter(s => s.status === 'completed').length;
    const cancelledSessions = data.filter(s => s.status === 'cancelled').length;
    
    const totalDistance = data.reduce((sum, s) => sum + (s.distance_meters || 0), 0);
    const totalDuration = data.reduce((sum, s) => sum + (s.estimated_duration_seconds || 0), 0);
    
    return {
      totalSessions,
      activeSessions,
      completedSessions,
      cancelledSessions,
      totalDistance,
      totalDuration,
      quotaUsed: totalSessions,
      quotaRemaining: MAPBOX_CONFIG.limits.maxSessionsPerMonth - totalSessions,
    };
  }
}

export const navigationService = new NavigationService();
