import Constants from 'expo-constants';

/**
 * Returns the base URL of the deployed web app used for calling serverless APIs from mobile
 * Priority: extra.appUrl (from app.config.js) -> EXPO_PUBLIC_APP_URL -> VITE_APP_URL -> fallback
 */
export function getAppUrl(): string {
  const extra = Constants.expoConfig?.extra as any;
  const fromExtra = extra?.appUrl as string | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_APP_URL || process.env.VITE_APP_URL;
  const url = fromExtra || fromEnv || 'https://checksfleet.com';
  // Normalize (remove trailing slash)
  return url.replace(/\/$/, '');
}
