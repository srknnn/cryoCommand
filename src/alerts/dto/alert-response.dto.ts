/**
 * Alert Response DTO - matches FastAPI AlertResponse model
 */
export class AlertResponseDto {
  id: string;
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
