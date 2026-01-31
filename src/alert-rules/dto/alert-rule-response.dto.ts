/**
 * Alert Rule Response DTO - matches FastAPI AlertRuleResponse model
 */
export class AlertRuleResponseDto {
  id: string;
  name: string;
  vehicle_id: string | null;
  temp_threshold_min: number;
  temp_threshold_max: number;
  duration_minutes: number;
  offline_alert_minutes: number;
  severity: string;
  is_active: boolean;
  created_at: string;
}
