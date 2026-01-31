import {
  Injectable,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import {
  ComplianceStandardCreateDto,
  ComplianceStandardResponseDto,
  ComplianceResultResponseDto,
  ComplianceSummaryDto,
  ViolationDetailDto,
} from './dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== STANDARDS ====================

  /**
   * Get all compliance standards
   * GET /api/compliance/standards
   */
  async getStandards(): Promise<ComplianceStandardResponseDto[]> {
    const standards = await this.prisma.complianceStandard.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    return standards.map((s) => this.toStandardResponse(s));
  }

  /**
   * Create a compliance standard
   * POST /api/compliance/standards
   */
  async createStandard(
    dto: ComplianceStandardCreateDto,
  ): Promise<ComplianceStandardResponseDto> {
    const standardId = uuidv4();
    const now = new Date();

    const standard = await this.prisma.complianceStandard.create({
      data: {
        visibleId: standardId,
        name: dto.name,
        description: dto.description,
        min_temp: dto.min_temp ?? -25.0,
        max_temp: dto.max_temp ?? -15.0,
        max_violation_duration_minutes: dto.max_violation_duration_minutes ?? 30,
        max_violations_allowed: dto.max_violations_allowed ?? 0,
        max_offline_minutes: dto.max_offline_minutes ?? 60,
        is_active: dto.is_active ?? true,
        created_at: now,
      },
    });

    return this.toStandardResponse(standard);
  }

  // ==================== RESULTS ====================

  /**
   * Get all compliance results
   * GET /api/compliance/results
   */
  async getResults(status?: string): Promise<ComplianceResultResponseDto[]> {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const results = await this.prisma.complianceResult.findMany({
      where,
      orderBy: { evaluated_at: 'desc' },
      take: 1000,
    });

    return results.map((r) => this.toResultResponse(r));
  }

  /**
   * Get compliance result for a trip
   * GET /api/compliance/results/:trip_id
   */
  async getResult(tripId: string): Promise<ComplianceResultResponseDto> {
    const result = await this.prisma.complianceResult.findFirst({
      where: { trip_id: tripId },
    });

    if (!result) {
      throw new NotFoundException('Compliance result not found');
    }

    return this.toResultResponse(result);
  }

  // ==================== EVALUATION ====================

  /**
   * Evaluate trip compliance against a standard
   * POST /api/compliance/evaluate/:trip_id
   *
   * Matches FastAPI evaluate_trip_compliance exactly
   */
  async evaluateTrip(
    tripId: string,
    standardId: string | null,
    userName: string,
  ): Promise<ComplianceResultResponseDto> {
    // Use default standard if not specified
    let standard: any;
    if (!standardId) {
      standard = await this.prisma.complianceStandard.findFirst({
        where: { is_active: true },
      });
      if (!standard) {
        throw new BadRequestException('No active compliance standard found');
      }
    } else {
      standard = await this.prisma.complianceStandard.findUnique({
        where: { visibleId: standardId },
      });
      if (!standard) {
        throw new NotFoundException('Standard not found');
      }
    }

    const result = await this.evaluateTripCompliance(
      tripId,
      standard.visibleId,
      userName,
    );

    if (!result) {
      throw new NotFoundException('Trip or standard not found');
    }

    return result;
  }

  /**
   * Evaluate all completed/failed trips
   * POST /api/compliance/evaluate-all
   */
  async evaluateAll(
    userName: string,
  ): Promise<{ message: string; standard: string }> {
    const defaultStandard = await this.prisma.complianceStandard.findFirst({
      where: { is_active: true },
    });

    if (!defaultStandard) {
      throw new BadRequestException('No active compliance standard found');
    }

    const trips = await this.prisma.trip.findMany({
      where: { status: { in: ['completed', 'failed'] } },
      take: 1000,
    });

    let evaluated = 0;
    for (const trip of trips) {
      const result = await this.evaluateTripCompliance(
        trip.visibleId,
        defaultStandard.visibleId,
        userName,
      );
      if (result) {
        evaluated++;
      }
    }

    return {
      message: `Evaluated ${evaluated} trips`,
      standard: defaultStandard.name,
    };
  }

  /**
   * Core evaluation logic - matches FastAPI evaluate_trip_compliance exactly
   */
  private async evaluateTripCompliance(
    tripId: string,
    standardId: string,
    userName: string,
  ): Promise<ComplianceResultResponseDto | null> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });
    if (!trip) return null;

    const standard = await this.prisma.complianceStandard.findUnique({
      where: { visibleId: standardId },
    });
    if (!standard) return null;

    // Get trip readings and alerts
    const readings = await this.prisma.tripReading.findMany({
      where: { trip_id: tripId },
      take: 10000,
    });

    const alerts = await this.prisma.tripAlert.findMany({
      where: { trip_id: tripId },
      take: 1000,
    });

    const violations: ViolationDetailDto[] = [];
    let compliantReadings = 0;

    // Check each reading against standard
    for (const reading of readings) {
      const temp = reading.temperature;
      if (temp >= standard.min_temp && temp <= standard.max_temp) {
        compliantReadings++;
      } else {
        const violationType =
          temp < standard.min_temp ? 'temperature_low' : 'temperature_high';
        const threshold =
          violationType === 'temperature_low'
            ? standard.min_temp
            : standard.max_temp;
        const severity = Math.abs(temp - threshold) > 5 ? 'critical' : 'warning';

        violations.push({
          type: violationType,
          severity,
          message: `Sıcaklık ${temp.toFixed(1)}°C, izin verilen aralık dışında (${standard.min_temp}° - ${standard.max_temp}°)`,
          timestamp: reading.timestamp.toISOString(),
          temperature: temp,
          duration_minutes: null,
        });
      }
    }

    // Add alerts as violations
    for (const alert of alerts) {
      if (!alert.is_resolved) {
        violations.push({
          type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          timestamp: alert.created_at.toISOString(),
          temperature: alert.temperature,
          duration_minutes: null,
        });
      }
    }

    // Calculate score
    const totalReadings = readings.length || 1;
    const score =
      totalReadings > 0 ? (compliantReadings / totalReadings) * 100 : 100;

    // Determine status
    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical',
    ).length;
    const status =
      criticalViolations <= standard.max_violations_allowed && score >= 90
        ? 'passed'
        : 'failed';

    const now = new Date();
    const resultId = uuidv4();

    const resultDoc = {
      visibleId: resultId,
      trip_id: tripId,
      trip_code: trip.trip_code,
      vehicle_name: trip.vehicle_name,
      origin: trip.origin,
      destination: trip.destination,
      standard_id: standardId,
      standard_name: standard.name,
      status,
      score: Math.round(score * 100) / 100,
      total_readings: totalReadings,
      compliant_readings: compliantReadings,
      violation_count: violations.length,
      violations: violations.slice(0, 50) as unknown as object, // Cast to Json for Prisma
      evaluated_at: now,
      evaluated_by: userName,
    };

    // Update or insert compliance result
    const existing = await this.prisma.complianceResult.findFirst({
      where: { trip_id: tripId, standard_id: standardId },
    });

    let savedResult: any;
    if (existing) {
      savedResult = await this.prisma.complianceResult.update({
        where: { id: existing.id },
        data: resultDoc,
      });
    } else {
      savedResult = await this.prisma.complianceResult.create({
        data: resultDoc,
      });
    }

    return this.toResultResponse(savedResult);
  }

  // ==================== SUMMARY ====================

  /**
   * Get compliance summary
   * GET /api/compliance/summary
   */
  async getSummary(): Promise<ComplianceSummaryDto> {
    const results = await this.prisma.complianceResult.findMany({
      take: 10000,
    });

    const total = results.length;
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = total - passed;
    const avgScore =
      total > 0 ? results.reduce((sum, r) => sum + r.score, 0) / total : 0;
    const complianceRate = total > 0 ? (passed / total) * 100 : 0;

    return {
      total_trips: total,
      passed_trips: passed,
      failed_trips: failed,
      average_score: Math.round(avgScore * 100) / 100,
      compliance_rate: Math.round(complianceRate * 100) / 100,
    };
  }

  // ==================== PDF REPORT ====================

  /**
   * Generate PDF compliance report
   * GET /api/compliance/report/:trip_id/pdf
   */
  async generatePdfReport(tripId: string): Promise<StreamableFile> {
    const result = await this.prisma.complianceResult.findFirst({
      where: { trip_id: tripId },
    });

    if (!result) {
      throw new NotFoundException('Compliance result not found');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    const standard = await this.prisma.complianceStandard.findUnique({
      where: { visibleId: result.standard_id },
    });

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Colors
    const primaryColor = '#0d9488';
    const passedColor = '#10b981';
    const failedColor = '#ef4444';
    const darkBg = '#1e293b';

    // Title
    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .text('SOĞUK ZİNCİR UYUMLULUK RAPORU', { align: 'center' });
    doc
      .fillColor('#666')
      .fontSize(14)
      .text('Cold Chain Compliance Audit Report', { align: 'center' });
    doc.moveDown(2);

    // Status Banner
    const statusColor = result.status === 'passed' ? passedColor : failedColor;
    const statusText =
      result.status === 'passed' ? 'UYUMLU (PASSED)' : 'UYUMSUZ (FAILED)';
    doc.fillColor(statusColor).fontSize(18).text(`DURUM: ${statusText}`);
    doc
      .fillColor('#333')
      .fontSize(14)
      .text(`Uyumluluk Skoru: ${result.score.toFixed(1)}%`);
    doc.moveDown(2);

    // Trip Information
    doc.fillColor(primaryColor).fontSize(16).text('SEFER BİLGİLERİ / Trip Information');
    doc.moveDown(0.5);
    doc.fillColor('#333').fontSize(11);
    doc.text(`Sefer Kodu / Trip Code: ${result.trip_code}`);
    doc.text(`Araç / Vehicle: ${result.vehicle_name}`);
    doc.text(`Güzergah / Route: ${result.origin} → ${result.destination}`);
    doc.text(
      `Değerlendirme Tarihi / Evaluation Date: ${result.evaluated_at.toISOString().slice(0, 19).replace('T', ' ')}`,
    );
    doc.text(`Değerlendiren / Evaluated By: ${result.evaluated_by}`);
    doc.moveDown(2);

    // Compliance Standard
    if (standard) {
      doc
        .fillColor(primaryColor)
        .fontSize(16)
        .text('UYUMLULUK STANDARDI / Compliance Standard');
      doc.moveDown(0.5);
      doc.fillColor('#333').fontSize(11);
      doc.text(`Standart Adı / Standard Name: ${standard.name}`);
      doc.text(
        `Sıcaklık Aralığı / Temp Range: ${standard.min_temp}°C - ${standard.max_temp}°C`,
      );
      doc.text(
        `Maks. İhlal Sayısı / Max Violations: ${standard.max_violations_allowed}`,
      );
      doc.moveDown(2);
    }

    // Results Summary
    doc.fillColor(primaryColor).fontSize(16).text('SONUÇ ÖZETİ / Results Summary');
    doc.moveDown(0.5);
    doc.fillColor('#333').fontSize(11);
    doc.text(`Toplam Okuma / Total Readings: ${result.total_readings}`);
    doc.text(`Uyumlu Okuma / Compliant Readings: ${result.compliant_readings}`);
    doc.text(`İhlal Sayısı / Violation Count: ${result.violation_count}`);
    doc.text(`Uyumluluk Oranı / Compliance Rate: ${result.score.toFixed(1)}%`);
    doc.moveDown(2);

    // Violations List
    const violations = result.violations as unknown as ViolationDetailDto[];
    if (violations && violations.length > 0) {
      doc
        .fillColor(primaryColor)
        .fontSize(16)
        .text('İHLAL DETAYLARI / Violation Details');
      doc.moveDown(0.5);
      doc.fillColor('#333').fontSize(10);

      const displayViolations = violations.slice(0, 20);
      for (const v of displayViolations) {
        const timestamp = v.timestamp
          ? v.timestamp.slice(0, 16).replace('T', ' ')
          : '-';
        const temp = v.temperature ? `${v.temperature.toFixed(1)}°C` : '-';
        const msg =
          v.message && v.message.length > 50
            ? v.message.slice(0, 50) + '...'
            : v.message || '-';
        doc.text(`• [${timestamp}] ${v.type} (${v.severity}) - ${temp} - ${msg}`);
      }

      if (violations.length > 20) {
        doc.text(`... ve ${violations.length - 20} adet daha`);
      }
      doc.moveDown(2);
    }

    // Footer
    doc.moveDown(2);
    doc
      .fillColor('#666')
      .fontSize(10)
      .text(
        'Bu rapor CryoCommand Soğuk Zincir Takip Sistemi tarafından otomatik olarak oluşturulmuştur.',
        { align: 'center' },
      );
    doc.text(
      'This report was automatically generated by CryoCommand Cold Chain Monitoring System.',
      { align: 'center' },
    );
    doc.moveDown(0.5);
    doc.text(
      `Oluşturulma Tarihi / Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`,
      { align: 'center' },
    );

    doc.end();

    // Wait for PDF to be generated
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(new StreamableFile(pdfBuffer));
      });
    });
  }

  /**
   * Get filename for PDF report
   */
  getPdfFilename(tripCode: string): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `compliance_report_${tripCode}_${date}.pdf`;
  }

  // ==================== HELPERS ====================

  private toStandardResponse(standard: any): ComplianceStandardResponseDto {
    return {
      id: standard.visibleId,
      name: standard.name,
      description: standard.description,
      min_temp: standard.min_temp,
      max_temp: standard.max_temp,
      max_violation_duration_minutes: standard.max_violation_duration_minutes,
      max_violations_allowed: standard.max_violations_allowed,
      max_offline_minutes: standard.max_offline_minutes,
      is_active: standard.is_active,
      created_at: standard.created_at.toISOString(),
    };
  }

  private toResultResponse(result: any): ComplianceResultResponseDto {
    return {
      id: result.visibleId,
      trip_id: result.trip_id,
      trip_code: result.trip_code,
      vehicle_name: result.vehicle_name,
      origin: result.origin,
      destination: result.destination,
      standard_id: result.standard_id,
      standard_name: result.standard_name,
      status: result.status,
      score: result.score,
      total_readings: result.total_readings,
      compliant_readings: result.compliant_readings,
      violation_count: result.violation_count,
      violations: result.violations as ViolationDetailDto[],
      evaluated_at: result.evaluated_at.toISOString(),
      evaluated_by: result.evaluated_by,
    };
  }
}
