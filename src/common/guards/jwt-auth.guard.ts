import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload, JWT_CONSTANTS } from '../../config/jwt.config';
import { IUser } from '../interfaces/user.interface';

/**
 * JWT Authentication Guard
 *
 * Validates the JWT token from the Authorization header.
 * Expects: Authorization: Bearer <token>
 *
 * On success, attaches the user object to request.user
 *
 * @example
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * async getMe(@Request() req) {
 *   return req.user;
 * }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const payload = await this.validateToken(token);
      const user = await this.validateUser(payload);

      // Attach user to request
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Extract Bearer token from Authorization header
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const authorization = request.headers[JWT_CONSTANTS.HEADER_KEY.toLowerCase()];

    if (!authorization || typeof authorization !== 'string') {
      return undefined;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * Validate and decode JWT token
   */
  private async validateToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Validate user exists in database
   */
  private async validateUser(payload: JwtPayload): Promise<IUser> {
    const userId = payload.sub;

    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { visibleId: userId },
      select: {
        visibleId: true,
        email: true,
        name: true,
        role: true,
        created_at: true,
      },
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
}
