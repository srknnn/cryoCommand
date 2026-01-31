import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ComplianceService } from './compliance.service';
import {
  ComplianceStandardCreateDto,
  ComplianceStandardResponseDto,
  ComplianceResultResponseDto,
  ComplianceSummaryDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles';
import { IUser } from '../common/interfaces/user.interface';

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ==================== STANDARDS ====================

  /**
   * Get all compliance standards
   * GET /api/compliance/standards
   */
  @Get('standards')
  async getStandards(): Promise<ComplianceStandardResponseDto[]> {
    return this.complianceService.getStandards();
  }

  /**
   * Create a compliance standard
   * POST /api/compliance/standards
   *
   * Roles: admin only
   */
  @Post('standards')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async createStandard(
    @Body() dto: ComplianceStandardCreateDto,
  ): Promise<ComplianceStandardResponseDto> {
    return this.complianceService.createStandard(dto);
  }

  // ==================== RESULTS ====================

  /**
   * Get all compliance results
   * GET /api/compliance/results
   *
   * Query params:
   * - status: Filter by status (passed, failed)
   */
  @Get('results')
  async getResults(
    @Query('status') status?: string,
  ): Promise<ComplianceResultResponseDto[]> {
    return this.complianceService.getResults(status);
  }

  /**
   * Get compliance result for a trip
   * GET /api/compliance/results/:trip_id
   */
  @Get('results/:trip_id')
  async getResult(
    @Param('trip_id') tripId: string,
  ): Promise<ComplianceResultResponseDto> {
    return this.complianceService.getResult(tripId);
  }

  // ==================== EVALUATION ====================

  /**
   * Evaluate trip compliance
   * POST /api/compliance/evaluate/:trip_id
   *
   * Query params:
   * - standard_id: Optional standard ID (uses active default if not provided)
   *
   * Roles: admin, operator
   */
  @Post('evaluate/:trip_id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async evaluateTrip(
    @Param('trip_id') tripId: string,
    @Query('standard_id') standardId?: string,
    @CurrentUser() user?: IUser,
  ): Promise<ComplianceResultResponseDto> {
    return this.complianceService.evaluateTrip(
      tripId,
      standardId || null,
      user?.name || 'System',
    );
  }

  /**
   * Evaluate all completed/failed trips
   * POST /api/compliance/evaluate-all
   *
   * Roles: admin only
   */
  @Post('evaluate-all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async evaluateAll(
    @CurrentUser() user: IUser,
  ): Promise<{ message: string; standard: string }> {
    return this.complianceService.evaluateAll(user.name);
  }

  // ==================== SUMMARY ====================

  /**
   * Get compliance summary
   * GET /api/compliance/summary
   */
  @Get('summary')
  async getSummary(): Promise<ComplianceSummaryDto> {
    return this.complianceService.getSummary();
  }

  // ==================== PDF REPORT ====================

  /**
   * Download PDF compliance report
   * GET /api/compliance/report/:trip_id/pdf
   */
  @Get('report/:trip_id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPdfReport(
    @Param('trip_id') tripId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get trip code for filename
    const result = await this.complianceService.getResult(tripId);
    const filename = this.complianceService.getPdfFilename(result.trip_code);

    res.set({
      'Content-Disposition': `attachment; filename=${filename}`,
    });

    return this.complianceService.generatePdfReport(tripId);
  }
}
