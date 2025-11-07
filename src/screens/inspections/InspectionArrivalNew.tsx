/**
 * Écran Inspection Arrivée - Mobile
 * Utilise désormais un composant dédié avec scanner et frais
 */

import React from 'react';
import InspectionArrivalNewDedicated from './InspectionArrivalNewDedicated';

export default function InspectionArrivalNew({ route, navigation }: any) {
  return <InspectionArrivalNewDedicated route={route} navigation={navigation} />;
}
