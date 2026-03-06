import { permissionService } from '../services/permissionService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Authorization Middleware - REFACTORED
 * -----------------------------------------
 * Centralized authorization using PermissionService.
 * REMOVED: Unused middleware functions that were never called in routes
 *
 * Removed methods:
 * - canAccessResource() - unused in any route
 * - requireCertificateOperation() - unused in any route
 * - canSignCertificate() - duplicates auth.requireRole('dean')
 */
export const authorizationMiddleware = {

  /**
   * Require user to be able to sign with a specific role.
   * Checks canSignAs logic from PermissionService.
   *
   * Used in: /api/certificates/:certId/[officer|dean|president]/sign routes
   *
   * @param {string} role - Role to sign as
   */
  canSignAsRole: (role) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json(
            ApiResponse.error('Authentication required', 'AUTH_REQUIRED', null)
          );
        }

        const canSign = permissionService.canSignAs(req.user, role);

        if (!canSign) {
          return res.status(403).json(
            ApiResponse.error(
              `You cannot sign as ${role}`,
              'FORBIDDEN',
              `Your role: ${req.user.role}`
            )
          );
        }

        next();
      } catch (error) {
        logger.error(`❌ Signing authorization denied: ${error.message}`);
        res.status(403).json(ApiResponse.error('Cannot sign', 'FORBIDDEN', error.message));
      }
    };
  }
};
