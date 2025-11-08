import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import MenuButton from '../components/MenuButton';

import InspectionListScreen from '../screens/inspections/InspectionListScreen';
import InspectionDepartureNew from '../screens/inspections/InspectionDepartureNew';
import InspectionArrivalNew from '../screens/inspections/InspectionArrivalNew';
import InspectionReportAdvanced from '../screens/inspections/InspectionReportAdvanced';
import InspectionShareScreen from '../screens/inspections/InspectionShareScreen';

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
        name="InspectionShare"
        component={InspectionShareScreen}
        options={{ 
          title: 'Rapports d\'inspection',
          headerLeft: () => <MenuButton />
        }}
      />
      <Stack.Screen
        name="InspectionReportAdvanced"
        component={InspectionReportAdvanced}
        options={{ 
          title: 'Rapport détaillé',
        }}
      />
      <Stack.Screen
        name="InspectionList"
        component={InspectionListScreen}
        options={{ 
          title: 'Inspections (ancienne)',
        }}
      />
      <Stack.Screen
        name="InspectionDeparture"
        component={InspectionDepartureNew}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InspectionArrival"
        component={InspectionArrivalNew}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
