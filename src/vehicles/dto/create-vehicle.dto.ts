import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

/**
 * Create Vehicle DTO - matches FastAPI VehicleCreate model
 */
export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  vehicle_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  type?: string = 'truck';

  @IsNumber()
  @IsOptional()
  latitude?: number = 40.7128;

  @IsNumber()
  @IsOptional()
  longitude?: number = -74.006;

  @IsNumber()
  @IsOptional()
  min_temp?: number = -25.0;

  @IsNumber()
  @IsOptional()
  max_temp?: number = -15.0;
}
