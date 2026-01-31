import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

/**
 * JWT Configuration
 *
 * JWT payload structure: { sub: userId, role: userRole }
 * Token type: Bearer
 * Default expiration: 24 hours
 */
export const jwtConfig: JwtModuleAsyncOptions = {
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET', 'coldchain-secret-key-2025'),
    signOptions: {
      expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
    },
  }),
  inject: [ConfigService],
};

/**
 * JWT Constants
 */
export const JWT_CONSTANTS = {
  ALGORITHM: 'HS256',
  TOKEN_TYPE: 'bearer',
  HEADER_KEY: 'Authorization',
  BEARER_PREFIX: 'Bearer ',
} as const;

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // userId
  role: string; // user role (admin, operator, viewer)
  iat?: number; // issued at
  exp?: number; // expiration
}
