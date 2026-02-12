import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';

import ClientListScreen from '../screens/clients/ClientListScreen';
import ClientDetailsScreen from '../screens/clients/ClientDetailsScreen';
import { Routes } from './Routes';

const Stack = createNativeStackNavigator();

export default function ClientsNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name={Routes.ClientList}
        component={ClientListScreen}
        options={{ title: 'Clients' }}
      />
      <Stack.Screen
        name={Routes.ClientDetails}
        component={ClientDetailsScreen}
        options={{ title: 'Détails client' }}
      />
    </Stack.Navigator>
  );
}
