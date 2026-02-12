import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// jest.setup.js - Configuration pour les tests Jest

// Silence les warnings de console pendant les tests (sauf errors importants)
global.console = {
  ...console,
  warn: jest.fn(),
  log: jest.fn(),
};

// Fix compatibilité React 19 avec react-test-renderer 18
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('ReactCurrentOwner') || 
       args[0].includes('act()') ||
       args[0].includes('Warning: ReactDOM.render'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Expo LocalAuthentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  brand: 'TestBrand',
  manufacturer: 'TestManufacturer',
  modelName: 'TestModel',
  osName: 'TestOS',
  osVersion: '1.0.0',
  deviceYearClass: 2023,
  totalMemory: 8000000000,
  isDevice: true,
}));

// Mock expo-clipboard
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(() => Promise.resolve()),
  getStringAsync: jest.fn(() => Promise.resolve('')),
  hasStringAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `finality://test/${path}`),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  parse: jest.fn((url) => ({ hostname: 'test', path: url })),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  openURL: jest.fn(() => Promise.resolve()),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://test/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('{}')),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, type: 'wifi' })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock expo-localization
jest.mock('expo-localization', () => ({
  locale: 'fr-FR',
  getLocales: jest.fn(() => [{ languageCode: 'fr', regionCode: 'FR' }]),
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock AccessibilityInfo
jest.mock('react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo', () => ({
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  announceForAccessibility: jest.fn(),
}));

// Mock Supabase
jest.mock('./src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      setSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
        or: jest.fn(() => ({
          data: [],
          error: null,
        })),
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
        single: jest.fn(() => ({
          data: null,
          error: null,
        })),
        in: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: jest.fn(() => ({ data: null, error: null })),
      update: jest.fn(() => ({ data: null, error: null })),
      delete: jest.fn(() => ({ data: null, error: null })),
    })),
  },
}));
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
