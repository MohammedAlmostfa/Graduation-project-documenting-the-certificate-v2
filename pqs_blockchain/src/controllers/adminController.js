import {
    keyService,
    certificateService,
    blockchainService,
    validationService
} from '../bootstrap.js';
import {
    logger
} from '../utils/logger.js';
import {
    ApiResponse
} from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

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
                    ApiResponse.error('بيانات المستخدم غير صالحة', 'VALIDATION_ERROR', validation.errors)
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
                ApiResponse.success('تم إنشاء المستخدم بنجاح', {
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
            res.json(ApiResponse.success('تم جلب قائمة المستخدمين بنجاح', {
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
                    ApiResponse.error('معرّف المستخدم مطلوب', 'VALIDATION_ERROR', null)
                );
            }

            const user = await keyService.getUser(userId);
            res.json(ApiResponse.success('تم جلب بيانات المستخدم بنجاح', user.toSafeJSON()));
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

            res.json(ApiResponse.success('تم جلب إحصائيات النظام بنجاح', {
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
     * Create a backup of system data.
     * Includes certificates, users, and blockchain.
     * Admin permission required.
     */
    backupData: asyncWrapper(async (req, res) => {
            const certificates = await certificateService.getAllCertificates();
            const users = await keyService.getAllUsers();
            const blockchain = await blockchainService.getAllBlocks();
            const blockchainStats = await blockchainService.getBlockchainStats();

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                data: {
                    certificates,
                    users,
                    blockchain: {
                        blocks: blockchain,
                        stats: blockchainStats
                    }
                }
            };

            logger.info(`✅ تم إنشاء النسخة الاحتياطية في ${backupData.timestamp}`);
            res.json(ApiResponse.success('تم إنشاء النسخة الاحتياطية بنجاح', backupData));
    })
};
