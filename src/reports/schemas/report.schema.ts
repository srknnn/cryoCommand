/**
 * Report Schema - defines the report document structure in MongoDB
 * Matches the Prisma Report model and FastAPI report document
 */
export interface ReportDocument {
  id: string;            // visibleId - UUID
  name: string;
  vehicle_ids: string[]; // Array of vehicle IDs
  start_date: string;
  end_date: string;
  report_type: string;   // temperature, compliance, etc.
  status: string;        // completed, pending, failed
  created_at: string;    // ISO string
  created_by: string;
}
