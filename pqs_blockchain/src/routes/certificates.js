import express from "express";
import {
    certificateController
} from "../controllers/certificateController.js";
import {
    auth
} from "../middleware/auth.js";
import {
    validation
} from "../middleware/validation.js";
import {
    rateLimit
} from "../middleware/rateLimit.js";
import {
    roles
} from "../config/security.js";

const router = express.Router();

/**
 * Certificate Routes
 * ------------------
 * Provides endpoints for creating, validating, signing, and retrieving certificates.
 *
 * LAYERED SECURITY APPROACH:
 * 1. Rate limiting (applied to all routes)
 * 2. Authentication (verify user identity)
 * 3. Authorization (verify permissions via role hierarchy)
 * 4. Validation (validate input data)
 * 5. Controller (handle request)
 *
 * Permission Checks:
 * - All permission checks now centralized in PermissionService
 * - Used by auth.requireRole() before reaching controller
 * - No redundant checks in controllers or services
 */

// Apply rate limiting to all certificate routes
router.use(rateLimit());

/**
 * Create Certificate
 * ------------------
 * POST /certificates
 *
 * Permissions: Officer role or higher
 * Validation: Certificate data in body
 *
 * Middleware order:
 * 1. auth.authenticate → Verify user identity
 * 2. auth.requireRole(roles.OFFICER) → Verify role hierarchy
 * 3. validation.validateCertificate → Validate input data
 * 4. certificateController.createCertificate → Handle request
 */
router.post(
    "/",
    auth.authenticate,
    auth.requireRole(roles.OFFICER),
    validation.validateCertificate,
    certificateController.createCertificate
);

/**
 * Get Certificate
 * ---------------
 * GET /certificates/:id
 *
 * Permissions: Authenticated user
 * Validation: Certificate ID in params
 */
router.get("/:id",
    auth.authenticate,
    certificateController.getCertificate
);

/**
 * Validate Certificate
 * --------------------
 * GET /certificates/:id/validate
 *
 * Permissions: None required (public validation)
 * Validation: Certificate ID in params
 */
router.get("/:certificateNumber/validate",
    certificateController.validateCertificate
);

/**
 * Dean Signature
 * --------------
 * POST /certificates/:certificateId/dean/sign
 *
 * Permissions: Dean role or higher
 * Validation: Certificate ID in params
 *
 * Middleware order:
 * 1. auth.authenticate → Verify user identity
 * 2. auth.requireRole(roles.DEAN) → Verify dean role
 * 3. certificateController.addDeanSignature → Handle request
 */
router.post(
    "/:certificateId/dean/sign",
    auth.authenticate,
    auth.requireRole(roles.DEAN),
    certificateController.addDeanSignature
);

/**
 * President Signature
 * -------------------
 * POST /certificates/:certificateId/president/sign
 *
 * Permissions: President role
 * Validation: Certificate ID in params
 *
 * Middleware order:
 * 1. auth.authenticate → Verify user identity
 * 2. auth.requireRole(roles.PRESIDENT) → Verify president role
 * 3. certificateController.addPresidentSignature → Handle request
 */
router.post(
    "/:certificateId/president/sign",
    auth.authenticate,
    auth.requireRole(roles.PRESIDENT),
    certificateController.addPresidentSignature
);
// Manual blockchain addition removed — president signature now enqueues mining automatically

/**
 * Get All Certificates
 * --------------------
 * GET /certificates
 *
 * Permissions: Authenticated user
 * Validation: None required
 */
router.get("/",

    certificateController.getAllCertificates
);

/**
 * Get Certificates by Status
 * ---------------------------
 * GET /certificates/status/:status
 *
 * Permissions: Authenticated user
 * Validation: Status parameter
 */
router.get("/status/:status",
    auth.authenticate,
    certificateController.getCertificatesByStatus
);

export default router;
