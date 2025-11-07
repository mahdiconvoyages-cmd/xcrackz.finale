import React from 'react';
import InspectionArrivalNew from './InspectionArrivalNew';

export default function InspectionArrivalScreen({ route, navigation }: any) {
  // Utiliser la vraie page d'inspection arrivée
  return <InspectionArrivalNew route={route} navigation={navigation} />;
}
