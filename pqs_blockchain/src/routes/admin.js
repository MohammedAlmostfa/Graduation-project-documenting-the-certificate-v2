import express from 'express';
import { adminController } from '../controllers/adminController.js';
import {
    auth
} from '../middleware/auth.js';
import { validation } from '../middleware/validation.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { roles } from '../config/security.js';

const router = express.Router();

/**
 * Admin Routes
 * ------------
 * Administrative operations: user management, system statistics, backups.
 *
 * SECURITY APPROACH:
 * 1. All routes require authentication
 * 2. All routes require admin privileges (checked by authorizationMiddleware.requireAdmin)
 * 3. Input validation for user creation
 *
 * This ensures:
 * - Only authenticated users can access admin endpoints
 * - Only admins can perform administrative operations
 * - Input data is validated before processing
 */

// Apply stricter rate limiting for admin routes
// Limit: 50 requests per 15 minutes
router.use(rateLimit(15 * 60 * 1000, 50));



/**
 * User Management
 * ---------------
 * Endpoints for creating, retrieving, and listing users.
 * Requires admin privileges.
 */

/**
 * Create a new user
 * POST /admin/users
 *
 * Requires: Admin role
 * Validation: User data (username, email, role, department)
 */
router.post('/users',
    auth.authenticate,
      auth.requireRole(roles.PRESIDENT),
    validation.validateUser,
    adminController.createUser
);

/**
 * Get all users
 * GET /admin/users
 *
 * Requires: Admin role
 */
router.get('/users',
    auth.authenticate,
      auth.requireRole(roles.PRESIDENT),
    adminController.getAllUsers
);

/**
 * Get a specific user by ID
 * GET /admin/users/:userId
 *
 * Requires: Admin role
 * Validation: User ID in params
 */
router.get('/users/:userId',
    auth.authenticate,
      auth.requireRole(roles.PRESIDENT),
    adminController.getUser
);

/**
 * System Statistics
 * -----------------
 * Provides system-wide metrics and statistics.
 * Requires admin privileges.
 */

/**
 * Get system statistics
 * GET /admin/stats
 *
 * Requires: Admin role
 * Returns: Certificate stats, blockchain stats, user stats, system uptime
 */
router.get('/stats',
    auth.authenticate,
    auth.requireRole(roles.ADMIN),
    adminController.getSystemStats
);

/**
 * Backup Management
 * -----------------
 * Allows admins to trigger a backup of system data.
 * Requires admin privileges.
 */

/**
 * Create system backup
 * GET /admin/backup
 *
 * Requires: Admin role
 * Returns: Complete backup of certificates, users, and blockchain
 *
 * NOTE: In production, this should be POST, not GET
 * GET is used here for testing purposes only
 */
router.get('/backup',
    auth.authenticate,
    auth.requireRole(roles.ADMIN),
    adminController.backupData
);

/**
 * Alternative POST endpoint for backup (recommended for production)
 */
router.post('/backup',
    auth.authenticate,
    auth.requireRole(roles.ADMIN),
    adminController.backupData
);

export default router;
