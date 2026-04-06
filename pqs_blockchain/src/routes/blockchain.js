import express from 'express';
import {
    blockchainController
} from '../controllers/blockchainController.js';
import {
    auth
} from '../middleware/auth.js';
import {
    rateLimit
} from '../middleware/rateLimit.js';
import { roles } from '../config/security.js';

const router = express.Router();

/**
 * Blockchain Routes
 * -----------------
 * Provides endpoints for blockchain statistics, validation, mining,
 * and retrieving blocks or certificates. Some routes require authentication
 * and role-based authorization.
 */

// Apply rate limiting to all blockchain routes
router.use(rateLimit());
// router.use(
//
//     auth.requireAdmin
// );
/**
 * Blockchain Statistics
 * ---------------------
 * Get overall blockchain statistics.
 */
router.get('/stats',

    blockchainController.getBlockchainStats
);

/**
 * Blockchain Validation
 * ---------------------
 * Validate the integrity of the blockchain.
 */
router.get('/validate',
    blockchainController.validateBlockchain
);

/**
 * Mining
 * ------
 * Mine pending certificates into a new block.
 */
router.post('/mine',


    blockchainController.minePendingCertificates
);

/**
 * Certificate Block Info
 * ----------------------
 * Get blockchain block information for a specific certificate.
 */
router.get('/certificate/:certificateId',
    blockchainController.getCertificateBlockInfo
);

/**
 * Specific Block
 * --------------
 * Get details of a specific block by block number.
 */
router.get('/block/:blockNumber',
    blockchainController.getBlock
);

/**
 * All Blocks
 * ----------
 * Get all blocks in the blockchain.

 */
router.get('/blocks',

    blockchainController.getAllBlocks
);

/**
 * Pending Certificates
 * --------------------
 * Get all certificates that are pending to be mined.
 * Requires authentication and officer role.
 */
router.get('/pending',
    auth.authenticate,
    auth.requireRole(roles.OFFICER),
    blockchainController.getPendingCertificates
);

export default router;

