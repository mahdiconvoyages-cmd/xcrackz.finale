// expo.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'xcrackz',
  slug: 'xcrackz-mobile-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'xcrackz',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B1220',
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.xcrackz.mobile',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0B1220',
    },
    package: 'com.xcrackz.mobile',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-dev-client',
      {
        addGeneratedScheme: false,
      },
    ],
  ],
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    eas: {
      projectId: '9b1edb4f-5f0d-4f62-a1a9-fc54a8b14a8e',
    },
  },
});
