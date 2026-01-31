/**
 * Report Response DTO - matches FastAPI ReportResponse model
 */
export class ReportResponseDto {
  id: string;
  name: string;
  vehicle_ids: string[];
  start_date: string;
  end_date: string;
  report_type: string;
  status: string;
  created_at: string;
  created_by: string;
}
