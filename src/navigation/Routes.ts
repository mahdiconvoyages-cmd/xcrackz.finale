export const Routes = {
  MissionList: 'MissionList',
  MissionCreate: 'MissionCreate',
  ShareMission: 'ShareMission',
  MissionView: 'MissionView',
  MissionTracking: 'MissionTracking',
  InspectionDeparture: 'InspectionDeparture',
  InspectionArrival: 'InspectionArrival',
} as const;

export type RouteName = typeof Routes[keyof typeof Routes];

export type MissionsStackParamList = {
  MissionList: undefined;
  MissionCreate: undefined;
  ShareMission: { missionId?: string } | undefined;
  MissionView: { missionId: string };
  MissionTracking: { missionId: string };
  InspectionDeparture: { missionId: string };
  InspectionArrival: { missionId: string };
};
