/**
 * Trip Risk Snapshot Schema - defines the trip risk snapshot document structure in MongoDB
 */
export interface TripRiskSnapshotDocument {
  id: string;                    // visibleId - UUID
  trip_id: string;
  score: number;
  level: string;                 // LOW, MEDIUM, HIGH
  predicted_eta: string;         // ISO string
  expected_delay_minutes: number;
  calculated_at: string;         // ISO string
}
