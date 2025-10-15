import React from 'react';
import InspectionScreen from './InspectionScreen';

interface InspectionDepartScreenProps {
  missionId: string;
  onComplete: () => void;
}

export default function InspectionDepartScreen({ missionId, onComplete }: InspectionDepartScreenProps) {
  // Wrapper autour de l'InspectionScreen existant avec type "departure"
  return (
    <InspectionScreen
      route={{
        params: {
          missionId,
          inspectionType: 'departure',
          onComplete: (inspectionId: string) => {
            console.log('Inspection départ complétée:', inspectionId);
            onComplete();
          },
        },
      }}
      navigation={null as any}
    />
  );
}
