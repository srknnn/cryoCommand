/**
 * Vehicle Health Snapshot Schema - defines the vehicle health snapshot document structure in MongoDB
 */
export interface VehicleHealthSnapshotDocument {
  id: string;                      // visibleId - UUID
  vehicle_id: string;
  health_score: number;
  predicted_failure_days: number;
  recommendations: string[];
  calculated_at: string;           // ISO string
}
