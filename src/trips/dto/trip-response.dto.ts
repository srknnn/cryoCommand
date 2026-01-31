/**
 * Trip Response DTO - matches FastAPI TripResponse model
 */
export class TripResponseDto {
  id: string;
  trip_code: string;
  vehicle_id: string;
  vehicle_name: string;
  origin: string;
  destination: string;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  cargo_type: string;
  status: string; // planned, active, completed, failed
  is_compliant: boolean;
  violation_count: number;
  min_temp_recorded: number | null;
  max_temp_recorded: number | null;
  avg_temp_recorded: number | null;
  notes: string | null;
  created_at: string;
  created_by: string;
}

/**
 * Trip Reading Response DTO - matches FastAPI TripReadingResponse model
 */
export class TripReadingResponseDto {
  id: string;
  trip_id: string;
  vehicle_id: string;
  temperature: number;
  humidity: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

/**
 * Trip Alert Response DTO - matches FastAPI TripAlertResponse model
 */
export class TripAlertResponseDto {
  id: string;
  trip_id: string;
  vehicle_id: string;
  vehicle_name: string;
  alert_type: string;
  severity: string;
  message: string;
  temperature: number | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

/**
 * Trip Summary Response - matches FastAPI get_trip_summary response
 */
export class TripSummaryResponseDto {
  trip_id: string;
  trip_code: string;
  vehicle_name: string;
  origin: string;
  destination: string;
  status: string;
  duration_hours: number | null;
  readings_count: number;
  alerts_count: number;
  critical_alerts: number;
  warning_alerts: number;
  min_temp_recorded: number | null;
  max_temp_recorded: number | null;
  avg_temp_recorded: number | null;
  violation_count: number;
  is_compliant: boolean;
}
