export const Routes = {
  MissionList: 'MissionList',
  MissionCreate: 'MissionCreate',
  ShareMission: 'ShareMission',
  MissionView: 'MissionView',
  MissionTracking: 'MissionTracking',
  InvoiceCreate: 'InvoiceCreate',
  InspectionDeparture: 'InspectionDeparture',
  InspectionArrival: 'InspectionArrival',
  // Inspections navigator
  InspectionShare: 'InspectionShare',
  InspectionReportAdvanced: 'InspectionReportAdvanced',
  InspectionList: 'InspectionList',
  // Carpooling navigator (tabs + stack)
  CarpoolingTabs: 'CarpoolingTabs',
  CarpoolingSearch: 'CarpoolingSearch',
  CarpoolingResults: 'CarpoolingResults',
  PublishRide: 'PublishRide',
  RideDetails: 'RideDetails',
  BookRide: 'BookRide',
  MyTrips: 'MyTrips',
  MyRides: 'MyRides',
  CreditsWallet: 'CreditsWallet',
  TripCreate: 'TripCreate',
  TripDetails: 'TripDetails',
  CarpoolingChat: 'CarpoolingChat',
  Rating: 'Rating',
  // Clients
  ClientList: 'ClientList',
  ClientDetails: 'ClientDetails',
  // Drawer/Main entries
  Dashboard: 'Dashboard',
  MesMissions: 'MesMissions',
  Covoiturage: 'Covoiturage',
  Profile: 'Profile',
  Inspections: 'Inspections',
  ScannerPro: 'ScannerPro',
  ScansLibrary: 'ScansLibrary',
} as const;

export type RouteName = typeof Routes[keyof typeof Routes];

export type MissionsStackParamList = {
  MissionList: undefined;
  MissionCreate: undefined;
  ShareMission: { missionId?: string } | undefined;
  MissionView: { missionId: string };
  MissionTracking: { missionId: string };
  InvoiceCreate: { mission: any };
  InspectionDeparture: { missionId: string };
  InspectionArrival: { missionId: string };
};
