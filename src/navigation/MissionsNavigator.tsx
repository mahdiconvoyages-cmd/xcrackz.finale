import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import MenuButton from '../components/MenuButton';

import MissionsScreenNew from '../screens/missions/MissionsScreenNew';
import MissionCreateScreen from '../screens/missions/MissionCreateScreen';
import MissionViewScreen from '../screens/missions/MissionViewScreenNew';
import MissionTrackingScreen from '../screens/missions/MissionTrackingScreen';
import InspectionDepartureNew from '../screens/inspections/InspectionDepartureNew';
import InspectionArrivalNew from '../screens/inspections/InspectionArrivalNew';
import ShareMissionScreen from '../screens/missions/ShareMissionScreen';

const Stack = createNativeStackNavigator();

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
        name="MissionList"
        component={MissionsScreenNew}
        options={{ 
          title: 'Mes missions',
          headerLeft: () => <MenuButton />
        }}
      />
      <Stack.Screen
        name="MissionCreate"
        component={MissionCreateScreen}
        options={{ title: 'Nouvelle mission' }}
      />
      <Stack.Screen
        name="ShareMission"
        component={ShareMissionScreen}
        options={{ title: 'Partager une mission' }}
      />
      <Stack.Screen
        name="MissionView"
        component={MissionViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MissionTracking"
        component={MissionTrackingScreen}
        options={{ title: 'Tracking GPS' }}
      />
      <Stack.Screen
        name="InspectionDeparture"
        component={InspectionDepartureNew}
        options={{ title: 'Inspection Départ' }}
      />
      <Stack.Screen
        name="InspectionArrival"
        component={InspectionArrivalNew}
        options={{ title: 'Inspection Arrivée' }}
      />
    </Stack.Navigator>
  );
}
