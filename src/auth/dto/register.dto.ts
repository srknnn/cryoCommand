import { IsEmail, IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

/**
 * Register DTO - matches FastAPI UserCreate model
 */
export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @IsIn(['admin', 'operator', 'viewer'])
  role?: string = 'viewer';
}
