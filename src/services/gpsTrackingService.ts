import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  accuracy: number | null;
  timestamp: string;
}

interface TrackingState {
  missionId: string | null;
  isTracking: boolean;
  lastUpdate: string | null;
}

let trackingState: TrackingState = {
  missionId: null,
  isTracking: false,
  lastUpdate: null,
};

/**
 * Définir la tâche de tracking en arrière-plan
 * Cette tâche sera exécutée même quand l'app est en background
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (!trackingState.missionId) {
      console.log('No active mission, skipping location save');
      return;
    }

    try {
      const locationPoint: LocationPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        speed: location.coords.speed,
        heading: location.coords.heading,
        altitude: location.coords.altitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      // Sauvegarder dans Supabase
      const { error: insertError } = await supabase
        .from('mission_locations')
        .insert({
          mission_id: trackingState.missionId,
          latitude: locationPoint.latitude,
          longitude: locationPoint.longitude,
          speed: locationPoint.speed,
          heading: locationPoint.heading,
          altitude: locationPoint.altitude,
          accuracy: locationPoint.accuracy,
          recorded_at: locationPoint.timestamp,
        });

      if (insertError) {
        console.error('Error saving location:', insertError);
      } else {
        trackingState.lastUpdate = new Date().toISOString();
        console.log('Location saved successfully:', locationPoint);
      }
    } catch (error) {
      console.error('Error processing location:', error);
    }
  }
});

/**
 * Démarrer le suivi GPS en arrière-plan
 */
export async function startBackgroundTracking(missionId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Vérifier les permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return {
        success: false,
        message: 'Permission de localisation refusée',
      };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return {
        success: false,
        message: 'Permission de localisation en arrière-plan refusée. Activez-la dans les paramètres.',
      };
    }

    // Vérifier si déjà en cours
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    // Configurer l'état
    trackingState.missionId = missionId;
    trackingState.isTracking = true;
    trackingState.lastUpdate = new Date().toISOString();

    // Démarrer le suivi en arrière-plan avec mise à jour toutes les 2 secondes
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000, // Mise à jour toutes les 2 secondes
      distanceInterval: 0, // Pas de filtre par distance (on veut toutes les positions)
      foregroundService: {
        notificationTitle: 'Suivi GPS actif',
        notificationBody: 'xCRACKZ suit votre position pour la mission',
        notificationColor: '#2563EB',
      },
      pausesUpdatesAutomatically: false, // Ne pas mettre en pause automatiquement
      showsBackgroundLocationIndicator: true, // Indicateur iOS
    });

    // Générer le lien de suivi public
    const trackingLink = await generatePublicTrackingLink(missionId);

    return {
      success: true,
      message: `Suivi démarré. Lien: ${trackingLink}`,
    };
  } catch (error: any) {
    console.error('Error starting background tracking:', error);
    return {
      success: false,
      message: error.message || 'Impossible de démarrer le suivi',
    };
  }
}

/**
 * Arrêter le suivi GPS en arrière-plan
 */
export async function stopBackgroundTracking(): Promise<{ success: boolean; message: string }> {
  try {
    const isTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    
    if (isTracking) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    trackingState.missionId = null;
    trackingState.isTracking = false;

    return {
      success: true,
      message: 'Suivi arrêté',
    };
  } catch (error: any) {
    console.error('Error stopping tracking:', error);
    return {
      success: false,
      message: error.message || 'Erreur lors de l\'arrêt du suivi',
    };
  }
}

/**
 * Vérifier si le suivi est actif
 */
export async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    return false;
  }
}

/**
 * Obtenir l'état actuel du tracking
 */
export function getTrackingState(): TrackingState {
  return { ...trackingState };
}

/**
 * Générer un lien public de suivi pour la mission
 */
async function generatePublicTrackingLink(missionId: string): Promise<string> {
  try {
    // Générer un token unique pour le partage public
    const trackingToken = `${missionId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Mettre à jour la mission avec le token de tracking
    const { error } = await supabase
      .from('missions')
      .update({
        public_tracking_link: trackingToken,
        tracking_started_at: new Date().toISOString(),
      })
      .eq('id', missionId);

    if (error) {
      console.error('Error generating tracking link:', error);
      return '';
    }

    // URL publique (à adapter selon votre domaine)
    return `https://xcrackz.com/tracking/${trackingToken}`;
  } catch (error) {
    console.error('Error generating tracking link:', error);
    return '';
  }
}

/**
 * Récupérer l'historique des positions pour une mission
 */
export async function getLocationHistory(missionId: string): Promise<LocationPoint[]> {
  try {
    const { data, error } = await supabase
      .from('mission_locations')
      .select('*')
      .eq('mission_id', missionId)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('Error fetching location history:', error);
      return [];
    }

    // Mapper les données de la DB vers LocationPoint
    return (data || []).map(loc => ({
      latitude: parseFloat(loc.latitude),
      longitude: parseFloat(loc.longitude),
      speed: loc.speed ? parseFloat(loc.speed) : null,
      heading: loc.heading ? parseFloat(loc.heading) : null,
      altitude: loc.altitude ? parseFloat(loc.altitude) : null,
      accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
      timestamp: loc.recorded_at,
    }));
  } catch (error) {
    console.error('Error fetching location history:', error);
    return [];
  }
}

/**
 * Calculer la distance totale parcourue pour une mission
 */
export function calculateTotalDistance(locations: LocationPoint[]): number {
  if (locations.length < 2) return 0;

  let totalDistance = 0;

  for (let i = 1; i < locations.length; i++) {
    const prev = locations[i - 1];
    const current = locations[i];

    // Formule Haversine pour calculer la distance entre deux points GPS
    const R = 6371; // Rayon de la Terre en km
    const dLat = toRad(current.latitude - prev.latitude);
    const dLon = toRad(current.longitude - prev.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(prev.latitude)) *
        Math.cos(toRad(current.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    totalDistance += distance;
  }

  return totalDistance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Obtenir les statistiques de tracking pour une mission
 */
export async function getTrackingStats(missionId: string): Promise<{
  totalDistance: number;
  totalDuration: number;
  averageSpeed: number;
  maxSpeed: number;
  pointsCount: number;
}> {
  try {
    const locations = await getLocationHistory(missionId);

    if (locations.length === 0) {
      return {
        totalDistance: 0,
        totalDuration: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        pointsCount: 0,
      };
    }

    const totalDistance = calculateTotalDistance(locations);

    const firstTimestamp = new Date(locations[0].timestamp).getTime();
    const lastTimestamp = new Date(locations[locations.length - 1].timestamp).getTime();
    const totalDuration = (lastTimestamp - firstTimestamp) / 1000 / 60; // en minutes

    const speeds = locations.filter(loc => loc.speed !== null).map(loc => loc.speed!);
    const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: Math.round(totalDuration),
      averageSpeed: Math.round(averageSpeed * 3.6 * 100) / 100, // Conversion m/s en km/h
      maxSpeed: Math.round(maxSpeed * 3.6 * 100) / 100, // Conversion m/s en km/h
      pointsCount: locations.length,
    };
  } catch (error) {
    console.error('Error calculating tracking stats:', error);
    return {
      totalDistance: 0,
      totalDuration: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      pointsCount: 0,
    };
  }
}

/**
 * 🚀 NOUVEAU: Surveiller automatiquement les missions pour arrêter le tracking
 * Retourne une fonction de nettoyage pour désabonner
 */
export function setupAutoStopTracking(): () => void {
  console.log('🔍 Configuration surveillance auto-stop tracking...');
  
  // S'abonner aux changements de statut des missions
  const channel = supabase
    .channel('mission_status_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'missions',
        filter: `status=in.(completed,delivered,cancelled)`,
      },
      async (payload: any) => {
        console.log('📢 Changement statut mission détecté:', payload.new);
        
        const mission = payload.new;
        const currentState = getTrackingState();
        
        // Si le tracking est actif pour cette mission, l'arrêter
        if (currentState.isTracking && currentState.missionId === mission.id) {
          console.log('🛑 Arrêt automatique du tracking pour mission:', mission.id);
          
          const result = await stopBackgroundTracking();
          
          if (result.success) {
            console.log('✅ Tracking arrêté automatiquement (mission terminée)');
            
            // Optionnel: Envoyer notification push
            // await sendNotification('Mission terminée', 'Le suivi GPS a été arrêté automatiquement');
          } else {
            console.error('❌ Erreur arrêt auto tracking:', result.message);
          }
        }
      }
    )
    .subscribe();

  // Retourner fonction de nettoyage
  return () => {
    console.log('🧹 Nettoyage surveillance auto-stop tracking');
    supabase.removeChannel(channel);
  };
}
