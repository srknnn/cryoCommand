import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import {
  CreateVehicleDto,
  VehicleResponseDto,
  SensorReadingResponseDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/constants/roles';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  /**
   * Get all vehicles with optional filters
   * GET /api/vehicles
   *
   * Query params:
   * - status: Filter by status (active, inactive, maintenance)
   * - search: Search by vehicle_id or name
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<VehicleResponseDto[]> {
    return this.vehiclesService.findAll(status, search);
  }

  /**
   * Get single vehicle by ID
   * GET /api/vehicles/:vehicle_id
   */
  @Get(':vehicle_id')
  async findOne(
    @Param('vehicle_id') vehicleId: string,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOne(vehicleId);
  }

  /**
   * Create a new vehicle
   * POST /api/vehicles
   *
   * Roles: admin, operator
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(dto);
  }

  /**
   * Delete a vehicle
   * DELETE /api/vehicles/:vehicle_id
   *
   * Roles: admin only
   */
  @Delete(':vehicle_id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(
    @Param('vehicle_id') vehicleId: string,
  ): Promise<{ message: string }> {
    return this.vehiclesService.delete(vehicleId);
  }

  /**
   * Get sensor readings for a vehicle
   * GET /api/vehicles/:vehicle_id/readings
   *
   * Query params:
   * - hours: Number of hours to look back (default: 24, max: 168)
   */
  @Get(':vehicle_id/readings')
  async getReadings(
    @Param('vehicle_id') vehicleId: string,
    @Query('hours') hours?: number,
  ): Promise<SensorReadingResponseDto[]> {
    return this.vehiclesService.getReadings(vehicleId, hours ?? 24);
  }
}
