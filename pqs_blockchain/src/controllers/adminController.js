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
import { telegramService } from '../services/telegram.service.js';
import { MerkleTree } from '../utils/merkleTree.js';

const escapeTelegramMarkdown = (value) => String(value ?? '').replace(/([_*\[`])/g, '\\$1');
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
                    ApiResponse.error('بيانات المستخدم غير صحيحة', 'VALIDATION_ERROR', validation.errors)
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
            res.json(ApiResponse.success('تم استرجاع قائمة المستخدمين بنجاح', {
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
                    ApiResponse.error('معرف المستخدم مطلوب', 'VALIDATION_ERROR', null)
                );
            }

            const user = await keyService.getUser(userId);
            res.json(ApiResponse.success('تم استرجاع بيانات المستخدم بنجاح', user.toSafeJSON()));
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

            res.json(ApiResponse.success('تم استرجاع إحصائيات النظام بنجاح', {
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
            logger.info('Backup operation started');

            // Send start notification (fire-and-forget - don't wait)
            telegramService.info(
                `*النسخة الاحتياطية - نسخة جديدة*\n\n` +
                `*Status:* جاري الانتظار...\n` +
                `*التاريخ:* _${new Date().toISOString()}_`
            ).catch(err => logger.error('Telegram info message failed', err));

            try {
                const result = await backupService.createBackupFile();

                logger.info(`Backup file created: ${result.filename}`);

                // Send success notification (fire-and-forget - don't wait)
                telegramService.success(
                    `*النسخة الاحتياطية تم إنشاؤها بنجاح*\n\n` +
                    `*الملف:* \`${result.filename}\`\n` +
                    `*الشهادات:* ${result.dataCount.certificates}\n` +
                    `*المستخدمون:* ${result.dataCount.users}\n` +
                    `*البلوكس:* ${result.dataCount.blocks}\n` +
                    `*التاريخ:* _${result.timestamp}_`
                ).catch(err => logger.error('Telegram success message failed', err));

                res.json(ApiResponse.success('تم إنشاء النسخة الاحتياطية بنجاح', {
                    filename: result.filename,
                    timestamp: result.timestamp,
                    dataCount: result.dataCount,
                    message: `Backup saved to: ${result.filepath}`
                }));
            } catch (error) {
                logger.error(`Backup creation failed: ${error.message}`);

                // Send error notification (fire-and-forget - don't wait)
                telegramService.error(
                    `*فشل إنشاء النسخة الاحتياطية*\n\n` +
                    `*الخطأ:* ${error.message}`,
                    error
                ).catch(err => logger.error('Telegram error message failed', err));

                throw error;
            }
    }),

    /**
     * List all available backup files.
     * Returns a list of all backups with their timestamps.
     * Admin permission required.
     */
    listBackups: asyncWrapper(async (req, res) => {
            const backups = await backupService.listBackups();

            logger.info(`Listed ${backups.length} backup files`);
            res.json(ApiResponse.success('تم جلب قائمة النسخ الاحتياطية بنجاح', {
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

            logger.info(`Starting restore from backup: ${filename}`);

            // Send start notification (fire-and-forget - don't wait)
            telegramService.warning(
                `*استعادة النظام - جاري الانتظار*\n\n` +
                `*الملف:* \`${filename}\`\n` +
                `*التاريخ:* _${new Date().toISOString()}_\n\n` +
                `تحذير: قد يستغرق الأمر عدة ثوان`
            ).catch(err => logger.error('Telegram warning message failed', err));

            try {
                // Perform restore with database transaction
                const result = await backupService.restoreFromBackup(filename);

                logger.info(`Restore completed successfully`);

                // Send success notification (fire-and-forget - don't wait)
                telegramService.success(
                    `*تم استعادة النظام بنجاح*\n\n` +
                    `*الملف:* \`${filename}\`\n` +
                    `*الشهادات المستعادة:* ${result.restoreDetails.dataRestored.certificates}\n` +
                    `*المستخدمون المستعادون:* ${result.restoreDetails.dataRestored.users}\n` +
                    `*البلوكس المستعادة:* ${result.restoreDetails.dataRestored.blocks}\n` +
                    `*التاريخ:* _${new Date().toISOString()}_`
                ).catch(err => logger.error('Telegram success message failed', err));

                res.json(ApiResponse.success('تم استعادة النظام بنجاح', result.restoreDetails));
            } catch (error) {
                logger.error(`❌ Restore from backup failed: ${error.message}`);

                // Send error notification (fire-and-forget - don't wait)
                telegramService.error(
                    `*فشل استعادة النظام*\n\n` +
                    `*الملف:* \`${filename}\`\n` +
                    `*الخطأ:* ${error.message}`,
                    error
                ).catch(err => logger.error('Telegram error message failed', err));

                throw error;
            }
    }),

    /**
     * Delete a backup file.
     * Admin permission required.
     */
    deleteBackup: asyncWrapper(async (req, res) => {
            const request = new RestoreBackupRequest(req.body.backupFilename);
            const filename = request.validate();

            logger.info(`Deleting backup: ${filename}`);

            try {
                const result = await backupService.deleteBackup(filename);

                logger.info(`Backup deleted: ${filename}`);

                // Send info notification (fire-and-forget - don't wait)
                telegramService.info(
                    `*تم حذف نسخة احتياطية*\n\n` +
                    `*الملف:* \`${filename}\``
                ).catch(err => logger.error('Telegram info message failed', err));

                res.json(ApiResponse.success('تم حذف النسخة الاحتياطية بنجاح', result));
            } catch (error) {
                logger.error(`Failed to delete backup: ${error.message}`);

                // Send error notification (fire-and-forget - don't wait)
                telegramService.error(
                    `*فشل حذف النسخة الاحتياطية*\n\n` +
                    `*الملف:* \`${filename}\``,
                    error
                ).catch(err => logger.error('Telegram error message failed', err));

                throw error;
            }
    }),

    /**
     * Verify certificates table integrity by rebuilding Merkle roots from current DB data.
     * Compares computed roots with stored roots in blockchain table.
     * Sends Telegram alert when any mismatch is detected.
     */
    verifyCertificatesIntegrity: asyncWrapper(async (_req, res) => {
            const checkedAt = new Date().toISOString();
            const blocks = await blockchainService.repo.getAllBlocks();
            const issues = [];
            const details = [];

            for (const block of blocks || []) {
                const certificateIds = block.certificateIds || [];
                const certHashes = [];

                for (const certId of certificateIds) {
                    const cert = await certificateService.repo.getCertificate(certId);
                    if (!cert || !cert.certificateHash) {
                        issues.push({
                            code: 'CERTIFICATE_HASH_MISSING',
                            blockId: block.id,
                            certificateId: certId
                        });
                        continue;
                    }
                    certHashes.push(cert.certificateHash);
                }

                const tree = new MerkleTree(certHashes, true);
                const computedMerkleRoot = tree.getRoot();
                const storedMerkleRoot = String(block.merkleRoot || '');
                const isEmptyBlock = certificateIds.length === 0;
                const rootsMatch = isEmptyBlock
                    ? (storedMerkleRoot === '' || storedMerkleRoot === computedMerkleRoot)
                    : storedMerkleRoot === computedMerkleRoot;

                details.push({
                    blockId: block.id,
                    certificatesCount: certificateIds.length,
                    storedMerkleRoot,
                    computedMerkleRoot,
                    rootsMatch
                });

                if (!rootsMatch) {
                    issues.push({
                        code: 'BLOCK_MERKLE_ROOT_MISMATCH',
                        blockId: block.id,
                        storedMerkleRoot,
                        computedMerkleRoot
                    });
                }
            }

            const result = {
                valid: issues.length === 0,
                checkedAt,
                summary: {
                    blocksChecked: (blocks || []).length,
                    issuesCount: issues.length
                },
                details,
                issues
            };

            if (!result.valid) {
                const topIssues = issues
                    .slice(0, 5)
                    .map((issue, idx) => `${idx + 1}. ${escapeTelegramMarkdown(issue.code)}${issue.blockId !== undefined ? ` | block=${escapeTelegramMarkdown(issue.blockId)}` : ''}${issue.certificateId ? ` | cert=${escapeTelegramMarkdown(issue.certificateId)}` : ''}`)
                    .join('\n');

                telegramService.warning(
                    `Database integrity check FAILED.\n\n` +
                    `Timestamp: ${escapeTelegramMarkdown(checkedAt)}\n` +
                    `Alert: Certificates table appears altered (Merkle mismatch detected).\n` +
                    `Recommendation: Restore the last known good backup immediately.\n\n` +
                    `${topIssues ? `Top issues:\n${topIssues}` : ''}`
                ).catch(err => logger.error('Telegram warning message failed', err));
            }

            res.json(ApiResponse.success('Certificates integrity verification result', result));
    })
};

