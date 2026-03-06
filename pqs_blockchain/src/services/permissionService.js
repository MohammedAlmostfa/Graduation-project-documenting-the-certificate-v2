import { logger } from '../utils/logger.js';
import { roles, roleHierarchy } from '../config/security.js';
import { ForbiddenError, ValidationError } from '../utils/errors.js';

/**
 * Service to handle permissions and role-based access control.
 */
export class PermissionService {
  constructor() {
    this.roleHierarchy = roleHierarchy;
  }

  /** Check if user can sign as a given role. Admins can sign as any role. */
  canSignAs(user, roleToSignAs) {
    if (!user) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!['officer', 'dean', 'president'].includes(roleToSignAs)) {
      throw new ValidationError(`Invalid signature role: ${roleToSignAs}`);
    }

    if (user.role === 'admin') return true;

    const canSign = user.role === roleToSignAs;

    if (!canSign) {
      logger.warn(`Signing denied: User ${user.id} (${user.role}) cannot sign as ${roleToSignAs}`);
    }

    return canSign;
  }

  /** Ensure user is an admin; throw error otherwise. */
  requireAdmin(user) {
    if (!user) {
      throw new ForbiddenError('User not authenticated');
    }

    if (user.role !== 'admin') {
      logger.warn(`Admin operation denied: User ${user.id} (${user.role}) is not admin`);
      throw new ForbiddenError('This operation requires administrator privileges');
    }

    return true;
  }

  /** Get numeric permission level for a role. */
  getRoleLevel(role) {
    return this.roleHierarchy[role] || 0;
  }

  /** Get all roles sorted by permission level (ascending). */
  getRolesSortedByLevel() {
    return Object.entries(this.roleHierarchy)
      .sort((a, b) => a[1] - b[1])
      .map(([role]) => role);
  }

  /** Assert a condition is true, throw ForbiddenError if not. */
  assert(condition, message = 'Permission denied') {
    if (!condition) {
      logger.warn(`Assertion failed: ${message}`);
      throw new ForbiddenError(message);
    }
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
