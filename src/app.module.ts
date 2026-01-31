import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { jwtConfig } from './config/jwt.config';
import { AuthModule } from './auth/auth.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AlertsModule } from './alerts/alerts.module';
import { AlertRulesModule } from './alert-rules/alert-rules.module';
import { TripsModule } from './trips/trips.module';
import { ComplianceModule } from './compliance/compliance.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Passport for authentication strategies
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT module configuration
    JwtModule.registerAsync(jwtConfig),

    // Prisma database module
    PrismaModule,

    // Feature modules
    AuthModule,
    VehiclesModule,
    AlertsModule,
    AlertRulesModule,
    TripsModule,
    ComplianceModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
