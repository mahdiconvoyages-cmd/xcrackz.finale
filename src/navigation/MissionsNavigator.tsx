import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import MenuButton from '../components/MenuButton';

import MissionsScreenNew from '../screens/missions/MissionsScreenNew';
import MissionCreateScreen from '../screens/missions/MissionCreateScreen';
import MissionViewScreen from '../screens/missions/MissionViewScreenNew';
import MissionTrackingScreen from '../screens/missions/MissionTrackingScreen';
import InvoiceCreateScreen from '../screens/missions/InvoiceCreateScreen';
import InspectionDepartureScreen from '../screens/inspections/InspectionDepartureScreen';
import InspectionArrivalScreen from '../screens/inspections/InspectionArrivalScreen';
import ShareMissionScreen from '../screens/missions/ShareMissionScreen';
import { Routes, MissionsStackParamList } from './Routes';

const Stack = createNativeStackNavigator<MissionsStackParamList>();

export default function MissionsNavigator() {
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
        name={Routes.MissionList}
        component={MissionsScreenNew}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name={Routes.MissionCreate}
        component={MissionCreateScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.ShareMission}
        component={ShareMissionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.MissionView}
        component={MissionViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.MissionTracking}
        component={MissionTrackingScreen}
        options={{ title: 'Tracking GPS' }}
      />
      <Stack.Screen
        name={Routes.InvoiceCreate}
        component={InvoiceCreateScreen}
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
