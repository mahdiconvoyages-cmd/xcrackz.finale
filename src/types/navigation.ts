// Local minimal redefinition to avoid depending on @react-navigation/native in web build
// Matches the common shape used by React Navigation for nesting params
export type NavigatorScreenParams<ParamList> = {
  screen?: keyof ParamList;
  params?: ParamList[keyof ParamList];
};

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
  Missions: undefined;
  Covoiturage: NavigatorScreenParams<CovoiturageStackParamList>;
  Scanner: NavigatorScreenParams<ScannerStackParamList>;
  Boutique: undefined;
  Profile: undefined;
  Dashboard: undefined;
  Contacts: undefined;
  More: undefined;
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
