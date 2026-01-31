import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { EnvironmentGuard } from './guards/environment.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { jwtConfig } from '../config/jwt.config';

/**
 * Seed Module
 *
 * Provides seed functionality for development and test environments.
 *
 * Features:
 * - Idempotent seed operations (uses upsert)
 * - Environment-restricted access (dev/test only)
 * - Auth-protected endpoints (admin role required)
 * - Structured seed order (lookup data first)
 *
 * Endpoints:
 * - POST /internal/seed/run - Seeds the database
 * - POST /internal/seed/reset - Clears seeded data
 *
 * @note This module should NOT be used in production.
 * The EnvironmentGuard blocks all requests when NODE_ENV is 'production'.
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync(jwtConfig),
  ],
  controllers: [SeedController],
  providers: [SeedService, EnvironmentGuard],
  exports: [SeedService],
})
export class SeedModule {}
