import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

/**
 * Compliance Standard Create DTO - matches FastAPI ComplianceStandardCreate model
 */
export class ComplianceStandardCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsOptional()
  min_temp?: number = -25.0;

  @IsNumber()
  @IsOptional()
  max_temp?: number = -15.0;

  @IsNumber()
  @IsOptional()
  max_violation_duration_minutes?: number = 30;

  @IsNumber()
  @IsOptional()
  max_violations_allowed?: number = 0;

  @IsNumber()
  @IsOptional()
  max_offline_minutes?: number = 60;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}

/**
 * Compliance Standard Response DTO - matches FastAPI ComplianceStandardResponse model
 */
export class ComplianceStandardResponseDto {
  id: string;
  name: string;
  description: string;
  min_temp: number;
  max_temp: number;
  max_violation_duration_minutes: number;
  max_violations_allowed: number;
  max_offline_minutes: number;
  is_active: boolean;
  created_at: string;
}
