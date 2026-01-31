import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VehicleResponseDto } from '../vehicles/dto';
import { AlertResponseDto } from '../alerts/dto';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get dashboard statistics
   * GET /api/dashboard/stats
   *
   * Returns:
   * - total_vehicles: Total number of vehicles
   * - active_vehicles: Number of active vehicles
   * - vehicles_in_violation: Vehicles with temp outside range
   * - alerts_today: Number of alerts created today
   */
  @Get('stats')
  async getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats();
  }

  /**
   * Get recent alerts
   * GET /api/dashboard/recent-alerts
   *
   * Returns: 10 most recent alerts
   */
  @Get('recent-alerts')
  async getRecentAlerts(): Promise<AlertResponseDto[]> {
    return this.dashboardService.getRecentAlerts();
  }

  /**
   * Get risky vehicles
   * GET /api/dashboard/risky-vehicles
   *
   * Returns: Up to 10 vehicles with temperature outside their allowed range
   */
  @Get('risky-vehicles')
  async getRiskyVehicles(): Promise<VehicleResponseDto[]> {
    return this.dashboardService.getRiskyVehicles();
  }
}
