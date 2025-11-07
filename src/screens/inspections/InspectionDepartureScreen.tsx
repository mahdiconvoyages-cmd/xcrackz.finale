import React from 'react';
import InspectionDepartureNew from './InspectionDepartureNew';

export default function InspectionDepartureScreen({ route, navigation }: any) {
  // Utiliser la vraie page d'inspection départ
  return <InspectionDepartureNew route={route} navigation={navigation} />;
}
