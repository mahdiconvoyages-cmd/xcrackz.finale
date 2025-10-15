import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GPSPosition {
  lat: number;
  lng: number;
  timestamp: number;
  bearing?: number;
  speed?: number;
  accuracy?: number;
}

class GPSTrackingService {
  private channel: RealtimeChannel | null = null;
  private watchSubscription: Location.LocationSubscription | null = null;
  private missionId: string | null = null;
  private isTracking = false;

  /**
   * Démarre le suivi GPS en temps réel pour une mission
   * @param missionId - ID de la mission à suivre
   * @param intervalMs - Intervalle de mise à jour en millisecondes (défaut: 2000ms)
   */
  async startTracking(missionId: string, intervalMs: number = 2000): Promise<void> {
    if (this.isTracking) {
      console.warn('GPS tracking already started');
      return;
    }

    try {
      // Demander les permissions de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission de localisation refusée');
      }

      // Vérifier que la localisation est activée
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        throw new Error('Les services de localisation sont désactivés');
      }

      this.missionId = missionId;
      this.isTracking = true;

      // Créer le canal Supabase Realtime
      this.channel = supabase.channel(`mission:${missionId}:gps`);
      
      await this.channel.subscribe((status) => {
        console.log('GPS tracking channel status:', status);
      });

      // Démarrer le suivi GPS
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: intervalMs,
          distanceInterval: 5, // Mise à jour tous les 5 mètres minimum
        },
        (location) => {
          this.publishPosition(location);
        }
      );

      console.log(`GPS tracking started for mission ${missionId}`);
    } catch (error) {
      console.error('Error starting GPS tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  /**
   * Publie la position GPS actuelle sur le canal Realtime
   */
  private publishPosition(location: Location.LocationObject): void {
    if (!this.channel || !this.missionId) {
      console.warn('Channel not initialized');
      return;
    }

    const position: GPSPosition = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      timestamp: location.timestamp,
      bearing: location.coords.heading || undefined,
      speed: location.coords.speed || undefined,
      accuracy: location.coords.accuracy || undefined,
    };

    // Publier sur le canal Realtime
    this.channel.send({
      type: 'broadcast',
      event: 'gps_update',
      payload: position,
    });

    console.log('GPS position published:', {
      lat: position.lat.toFixed(6),
      lng: position.lng.toFixed(6),
      bearing: position.bearing?.toFixed(0),
      speed: position.speed?.toFixed(1),
    });
  }

  /**
   * Arrête le suivi GPS
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    console.log('Stopping GPS tracking...');

    // Arrêter le suivi de position
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }

    // Désinscription du canal
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.missionId = null;
    this.isTracking = false;

    console.log('GPS tracking stopped');
  }

  /**
   * Obtient la position actuelle (une seule fois)
   */
  async getCurrentPosition(): Promise<GPSPosition> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission de localisation refusée');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      timestamp: location.timestamp,
      bearing: location.coords.heading || undefined,
      speed: location.coords.speed || undefined,
      accuracy: location.coords.accuracy || undefined,
    };
  }

  /**
   * Vérifie si le suivi est actif
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Obtient l'ID de la mission en cours de suivi
   */
  getActiveMissionId(): string | null {
    return this.missionId;
  }
}

// Instance singleton
export const gpsTrackingService = new GPSTrackingService();
