import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

// FastImage fallback
let FastImage: any = null;
try {
  FastImage = require('react-native-fast-image').default;
} catch (e) {
  console.log('⚠️ FastImage non disponible');
}

// Contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import MainNavigator from './src/navigation/MainNavigator';
// import PublicInspectionReportShared from './src/screens/PublicInspectionReportShared';

// Loaders
import { LoadingScreen } from './src/components/LoadingScreen';

// Services
import { notificationService } from './src/services/notificationService';
import { setupAutoStopTracking } from './src/services/gpsTrackingService';
import { useDeepLinking } from './src/hooks/useDeepLinking';

const Stack = createNativeStackNavigator();

function RootNavigator({ navigationRef }: { navigationRef: any }) {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  // Activer la gestion des deep links
  useDeepLinking();

  // Initialiser les notifications et le tracking automatique quand l'utilisateur est connecté
  useEffect(() => {
    if (user && navigationRef.current) {
      initializeNotifications();
    }

    // 🚀 NOUVEAU: Surveillance automatique pour arrêter le tracking GPS
    let cleanupAutoStop: (() => void) | undefined;
    if (user) {
      cleanupAutoStop = setupAutoStopTracking();
      console.log('✅ Surveillance auto-stop tracking activée');
    }

    return () => {
      notificationService.cleanup();
      if (cleanupAutoStop) {
        cleanupAutoStop();
      }
      // Clear FastImage cache on logout
      if (!user && FastImage) {
        FastImage.clearMemoryCache();
      }
    };
  }, [user]);

  const initializeNotifications = async () => {
    try {
      // Demander la permission et obtenir le token
      const token = await notificationService.registerForPushNotifications();
      
      if (token && user) {
        // Enregistrer le token dans la base de données
        await notificationService.saveTokenToDatabase(user.id, token);
        
        // Configurer les listeners
        notificationService.setupNotificationListeners(navigationRef.current);
        
        console.log('✅ Notifications initialisées avec succès');
      } else if (!token) {
        console.log('ℹ️ Notifications non disponibles (Expo Go ou permissions refusées)');
      }
    } catch (error: any) {
      // Ne pas crash l'app si les notifications échouent
      console.error('❌ Erreur lors de l\'initialisation des notifications:', error.message);
      console.log('ℹ️ L\'application continuera de fonctionner sans notifications push');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  const navigationRef = useRef<any>(null);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator navigationRef={navigationRef} />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
