// Centralized navigation param lists for mission-related screens
// Incremental typing: add more screens as they are converted
export type MissionStackParamList = {
  MissionList: undefined;
  MissionDetail: { missionId: string }; // existing route renamed earlier from MissionView
  MissionView: { missionId: string }; // legacy naming used in some older screens
  MissionTracking: { missionId: string };
  InspectionDeparture: { missionId: string };
  InspectionArrival: { missionId: string };
  MissionCreate: undefined;
  ShareMission: { mission: any }; // New: Share mission via code
  // Nested navigator bridge: allow passing through to Inspections navigator without over-constraining now
  Inspections: any;
};

// Generic route prop helper (avoids importing react-navigation types everywhere initially)
export interface MissionRouteProp<S extends keyof MissionStackParamList> {
  key?: string;
  name: S;
  params: MissionStackParamList[S];
}
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Signup: undefined;
  Support: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type MainTabParamList = {
  Inspections: NavigatorScreenParams<InspectionsStackParamList>;
  Covoiturage: NavigatorScreenParams<CovoiturageStackParamList>;
  Scanner: NavigatorScreenParams<ScannerStackParamList>;
  Boutique: undefined;
  Profile: undefined;
  Dashboard: undefined;
  Contacts: undefined;
  More: undefined;
  NewMissions: undefined;
};

export type InspectionsStackParamList = {
  InspectionsHome: undefined;
  InspectionWizard: {
    missionId: string;
    type: 'departure' | 'arrival';
    destinationAddress?: string;
    vehicle?: { brand: string; model: string };
    reference?: string;
    arrivalCity?: string;
  };
  InAppNavigation: {
    destination: string;
    missionId?: string;
  };
  Contacts: undefined;
  CreateMission: undefined;
  MissionWizard: {
    missionId: string;
  };
  MissionReports: undefined;
  MissionDetail: { missionId: string };
  MissionCreate: undefined;
  Inspection: undefined;
};

export type CovoiturageStackParamList = {
  CovoiturageHome: undefined;
  CovoiturageMyTrips: undefined;
  CovoiturageMessages: undefined;
  CovoiturageTripDetails: {
    tripId: string;
  };
  CovoituragePublish: undefined;
  CovoiturageRateUser: {
    userId: string;
    tripId: string;
  };
  CovoiturageUserProfile: {
    userId: string;
  };
  // Nouveaux écrans modernes
  CarpoolingTabs: undefined;
  CarpoolingSearch: undefined;
  CarpoolingResults: {
    departureCity: string;
    arrivalCity: string;
    date: string;
    passengers: number;
  };
  PublishRide: undefined;
  RideDetails: {
    rideId: string;
  };
  BookRide: {
    ride: any;
  };
  MyTrips: undefined;
  MyRides: undefined;
  CreditsWallet: undefined;
  // Anciens écrans (compatibilité)
  TripCreate: undefined;
  TripDetails: {
    tripId: string;
  };
  CarpoolingChat: {
    tripId: string;
  };
  Rating: {
    userId: string;
    tripId: string;
  };
};

export type ScannerStackParamList = {
  ScannerHome: undefined;
  DocumentViewer: {
    documentUri: string;
    documentType?: string;
  };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
