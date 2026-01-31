/**
 * Dashboard Stats Response - matches FastAPI get_dashboard_stats response
 */
export class DashboardStatsDto {
  total_vehicles: number;
  active_vehicles: number;
  vehicles_in_violation: number;
  alerts_today: number;
}
