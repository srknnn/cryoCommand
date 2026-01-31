import { SetMetadata } from '@nestjs/common';
import { Role } from '../constants/roles';

/**
 * Metadata key for roles
 */
export const ROLES_KEY = 'roles';

/**
 * Roles decorator
 *
 * Use this decorator on controller methods to restrict access to specific roles.
 *
 * @example
 * // Allow only admin
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async deleteVehicle() {}
 *
 * @example
 * // Allow admin and operator
 * @Roles(Role.ADMIN, Role.OPERATOR)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async createVehicle() {}
 *
 * @example
 * // Allow all authenticated users (no @Roles decorator needed, just JwtAuthGuard)
 * @UseGuards(JwtAuthGuard)
 * async getVehicles() {}
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Convenience decorators for common role combinations
 */
export const AdminOnly = () => Roles(Role.ADMIN);
export const AdminOrOperator = () => Roles(Role.ADMIN, Role.OPERATOR);
export const AllRoles = () => Roles(Role.ADMIN, Role.OPERATOR, Role.VIEWER);
