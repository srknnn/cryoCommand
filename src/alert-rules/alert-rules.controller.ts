import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AlertRulesService } from './alert-rules.service';
import { AlertRuleCreateDto, AlertRuleResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@Controller('alert-rules')
@UseGuards(JwtAuthGuard)
export class AlertRulesController {
  constructor(private readonly alertRulesService: AlertRulesService) {}

  /**
   * Get all alert rules
   * GET /api/alert-rules
   */
  @Get()
  async findAll(): Promise<AlertRuleResponseDto[]> {
    return this.alertRulesService.findAll();
  }

  /**
   * Create a new alert rule
   * POST /api/alert-rules
   *
   * Roles: admin, operator
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async create(@Body() dto: AlertRuleCreateDto): Promise<AlertRuleResponseDto> {
    return this.alertRulesService.create(dto);
  }

  /**
   * Update an alert rule
   * PUT /api/alert-rules/:rule_id
   *
   * Roles: admin, operator
   */
  @Put(':rule_id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async update(
    @Param('rule_id') ruleId: string,
    @Body() dto: AlertRuleCreateDto,
  ): Promise<AlertRuleResponseDto> {
    return this.alertRulesService.update(ruleId, dto);
  }

  /**
   * Delete an alert rule
   * DELETE /api/alert-rules/:rule_id
   *
   * Roles: admin only
   */
  @Delete(':rule_id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('rule_id') ruleId: string): Promise<{ message: string }> {
    return this.alertRulesService.delete(ruleId);
  }
}
