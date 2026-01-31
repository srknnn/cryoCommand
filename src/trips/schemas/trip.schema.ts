/**
 * Trip Schema - defines the trip document structure in MongoDB
 * Matches the Prisma Trip model and FastAPI trip document
 */
export interface TripDocument {
  id: string;                    // visibleId - UUID
  trip_code: string;
  vehicle_id: string;
  vehicle_name: string;
  origin: string;
  destination: string;
  planned_start: string;         // ISO string
  planned_end: string;           // ISO string
  actual_start: string | null;   // ISO string or null
  actual_end: string | null;     // ISO string or null
  cargo_type: string;
  status: string;                // planned, active, completed, failed
  is_compliant: boolean;
  violation_count: number;
  min_temp_recorded: number | null;
  max_temp_recorded: number | null;
  avg_temp_recorded: number | null;
  notes: string | null;
  created_at: string;            // ISO string
  created_by: string;
}

/**
 * Trip Stats - calculated from readings and alerts
 */
export interface TripStats {
  min_temp_recorded: number | null;
  max_temp_recorded: number | null;
  avg_temp_recorded: number | null;
  violation_count: number;
  is_compliant: boolean;
}
