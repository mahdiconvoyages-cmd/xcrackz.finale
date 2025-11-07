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
