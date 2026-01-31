import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Trip Create DTO - matches FastAPI TripCreate model
 */
export class TripCreateDto {
  @IsString()
  @IsNotEmpty()
  vehicle_id: string;

  @IsString()
  @IsNotEmpty()
  trip_code: string;

  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsString()
  @IsNotEmpty()
  planned_start: string;

  @IsString()
  @IsNotEmpty()
  planned_end: string;

  @IsString()
  @IsOptional()
  cargo_type?: string = 'frozen_goods';

  @IsString()
  @IsOptional()
  notes?: string;
}
