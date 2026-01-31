import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Environment Guard
 *
 * Blocks access to seed endpoints in production environment.
 * Only allows access when NODE_ENV is 'development' or 'test'.
 *
 * @example
 * @UseGuards(EnvironmentGuard)
 * @Post('seed')
 * async seed() {}
 */
@Injectable()
export class EnvironmentGuard implements CanActivate {
  private readonly allowedEnvironments = ['development', 'test'];

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (!this.allowedEnvironments.includes(nodeEnv)) {
      throw new ForbiddenException(
        'Seed operations are not allowed in production environment',
      );
    }

    return true;
  }
}
