import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * Get all alerts with optional filters
   * GET /api/alerts
   *
   * Query params:
   * - is_resolved: Filter by resolved status (true/false)
   * - severity: Filter by severity (critical, warning, info)
   */
  @Get()
  async findAll(
    @Query('is_resolved') isResolved?: string,
    @Query('severity') severity?: string,
  ): Promise<AlertResponseDto[]> {
    // Parse is_resolved string to boolean if provided
    let resolved: boolean | undefined;
    if (isResolved !== undefined && isResolved !== '') {
      resolved = isResolved === 'true';
    }

    return this.alertsService.findAll(resolved, severity);
  }

  /**
   * Resolve an alert
   * PUT /api/alerts/:alert_id/resolve
   *
   * Roles: admin, operator
   */
  @Put(':alert_id/resolve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async resolve(
    @Param('alert_id') alertId: string,
  ): Promise<{ message: string }> {
    return this.alertsService.resolve(alertId);
  }
}
