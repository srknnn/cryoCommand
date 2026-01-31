import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Seed Service
 *
 * Handles all seed operations for the application.
 * All operations are idempotent - running multiple times won't create duplicates.
 *
 * Seed order:
 * 1. Lookup/Static data (Compliance Standards, Alert Rules)
 * 2. Core entities (Vehicles)
 * 3. Related entities (Trips, Sensor Readings)
 * 4. Generated data (Alerts, Trip Alerts)
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run all seed operations
   * Uses upsert to ensure idempotency
   */
  async runSeed(): Promise<{
    vehicles: number;
    alertRules: number;
    complianceStandards: number;
    trips: number;
    sensorReadings: number;
    tripReadings: number;
    alerts: number;
    tripAlerts: number;
  }> {
    this.logger.log('Starting seed operation...');

    const counts = {
      vehicles: 0,
      alertRules: 0,
      complianceStandards: 0,
      trips: 0,
      sensorReadings: 0,
      tripReadings: 0,
      alerts: 0,
      tripAlerts: 0,
    };

    // 1. Seed lookup/static data first
    counts.complianceStandards = await this.seedComplianceStandards();
    counts.alertRules = await this.seedAlertRules();

    // 2. Seed core entities
    counts.vehicles = await this.seedVehicles();

    // 3. Seed related entities
    const tripResults = await this.seedTrips();
    counts.trips = tripResults.trips;
    counts.tripReadings = tripResults.tripReadings;
    counts.tripAlerts = tripResults.tripAlerts;

    // 4. Seed sensor readings and alerts
    counts.sensorReadings = await this.seedSensorReadings();
    counts.alerts = await this.seedAlerts();

    this.logger.log('Seed operation completed successfully');
    return counts;
  }

  /**
   * Reset database - clear all seeded data
   * WARNING: This will delete all data from the tables
   */
  async resetDatabase(): Promise<string[]> {
    this.logger.warn('Starting database reset...');

    const tables = [
      'complianceResult',
      'tripAlert',
      'tripReading',
      'trip',
      'alert',
      'sensorReading',
      'alertRule',
      'complianceStandard',
      'vehicle',
      'report',
    ];

    const clearedTables: string[] = [];

    for (const table of tables) {
      try {
        // @ts-ignore - Dynamic table access
        await this.prisma[table].deleteMany({});
        clearedTables.push(table);
        this.logger.log(`Cleared table: ${table}`);
      } catch (error) {
        this.logger.error(`Failed to clear table ${table}:`, error);
      }
    }

    this.logger.warn('Database reset completed');
    return clearedTables;
  }

  /**
   * Seed compliance standards (lookup data)
   */
  private async seedComplianceStandards(): Promise<number> {
    const standards = [
      {
        visibleId: 'std-frozen-food-tr',
        name: 'Türk Gıda Kodeksi - Dondurulmuş Gıda',
        description: 'Türk Gıda Kodeksi\'ne göre dondurulmuş gıda taşımacılığı standartları',
        min_temp: -25.0,
        max_temp: -15.0,
        max_violation_duration_minutes: 30,
        max_violations_allowed: 0,
        max_offline_minutes: 60,
        is_active: true,
      },
      {
        visibleId: 'std-dairy-products',
        name: 'Süt Ürünleri Taşıma Standardı',
        description: 'Süt ve süt ürünleri için soğuk zincir standartları',
        min_temp: 2.0,
        max_temp: 8.0,
        max_violation_duration_minutes: 15,
        max_violations_allowed: 1,
        max_offline_minutes: 30,
        is_active: true,
      },
      {
        visibleId: 'std-pharmaceuticals',
        name: 'İlaç Taşıma Standardı',
        description: 'Farmasötik ürünler için soğuk zincir standartları',
        min_temp: 2.0,
        max_temp: 8.0,
        max_violation_duration_minutes: 10,
        max_violations_allowed: 0,
        max_offline_minutes: 20,
        is_active: true,
      },
    ];

    let count = 0;
    for (const standard of standards) {
      await this.prisma.complianceStandard.upsert({
        where: { visibleId: standard.visibleId },
        update: {
          name: standard.name,
          description: standard.description,
          min_temp: standard.min_temp,
          max_temp: standard.max_temp,
          max_violation_duration_minutes: standard.max_violation_duration_minutes,
          max_violations_allowed: standard.max_violations_allowed,
          max_offline_minutes: standard.max_offline_minutes,
          is_active: standard.is_active,
        },
        create: standard,
      });
      count++;
    }

    this.logger.log(`Seeded ${count} compliance standards`);
    return count;
  }

  /**
   * Seed alert rules (lookup data)
   */
  private async seedAlertRules(): Promise<number> {
    const rules = [
      {
        visibleId: 'rule-default-temp',
        name: 'Varsayılan Sıcaklık Kuralı',
        vehicle_id: null,
        temp_threshold_min: -25.0,
        temp_threshold_max: -15.0,
        duration_minutes: 5,
        offline_alert_minutes: 10,
        severity: 'warning',
        is_active: true,
      },
      {
        visibleId: 'rule-critical-temp',
        name: 'Kritik Sıcaklık Kuralı',
        vehicle_id: null,
        temp_threshold_min: -30.0,
        temp_threshold_max: -10.0,
        duration_minutes: 3,
        offline_alert_minutes: 5,
        severity: 'critical',
        is_active: true,
      },
    ];

    let count = 0;
    for (const rule of rules) {
      await this.prisma.alertRule.upsert({
        where: { visibleId: rule.visibleId },
        update: {
          name: rule.name,
          vehicle_id: rule.vehicle_id,
          temp_threshold_min: rule.temp_threshold_min,
          temp_threshold_max: rule.temp_threshold_max,
          duration_minutes: rule.duration_minutes,
          offline_alert_minutes: rule.offline_alert_minutes,
          severity: rule.severity,
          is_active: rule.is_active,
        },
        create: rule,
      });
      count++;
    }

    this.logger.log(`Seeded ${count} alert rules`);
    return count;
  }

  /**
   * Seed vehicles (core entities)
   */
  private async seedVehicles(): Promise<number> {
    const vehicles = [
      { vehicle_id: 'TRK-001', name: 'Frozen Foods Express', type: 'truck', lat: 41.0082, lon: 28.9784, temp: -18.5 },
      { vehicle_id: 'TRK-002', name: 'Arctic Hauler', type: 'truck', lat: 39.9334, lon: 32.8597, temp: -20.2 },
      { vehicle_id: 'TRK-003', name: 'ColdLine Alpha', type: 'truck', lat: 38.4192, lon: 27.1287, temp: -15.8 },
      { vehicle_id: 'TRK-004', name: 'FrostGuard Van', type: 'van', lat: 36.8969, lon: 30.7133, temp: -22.1 },
      { vehicle_id: 'TRK-005', name: 'IceRunner', type: 'truck', lat: 40.1885, lon: 29.0610, temp: -12.0 },
      { vehicle_id: 'TRK-006', name: 'Polar Express', type: 'truck', lat: 37.0662, lon: 37.3833, temp: -19.3 },
      { vehicle_id: 'TRK-007', name: 'ChillWave', type: 'van', lat: 38.7312, lon: 35.4787, temp: -17.8 },
      { vehicle_id: 'TRK-008', name: 'SubZero Transit', type: 'truck', lat: 40.7667, lon: 29.9167, temp: -26.5 },
    ];

    const now = new Date();
    let count = 0;

    for (const v of vehicles) {
      const visibleId = `vehicle-${v.vehicle_id.toLowerCase()}`;

      await this.prisma.vehicle.upsert({
        where: { visibleId },
        update: {
          name: v.name,
          type: v.type,
          latitude: v.lat,
          longitude: v.lon,
          current_temp: v.temp,
          last_update: now,
        },
        create: {
          visibleId,
          vehicle_id: v.vehicle_id,
          name: v.name,
          type: v.type,
          latitude: v.lat,
          longitude: v.lon,
          current_temp: v.temp,
          min_temp: -25.0,
          max_temp: -15.0,
          status: 'active',
          last_update: now,
          created_at: now,
        },
      });
      count++;
    }

    this.logger.log(`Seeded ${count} vehicles`);
    return count;
  }

  /**
   * Seed trips with readings and alerts
   */
  private async seedTrips(): Promise<{ trips: number; tripReadings: number; tripAlerts: number }> {
    const vehicles = await this.prisma.vehicle.findMany();
    if (vehicles.length === 0) {
      this.logger.warn('No vehicles found, skipping trips seed');
      return { trips: 0, tripReadings: 0, tripAlerts: 0 };
    }

    const now = new Date();
    const trips = [
      { code: 'SEF-2025-001', vehicleIdx: 0, origin: 'İstanbul', dest: 'Ankara', status: 'active', cargo: 'frozen_goods' },
      { code: 'SEF-2025-002', vehicleIdx: 1, origin: 'Ankara', dest: 'İzmir', status: 'completed', cargo: 'dairy' },
      { code: 'SEF-2025-003', vehicleIdx: 2, origin: 'İzmir', dest: 'Antalya', status: 'active', cargo: 'frozen_goods' },
      { code: 'SEF-2025-004', vehicleIdx: 3, origin: 'Antalya', dest: 'Gaziantep', status: 'planned', cargo: 'pharmaceuticals' },
      { code: 'SEF-2025-005', vehicleIdx: 4, origin: 'Bursa', dest: 'İstanbul', status: 'failed', cargo: 'frozen_goods' },
    ];

    let tripCount = 0;
    let tripReadingCount = 0;
    let tripAlertCount = 0;

    for (const t of trips) {
      const vehicle = vehicles[t.vehicleIdx % vehicles.length];
      const tripStart = new Date(now.getTime() - this.randomInt(1, 24) * 60 * 60 * 1000);
      const visibleId = `trip-${t.code.toLowerCase()}`;

      const isCompliant = t.status !== 'failed';
      const violationCount = isCompliant ? 0 : this.randomInt(1, 5);

      // Upsert trip
      await this.prisma.trip.upsert({
        where: { visibleId },
        update: {
          vehicle_name: vehicle.name,
          origin: t.origin,
          destination: t.dest,
          status: t.status,
          is_compliant: isCompliant,
          violation_count: violationCount,
        },
        create: {
          visibleId,
          trip_code: t.code,
          vehicle_id: vehicle.visibleId,
          vehicle_name: vehicle.name,
          origin: t.origin,
          destination: t.dest,
          planned_start: new Date(tripStart.getTime() - 60 * 60 * 1000),
          planned_end: new Date(tripStart.getTime() + 8 * 60 * 60 * 1000),
          actual_start: t.status !== 'planned' ? tripStart : null,
          actual_end: ['completed', 'failed'].includes(t.status)
            ? new Date(tripStart.getTime() + 6 * 60 * 60 * 1000)
            : null,
          cargo_type: t.cargo,
          status: t.status,
          is_compliant: isCompliant,
          violation_count: violationCount,
          min_temp_recorded: t.status !== 'planned' ? vehicle.current_temp - 2 : null,
          max_temp_recorded: t.status !== 'planned' ? vehicle.current_temp + 3 : null,
          avg_temp_recorded: t.status !== 'planned' ? vehicle.current_temp : null,
          notes: null,
          created_at: new Date(tripStart.getTime() - 2 * 60 * 60 * 1000),
          created_by: 'Sistem',
        },
      });
      tripCount++;

      // Get the created trip
      const trip = await this.prisma.trip.findUnique({ where: { visibleId } });
      if (!trip) continue;

      // Seed trip readings for active/completed trips
      if (['active', 'completed', 'failed'].includes(t.status)) {
        for (let j = 0; j < 24; j++) {
          const readingTime = new Date(tripStart.getTime() + j * 15 * 60 * 1000);
          if (readingTime > now) break;

          const readingVisibleId = `reading-${trip.visibleId}-${j}`;
          const tempVariation = this.randomFloat(-3, 3);

          // Check if reading already exists
          const existingReading = await this.prisma.tripReading.findUnique({
            where: { visibleId: readingVisibleId },
          });

          if (!existingReading) {
            await this.prisma.tripReading.create({
              data: {
                visibleId: readingVisibleId,
                trip_id: trip.visibleId,
                vehicle_id: vehicle.visibleId,
                temperature: vehicle.current_temp + tempVariation,
                humidity: this.randomFloat(30, 70),
                latitude: vehicle.latitude + this.randomFloat(-0.05, 0.05),
                longitude: vehicle.longitude + this.randomFloat(-0.05, 0.05),
                timestamp: readingTime,
              },
            });
            tripReadingCount++;
          }
        }
      }

      // Seed trip alerts for failed trips
      if (t.status === 'failed') {
        for (let k = 0; k < violationCount; k++) {
          const alertVisibleId = `trip-alert-${trip.visibleId}-${k}`;

          const existingAlert = await this.prisma.tripAlert.findUnique({
            where: { visibleId: alertVisibleId },
          });

          if (!existingAlert) {
            await this.prisma.tripAlert.create({
              data: {
                visibleId: alertVisibleId,
                trip_id: trip.visibleId,
                vehicle_id: vehicle.visibleId,
                vehicle_name: vehicle.name,
                alert_type: k % 2 === 0 ? 'high_temp' : 'low_temp',
                severity: k === 0 ? 'critical' : 'warning',
                message: 'Sıcaklık ihlali tespit edildi',
                temperature: vehicle.current_temp + (k % 2 === 0 ? 5 : -5),
                is_resolved: false,
                resolved_at: null,
                created_at: new Date(tripStart.getTime() + k * 60 * 60 * 1000),
              },
            });
            tripAlertCount++;
          }
        }
      }
    }

    this.logger.log(`Seeded ${tripCount} trips, ${tripReadingCount} trip readings, ${tripAlertCount} trip alerts`);
    return { trips: tripCount, tripReadings: tripReadingCount, tripAlerts: tripAlertCount };
  }

  /**
   * Seed sensor readings for vehicles
   */
  private async seedSensorReadings(): Promise<number> {
    const vehicles = await this.prisma.vehicle.findMany();
    const now = new Date();
    let count = 0;

    for (const vehicle of vehicles) {
      // Create historical readings (48 hours)
      for (let i = 0; i < 48; i++) {
        const readingTime = new Date(now.getTime() - i * 60 * 60 * 1000);
        const readingVisibleId = `sensor-${vehicle.visibleId}-${i}`;

        const existingReading = await this.prisma.sensorReading.findUnique({
          where: { visibleId: readingVisibleId },
        });

        if (!existingReading) {
          const tempVariation = this.randomFloat(-3, 3);
          await this.prisma.sensorReading.create({
            data: {
              visibleId: readingVisibleId,
              vehicle_id: vehicle.visibleId,
              temperature: vehicle.current_temp + tempVariation,
              humidity: this.randomFloat(30, 70),
              latitude: vehicle.latitude + this.randomFloat(-0.01, 0.01),
              longitude: vehicle.longitude + this.randomFloat(-0.01, 0.01),
              timestamp: readingTime,
            },
          });
          count++;
        }
      }
    }

    this.logger.log(`Seeded ${count} sensor readings`);
    return count;
  }

  /**
   * Seed alerts for vehicles with temperature violations
   */
  private async seedAlerts(): Promise<number> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        OR: [
          { current_temp: { lt: -25 } },
          { current_temp: { gt: -15 } },
        ],
      },
      take: 3,
    });

    const now = new Date();
    let count = 0;

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      const alertVisibleId = `alert-${vehicle.visibleId}-seed`;

      const existingAlert = await this.prisma.alert.findUnique({
        where: { visibleId: alertVisibleId },
      });

      if (!existingAlert) {
        await this.prisma.alert.create({
          data: {
            visibleId: alertVisibleId,
            vehicle_id: vehicle.visibleId,
            vehicle_name: vehicle.name,
            alert_type: vehicle.current_temp > -15 ? 'high_temp' : 'low_temp',
            severity: i === 0 ? 'critical' : 'warning',
            message: `Sıcaklık ${vehicle.current_temp.toFixed(1)}°C aralık dışında`,
            temperature: vehicle.current_temp,
            is_resolved: false,
            resolved_at: null,
            created_at: new Date(now.getTime() - i * 60 * 60 * 1000),
          },
        });
        count++;
      }
    }

    this.logger.log(`Seeded ${count} alerts`);
    return count;
  }

  /**
   * Helper: Random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Helper: Random float between min and max
   */
  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
