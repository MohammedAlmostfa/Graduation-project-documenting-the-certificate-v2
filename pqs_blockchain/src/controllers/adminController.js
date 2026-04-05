import {
    keyService,
    certificateService,
    blockchainService,
    validationService,
    backupService
} from '../bootstrap.js';
import {
    logger
} from '../utils/logger.js';
import {
    ApiResponse
} from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { RestoreBackupRequest } from '../requests/RestoreBackupRequest.js';
/**
 * Admin Controller
 *
 * Handles admin API requests.
 * - Receives HTTP requests
 * - Validates input
 * - Calls service layer
 * - Returns formatted responses
 *
 * Permissions are handled by middleware.
 * Validation is handled by ValidationService.
 */
export const adminController = {
    /**
     * Create a new user.
     * Admin permission required.
     */
    createUser: asyncWrapper(async (req, res) => {
            const userData = req.body;

            // Validate input data
            const validation = validationService.validateUserData(userData);
            if (!validation.isValid) {
                return res.status(400).json(
                    ApiResponse.error('Invalid user data', 'VALIDATION_ERROR', validation.errors)
                );
            }

            const result = await keyService.createUser(
                userData.username,
                userData.email,
                userData.password,
                userData.role,
                userData.department
            );

            res.status(201).json(
                ApiResponse.success('User created successfully', {
                    user: result.user,
                    privateKey: result.privateKey
                })
            );
    }),

    /**
     * Get all users.
     * Admin permission required.
     */
    getAllUsers: asyncWrapper(async (req, res) => {
            const users = await keyService.getAllUsers();
            res.json(ApiResponse.success('User list retrieved successfully', {
                count: users.length,
                users
            }));
    }),

    /**
     * Get user by ID.
     * Admin permission required.
     */
    getUser: asyncWrapper(async (req, res) => {
            const { userId } = req.params;

            // Check if userId exists
            if (!userId || userId.trim() === '') {
                return res.status(400).json(
                    ApiResponse.error('User ID is required', 'VALIDATION_ERROR', null)
                );
            }

            const user = await keyService.getUser(userId);
            res.json(ApiResponse.success('User data retrieved successfully', user.toSafeJSON()));
    }),

    /**
     * Get system statistics.
     * Includes certificates, blockchain, and users.
     * Admin permission required.
     */
    getSystemStats: asyncWrapper(async (req, res) => {
            const allCertificates = await certificateService.getAllCertificates();
            const certificatesByStatus = allCertificates.reduce((acc, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
            }, {});

            const blockchainStats = await blockchainService.getBlockchainStats();
            const users = await keyService.getAllUsers();
            const usersByRole = users.reduce((acc, u) => {
                acc[u.role] = (acc[u.role] || 0) + 1;
                return acc;
            }, {});

            res.json(ApiResponse.success('System statistics retrieved successfully', {
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    version: '1.0.0'
                },
                certificates: {
                    total: allCertificates.length,
                    byStatus: certificatesByStatus
                },
                blockchain: blockchainStats,
                users: {
                    total: users.length,
                    byRole: usersByRole
                }
            }));
    }),
  /**
     * Create a backup of system data and save it to a file.
     * Backup files are saved in /backups/ directory with timestamp-based names.
     * Includes certificates, users, and blockchain.
     * Admin permission required.
     */
    backupData: asyncWrapper(async (req, res) => {
            const result = await backupService.createBackupFile();

            logger.info(`✅ Backup file created: ${result.filename}`);
            res.json(ApiResponse.success('تم إنشاء النسخة الاحتياطية بنجاح (Backup created successfully)', {
                filename: result.filename,
                timestamp: result.timestamp,
                dataCount: result.dataCount,
                message: `Backup saved to: ${result.filepath}`
            }));
    }),

    /**
     * List all available backup files.
     * Returns a list of all backups with their timestamps.
     * Admin permission required.
     */
    listBackups: asyncWrapper(async (req, res) => {
            const backups = await backupService.listBackups();

            logger.info(`✅ Listed ${backups.length} backup files`);
            res.json(ApiResponse.success('تم جلب قائمة النسخ الاحتياطية بنجاح (Backup list retrieved successfully)', {
                count: backups.length,
                backups
            }));
    }),

    /**
     * Restore system from a selected backup file.
     * This operation:
     * - Loads the selected backup file
     * - Clears existing system data
     * - Restores all data using database transactions
     * - Rolls back all changes if any error occurs
     *
     * Request body: { backupFilename: "backup-YYYY-MM-DD-HH-mm-ss.json" }
     * Admin permission required.
     */
    restoreBackup: asyncWrapper(async (req, res) => {
            // Validate backup filename
            const request = new RestoreBackupRequest(req.body.backupFilename);
            const filename = request.validate();

            logger.info(`🔄 Starting restore from backup: ${filename}`);

            // Perform restore with database transaction
            const result = await backupService.restoreFromBackup(filename);

            logger.info(`✅ Restore completed successfully`);
            res.json(ApiResponse.success('تم استعادة النظام بنجاح (System restored successfully)', result.restoreDetails));
    }),

    /**
     * Delete a backup file.
     * Admin permission required.
     */
    deleteBackup: asyncWrapper(async (req, res) => {
            const request = new RestoreBackupRequest(req.body.backupFilename);
            const filename = request.validate();

            const result = await backupService.deleteBackup(filename);

            logger.info(`🗑️ Backup deleted: ${filename}`);
            res.json(ApiResponse.success('تم حذف النسخة الاحتياطية بنجاح (Backup deleted successfully)', result));
    })
};
