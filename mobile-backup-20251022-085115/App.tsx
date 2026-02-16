// @ts-nocheck
import 'react-native-reanimated'; // Must be first
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, StatusBar, Platform, Pressable } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { oneSignalService } from './src/services/OneSignalService';
import CovoiturageScreenBlaBlaCar from './src/screens/CovoiturageScreenBlaBlaCar';
import DashboardScreen from './src/screens/DashboardScreen';
import MissionsScreen from './src/screens/MissionsScreen';
import MissionReportsScreen from './src/screens/MissionReportsScreen';
import MissionDetailScreen from './src/screens/MissionDetailScreen';
import MissionCreateScreen from './src/screens/MissionCreateScreen';
import InspectionScreen from './src/screens/InspectionScreen';
import InspectionWizardScreen from './src/screens/InspectionWizardScreen';
import InspectionGPSScreen from './src/screens/InspectionGPSScreen';
import CovoiturageScreen from './src/screens/CovoiturageScreen';
// import CreateMissionWizard from './src/screens/CreateMissionWizard';
import ContactsScreen from './src/screens/ContactsScreen';
import FacturationScreen from './src/screens/FacturationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ShopScreen from './src/screens/ShopScreen';
import SupportScreen from './src/screens/SupportScreen';
import ScannerProScreen from './src/screens/ScannerProScreen';
import DocumentViewerScreen from './src/screens/DocumentViewerScreen';
import MoreScreen from './src/screens/MoreScreen';
import TestModificationsScreen from './src/screens/TestModificationsScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CovoiturageMyTrips from './src/screens/CovoiturageMyTrips';
import CovoiturageMessages from './src/screens/CovoiturageMessages';
import CovoiturageTripDetails from './src/screens/CovoiturageTripDetails';
import CovoiturageRateUser from './src/screens/CovoiturageRateUser';
import CovoiturageUserProfile from './src/screens/CovoiturageUserProfile';
import DevisScreen from './src/screens/DevisScreen';
import CovoituragePublish from './src/screens/CovoituragePublish';
import Toast from 'react-native-toast-message';
import { flushInspectionQueue } from './src/services/inspections';
import { NetworkBanner } from './src/components/NetworkBanner';
import type {
  RootStackParamList,
  MainTabParamList,
  InspectionsStackParamList,
  CovoiturageStackParamList,
  ScannerStackParamList,
  FacturationStackParamList,
} from './src/types/navigation';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const CovoiturageStackNav = createNativeStackNavigator<CovoiturageStackParamList>();
const FacturationStackNav = createNativeStackNavigator<FacturationStackParamList>();
const InspectionsStackNav = createNativeStackNavigator<InspectionsStackParamList>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

function HeaderActions({ onMessages, onList, onBell }: { onMessages?: () => void; onList?: () => void; onBell?: () => void }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {onMessages && (
        <Pressable onPress={onMessages} style={{ paddingHorizontal: 8 }}>
          <MaterialIcons name="chat-bubble-outline" size={20} color="#38bdf8" />
        </Pressable>
      )}
      {onList && (
        <Pressable onPress={onList} style={{ paddingHorizontal: 8 }}>
          <MaterialIcons name="format-list-bulleted" size={20} color="#a78bfa" />
        </Pressable>
      )}
      {onBell && (
        <Pressable onPress={onBell} style={{ paddingLeft: 8 }}>
          <MaterialIcons name="notifications-none" size={20} color="#f59e0b" />
        </Pressable>
      )}
    </View>
  );
}

function CovoiturageStack() {
  return (
    <CovoiturageStackNav.Navigator 
      screenOptions={{ 
        headerShown: true, 
        headerStyle: { backgroundColor: '#00AFF5' }, 
        headerTintColor: 'white',
        headerTitleStyle: { fontWeight: '700', fontSize: 20 }
      }}
    >
      <CovoiturageStackNav.Screen
        name="CovoiturageHome"
        component={CovoiturageScreenBlaBlaCar}
        options={({ navigation }) => ({
          title: 'Covoiturage',
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 8 }}>
              <Pressable 
                onPress={() => navigation.navigate('CovoiturageMessages')} 
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <MaterialIcons name="chat-bubble-outline" size={24} color="white" />
              </Pressable>
              <Pressable 
                onPress={() => navigation.navigate('CovoiturageMyTrips')} 
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <MaterialIcons name="list" size={24} color="white" />
              </Pressable>
            </View>
          ),
        })}
      />
      <CovoiturageStackNav.Screen name="CovoiturageMyTrips" component={CovoiturageMyTrips} options={{ title: 'Mes trajets' }} />
      <CovoiturageStackNav.Screen name="CovoiturageMessages" component={CovoiturageMessages} options={{ title: 'Messages' }} />
      <CovoiturageStackNav.Screen name="CovoiturageTripDetails" component={CovoiturageTripDetails} options={{ title: 'Détails' }} />
      <CovoiturageStackNav.Screen name="CovoituragePublish" component={CovoituragePublish} options={{ title: 'Publier un trajet' }} />
      <CovoiturageStackNav.Screen name="CovoiturageInfo" component={CovoiturageScreen} options={{ title: 'Covoiturage Infos' }} />
      <CovoiturageStackNav.Screen name="CovoiturageRateUser" component={CovoiturageRateUser} options={{ title: 'Noter un utilisateur' }} />
      <CovoiturageStackNav.Screen name="CovoiturageUserProfile" component={CovoiturageUserProfile} options={{ title: 'Profil utilisateur' }} />
    </CovoiturageStackNav.Navigator>
  );
}

function FacturationStack() {
  return (
    <FacturationStackNav.Navigator screenOptions={{ headerShown: true, headerStyle: { backgroundColor: '#0b1220' }, headerTintColor: 'white' }}>
      <FacturationStackNav.Screen name="FacturationHome" component={FacturationScreen} options={{ title: 'Facturation' }} />
      <FacturationStackNav.Screen name="Devis" component={DevisScreen} options={{ title: 'Devis' }} />
    </FacturationStackNav.Navigator>
  );
}

function MissionsStack() {
  return (
    <InspectionsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <InspectionsStackNav.Screen name="InspectionsHome" component={MissionsScreen} />
      <InspectionsStackNav.Screen name="MissionReports" component={MissionReportsScreen} />
      <InspectionsStackNav.Screen name="MissionDetail" component={MissionDetailScreen} />
      <InspectionsStackNav.Screen name="MissionCreate" component={MissionCreateScreen} />
      <InspectionsStackNav.Screen name="Inspection" component={InspectionScreen} />
      <InspectionsStackNav.Screen name="InspectionWizard" component={InspectionWizardScreen} />
      <InspectionsStackNav.Screen name="InspectionGPS" component={InspectionGPSScreen} />
      <InspectionsStackNav.Screen name="Contacts" component={ContactsScreen} />
    </InspectionsStackNav.Navigator>
  );
}

function InspectionsStack() {
  return (
    <InspectionsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <InspectionsStackNav.Screen name="InspectionsHome" component={MissionsScreen} />
      <InspectionsStackNav.Screen name="MissionDetail" component={MissionDetailScreen} />
      <InspectionsStackNav.Screen name="MissionCreate" component={MissionCreateScreen} />
      <InspectionStack name="Inspection" component={InspectionScreen} />
      <InspectionsStackNav.Screen name="InspectionWizard" component={InspectionWizardScreen} />
      <InspectionsStackNav.Screen name="InspectionGPS" component={InspectionGPSScreen} />
      <InspectionsStackNav.Screen name="Contacts" component={ContactsScreen} />
    </InspectionsStackNav.Navigator>
  );
}

function ScannerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScannerHome" component={ScannerProScreen} />
      <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  // Fix pour Android: padding minimal pour remonter les boutons
  const bottom = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 2)
    : Math.max(insets.bottom, 8);
  const topPad = Platform.OS === 'android' ? 4 : 8;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#14b8a6',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarBackground: () => (
          <LinearGradient
            colors={Platform.OS === 'android' 
              ? ['rgba(20, 184, 166, 0.95)', 'rgba(6, 182, 212, 0.95)', 'rgba(20, 184, 166, 0.95)']
              : ['#0b1220', '#0e1930', '#0b1220']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        ),
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          paddingBottom: bottom,
          paddingTop: topPad,
          height: Platform.OS === 'android' ? 58 : 70,
          position: 'absolute',
          bottom: Platform.OS === 'android' ? 35 : undefined,
          elevation: Platform.OS === 'android' ? 20 : 12,
          shadowColor: Platform.OS === 'android' ? '#14b8a6' : '#00d9ff',
          shadowOpacity: Platform.OS === 'android' ? 0.4 : 0.15,
          shadowRadius: Platform.OS === 'android' ? 25 : 18,
          shadowOffset: { width: 0, height: Platform.OS === 'android' ? -8 : -6 },
        },
        tabBarItemStyle: {
          paddingTop: Platform.OS === 'android' ? 2 : 2,
          paddingBottom: Platform.OS === 'android' ? 2 : 0,
          marginHorizontal: Platform.OS === 'android' ? 0 : 0,
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'android' ? 8.5 : 11,
          fontWeight: '700',
          marginBottom: Platform.OS === 'android' ? 0 : 2,
          marginTop: Platform.OS === 'android' ? 1 : 2,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="home" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Inspections" 
        component={MissionsStack}
        options={{
          title: 'Missions',
          tabBarLabel: 'Missions',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="clipboard" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      />
      {/* Scanner désactivé temporairement */}
      {/* <Tab.Screen 
        name="Scanner" 
        component={ScannerStack}
        options={{
          title: 'Scanner',
          tabBarLabel: 'Scanner',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="camera" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      /> */}
      <Tab.Screen 
        name="Contacts" 
        component={ContactsScreen}
        options={{
          title: 'Contacts',
          tabBarLabel: 'Contacts',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="users" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Covoiturage" 
        component={CovoiturageStack}
        options={{
          title: 'Covoiturage',
          tabBarLabel: 'Covoit',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="navigation" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Facturation" 
        component={FacturationStack}
        options={{
          title: 'Facturation',
          tabBarLabel: 'Factures',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="file-text" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{
          title: 'Plus',
          tabBarLabel: 'Plus',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Feather name="menu" color={focused ? '#fff' : '#cbd5e1'} size={24} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  console.log('📍 RootNavigator: Rendering...');
  
  let authHookResult;
  try {
    authHookResult = useAuth();
  } catch (error) {
    console.error('❌ RootNavigator: useAuth error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220', padding: 20 }}>
        <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
          Erreur d'authentification
        </Text>
        <Text style={{ color: '#f87171', fontSize: 14, textAlign: 'center' }}>
          {error instanceof Error ? error.message : 'Erreur inconnue'}
        </Text>
      </View>
    );
  }
  
  const { loading, user } = authHookResult;
  const bypassAuth = (process.env.EXPO_PUBLIC_BYPASS_AUTH === '1');
  
  console.log('🔐 RootNavigator: loading:', loading, 'user:', user?.id, 'bypassAuth:', bypassAuth);
  
  // Initialize OneSignal - DISABLED TEMPORARILY FOR DEBUGGING
  // useEffect(() => {
  //   try {
  //     console.log('🔔 Initializing OneSignal...');
  //     oneSignalService.initialize();
  //   } catch (error) {
  //     console.error('❌ OneSignal init error:', error);
  //   }
  // }, []);

  // // Associate user with OneSignal when logged in
  // useEffect(() => {
  //   if (!loading && user) {
  //     console.log('🔔 Setting OneSignal user:', user.id);
  //     oneSignalService.setUser(user.id, {
  //       user_type: user.user_metadata?.role || 'driver',
  //       email: user.email,
  //       // Add other user tags as needed
  //     }).catch((error) => {
  //       console.error('❌ Error setting OneSignal user:', error);
  //     });
  //   } else if (!loading && !user && !bypassAuth) {
  //     // Clear user on logout
  //     console.log('🔔 Clearing OneSignal user');
  //     oneSignalService.clearUser();
  //   }
  // }, [loading, user, bypassAuth]);

  // Flush offline inspections
  React.useEffect(() => {
    // Flush offline inspections when authenticated or bypassed
    if (!loading && (user || bypassAuth)) {
      flushInspectionQueue().catch((error) => {
        console.error('❌ Flush inspection queue error:', error);
      });
    }
  }, [loading, user, bypassAuth]);
  
  if (loading) {
    console.log('⏳ RootNavigator: Still loading auth...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Chargement...</Text>
      </View>
    );
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user || bypassAuth ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen 
            name="Support" 
            component={SupportScreen}
            options={{
              headerShown: true,
              title: 'Support Client',
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: '700' },
            }}
          />
          <Stack.Screen 
            name="Shop" 
            component={ShopScreen}
            options={{
              headerShown: true,
              title: 'Boutique',
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{
              headerShown: true,
              title: 'Mon Profil',
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="TestModifications" 
            component={TestModificationsScreen}
            options={{
              headerShown: true,
              title: '🧪 Test des Modifications',
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#fff',
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <NetworkBanner />
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
              </QueryClientProvider>
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
        <Toast />
      </ErrorBoundary>
    </>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    height: 32,
    width: 32,
    borderRadius: 14,
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#fff',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});


