import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

// Background task name used for in-app navigation updates
export const NAV_BG_TASK = 'nav_bg_task';

// Define the background task once. If defined multiple times, TaskManager throws, so we guard via try/catch.
try {
  TaskManager.defineTask(NAV_BG_TASK, async ({ data, error }: any) => {
    try {
      if (error) {
        console.warn('[NAV_BG_TASK] error:', error.message || error);
        return;
      }
  const { locations } = (data || {}) as { locations?: Location.LocationObject[] };
      if (Array.isArray(locations) && locations.length) {
        const last = locations[locations.length - 1];
        // Minimal handling: log. You can persist to AsyncStorage or Supabase if desired.
        console.log('[NAV_BG_TASK] location', {
          ts: last?.timestamp,
          lat: last?.coords?.latitude,
          lon: last?.coords?.longitude,
          acc: last?.coords?.accuracy,
          spd: last?.coords?.speed,
        });
      }
    } catch (e: any) {
      console.warn('[NAV_BG_TASK] handler failure:', e?.message || e);
    }
  });
} catch (e: any) {
  // Ignore duplicate definition errors
}
