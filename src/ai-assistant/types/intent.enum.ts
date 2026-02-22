export enum DomainType {
  FLEET = 'FLEET',
  VEHICLE = 'VEHICLE',
  TRIP = 'TRIP',
  ALERT = 'ALERT',
  COMPLIANCE = 'COMPLIANCE',
  SENSOR = 'SENSOR',
  REPORT = 'REPORT',
  UNKNOWN = 'UNKNOWN',
}

export enum ActionType {
  OVERVIEW = 'OVERVIEW',
  DETAIL = 'DETAIL',
  STATUS = 'STATUS',
  TREND = 'TREND',
  ANALYSIS = 'ANALYSIS',
  UNKNOWN = 'UNKNOWN',
}

export interface ClassifiedIntent {
  domain: DomainType;
  action: ActionType;
}

export const DOMAIN_VALUES = Object.values(DomainType);
export const ACTION_VALUES = Object.values(ActionType);
