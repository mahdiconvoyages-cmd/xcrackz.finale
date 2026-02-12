import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import MenuButton from '../components/MenuButton';

import InspectionListScreen from '../screens/inspections/InspectionListScreen';
import InspectionDepartureScreen from '../screens/inspections/InspectionDeparture';
import InspectionArrivalScreen from '../screens/inspections/InspectionArrival';
import InspectionShareScreen from '../screens/inspections/InspectionShareScreen';
import { Routes } from './Routes';

const Stack = createNativeStackNavigator();

export default function InspectionsNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name={Routes.InspectionShare}
        component={InspectionShareScreen}
        options={{ 
          title: 'Rapports d\'inspection',
          headerLeft: () => <MenuButton />
        }}
      />
      <Stack.Screen
        name={Routes.InspectionList}
        component={InspectionListScreen}
        options={{ 
          title: 'Inspections (ancienne)',
        }}
      />
      <Stack.Screen
        name={Routes.InspectionDeparture}
        component={InspectionDepartureScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.InspectionDeparture}
        component={InspectionDepartureScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.InspectionArrival}
        component={InspectionArrivalScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
