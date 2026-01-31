/**
 * Trip Alert Schema - defines the trip alert document structure in MongoDB
 * Matches the Prisma TripAlert model and FastAPI trip alert document
 */
export interface TripAlertDocument {
  id: string;                    // visibleId - UUID
  trip_id: string;
  vehicle_id: string;
  vehicle_name: string;
  alert_type: string;
  severity: string;
  message: string;
  temperature: number | null;
  is_resolved: boolean;
  resolved_at: string | null;    // ISO string or null
  created_at: string;            // ISO string
}
