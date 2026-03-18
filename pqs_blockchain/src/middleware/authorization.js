import { permissionService } from '../services/permissionService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Authorization Middleware - REFACTORED
 * -----------------------------------------
 * NOTE: This module is now deprecated. All authorization is handled by:
 * - auth.requireRole() in auth middleware (role hierarchy enforcement)
 * - permissionService.canSignAs() in service layer (custom permission logic)
 *
 * REMOVED: canSignAsRole() - auth.requireRole() provides sufficient role-based access control
 * REMOVED: Other unused middleware functions that were never applied to any route
 *
 * Consider removing this file entirely in future refactoring.
 */
export const authorizationMiddleware = {
  // Middleware functions removed - use auth.requireRole() instead
};
