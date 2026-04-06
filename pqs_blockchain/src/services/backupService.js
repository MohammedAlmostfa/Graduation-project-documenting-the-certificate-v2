import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { CertificateQueries } from '../storage/queries/CertificateQueries.js';
import { ChainQueries } from '../storage/queries/ChainQueries.js';
import { oqsCrypto } from '../utils/crypto-oqs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Backup Service
 * ===============
 * Handles file-based backup and restore operations.
 * - Creates timestamped backup files
 * - Manages backup directory
 * - Provides file listing functionality
 * - Implements safe restore with database transactions
 *
 * File structure:
 * /backups/
 *   ├── backup-2026-04-05-14-30-45.json
 *   ├── backup-2026-04-05-15-00-00.json
 *   └── backup-2026-04-05-16-15-30.json
 */
export class BackupService {
    constructor({
        certificateService,
        keyService,
        blockchainService,
        db
    } = {}) {
        this.certificateService = certificateService;
        this.keyService = keyService;
        this.blockchainService = blockchainService;
        this.db = db;
        this.backupsDir = path.join(__dirname, '../../backups');
    }

    /**
     * Ensure backups directory exists
     */
    async ensureBackupsDirectory() {
        try {
            await fs.mkdir(this.backupsDir, { recursive: true });
            logger.info(`✅ Backups directory ensured: ${this.backupsDir}`);
        } catch (error) {
            logger.error(`❌ Failed to ensure backups directory: ${error.message}`);
            throw new ValidationError('Failed to create backups directory');
        }
    }

    /**
     * Generate timestamp-based filename: backup-YYYY-MM-DD-HH-mm-ss.json
     */
    generateFilename() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        return `backup-${year}-${month}-${day}-${hours}-${minutes}-${seconds}.json`;
    }

    /**
     * Extract timestamp from backup filename
     * Format: backup-YYYY-MM-DD-HH-mm-ss.json
     */
    getTimestampFromFilename(filename) {
        const match = filename.match(/backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json/);
        if (!match) return null;

        const [, year, month, day, hours, minutes, seconds] = match;
        return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`);
    }

    /**
     * Create a backup and save it to a file
     */
    async createBackupFile() {
        await this.ensureBackupsDirectory();

        try {
            logger.info('📦 Starting backup creation...');

            // Collect all system data
            const certificates = await this.certificateService.getAllCertificates();
            const users = await this.keyService.getAllUsers();
            const blockchain = await this.blockchainService.getAllBlocks();
            const blockchainStats = await this.blockchainService.getBlockchainStats();

            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                data: {
                    certificates: certificates.length > 0 ? certificates : [],
                    users: users.length > 0 ? users : [],
                    blockchain: {
                        blocks: blockchain.length > 0 ? blockchain : [],
                        stats: blockchainStats || {}
                    }
                }
            };

            // Validate backup data
            this._validateBackupData(backupData);

            // Generate filename and write to file
            const filename = this.generateFilename();
            const filepath = path.join(this.backupsDir, filename);

            await fs.writeFile(
                filepath,
                JSON.stringify(backupData, null, 2),
                { encoding: 'utf-8' }
            );

            logger.info(`✅ Backup validation successful`);
            logger.info(`💾 Backup saved to: ${filepath}`);

            return {
                success: true,
                filename,
                filepath,
                timestamp: backupData.timestamp,
                dataCount: {
                    certificates: backupData.data.certificates.length,
                    users: backupData.data.users.length,
                    blocks: backupData.data.blockchain.blocks.length
                }
            };
        } catch (error) {
            logger.error(`❌ Backup creation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * List all available backup files
     */
    async listBackups() {
        await this.ensureBackupsDirectory();

        try {
            const files = await fs.readdir(this.backupsDir);

            // Filter and sort backup files
            const backups = files
                .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
                .sort((a, b) => {
                    // Sort by timestamp in descending order (newest first)
                    const timestampA = this.getTimestampFromFilename(a);
                    const timestampB = this.getTimestampFromFilename(b);
                    return timestampB - timestampA;
                })
                .map(filename => ({
                    filename,
                    timestamp: this.getTimestampFromFilename(filename).toISOString(),
                    created: this.getTimestampFromFilename(filename)
                }));

            logger.info(`✅ Found ${backups.length} backup files`);
            return backups;
        } catch (error) {
            logger.error(`❌ Failed to list backups: ${error.message}`);
            throw new ValidationError('Failed to list backup files');
        }
    }

    /**
     * Get full path for a backup file
     */
    async getBackupPath(filename) {
        // Validate filename format to prevent directory traversal attacks
        if (!filename.startsWith('backup-') || !filename.endsWith('.json')) {
            throw new ValidationError('Invalid backup filename format');
        }

        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw new ValidationError('Invalid backup filename - path traversal not allowed');
        }

        const filepath = path.join(this.backupsDir, filename);
        return filepath;
    }

    /**
     * Load and validate backup file
     */
    async loadBackupFile(filename) {
        try {
            const filepath = await this.getBackupPath(filename);

            // Check if file exists
            await fs.access(filepath);

            // Read and parse backup file
            const content = await fs.readFile(filepath, { encoding: 'utf-8' });
            const backupData = JSON.parse(content);

            // Validate backup structure
            this._validateBackupData(backupData);

            logger.info(`✅ Backup file loaded: ${filename}`);
            return backupData;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new NotFoundError(`Backup file not found: ${filename}`);
            }
            if (error instanceof SyntaxError) {
                throw new ValidationError('Invalid backup file format - corrupted JSON');
            }
            logger.error(`❌ Failed to load backup file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate backup file structure and data
     */
    _validateBackupData(backupData) {
        if (!backupData || typeof backupData !== 'object') {
            throw new ValidationError('Invalid backup data structure');
        }

        if (!backupData.timestamp || !backupData.version) {
            throw new ValidationError('Backup missing required metadata: timestamp or version');
        }

        if (!backupData.data) {
            throw new ValidationError('Backup missing data section');
        }

        const { data } = backupData;
        if (!Array.isArray(data.certificates) || !Array.isArray(data.users)) {
            throw new ValidationError('Backup data structure invalid - certificates and users must be arrays');
        }

        if (!data.blockchain || !Array.isArray(data.blockchain.blocks)) {
            throw new ValidationError('Backup blockchain structure invalid');
        }

        // Validate blockchain blocks for hash corruption
        const corruptedBlocks = [];
        data.blockchain.blocks.forEach(block => {
            const validation = oqsCrypto.validateBlockHashes(block);
            if (!validation.valid) {
                corruptedBlocks.push({
                    index: block.id,
                    errors: validation.errors
                });
            }
        });

        if (corruptedBlocks.length > 0) {
            logger.warn(`⚠️  Backup validation found ${corruptedBlocks.length} blocks with corrupted hashes (will be reported)`);
        }

        logger.debug(`✅ Backup data validation passed`);
    }

    /**
     * Restore system from backup file with database transactions
     * Implements all-or-nothing restore for data consistency
     */
    async restoreFromBackup(filename) {
        let connection;
        try {
            logger.info(`🔄 Starting restore process from: ${filename}`);

            // Load and validate backup file
            const backupData = await this.loadBackupFile(filename);

            // Get connection from pool for transaction management
            await this.db.ready;
            connection = await this.db.pool.getConnection();

            // Start transaction
            await connection.beginTransaction();
            logger.info(`📋 Transaction started for restore operation`);

            try {
                // Temporarily disable foreign key constraints for restore
                logger.info(`🔓 Disabling foreign key constraints for safe restore...`);
                await connection.query('SET FOREIGN_KEY_CHECKS = 0');

                // 1. Clear existing data
                logger.info(`🧹 Clearing existing data...`);
                await connection.query('DELETE FROM certificate_signatures');
                await connection.query('DELETE FROM certificates');
                await connection.query('DELETE FROM students');
                await connection.query('DELETE FROM blockchain');
                await connection.query('DELETE FROM users');

                // 2. Restore users first (required for admin/auth state)
                logger.info(`👥 Restoring users...`);
                if (backupData.data.users && backupData.data.users.length > 0) {
                    for (const user of backupData.data.users) {
                        // Use default password if none exists in backup (fallback for compatibility)
                        const defaultPassword = process.env.DEFAULT_USER_PASSWORD || 'University@2026';
                        const password = user.password || defaultPassword;

                        const insert = `
                            INSERT INTO users (id, username, email, password, role, department, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                username = VALUES(username),
                                email = VALUES(email),
                                password = VALUES(password),
                                role = VALUES(role),
                                department = VALUES(department)
                        `;
                        await connection.query(insert, [
                            user.id,
                            user.username,
                            user.email,
                            password,
                            user.role,
                            user.department,
                            user.createdAt || user.created_at || new Date().toISOString()
                        ]);
                    }
                }
                logger.info(`✅ Users restored: ${backupData.data.users.length}`);

                // 3. Restore blockchain FIRST (certificates have foreign key to blockchain)
                logger.info(`⛓️ Restoring blockchain...`);
                if (backupData.data.blockchain && backupData.data.blockchain.blocks.length > 0) {
                    // Validate blockchain blocks for corruption BEFORE restoring
                    const corruptedBlocks = [];
                    backupData.data.blockchain.blocks.forEach(block => {
                        const validation = oqsCrypto.validateBlockHashes(block);
                        if (!validation.valid) {
                            corruptedBlocks.push({
                                index: block.id,
                                errors: validation.errors
                            });
                        }
                    });

                    if (corruptedBlocks.length > 0) {
                        logger.warn(`⚠️  Backup contains ${corruptedBlocks.length} blocks with corrupted hashes:`);
                        corruptedBlocks.forEach(block => {
                            logger.warn(`   Block ${block.id}:`);
                            block.errors.forEach(err => logger.warn(`      - ${err}`));
                        });
                        logger.warn(`⚠️  These corrupted blocks WILL be restored as-is. Manual inspection recommended.`);
                    }

                    await ChainQueries.saveChain(connection, { chain: backupData.data.blockchain.blocks });
                }
                logger.info(`✅ Blockchain restored: ${backupData.data.blockchain.blocks.length}`);

                // 4. Restore certificates using schema-aware repository helpers
                logger.info(`📜 Restoring certificates...`);
                if (backupData.data.certificates && backupData.data.certificates.length > 0) {
                    for (const cert of backupData.data.certificates) {
                        const studentId = await CertificateQueries._upsertStudent(connection, cert.student || {});
                        await CertificateQueries._upsertCertificate(connection, cert, studentId);
                        await CertificateQueries._replaceSignatures(connection, cert.id, cert.signatures || []);
                    }
                }
                logger.info(`✅ Certificates restored: ${backupData.data.certificates.length}`);

                // Re-enable foreign key constraints
                logger.info(`🔒 Re-enabling foreign key constraints...`);
                await connection.query('SET FOREIGN_KEY_CHECKS = 1');

                // Commit transaction
                await connection.commit();
                logger.info(`✅ Transaction committed successfully`);

                return {
                    success: true,
                    message: 'Restore completed successfully',
                    restoreDetails: {
                        timestamp: backupData.timestamp,
                        version: backupData.version,
                        dataRestored: {
                            users: backupData.data.users.length,
                            certificates: backupData.data.certificates.length,
                            blocks: backupData.data.blockchain.blocks.length
                        }
                    }
                };
            } catch (innerError) {
                // Rollback on any error
                await connection.rollback();
                logger.error(`❌ Restore failed, transaction rolled back: ${innerError.message}`);
                throw new ValidationError(`Restore operation failed: ${innerError.message}`);
            }
        } catch (error) {
            logger.error(`❌ Restore process failed: ${error.message}`);
            throw error;
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Delete a backup file
     */
    async deleteBackup(filename) {
        try {
            const filepath = await this.getBackupPath(filename);
            await fs.unlink(filepath);
            logger.info(`🗑️ Backup deleted: ${filename}`);
            return { success: true, message: 'Backup deleted successfully' };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new NotFoundError(`Backup file not found: ${filename}`);
            }
            logger.error(`❌ Failed to delete backup: ${error.message}`);
            throw error;
        }
    }
}

