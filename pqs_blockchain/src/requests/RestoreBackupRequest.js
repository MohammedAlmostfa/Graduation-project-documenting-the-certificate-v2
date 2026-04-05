import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for validating backup restore parameters.
 * Ensures backup filename is valid and safe.
 */
export class RestoreBackupRequest {
    constructor(backupFilename) {
        this.backupFilename = backupFilename;
    }

    /**
     * Validate the backup filename.
     * - Must be a non-empty string
     * - Must match the backup filename format: backup-YYYY-MM-DD-HH-mm-ss.json
     * - Must not contain path traversal attempts
     *
     * @throws {ValidationError} If validation fails.
     * @returns {string} The validated backup filename.
     */
    validate() {
        const trimmed = typeof this.backupFilename === 'string'
            ? this.backupFilename.trim()
            : '';

        if (!trimmed) {
            throw new ValidationError('اسم ملف النسخة الاحتياطية مطلوب (Backup filename is required)');
        }

        // Check for path traversal attempts
        if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
            throw new ValidationError('اسم الملف غير صالح (Invalid filename - path traversal not allowed)');
        }

        // Validate backup filename format: backup-YYYY-MM-DD-HH-mm-ss.json
        const backupPattern = /^backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;
        if (!backupPattern.test(trimmed)) {
            throw new ValidationError(
                'تنسيق اسم الملف غير صحيح (Invalid backup filename format - expected: backup-YYYY-MM-DD-HH-mm-ss.json)'
            );
        }

        return trimmed;
    }
}
