/**
 * Alert Schema - defines the alert document structure in MongoDB
 * Matches the Prisma Alert model and FastAPI alert document
 */
export interface AlertDocument {
  id: string;            // visibleId - UUID
  vehicle_id: string;    // reference to vehicle's visibleId
  vehicle_name: string;
  alert_type: string;    // high_temp, low_temp, sensor_offline, etc.
  severity: string;      // critical, warning, info
  message: string;
  temperature: number | null;
  is_resolved: boolean;
  resolved_at: string | null;  // ISO string or null
  created_at: string;          // ISO string
}
