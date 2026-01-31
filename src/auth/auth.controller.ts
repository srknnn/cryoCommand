import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, TokenResponseDto, UserResponseDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IUser } from '../common/interfaces/user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * POST /api/auth/register
   *
   * Request body: { email, password, name, role? }
   * Response: { access_token, token_type, user }
   */
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Login user
   * POST /api/auth/login
   *
   * Request body: { email, password }
   * Response: { access_token, token_type, user }
   */
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * Get current authenticated user
   * GET /api/auth/me
   *
   * Headers: Authorization: Bearer <token>
   * Response: { id, email, name, role, created_at }
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: IUser): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }
}
