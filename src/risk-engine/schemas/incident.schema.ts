/**
 * Incident Schema - defines the incident document structure in MongoDB
 */
export interface IncidentDocument {
  id: string;                // visibleId - UUID
  trip_id: string;
  summary: string;
  root_cause: string;
  recommendations: string[];
  created_at: string;        // ISO string
  created_by_ai: boolean;
}
