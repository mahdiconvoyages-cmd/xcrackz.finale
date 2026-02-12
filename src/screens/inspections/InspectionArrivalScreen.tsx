import React from 'react';
import InspectionArrival from './InspectionArrival';

export default function InspectionArrivalScreen({ route, navigation }: any) {
  const { missionId } = route.params;
  
  return (
    <InspectionArrival 
      missionId={missionId}
      onComplete={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  );
}
