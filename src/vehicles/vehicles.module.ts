import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { jwtConfig } from '../config/jwt.config';

@Module({
  imports: [JwtModule.registerAsync(jwtConfig)],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
