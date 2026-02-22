import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { RiskScoreResponseDto, TripRiskForecastResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class RiskEngineController {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  /**
   * Get vehicle risk score
   * GET /api/vehicles/:id/risk-score
   *
   * Calculates a risk score (0-100) based on:
   * - Temperature variance from sensor_readings last 6h
   * - Alert count last 24h
   * - Last update gap
   * - Distance travelled from GPS readings
   */
  @Get('vehicles/:id/risk-score')
  async getVehicleRiskScore(
    @Param('id') vehicleId: string,
  ): Promise<RiskScoreResponseDto> {
    return this.riskEngineService.getVehicleRiskScore(vehicleId);
  }

  /**
   * Get trip risk forecast
   * GET /api/trips/:id/risk-forecast
   *
   * Calculates a risk score (0-100) based on:
   * - avg_temp_recorded vs vehicle min/max
   * - violation_count
   * - delay vs planned_end
   * - temperature spikes from trip_readings
   */
  @Get('trips/:id/risk-forecast')
  async getTripRiskForecast(
    @Param('id') tripId: string,
  ): Promise<TripRiskForecastResponseDto> {
    return this.riskEngineService.getTripRiskForecast(tripId);
  }
}
