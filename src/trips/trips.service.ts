import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  TripCreateDto,
  TripUpdateDto,
  TripResponseDto,
  TripReadingResponseDto,
  TripAlertResponseDto,
  TripSummaryResponseDto,
} from './dto';
import { TripStats } from './schemas/trip.schema';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate trip statistics from readings and alerts
   * Matches FastAPI calculate_trip_stats exactly
   */
  private async calculateTripStats(tripId: string): Promise<TripStats> {
    const readings = await this.prisma.tripReading.findMany({
      where: { trip_id: tripId },
      take: 10000,
    });

    const alerts = await this.prisma.tripAlert.findMany({
      where: { trip_id: tripId, is_resolved: false },
      take: 1000,
    });

    if (!readings || readings.length === 0) {
      return {
        min_temp_recorded: null,
        max_temp_recorded: null,
        avg_temp_recorded: null,
        violation_count: alerts.length,
        is_compliant: alerts.length === 0,
      };
    }

    const temps = readings.map((r) => r.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    return {
      min_temp_recorded: minTemp,
      max_temp_recorded: maxTemp,
      avg_temp_recorded: avgTemp,
      violation_count: alerts.length,
      is_compliant: alerts.length === 0,
    };
  }

  /**
   * Get all trips with optional filters
   * GET /api/trips
   */
  async findAll(
    status?: string,
    vehicleId?: string,
  ): Promise<TripResponseDto[]> {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (vehicleId) {
      where.vehicle_id = vehicleId;
    }

    const trips = await this.prisma.trip.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 1000,
    });

    const result: TripResponseDto[] = [];
    for (const trip of trips) {
      const stats = await this.calculateTripStats(trip.visibleId);
      result.push(this.toTripResponse(trip, stats));
    }

    return result;
  }

  /**
   * Get single trip by ID
   * GET /api/trips/:trip_id
   */
  async findOne(tripId: string): Promise<TripResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const stats = await this.calculateTripStats(tripId);
    return this.toTripResponse(trip, stats);
  }

  /**
   * Create a new trip
   * POST /api/trips
   */
  async create(dto: TripCreateDto, userName: string): Promise<TripResponseDto> {
    // Verify vehicle exists
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { visibleId: dto.vehicle_id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const tripId = uuidv4();
    const now = new Date();

    const trip = await this.prisma.trip.create({
      data: {
        visibleId: tripId,
        trip_code: dto.trip_code,
        vehicle_id: dto.vehicle_id,
        vehicle_name: vehicle.name,
        origin: dto.origin,
        destination: dto.destination,
        planned_start: new Date(dto.planned_start),
        planned_end: new Date(dto.planned_end),
        actual_start: null,
        actual_end: null,
        cargo_type: dto.cargo_type ?? 'frozen_goods',
        status: 'planned',
        is_compliant: true,
        violation_count: 0,
        min_temp_recorded: null,
        max_temp_recorded: null,
        avg_temp_recorded: null,
        notes: dto.notes ?? null,
        created_at: now,
        created_by: userName,
      },
    });

    return this.toTripResponse(trip, {
      min_temp_recorded: null,
      max_temp_recorded: null,
      avg_temp_recorded: null,
      violation_count: 0,
      is_compliant: true,
    });
  }

  /**
   * Update a trip
   * PUT /api/trips/:trip_id
   */
  async update(tripId: string, dto: TripUpdateDto): Promise<TripResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Build update data - only include non-undefined fields
    const updateData: any = {};
    if (dto.origin !== undefined) updateData.origin = dto.origin;
    if (dto.destination !== undefined) updateData.destination = dto.destination;
    if (dto.planned_start !== undefined)
      updateData.planned_start = new Date(dto.planned_start);
    if (dto.planned_end !== undefined)
      updateData.planned_end = new Date(dto.planned_end);
    if (dto.cargo_type !== undefined) updateData.cargo_type = dto.cargo_type;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updatedTrip = await this.prisma.trip.update({
      where: { visibleId: tripId },
      data: updateData,
    });

    const stats = await this.calculateTripStats(tripId);
    return this.toTripResponse(updatedTrip, stats);
  }

  /**
   * Start a trip
   * POST /api/trips/:trip_id/start
   */
  async start(tripId: string): Promise<{ message: string; actual_start: string }> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== 'planned') {
      throw new BadRequestException(
        'Trip can only be started from planned status',
      );
    }

    const now = new Date();

    await this.prisma.trip.update({
      where: { visibleId: tripId },
      data: {
        status: 'active',
        actual_start: now,
      },
    });

    return {
      message: 'Trip started',
      actual_start: now.toISOString(),
    };
  }

  /**
   * Complete a trip
   * POST /api/trips/:trip_id/complete
   */
  async complete(
    tripId: string,
  ): Promise<{ message: string; actual_end: string; is_compliant: boolean }> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== 'active') {
      throw new BadRequestException('Only active trips can be completed');
    }

    const now = new Date();
    const stats = await this.calculateTripStats(tripId);

    await this.prisma.trip.update({
      where: { visibleId: tripId },
      data: {
        status: stats.is_compliant ? 'completed' : 'failed',
        actual_end: now,
        min_temp_recorded: stats.min_temp_recorded,
        max_temp_recorded: stats.max_temp_recorded,
        avg_temp_recorded: stats.avg_temp_recorded,
        violation_count: stats.violation_count,
        is_compliant: stats.is_compliant,
      },
    });

    return {
      message: 'Trip completed',
      actual_end: now.toISOString(),
      is_compliant: stats.is_compliant,
    };
  }

  /**
   * Delete a trip
   * DELETE /api/trips/:trip_id
   */
  async delete(tripId: string): Promise<{ message: string }> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Delete associated readings and alerts
    await this.prisma.tripReading.deleteMany({
      where: { trip_id: tripId },
    });

    await this.prisma.tripAlert.deleteMany({
      where: { trip_id: tripId },
    });

    await this.prisma.trip.delete({
      where: { visibleId: tripId },
    });

    return { message: 'Trip deleted' };
  }

  /**
   * Get trip readings
   * GET /api/trips/:trip_id/readings
   */
  async getReadings(tripId: string): Promise<TripReadingResponseDto[]> {
    const readings = await this.prisma.tripReading.findMany({
      where: { trip_id: tripId },
      orderBy: { timestamp: 'asc' },
      take: 10000,
    });

    return readings.map((r) => this.toTripReadingResponse(r));
  }

  /**
   * Get trip alerts
   * GET /api/trips/:trip_id/alerts
   */
  async getAlerts(tripId: string): Promise<TripAlertResponseDto[]> {
    const alerts = await this.prisma.tripAlert.findMany({
      where: { trip_id: tripId },
      orderBy: { created_at: 'desc' },
      take: 1000,
    });

    return alerts.map((a) => this.toTripAlertResponse(a));
  }

  /**
   * Get trip summary
   * GET /api/trips/:trip_id/summary
   */
  async getSummary(tripId: string): Promise<TripSummaryResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const stats = await this.calculateTripStats(tripId);
    const readingsCount = await this.prisma.tripReading.count({
      where: { trip_id: tripId },
    });

    const alerts = await this.prisma.tripAlert.findMany({
      where: { trip_id: tripId },
      take: 100,
    });

    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;
    const warningAlerts = alerts.filter((a) => a.severity === 'warning').length;

    return {
      trip_id: tripId,
      trip_code: trip.trip_code,
      vehicle_name: trip.vehicle_name,
      origin: trip.origin,
      destination: trip.destination,
      status: trip.status,
      duration_hours: null, // Can be calculated if actual_start and actual_end exist
      readings_count: readingsCount,
      alerts_count: alerts.length,
      critical_alerts: criticalAlerts,
      warning_alerts: warningAlerts,
      min_temp_recorded: stats.min_temp_recorded,
      max_temp_recorded: stats.max_temp_recorded,
      avg_temp_recorded: stats.avg_temp_recorded,
      violation_count: stats.violation_count,
      is_compliant: stats.is_compliant,
    };
  }

  /**
   * Convert Prisma Trip to TripResponseDto
   */
  private toTripResponse(trip: any, stats: TripStats): TripResponseDto {
    return {
      id: trip.visibleId,
      trip_code: trip.trip_code,
      vehicle_id: trip.vehicle_id,
      vehicle_name: trip.vehicle_name,
      origin: trip.origin,
      destination: trip.destination,
      planned_start: trip.planned_start.toISOString(),
      planned_end: trip.planned_end.toISOString(),
      actual_start: trip.actual_start
        ? trip.actual_start.toISOString()
        : null,
      actual_end: trip.actual_end ? trip.actual_end.toISOString() : null,
      cargo_type: trip.cargo_type,
      status: trip.status,
      is_compliant: stats.is_compliant,
      violation_count: stats.violation_count,
      min_temp_recorded: stats.min_temp_recorded,
      max_temp_recorded: stats.max_temp_recorded,
      avg_temp_recorded: stats.avg_temp_recorded,
      notes: trip.notes,
      created_at: trip.created_at.toISOString(),
      created_by: trip.created_by,
    };
  }

  /**
   * Convert Prisma TripReading to TripReadingResponseDto
   */
  private toTripReadingResponse(reading: any): TripReadingResponseDto {
    return {
      id: reading.visibleId,
      trip_id: reading.trip_id,
      vehicle_id: reading.vehicle_id,
      temperature: reading.temperature,
      humidity: reading.humidity,
      latitude: reading.latitude,
      longitude: reading.longitude,
      timestamp: reading.timestamp.toISOString(),
    };
  }

  /**
   * Convert Prisma TripAlert to TripAlertResponseDto
   */
  private toTripAlertResponse(alert: any): TripAlertResponseDto {
    return {
      id: alert.visibleId,
      trip_id: alert.trip_id,
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
