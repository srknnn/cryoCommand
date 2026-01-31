/**
 * Violation Detail - matches FastAPI ViolationDetail model
 */
export class ViolationDetailDto {
  type: string; // temperature_high, temperature_low, sensor_offline, duration_exceeded
  severity: string;
  message: string;
  timestamp: string;
  temperature: number | null;
  duration_minutes: number | null;
}

/**
 * Compliance Result Response DTO - matches FastAPI ComplianceResultResponse model
 */
export class ComplianceResultResponseDto {
  id: string;
  trip_id: string;
  trip_code: string;
  vehicle_name: string;
  origin: string;
  destination: string;
  standard_id: string;
  standard_name: string;
  status: string; // passed, failed
  score: number; // 0-100
  total_readings: number;
  compliant_readings: number;
  violation_count: number;
  violations: ViolationDetailDto[];
  evaluated_at: string;
  evaluated_by: string;
}

/**
 * Compliance Summary DTO - matches FastAPI ComplianceSummary model
 */
export class ComplianceSummaryDto {
  total_trips: number;
  passed_trips: number;
  failed_trips: number;
  average_score: number;
  compliance_rate: number;
}
