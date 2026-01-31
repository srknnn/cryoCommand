/**
 * User Roles
 *
 * Role hierarchy:
 * - admin: Full access to all resources and operations
 * - operator: Can manage vehicles, trips, alerts, and reports
 * - viewer: Read-only access to data
 */
export enum Role {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

/**
 * All available roles as array
 */
export const ALL_ROLES = Object.values(Role);

/**
 * Roles that can modify data (create, update, delete)
 */
export const WRITE_ROLES = [Role.ADMIN, Role.OPERATOR];

/**
 * Admin only operations
 */
export const ADMIN_ONLY = [Role.ADMIN];

/**
 * Role permissions mapping
 *
 * Defines what each role can do:
 */
export const ROLE_PERMISSIONS = {
  [Role.ADMIN]: {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageCompliance: true,
    canEvaluateAll: true,
  },
  [Role.OPERATOR]: {
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    canManageCompliance: true,
    canEvaluateAll: false,
  },
  [Role.VIEWER]: {
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canManageCompliance: false,
    canEvaluateAll: false,
  },
} as const;

export type RolePermissions = (typeof ROLE_PERMISSIONS)[Role];
