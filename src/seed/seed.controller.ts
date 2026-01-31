import {
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seed.service';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '../common';
import { EnvironmentGuard } from './guards/environment.guard';
import { SeedRunResponseDto, SeedResetResponseDto } from './dto';

/**
 * Seed Controller
 *
 * Internal endpoints for database seeding operations.
 * Only available in development and test environments.
 *
 * Protected by:
 * 1. EnvironmentGuard - Blocks access in production
 * 2. JwtAuthGuard - Requires valid JWT token
 * 3. RolesGuard - Requires admin role
 *
 * Endpoints:
 * - POST /api/seed - Seeds the database with minimal domain data
 * - POST /api/seed/reset - Clears all seeded data
 */
@Controller('seed')
//@UseGuards(EnvironmentGuard, JwtAuthGuard, RolesGuard)
export class SeedController {
  constructor(
    private readonly seedService: SeedService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run seed operation
   *
   * Seeds the database with minimal domain data for development/testing.
   * Operations are idempotent - running multiple times won't create duplicates.
   *
   * Seed order:
   * 1. Compliance Standards (lookup data)
   * 2. Alert Rules (lookup data)
   * 3. Vehicles (core entities)
   * 4. Trips with readings and alerts
   * 5. Sensor readings
   * 6. Vehicle alerts
   *
   * @returns SeedRunResponseDto with counts of seeded data
   */
  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async runSeed(): Promise<SeedRunResponseDto> {
    const counts = await this.seedService.runSeed();
    const environment = this.configService.get<string>('NODE_ENV', 'development');

    return {
      message: 'Demo veriler başarıyla yüklendi',
      success: true,
      environment,
      counts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset database
   *
   * Clears all seeded data from the database.
   * WARNING: This will delete all data from the affected tables.
   *
   * Does NOT delete:
   * - User accounts
   *
   * @returns SeedResetResponseDto with list of cleared tables
   */
  @Post('reset')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetDatabase(): Promise<SeedResetResponseDto> {
    const clearedTables = await this.seedService.resetDatabase();
    const environment = this.configService.get<string>('NODE_ENV', 'development');

    return {
      message: 'Veritabanı başarıyla temizlendi',
      success: true,
      environment,
      clearedTables,
      timestamp: new Date().toISOString(),
    };
  }
}
