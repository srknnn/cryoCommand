/**
 * Risk Score Response DTO - returned by risk score endpoints
 */
export class RiskScoreResponseDto {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
}

/**
 * Trip Risk Forecast Response DTO - returned by trip risk forecast endpoint
 */
export class TripRiskForecastResponseDto {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  predicted_eta: string | null;
  expected_delay_minutes: number;
}
