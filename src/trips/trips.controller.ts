import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import {
  TripCreateDto,
  TripUpdateDto,
  TripResponseDto,
  TripReadingResponseDto,
  TripAlertResponseDto,
  TripSummaryResponseDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/constants/roles';
import { IUser } from '../common/interfaces/user.interface';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  /**
   * Get all trips with optional filters
   * GET /api/trips
   *
   * Query params:
   * - status: Filter by status (planned, active, completed, failed)
   * - vehicle_id: Filter by vehicle
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('vehicle_id') vehicleId?: string,
  ): Promise<TripResponseDto[]> {
    return this.tripsService.findAll(status, vehicleId);
  }

  /**
   * Get single trip by ID
   * GET /api/trips/:trip_id
   */
  @Get(':trip_id')
  async findOne(@Param('trip_id') tripId: string): Promise<TripResponseDto> {
    return this.tripsService.findOne(tripId);
  }

  /**
   * Create a new trip
   * POST /api/trips
   *
   * Roles: admin, operator
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async create(
    @Body() dto: TripCreateDto,
    @CurrentUser() user: IUser,
  ): Promise<TripResponseDto> {
    return this.tripsService.create(dto, user.name);
  }

  /**
   * Update a trip
   * PUT /api/trips/:trip_id
   *
   * Roles: admin, operator
   */
  @Put(':trip_id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async update(
    @Param('trip_id') tripId: string,
    @Body() dto: TripUpdateDto,
  ): Promise<TripResponseDto> {
    return this.tripsService.update(tripId, dto);
  }

  /**
   * Start a trip
   * POST /api/trips/:trip_id/start
   *
   * Roles: admin, operator
   */
  @Post(':trip_id/start')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async start(
    @Param('trip_id') tripId: string,
  ): Promise<{ message: string; actual_start: string }> {
    return this.tripsService.start(tripId);
  }

  /**
   * Complete a trip
   * POST /api/trips/:trip_id/complete
   *
   * Roles: admin, operator
   */
  @Post(':trip_id/complete')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.OPERATOR)
  async complete(
    @Param('trip_id') tripId: string,
  ): Promise<{ message: string; actual_end: string; is_compliant: boolean }> {
    return this.tripsService.complete(tripId);
  }

  /**
   * Delete a trip
   * DELETE /api/trips/:trip_id
   *
   * Roles: admin only
   */
  @Delete(':trip_id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async delete(@Param('trip_id') tripId: string): Promise<{ message: string }> {
    return this.tripsService.delete(tripId);
  }

  /**
   * Get trip readings
   * GET /api/trips/:trip_id/readings
   */
  @Get(':trip_id/readings')
  async getReadings(
    @Param('trip_id') tripId: string,
  ): Promise<TripReadingResponseDto[]> {
    return this.tripsService.getReadings(tripId);
  }

  /**
   * Get trip alerts
   * GET /api/trips/:trip_id/alerts
   */
  @Get(':trip_id/alerts')
  async getAlerts(
    @Param('trip_id') tripId: string,
  ): Promise<TripAlertResponseDto[]> {
    return this.tripsService.getAlerts(tripId);
  }

  /**
   * Get trip summary
   * GET /api/trips/:trip_id/summary
   */
  @Get(':trip_id/summary')
  async getSummary(
    @Param('trip_id') tripId: string,
  ): Promise<TripSummaryResponseDto> {
    return this.tripsService.getSummary(tripId);
  }
}
