import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

/**
 * Report Create DTO - matches FastAPI ReportCreate model
 */
export class ReportCreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vehicle_ids?: string[] = [];

  @IsString()
  @IsNotEmpty()
  start_date: string;

  @IsString()
  @IsNotEmpty()
  end_date: string;

  @IsString()
  @IsOptional()
  report_type?: string = 'temperature';
}
