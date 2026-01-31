/**
 * Seed operation count details
 */
export class SeedCountsDto {
  /** Number of vehicles created/upserted */
  vehicles: number;

  /** Number of alert rules created/upserted */
  alertRules: number;

  /** Number of compliance standards created/upserted */
  complianceStandards: number;

  /** Number of trips created/upserted */
  trips: number;

  /** Number of sensor readings created */
  sensorReadings: number;

  /** Number of trip readings created */
  tripReadings: number;

  /** Number of alerts created */
  alerts: number;

  /** Number of trip alerts created */
  tripAlerts: number;
}

/**
 * Seed run response
 */
export class SeedRunResponseDto {
  /** Operation result message */
  message: string;

  /** Whether the operation was successful */
  success: boolean;

  /** Current environment */
  environment: string;

  /** Counts of seeded data */
  counts: SeedCountsDto;

  /** Timestamp of the operation */
  timestamp: string;
}

/**
 * Seed reset response
 */
export class SeedResetResponseDto {
  /** Operation result message */
  message: string;

  /** Whether the operation was successful */
  success: boolean;

  /** Current environment */
  environment: string;

  /** Tables that were cleared */
  clearedTables: string[];

  /** Timestamp of the operation */
  timestamp: string;
}
