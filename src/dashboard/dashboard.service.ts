import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardStatsDto } from './dto';
import { VehicleResponseDto } from '../vehicles/dto';
import { AlertResponseDto } from '../alerts/dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   * GET /api/dashboard/stats
   *
   * Matches FastAPI get_dashboard_stats exactly
   */
  async getStats(): Promise<DashboardStatsDto> {
    // Total vehicles
    const totalVehicles = await this.prisma.vehicle.count();

    // Active vehicles
    const activeVehicles = await this.prisma.vehicle.count({
      where: { status: 'active' },
    });

    // Vehicles in violation (temp outside range)
    const vehicles = await this.prisma.vehicle.findMany({
      take: 1000,
    });

    const violationCount = vehicles.filter(
      (v) => v.current_temp < v.min_temp || v.current_temp > v.max_temp,
    ).length;

    // Alerts today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alertsToday = await this.prisma.alert.count({
      where: {
        created_at: { gte: todayStart },
      },
    });

    return {
      total_vehicles: totalVehicles,
      active_vehicles: activeVehicles,
      vehicles_in_violation: violationCount,
      alerts_today: alertsToday,
    };
  }

  /**
   * Get recent alerts
   * GET /api/dashboard/recent-alerts
   */
  async getRecentAlerts(): Promise<AlertResponseDto[]> {
    const alerts = await this.prisma.alert.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return alerts.map((a) => this.toAlertResponse(a));
  }

  /**
   * Get risky vehicles (temp outside range)
   * GET /api/dashboard/risky-vehicles
   */
  async getRiskyVehicles(): Promise<VehicleResponseDto[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      take: 1000,
    });

    const risky = vehicles
      .filter((v) => v.current_temp < v.min_temp || v.current_temp > v.max_temp)
      .slice(0, 10);

    return risky.map((v) => this.toVehicleResponse(v));
  }

  /**
   * Convert Prisma Alert to AlertResponseDto
   */
  private toAlertResponse(alert: any): AlertResponseDto {
    return {
      id: alert.visibleId,
      vehicle_id: alert.vehicle_id,
      vehicle_name: alert.vehicle_name,
      alert_type: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      temperature: alert.temperature,
      is_resolved: alert.is_resolved,
      resolved_at: alert.resolved_at ? alert.resolved_at.toISOString() : null,
      created_at: alert.created_at.toISOString(),
    };
  }

  /**
   * Convert Prisma Vehicle to VehicleResponseDto
   */
  private toVehicleResponse(vehicle: any): VehicleResponseDto {
    return {
      id: vehicle.visibleId,
      vehicle_id: vehicle.vehicle_id,
      name: vehicle.name,
      type: vehicle.type,
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      current_temp: vehicle.current_temp,
      min_temp: vehicle.min_temp,
      max_temp: vehicle.max_temp,
      status: vehicle.status,
      last_update: vehicle.last_update.toISOString(),
      created_at: vehicle.created_at.toISOString(),
    };
  }
}
