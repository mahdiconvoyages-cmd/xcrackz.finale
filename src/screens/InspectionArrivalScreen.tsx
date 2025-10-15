import React from 'react';
import InspectionScreen from './InspectionScreen';

interface InspectionArrivalScreenProps {
  missionId: string;
  onComplete: () => void;
}

export default function InspectionArrivalScreen({ missionId, onComplete }: InspectionArrivalScreenProps) {
  // Wrapper autour de l'InspectionScreen existant avec type "arrival"
  return (
    <InspectionScreen
      route={{
        params: {
          missionId,
          inspectionType: 'arrival',
          onComplete: (inspectionId: string) => {
            console.log('Inspection arrivée complétée:', inspectionId);
            onComplete();
          },
        },
      }}
      navigation={null as any}
    />
  );
}
