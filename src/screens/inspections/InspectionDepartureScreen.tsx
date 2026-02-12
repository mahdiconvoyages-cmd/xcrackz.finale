import React from 'react';
import InspectionDeparture from './InspectionDeparture';

export default function InspectionDepartureScreen({ route, navigation }: any) {
  const { missionId } = route.params;
  
  return (
    <InspectionDeparture 
      missionId={missionId}
      onComplete={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  );
}
