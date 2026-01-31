/**
 * Alert Rule Schema - defines the alert rule document structure in MongoDB
 * Matches the Prisma AlertRule model and FastAPI alert rule document
 */
export interface AlertRuleDocument {
  id: string;                    // visibleId - UUID
  name: string;
  vehicle_id: string | null;     // null means applies to all vehicles
  temp_threshold_min: number;
  temp_threshold_max: number;
  duration_minutes: number;
  offline_alert_minutes: number;
  severity: string;              // critical, warning, info
  is_active: boolean;
  created_at: string;            // ISO string
}
