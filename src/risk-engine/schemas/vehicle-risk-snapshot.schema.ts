/**
 * Vehicle Risk Snapshot Schema - defines the vehicle risk snapshot document structure in MongoDB
 */
export interface VehicleRiskSnapshotDocument {
  id: string;           // visibleId - UUID
  vehicle_id: string;
  score: number;
  level: string;        // LOW, MEDIUM, HIGH
  reasons: string[];
  calculated_at: string; // ISO string
}
