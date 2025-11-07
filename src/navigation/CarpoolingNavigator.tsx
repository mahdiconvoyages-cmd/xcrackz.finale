import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import MenuButton from '../components/MenuButton';

// Screens modernes (BlaBlaCar style)
import CarpoolingSearchScreen from '../screens/carpooling/CarpoolingSearchScreen';
import CarpoolingResultsScreen from '../screens/carpooling/CarpoolingResultsScreen';
import PublishRideScreen from '../screens/carpooling/PublishRideScreen';
import RideDetailsScreen from '../screens/carpooling/RideDetailsScreen';
import BookRideScreen from '../screens/carpooling/BookRideScreen';
import CreditsWalletScreen from '../screens/carpooling/CreditsWalletScreen';

// Anciens écrans (garder pour compatibilité)
import TripCreateScreen from '../screens/TripCreateScreen';
import TripDetailsScreen from '../screens/TripDetailsScreen';
import MyTripsScreen from '../screens/MyTripsScreen';
import MyBookingsScreen from '../screens/MyBookingsScreen';
import CarpoolingChatScreen from '../screens/CarpoolingChatScreen';
import RatingScreen from '../screens/RatingScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CarpoolingTabs() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tab.Screen
        name="CarpoolingSearch"
        component={CarpoolingSearchScreen}
        options={{
          title: 'Rechercher',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PublishRide"
        component={PublishRideScreen}
        options={{
          title: 'Publier',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyTrips"
        component={MyTripsScreen}
        options={{
          title: 'Mes trajets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CreditsWallet"
        component={CreditsWalletScreen}
        options={{
          title: 'Crédits',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function CarpoolingNavigator() {
  const { colors } = useTheme();
  
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen 
        name="CarpoolingTabs" 
        component={CarpoolingTabs}
        options={{
          title: 'Covoiturage',
          headerLeft: () => <MenuButton />
        }}
      />
      <Stack.Screen 
        name="CarpoolingResults" 
        component={CarpoolingResultsScreen}
        options={{ title: 'Résultats' }}
      />
      <Stack.Screen 
        name="RideDetails" 
        component={RideDetailsScreen}
        options={{ title: 'Détails du trajet' }}
      />
      <Stack.Screen 
        name="BookRide" 
        component={BookRideScreen}
        options={{ title: 'Réserver' }}
      />
      {/* Anciens écrans (compatibilité) */}
      <Stack.Screen name="TripCreate" component={TripCreateScreen} />
      <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
      <Stack.Screen name="CarpoolingChat" component={CarpoolingChatScreen} />
      <Stack.Screen name="Rating" component={RatingScreen} />
    </Stack.Navigator>
  );
}
