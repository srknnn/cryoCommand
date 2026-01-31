import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
} from 'class-validator';

/**
 * Alert Rule Create DTO - matches FastAPI AlertRuleCreate model
 */
export class AlertRuleCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  vehicle_id?: string;

  @IsNumber()
  @IsOptional()
  temp_threshold_min?: number = -25.0;

  @IsNumber()
  @IsOptional()
  temp_threshold_max?: number = -15.0;

  @IsNumber()
  @IsOptional()
  duration_minutes?: number = 5;

  @IsNumber()
  @IsOptional()
  offline_alert_minutes?: number = 10;

  @IsString()
  @IsOptional()
  @IsIn(['critical', 'warning', 'info'])
  severity?: string = 'warning';

  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}
