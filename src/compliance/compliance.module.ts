import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';
import { jwtConfig } from '../config/jwt.config';

@Module({
  imports: [JwtModule.registerAsync(jwtConfig)],
  controllers: [ComplianceController],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
