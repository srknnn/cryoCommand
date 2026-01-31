import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { AlertRuleCreateDto, AlertRuleResponseDto } from './dto';

@Injectable()
export class AlertRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all alert rules
   * GET /api/alert-rules
   */
  async findAll(): Promise<AlertRuleResponseDto[]> {
    const rules = await this.prisma.alertRule.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return rules.map((r) => this.toAlertRuleResponse(r));
  }

  /**
   * Create a new alert rule
   * POST /api/alert-rules
   */
  async create(dto: AlertRuleCreateDto): Promise<AlertRuleResponseDto> {
    const ruleId = uuidv4();
    const now = new Date();

    const rule = await this.prisma.alertRule.create({
      data: {
        visibleId: ruleId,
        name: dto.name,
        vehicle_id: dto.vehicle_id ?? null,
        temp_threshold_min: dto.temp_threshold_min ?? -25.0,
        temp_threshold_max: dto.temp_threshold_max ?? -15.0,
        duration_minutes: dto.duration_minutes ?? 5,
        offline_alert_minutes: dto.offline_alert_minutes ?? 10,
        severity: dto.severity ?? 'warning',
        is_active: dto.is_active ?? true,
        created_at: now,
      },
    });

    return this.toAlertRuleResponse(rule);
  }

  /**
   * Update an alert rule
   * PUT /api/alert-rules/:rule_id
   */
  async update(
    ruleId: string,
    dto: AlertRuleCreateDto,
  ): Promise<AlertRuleResponseDto> {
    const existing = await this.prisma.alertRule.findUnique({
      where: { visibleId: ruleId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    const rule = await this.prisma.alertRule.update({
      where: { visibleId: ruleId },
      data: {
        name: dto.name,
        vehicle_id: dto.vehicle_id ?? null,
        temp_threshold_min: dto.temp_threshold_min ?? -25.0,
        temp_threshold_max: dto.temp_threshold_max ?? -15.0,
        duration_minutes: dto.duration_minutes ?? 5,
        offline_alert_minutes: dto.offline_alert_minutes ?? 10,
        severity: dto.severity ?? 'warning',
        is_active: dto.is_active ?? true,
      },
    });

    return this.toAlertRuleResponse(rule);
  }

  /**
   * Delete an alert rule
   * DELETE /api/alert-rules/:rule_id
   */
  async delete(ruleId: string): Promise<{ message: string }> {
    const existing = await this.prisma.alertRule.findUnique({
      where: { visibleId: ruleId },
    });

    if (!existing) {
      throw new NotFoundException('Alert rule not found');
    }

    await this.prisma.alertRule.delete({
      where: { visibleId: ruleId },
    });

    return { message: 'Alert rule deleted' };
  }

  /**
   * Convert Prisma AlertRule to AlertRuleResponseDto
   */
  private toAlertRuleResponse(rule: any): AlertRuleResponseDto {
    return {
      id: rule.visibleId,
      name: rule.name,
      vehicle_id: rule.vehicle_id,
      temp_threshold_min: rule.temp_threshold_min,
      temp_threshold_max: rule.temp_threshold_max,
      duration_minutes: rule.duration_minutes,
      offline_alert_minutes: rule.offline_alert_minutes,
      severity: rule.severity,
      is_active: rule.is_active,
      created_at: rule.created_at.toISOString(),
    };
  }
}
