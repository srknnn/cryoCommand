import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, TokenResponseDto, UserResponseDto } from './dto';
import { JwtPayload } from '../config/jwt.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user
   * POST /api/auth/register
   */
  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const userId = uuidv4();
    const now = new Date().toISOString();
    const hashedPassword = await this.hashPassword(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        visibleId: userId,
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: dto.role || 'viewer',
        created_at: new Date(now),
      },
    });

    // Generate token
    const token = this.createAccessToken({
      sub: userId,
      role: user.role,
    });

    // Build response
    const userResponse: UserResponseDto = {
      id: userId,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: now,
    };

    return {
      access_token: token,
      token_type: 'bearer',
      user: userResponse,
    };
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  async login(dto: LoginDto): Promise<TokenResponseDto> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate token
    const token = this.createAccessToken({
      sub: user.visibleId,
      role: user.role,
    });

    // Build response
    const userResponse: UserResponseDto = {
      id: user.visibleId,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    };

    return {
      access_token: token,
      token_type: 'bearer',
      user: userResponse,
    };
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { visibleId: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.visibleId,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at.toISOString(),
    };
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Create JWT access token
   * Payload: { sub: userId, role: userRole }
   * Expiration: 24 hours (configured in jwt.config.ts)
   */
  private createAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
