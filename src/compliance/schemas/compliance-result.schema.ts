import { ViolationDetailDto } from '../dto/compliance-result.dto';

/**
 * Compliance Result Schema - defines the compliance result document structure in MongoDB
 * Matches the Prisma ComplianceResult model and FastAPI compliance result document
 */
export interface ComplianceResultDocument {
  id: string;                    // visibleId - UUID
  trip_id: string;
  trip_code: string;
  vehicle_name: string;
  origin: string;
  destination: string;
  standard_id: string;
  standard_name: string;
  status: string;                // passed, failed
  score: number;                 // 0-100
  total_readings: number;
  compliant_readings: number;
  violation_count: number;
  violations: ViolationDetailDto[];
  evaluated_at: string;          // ISO string
  evaluated_by: string;
}
