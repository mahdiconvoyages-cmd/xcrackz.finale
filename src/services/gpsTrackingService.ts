import { supabase } from '../lib/supabase';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

export interface GPSTrackingSession {
  id: string;
  mission_id: string;
  driver_id: string;
  departure_inspection_id?: string;
  arrival_inspection_id?: string;
  start_latitude?: number;
  start_longitude?: number;
  start_address?: string;
  end_latitude?: number;
  end_longitude?: number;
  end_address?: string;
  total_distance_km?: number;
  total_duration_minutes?: number;
  average_speed_kmh?: number;
  max_speed_kmh?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GPSLocationPoint {
  id: string;
  session_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed_kmh?: number;
  heading?: number;
  recorded_at: string;
  created_at: string;
}

let currentSessionId: string | null = null;
let locationSubscription: Location.LocationSubscription | null = null;

export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

    if (backgroundStatus !== 'granted') {
      console.warn('Background location permission not granted');
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

export async function startTrackingSession(
  missionId: string,
  departureInspectionId?: string,
  startLocation?: { latitude: number; longitude: number; address?: string }
): Promise<GPSTrackingSession | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) throw new Error('Location permission denied');

    const sessionData = {
      mission_id: missionId,
      driver_id: user.id,
      departure_inspection_id: departureInspectionId,
      start_latitude: startLocation?.latitude,
      start_longitude: startLocation?.longitude,
      start_address: startLocation?.address,
      status: 'active',
      started_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('gps_tracking_sessions')
      .insert([sessionData])
      .select()
      .single();

    if (error) throw error;

    currentSessionId = data.id;

    await startLocationUpdates(data.id);

    return data;
  } catch (error) {
    console.error('Error starting tracking session:', error);
    return null;
  }
}

export async function startLocationUpdates(sessionId: string): Promise<void> {
  try {
    if (locationSubscription) {
      locationSubscription.remove();
    }

    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      async (location) => {
        await recordLocationPoint(sessionId, location);
      }
    );

    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        console.error('Background location error:', error);
        return;
      }
      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0 && currentSessionId) {
          for (const location of locations) {
            await recordLocationPoint(currentSessionId, location);
          }
        }
      }
    });

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 10,
      foregroundService: {
        notificationTitle: 'Suivi GPS actif',
        notificationBody: 'Votre position est partagée avec le donneur d\'ordre',
        notificationColor: '#14b8a6',
      },
    });
  } catch (error) {
    console.error('Error starting location updates:', error);
  }
}

export async function recordLocationPoint(
  sessionId: string,
  location: Location.LocationObject
): Promise<boolean> {
  try {
    const speedKmh = location.coords.speed
      ? location.coords.speed * 3.6
      : undefined;

    const pointData = {
      session_id: sessionId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
      speed_kmh: speedKmh,
      heading: location.coords.heading,
      recorded_at: new Date(location.timestamp).toISOString(),
    };

    const { error } = await supabase
      .from('gps_location_points')
      .insert([pointData]);

    if (error) throw error;

    await updateSessionStats(sessionId);

    return true;
  } catch (error) {
    console.error('Error recording location point:', error);
    return false;
  }
}

export async function updateSessionStats(sessionId: string): Promise<void> {
  try {
    const { data: points } = await supabase
      .from('gps_location_points')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: true });

    if (!points || points.length < 2) return;

    let totalDistance = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const distance = calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      totalDistance += distance;

      if (curr.speed_kmh) {
        maxSpeed = Math.max(maxSpeed, curr.speed_kmh);
        speedSum += curr.speed_kmh;
        speedCount++;
      }
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const durationMinutes = Math.round(
      (new Date(lastPoint.recorded_at).getTime() - new Date(firstPoint.recorded_at).getTime()) / 60000
    );

    const averageSpeed = speedCount > 0 ? speedSum / speedCount : 0;

    await supabase
      .from('gps_tracking_sessions')
      .update({
        total_distance_km: totalDistance,
        total_duration_minutes: durationMinutes,
        average_speed_kmh: averageSpeed,
        max_speed_kmh: maxSpeed,
      })
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error updating session stats:', error);
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function pauseTrackingSession(sessionId: string): Promise<boolean> {
  try {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

    const { error } = await supabase
      .from('gps_tracking_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error pausing tracking:', error);
    return false;
  }
}

export async function resumeTrackingSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('gps_tracking_sessions')
      .update({ status: 'active' })
      .eq('id', sessionId);

    if (error) throw error;

    await startLocationUpdates(sessionId);
    return true;
  } catch (error) {
    console.error('Error resuming tracking:', error);
    return false;
  }
}

export async function completeTrackingSession(
  sessionId: string,
  arrivalInspectionId?: string,
  endLocation?: { latitude: number; longitude: number; address?: string }
): Promise<boolean> {
  try {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

    const { error } = await supabase
      .from('gps_tracking_sessions')
      .update({
        status: 'completed',
        arrival_inspection_id: arrivalInspectionId,
        end_latitude: endLocation?.latitude,
        end_longitude: endLocation?.longitude,
        end_address: endLocation?.address,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;

    currentSessionId = null;
    return true;
  } catch (error) {
    console.error('Error completing tracking:', error);
    return false;
  }
}

export async function getTrackingSession(sessionId: string): Promise<GPSTrackingSession | null> {
  try {
    const { data, error } = await supabase
      .from('gps_tracking_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching tracking session:', error);
    return null;
  }
}

export async function getSessionLocations(
  sessionId: string,
  limit?: number
): Promise<GPSLocationPoint[]> {
  try {
    let query = supabase
      .from('gps_location_points')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching session locations:', error);
    return [];
  }
}

export async function getLatestLocation(sessionId: string): Promise<GPSLocationPoint | null> {
  try {
    const { data, error } = await supabase
      .from('gps_location_points')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching latest location:', error);
    return null;
  }
}

export async function getMissionActiveSession(missionId: string): Promise<GPSTrackingSession | null> {
  try {
    const { data, error } = await supabase
      .from('gps_tracking_sessions')
      .select('*')
      .eq('mission_id', missionId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}

export function getCurrentSessionId(): string | null {
  return currentSessionId;
}

export async function stopAllTracking(): Promise<void> {
  try {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }

    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    currentSessionId = null;
  } catch (error) {
    console.error('Error stopping all tracking:', error);
  }
}
