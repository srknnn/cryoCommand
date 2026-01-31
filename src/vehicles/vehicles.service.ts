import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVehicleDto,
  VehicleResponseDto,
  SensorReadingResponseDto,
} from './dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all vehicles with optional filters
   * GET /api/vehicles
   *
   * @param status - Filter by status (active, inactive, maintenance)
   * @param search - Search by vehicle_id or name (case-insensitive)
   */
  async findAll(
    status?: string,
    search?: string,
  ): Promise<VehicleResponseDto[]> {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { vehicle_id: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    return vehicles.map((v) => this.toVehicleResponse(v));
  }

  /**
   * Get single vehicle by ID
   * GET /api/vehicles/:vehicle_id
   *
   * @param vehicleId - The visibleId of the vehicle
   */
  async findOne(vehicleId: string): Promise<VehicleResponseDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { visibleId: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.toVehicleResponse(vehicle);
  }

  /**
   * Create a new vehicle
   * POST /api/vehicles
   *
   * Initial current_temp is randomly generated between min_temp and max_temp
   */
  async create(dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const vehicleId = uuidv4();
    const now = new Date();

    // Random initial temperature between min and max
    const minTemp = dto.min_temp ?? -25.0;
    const maxTemp = dto.max_temp ?? -15.0;
    const currentTemp = Math.random() * (maxTemp - minTemp) + minTemp;

    const vehicle = await this.prisma.vehicle.create({
      data: {
        visibleId: vehicleId,
        vehicle_id: dto.vehicle_id,
        name: dto.name,
        type: dto.type ?? 'truck',
        latitude: dto.latitude ?? 40.7128,
        longitude: dto.longitude ?? -74.006,
        current_temp: currentTemp,
        min_temp: minTemp,
        max_temp: maxTemp,
        status: 'active',
        last_update: now,
        created_at: now,
      },
    });

    return this.toVehicleResponse(vehicle);
  }

  /**
   * Delete a vehicle
   * DELETE /api/vehicles/:vehicle_id
   *
   * @param vehicleId - The visibleId of the vehicle
   */
  async delete(vehicleId: string): Promise<{ message: string }> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { visibleId: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.prisma.vehicle.delete({
      where: { visibleId: vehicleId },
    });

    return { message: 'Vehicle deleted' };
  }

  /**
   * Get sensor readings for a vehicle
   * GET /api/vehicles/:vehicle_id/readings
   *
   * @param vehicleId - The visibleId of the vehicle
   * @param hours - Number of hours to look back (default: 24, max: 168)
   */
  async getReadings(
    vehicleId: string,
    hours: number = 24,
  ): Promise<SensorReadingResponseDto[]> {
    // Validate hours (max 168 = 7 days)
    const validHours = Math.min(Math.max(hours, 1), 168);
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - validHours);

    const readings = await this.prisma.sensorReading.findMany({
      where: {
        vehicle_id: vehicleId,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    return readings.map((r) => this.toSensorReadingResponse(r));
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

  /**
   * Convert Prisma SensorReading to SensorReadingResponseDto
   */
  private toSensorReadingResponse(reading: any): SensorReadingResponseDto {
    return {
      id: reading.visibleId,
      vehicle_id: reading.vehicle_id,
      temperature: reading.temperature,
      humidity: reading.humidity,
      latitude: reading.latitude,
      longitude: reading.longitude,
      timestamp: reading.timestamp.toISOString(),
    };
  }
}
