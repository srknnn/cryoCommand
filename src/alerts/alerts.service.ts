import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertResponseDto } from './dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all alerts with optional filters
   * GET /api/alerts
   *
   * @param isResolved - Filter by resolved status
   * @param severity - Filter by severity (critical, warning, info)
   */
  async findAll(
    isResolved?: boolean,
    severity?: string,
  ): Promise<AlertResponseDto[]> {
    const where: any = {};

    if (isResolved !== undefined) {
      where.is_resolved = isResolved;
    }

    if (severity) {
      where.severity = severity;
    }

    const alerts = await this.prisma.alert.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 1000,
    });

    return alerts.map((a) => this.toAlertResponse(a));
  }

  /**
   * Resolve an alert
   * PUT /api/alerts/:alert_id/resolve
   *
   * @param alertId - The visibleId of the alert
   */
  async resolve(alertId: string): Promise<{ message: string }> {
    const alert = await this.prisma.alert.findUnique({
      where: { visibleId: alertId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const now = new Date();

    await this.prisma.alert.update({
      where: { visibleId: alertId },
      data: {
        is_resolved: true,
        resolved_at: now,
      },
    });

    return { message: 'Alert resolved' };
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
}
