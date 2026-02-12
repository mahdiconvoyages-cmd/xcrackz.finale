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
import { Routes } from './Routes';

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
        name={Routes.CarpoolingSearch}
        component={CarpoolingSearchScreen}
        options={{
          title: 'Rechercher',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={Routes.PublishRide}
        component={PublishRideScreen}
        options={{
          title: 'Publier',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={Routes.MyTrips}
        component={MyTripsScreen}
        options={{
          title: 'Mes trajets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name={Routes.CreditsWallet}
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
        name={Routes.CarpoolingTabs} 
        component={CarpoolingTabs}
        options={{
          title: 'Covoiturage',
          headerLeft: () => <MenuButton />
        }}
      />
      <Stack.Screen 
        name={Routes.CarpoolingResults} 
        component={CarpoolingResultsScreen}
        options={{ title: 'Résultats' }}
      />
      <Stack.Screen 
        name={Routes.RideDetails} 
        component={RideDetailsScreen}
        options={{ title: 'Détails du trajet' }}
      />
      <Stack.Screen 
        name={Routes.BookRide} 
        component={BookRideScreen}
        options={{ title: 'Réserver' }}
      />
      {/* Anciens écrans (compatibilité) */}
      <Stack.Screen name={Routes.TripCreate} component={TripCreateScreen} />
      <Stack.Screen name={Routes.TripDetails} component={TripDetailsScreen} />
      <Stack.Screen name={Routes.CarpoolingChat} component={CarpoolingChatScreen} />
      <Stack.Screen name={Routes.Rating} component={RatingScreen} />
    </Stack.Navigator>
  );
}
