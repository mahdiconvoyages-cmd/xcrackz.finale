import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';

import ClientListScreen from '../screens/clients/ClientListScreen';
import ClientDetailsScreen from '../screens/clients/ClientDetailsScreen';

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
        name="ClientList"
        component={ClientListScreen}
        options={{ title: 'Clients' }}
      />
      <Stack.Screen
        name="ClientDetails"
        component={ClientDetailsScreen}
        options={{ title: 'Détails client' }}
      />
    </Stack.Navigator>
  );
}
