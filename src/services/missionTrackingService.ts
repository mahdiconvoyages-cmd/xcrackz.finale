import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const LOCATION_TASK_NAME = 'background-location-task';
const MISSION_TRACKING_NOTIFICATION_ID = 'mission-tracking';

interface ActiveMission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
}

let activeMission: ActiveMission | null = null;
let isTracking = false;

/**
 * Configuration des notifications pour Android
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/**
 * ⚡ TÂCHE DE TRACKING EN TEMPS RÉEL (2 secondes)
 * 
 * Cette tâche s'exécute en arrière-plan même si l'app est fermée.
 * Configuration optimisée pour un suivi en temps réel fluide :
 * - Intervalle: 2 secondes
 * - Distance minimale: 1 mètre
 * - Précision: BestForNavigation (GPS haute précision)
 * 
 * ⚠️ ATTENTION BATTERIE : Cette configuration consomme plus d'énergie.
 * Utilisez uniquement pour des missions actives.
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('❌ Background location error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location && activeMission) {
      console.log('📍 Position enregistrée:', {
        lat: location.coords.latitude.toFixed(6),
        lng: location.coords.longitude.toFixed(6),
        accuracy: location.coords.accuracy?.toFixed(1),
      });

      // Sauvegarder la position dans Supabase (temps réel)
      await saveLocationToSupabase(
        activeMission.id,
        location.coords.latitude,
        location.coords.longitude,
        location.coords.accuracy,
        location.coords.altitude,
        location.coords.speed,
        location.coords.heading
      );
      
      // Mettre à jour la notification avec position actuelle
      await updateTrackingNotification(activeMission, location.coords);
    }
  }
});

/**
 * Démarrer le tracking pour une mission
 */
export async function startMissionTracking(mission: ActiveMission): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier les permissions
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return { success: false, error: 'Permission de localisation refusée' };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return { success: false, error: 'Permission de localisation en arrière-plan refusée' };
    }

    // Vérifier les permissions de notification
    const { status: notifStatus } = await Notifications.requestPermissionsAsync();
    if (notifStatus !== 'granted') {
      return { success: false, error: 'Permission de notification refusée' };
    }

    // Sauvegarder la mission active
    activeMission = mission;
    isTracking = true;

    // Démarrer le tracking en arrière-plan - TEMPS RÉEL (2 secondes)
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation, // Précision maximale pour navigation
      timeInterval: 2000, // Mise à jour toutes les 2 secondes ⚡
      distanceInterval: 1, // Ou tous les 1 mètre (sensibilité maximale)
      foregroundService: {
        notificationTitle: '🚗 Mission en cours',
        notificationBody: `${mission.reference} - ${mission.delivery_address}`,
        notificationColor: '#3B82F6',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      deferredUpdatesInterval: 2000, // Mise à jour différée également 2s
      deferredUpdatesDistance: 1, // Distance minimale
    });

    // Créer la notification persistante
    await createPersistentNotification(mission);

    console.log('✅ Tracking démarré pour mission:', mission.reference);
    return { success: true };
  } catch (error: any) {
    console.error('Error starting tracking:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Arrêter le tracking
 */
export async function stopMissionTracking(): Promise<void> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    
    // Supprimer la notification
    await Notifications.dismissNotificationAsync(MISSION_TRACKING_NOTIFICATION_ID);
    
    activeMission = null;
    isTracking = false;
    
    console.log('✅ Tracking arrêté');
  } catch (error) {
    console.error('Error stopping tracking:', error);
  }
}

/**
 * Vérifier si le tracking est actif
 */
export function isTrackingActive(): boolean {
  return isTracking;
}

/**
 * Obtenir la mission active
 */
export function getActiveMission(): ActiveMission | null {
  return activeMission;
}

/**
 * Créer une notification persistante
 */
async function createPersistentNotification(mission: ActiveMission): Promise<void> {
  // Créer un canal de notification pour Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mission-tracking', {
      name: 'Mission en cours',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      vibrationPattern: [0],
      enableLights: false,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: MISSION_TRACKING_NOTIFICATION_ID,
    content: {
      title: '🚗 Mission en cours',
      body: `${mission.reference}\n📍 ${mission.delivery_address}`,
      data: { missionId: mission.id },
      sticky: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      categoryIdentifier: 'mission-tracking',
    },
    trigger: null, // Notification immédiate
  });
}

/**
 * Mettre à jour la notification avec la position actuelle
 */
async function updateTrackingNotification(
  mission: ActiveMission,
  coords: { latitude: number; longitude: number }
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: MISSION_TRACKING_NOTIFICATION_ID,
      content: {
        title: '🚗 Mission en cours',
        body: `${mission.reference}\n📍 Position: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
        data: { 
          missionId: mission.id,
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: 'mission-tracking',
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
  }
}

/**
 * Sauvegarder la position dans Supabase avec toutes les données GPS
 */
async function saveLocationToSupabase(
  missionId: string,
  latitude: number,
  longitude: number,
  accuracy?: number | null,
  altitude?: number | null,
  speed?: number | null,
  heading?: number | null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('mission_locations')
      .insert([{
        mission_id: missionId,
        latitude,
        longitude,
        accuracy: accuracy || null,
        altitude: altitude || null,
        speed: speed || null,
        heading: heading || null,
        recorded_at: new Date().toISOString(),
      }]);

    if (error && error.code !== '42P01') { // Ignore si la table n'existe pas encore
      console.error('❌ Error saving location:', error);
    } else if (!error) {
      console.log('✅ Position sauvegardée dans Supabase');
    }
  } catch (error) {
    console.error('❌ Error saving location to Supabase:', error);
  }
}

/**
 * Obtenir la dernière position connue
 */
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return location;
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
}

/**
 * Calculer la distance entre deux points (en km)
 */
export function calculateDistance(
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
  return R * c;
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
