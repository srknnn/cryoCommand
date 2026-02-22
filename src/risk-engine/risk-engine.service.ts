import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RiskScoreResponseDto, TripRiskForecastResponseDto } from './dto';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

@Injectable()
export class RiskEngineService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate vehicle risk score
   * GET /api/vehicles/:id/risk-score
   *
   * Factors:
   * - Temperature variance from sensor_readings last 6h (0-25 points)
   * - Alert count last 24h (0-30 points)
   * - Last update gap (0-20 points)
   * - Distance travelled from GPS readings (0-25 points)
   */
  async getVehicleRiskScore(vehicleId: string): Promise<RiskScoreResponseDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { visibleId: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const reasons: string[] = [];
    let totalScore = 0;

    // Factor 1: Temperature variance from sensor_readings last 6h (0-25 points)
    const tempVarianceResult = await this.calculateTempVariance(vehicleId);
    totalScore += tempVarianceResult.score;
    if (tempVarianceResult.reason) {
      reasons.push(tempVarianceResult.reason);
    }

    // Factor 2: Alert count last 24h (0-30 points)
    const alertResult = await this.calculateAlertFactor(vehicleId);
    totalScore += alertResult.score;
    if (alertResult.reason) {
      reasons.push(alertResult.reason);
    }

    // Factor 3: Last update gap (0-20 points)
    const updateGapResult = this.calculateUpdateGap(vehicle.last_update);
    totalScore += updateGapResult.score;
    if (updateGapResult.reason) {
      reasons.push(updateGapResult.reason);
    }

    // Factor 4: Distance travelled from GPS readings (0-25 points)
    const distanceResult = await this.calculateDistanceFactor(vehicleId);
    totalScore += distanceResult.score;
    if (distanceResult.reason) {
      reasons.push(distanceResult.reason);
    }

    const score = Math.min(Math.round(totalScore), 100);
    const level = this.scoreToLevel(score);

    if (reasons.length === 0) {
      reasons.push('All vehicle metrics are within normal range');
    }

    // Store snapshot
    await this.storeVehicleRiskSnapshot(vehicleId, score, level, reasons);

    return { score, level, reasons };
  }

  /**
   * Calculate trip risk forecast
   * GET /api/trips/:id/risk-forecast
   *
   * Factors:
   * - avg_temp_recorded vs vehicle min/max (0-30 points)
   * - violation_count (0-25 points)
   * - delay vs planned_end (0-25 points)
   * - temperature spikes from trip_readings (0-20 points)
   */
  async getTripRiskForecast(
    tripId: string,
  ): Promise<TripRiskForecastResponseDto> {
    const trip = await this.prisma.trip.findUnique({
      where: { visibleId: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { visibleId: trip.vehicle_id },
    });

    const reasons: string[] = [];
    let totalScore = 0;

    // Factor 1: avg_temp_recorded vs vehicle min/max (0-30 points)
    const tempDeviationResult = this.calculateTempDeviation(
      trip.avg_temp_recorded,
      vehicle?.min_temp ?? -25,
      vehicle?.max_temp ?? -15,
    );
    totalScore += tempDeviationResult.score;
    if (tempDeviationResult.reason) {
      reasons.push(tempDeviationResult.reason);
    }

    // Factor 2: violation_count (0-25 points)
    const violationResult = await this.calculateViolationFactor(tripId);
    totalScore += violationResult.score;
    if (violationResult.reason) {
      reasons.push(violationResult.reason);
    }

    // Factor 3: delay vs planned_end (0-25 points)
    const delayResult = this.calculateDelayFactor(
      trip.planned_end,
      trip.actual_end,
      trip.status,
    );
    totalScore += delayResult.score;
    if (delayResult.reason) {
      reasons.push(delayResult.reason);
    }

    // Factor 4: temperature spikes from trip_readings (0-20 points)
    const spikeResult = await this.calculateTempSpikes(tripId);
    totalScore += spikeResult.score;
    if (spikeResult.reason) {
      reasons.push(spikeResult.reason);
    }

    const score = Math.min(Math.round(totalScore), 100);
    const level = this.scoreToLevel(score);

    if (reasons.length === 0) {
      reasons.push('All trip metrics are within normal range');
    }

    // Calculate predicted ETA and delay
    const expectedDelayMinutes = delayResult.delayMinutes;
    let predictedEta: Date | null = null;

    if (trip.status === 'active') {
      predictedEta = new Date(
        trip.planned_end.getTime() + expectedDelayMinutes * 60 * 1000,
      );
    } else if (trip.actual_end) {
      predictedEta = trip.actual_end;
    } else {
      predictedEta = trip.planned_end;
    }

    // Store snapshot
    await this.storeTripRiskSnapshot(
      tripId,
      score,
      level,
      predictedEta,
      expectedDelayMinutes,
    );

    return {
      score,
      level,
      reasons,
      predicted_eta: predictedEta ? predictedEta.toISOString() : null,
      expected_delay_minutes: expectedDelayMinutes,
    };
  }

  /**
   * Temperature variance from sensor_readings last 6 hours
   * Uses Prisma aggregateRaw for MongoDB aggregation pipeline
   */
  private async calculateTempVariance(
    vehicleId: string,
  ): Promise<{ score: number; reason: string | null }> {
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const result: any = await this.prisma.sensorReading.aggregateRaw({
      pipeline: [
        {
          $match: {
            id: vehicleId,
            timestamp: { $gte: { $date: sixHoursAgo.toISOString() } },
          },
        },
        {
          $group: {
            _id: null,
            avgTemp: { $avg: '$temperature' },
            minTemp: { $min: '$temperature' },
            maxTemp: { $max: '$temperature' },
            stdDev: { $stdDevPop: '$temperature' },
            count: { $sum: 1 },
          },
        },
      ],
    });

    if (!result || result.length === 0 || result[0]?.count === 0) {
      return { score: 5, reason: 'No recent sensor readings in last 6 hours' };
    }

    const stats = result[0];
    const variance = (stats.maxTemp ?? 0) - (stats.minTemp ?? 0);
    const stdDev = stats.stdDev ?? 0;

    // Score: variance > 10°C is max risk, stdDev > 3 adds risk
    let score = 0;
    if (variance > 10) {
      score = 25;
    } else if (variance > 5) {
      score = Math.round((variance / 10) * 25);
    } else {
      score = Math.round((variance / 10) * 15);
    }

    if (stdDev > 3) {
      score = Math.min(score + 5, 25);
    }

    const reason =
      score >= 15
        ? `High temperature variance: ${variance.toFixed(1)}°C range (σ=${stdDev.toFixed(1)}) in last 6h`
        : score >= 8
          ? `Moderate temperature variance: ${variance.toFixed(1)}°C range in last 6h`
          : null;

    return { score, reason };
  }

  /**
   * Alert count in last 24 hours
   * Uses Prisma aggregateRaw for MongoDB aggregation pipeline
   */
  private async calculateAlertFactor(
    vehicleId: string,
  ): Promise<{ score: number; reason: string | null }> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const result: any = await this.prisma.alert.aggregateRaw({
      pipeline: [
        {
          $match: {
            vehicle_id: vehicleId,
            created_at: {
              $gte: { $date: twentyFourHoursAgo.toISOString() },
            },
          },
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ],
    });

    if (!result || result.length === 0) {
      return { score: 0, reason: null };
    }

    let criticalCount = 0;
    let warningCount = 0;
    let totalCount = 0;

    for (const group of result) {
      totalCount += group.count;
      if (group._id === 'critical') criticalCount = group.count;
      if (group._id === 'warning') warningCount = group.count;
    }

    // Critical alerts weigh more: 6pts each (max 30), warnings 3pts each
    const score = Math.min(criticalCount * 6 + warningCount * 3, 30);

    const reason =
      totalCount > 0
        ? `${totalCount} alert(s) in last 24h (${criticalCount} critical, ${warningCount} warning)`
        : null;

    return { score, reason };
  }

  /**
   * Last update gap - how stale is the vehicle data
   */
  private calculateUpdateGap(
    lastUpdate: Date,
  ): { score: number; reason: string | null } {
    const now = new Date();
    const gapMinutes =
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

    let score = 0;
    if (gapMinutes > 60) {
      score = 20;
    } else if (gapMinutes > 30) {
      score = 15;
    } else if (gapMinutes > 15) {
      score = 10;
    } else if (gapMinutes > 5) {
      score = 5;
    }

    const reason =
      score >= 10
        ? `Vehicle data is ${Math.round(gapMinutes)} minutes stale`
        : null;

    return { score, reason };
  }

  /**
   * Distance travelled from GPS readings in last 6 hours
   * High movement with temperature issues suggests route problems
   */
  private async calculateDistanceFactor(
    vehicleId: string,
  ): Promise<{ score: number; reason: string | null }> {
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const readings = await this.prisma.sensorReading.findMany({
      where: {
        vehicle_id: vehicleId,
        timestamp: { gte: sixHoursAgo },
      },
      orderBy: { timestamp: 'asc' },
      select: { latitude: true, longitude: true },
      take: 500,
    });

    if (readings.length < 2) {
      return {
        score: 5,
        reason:
          readings.length === 0
            ? 'No GPS data available for distance calculation'
            : null,
      };
    }

    // Calculate total distance using Haversine formula
    let totalDistanceKm = 0;
    for (let i = 1; i < readings.length; i++) {
      totalDistanceKm += this.haversineDistance(
        readings[i - 1].latitude,
        readings[i - 1].longitude,
        readings[i].latitude,
        readings[i].longitude,
      );
    }

    // Very high distance (>500km in 6h) or no movement at all can indicate issues
    let score = 0;
    if (totalDistanceKm > 500) {
      score = 25;
    } else if (totalDistanceKm > 300) {
      score = 15;
    } else if (totalDistanceKm < 1 && readings.length > 10) {
      // Vehicle not moving but sending readings - could be stuck
      score = 10;
    } else {
      score = Math.round((totalDistanceKm / 500) * 10);
    }

    const reason =
      score >= 15
        ? `Unusual distance pattern: ${totalDistanceKm.toFixed(1)}km in last 6h`
        : score >= 10
          ? `Vehicle appears stationary despite active readings`
          : null;

    return { score, reason };
  }

  /**
   * Average temperature deviation from vehicle acceptable range
   */
  private calculateTempDeviation(
    avgTemp: number | null,
    minTemp: number,
    maxTemp: number,
  ): { score: number; reason: string | null } {
    if (avgTemp === null) {
      return { score: 5, reason: 'No temperature readings recorded yet' };
    }

    const midPoint = (minTemp + maxTemp) / 2;
    const range = maxTemp - minTemp;

    let deviation = 0;
    if (avgTemp < minTemp) {
      deviation = minTemp - avgTemp;
    } else if (avgTemp > maxTemp) {
      deviation = avgTemp - maxTemp;
    }

    // Score based on how far outside the range
    let score = 0;
    if (deviation === 0) {
      // Within range but check how close to edges
      const distToEdge = Math.min(
        Math.abs(avgTemp - minTemp),
        Math.abs(avgTemp - maxTemp),
      );
      score = distToEdge < range * 0.1 ? 10 : 0;
    } else if (deviation > 5) {
      score = 30;
    } else if (deviation > 2) {
      score = Math.round((deviation / 5) * 30);
    } else {
      score = Math.round((deviation / 5) * 15);
    }

    const reason =
      deviation > 0
        ? `Average temperature ${avgTemp.toFixed(1)}°C is ${deviation.toFixed(1)}°C outside acceptable range [${minTemp}°C, ${maxTemp}°C]`
        : score >= 10
          ? `Average temperature ${avgTemp.toFixed(1)}°C is near the edge of acceptable range [${minTemp}°C, ${maxTemp}°C]`
          : null;

    return { score, reason };
  }

  /**
   * Violation count factor for trip
   */
  private async calculateViolationFactor(
    tripId: string,
  ): Promise<{ score: number; reason: string | null }> {
    const unresolvedAlerts = await this.prisma.tripAlert.count({
      where: { trip_id: tripId, is_resolved: false },
    });

    const totalAlerts = await this.prisma.tripAlert.count({
      where: { trip_id: tripId },
    });

    // 5 points per unresolved violation, 2 per resolved
    const resolvedCount = totalAlerts - unresolvedAlerts;
    const score = Math.min(unresolvedAlerts * 5 + resolvedCount * 2, 25);

    const reason =
      totalAlerts > 0
        ? `${totalAlerts} violation(s) detected (${unresolvedAlerts} unresolved)`
        : null;

    return { score, reason };
  }

  /**
   * Delay factor: current time or actual_end vs planned_end
   */
  private calculateDelayFactor(
    plannedEnd: Date,
    actualEnd: Date | null,
    status: string,
  ): { score: number; reason: string | null; delayMinutes: number } {
    const now = new Date();
    let delayMinutes = 0;

    if (status === 'active') {
      // Trip is ongoing - compare current time to planned end
      if (now > plannedEnd) {
        delayMinutes = Math.round(
          (now.getTime() - plannedEnd.getTime()) / (1000 * 60),
        );
      }
    } else if (actualEnd && actualEnd > plannedEnd) {
      delayMinutes = Math.round(
        (actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60),
      );
    }

    let score = 0;
    if (delayMinutes > 120) {
      score = 25;
    } else if (delayMinutes > 60) {
      score = 20;
    } else if (delayMinutes > 30) {
      score = 15;
    } else if (delayMinutes > 10) {
      score = Math.round((delayMinutes / 60) * 15);
    }

    const reason =
      delayMinutes > 0
        ? `Trip is delayed by ${delayMinutes} minutes beyond planned end`
        : null;

    return { score, reason, delayMinutes };
  }

  /**
   * Temperature spikes from trip_readings
   * Uses Prisma aggregateRaw for MongoDB aggregation pipeline
   */
  private async calculateTempSpikes(
    tripId: string,
  ): Promise<{ score: number; reason: string | null }> {
    const readings = await this.prisma.tripReading.findMany({
      where: { trip_id: tripId },
      orderBy: { timestamp: 'asc' },
      select: { temperature: true, timestamp: true },
      take: 5000,
    });

    if (readings.length < 2) {
      return { score: 0, reason: null };
    }

    // Detect temperature spikes (>3°C change between consecutive readings)
    let spikeCount = 0;
    let maxSpike = 0;

    for (let i = 1; i < readings.length; i++) {
      const diff = Math.abs(readings[i].temperature - readings[i - 1].temperature);
      if (diff > 3) {
        spikeCount++;
        maxSpike = Math.max(maxSpike, diff);
      }
    }

    let score = 0;
    if (spikeCount > 10) {
      score = 20;
    } else if (spikeCount > 5) {
      score = 15;
    } else if (spikeCount > 0) {
      score = Math.round((spikeCount / 5) * 10);
    }

    // Large individual spikes add extra risk
    if (maxSpike > 10) {
      score = Math.min(score + 5, 20);
    }

    const reason =
      spikeCount > 0
        ? `${spikeCount} temperature spike(s) detected (max ${maxSpike.toFixed(1)}°C jump)`
        : null;

    return { score, reason };
  }

  /**
   * Store vehicle risk snapshot in MongoDB
   */
  private async storeVehicleRiskSnapshot(
    vehicleId: string,
    score: number,
    level: RiskLevel,
    reasons: string[],
  ): Promise<void> {
    await this.prisma.vehicleRiskSnapshot.create({
      data: {
        visibleId: uuidv4(),
        vehicle_id: vehicleId,
        score,
        level,
        reasons,
        calculated_at: new Date(),
      },
    });
  }

  /**
   * Store trip risk snapshot in MongoDB
   */
  private async storeTripRiskSnapshot(
    tripId: string,
    score: number,
    level: RiskLevel,
    predictedEta: Date,
    expectedDelayMinutes: number,
  ): Promise<void> {
    await this.prisma.tripRiskSnapshot.create({
      data: {
        visibleId: uuidv4(),
        trip_id: tripId,
        score,
        level,
        predicted_eta: predictedEta,
        expected_delay_minutes: expectedDelayMinutes,
        calculated_at: new Date(),
      },
    });
  }

  /**
   * Convert numeric score to risk level
   */
  private scoreToLevel(score: number): RiskLevel {
    if (score >= 67) return 'HIGH';
    if (score >= 34) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Haversine formula to calculate distance between two GPS coordinates
   * Returns distance in kilometers
   */
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
