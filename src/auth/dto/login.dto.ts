import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

/**
 * Login DTO - matches FastAPI UserLogin model
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
