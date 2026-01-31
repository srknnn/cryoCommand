import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportCreateDto, ReportResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles';
import { IUser } from '../common/interfaces/user.interface';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Get all reports
   * GET /api/reports
   */
  @Get()
  async findAll(): Promise<ReportResponseDto[]> {
    return this.reportsService.findAll();
  }

  /**
   * Create a new report
   * POST /api/reports
   *
   * Roles: admin, operator
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async create(
    @Body() dto: ReportCreateDto,
    @CurrentUser() user: IUser,
  ): Promise<ReportResponseDto> {
    return this.reportsService.create(dto, user.name);
  }

  /**
   * Download report as PDF
   * GET /api/reports/:report_id/download
   */
  @Get(':report_id/download')
  @Header('Content-Type', 'application/pdf')
  async downloadReport(
    @Param('report_id') reportId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get report for filename
    const report = await this.reportsService.getReport(reportId);
    const filename = this.reportsService.getPdfFilename(report.name);

    res.set({
      'Content-Disposition': `attachment; filename=${filename}`,
    });

    return this.reportsService.downloadReport(reportId);
  }
}
