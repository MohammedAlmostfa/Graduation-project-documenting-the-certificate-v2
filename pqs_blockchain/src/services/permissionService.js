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
}

// Export singleton instance
export const permissionService = new PermissionService();
