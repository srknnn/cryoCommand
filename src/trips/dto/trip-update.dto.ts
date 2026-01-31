import { IsString, IsOptional } from 'class-validator';

/**
 * Trip Update DTO - matches FastAPI TripUpdate model
 */
export class TripUpdateDto {
  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsString()
  @IsOptional()
  planned_start?: string;

  @IsString()
  @IsOptional()
  planned_end?: string;

  @IsString()
  @IsOptional()
  cargo_type?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
