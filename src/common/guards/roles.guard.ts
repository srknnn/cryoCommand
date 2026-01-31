import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../constants/roles';
import { IUser } from '../interfaces/user.interface';

/**
 * Roles Guard
 *
 * Checks if the authenticated user has one of the required roles.
 * Must be used after JwtAuthGuard to ensure user is attached to request.
 *
 * @example
 * // Require admin role
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Delete(':id')
 * async delete() {}
 *
 * @example
 * // Require admin or operator role
 * @Roles(Role.ADMIN, Role.OPERATOR)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post()
 * async create() {}
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access (just authentication check)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user: IUser = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has one of the required roles
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
