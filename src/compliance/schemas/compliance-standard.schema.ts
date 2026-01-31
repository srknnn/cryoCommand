/**
 * Compliance Standard Schema - defines the compliance standard document structure in MongoDB
 * Matches the Prisma ComplianceStandard model and FastAPI compliance standard document
 */
export interface ComplianceStandardDocument {
  id: string;                            // visibleId - UUID
  name: string;
  description: string;
  min_temp: number;
  max_temp: number;
  max_violation_duration_minutes: number;
  max_violations_allowed: number;
  max_offline_minutes: number;
  is_active: boolean;
  created_at: string;                    // ISO string
}
