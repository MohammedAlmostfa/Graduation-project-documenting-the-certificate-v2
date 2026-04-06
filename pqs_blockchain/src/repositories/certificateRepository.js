import { mysqlDB } from '../storage/mysqlDB.js';
import { logger } from '../utils/logger.js';
import { BaseRepository } from './baseRepository.js';

/**
 * Certificate Repository
 * Handles database operations for certificates.
 */
class CertificateRepository extends BaseRepository {
    /**
     * البحث عن شهادة باستخدام certificateNumber فقط
     */
    async findByCertificateNumber(certificateNumber) {
        try {
            return await this.exec('findByCertificateNumber', this.db.getCertificateByNumber, certificateNumber);
        } catch (error) {
            return null;
        }
    }

    /**
     * @param {object} db - Database interface (default: mysqlDB)
     */
    constructor(db = mysqlDB) {
        super(db);
    }

    /**
     * Get a certificate by ID.
     */
    async getCertificate(id) {
        return this.exec('getCertificate', this.db.getCertificate, id);
    }

    /**
     * Save a certificate in the database.
     */
    async saveCertificate(certificate) {
        try {
            return await this.db.saveCertificate(certificate);
        } catch (error) {
            if (error.message && error.message.includes('Unknown column')) {
                logger.error(
                    '❌ Repository:saveCertificate error: missing database column. ' +
                    'Restart the server after schema changes.'
                );
            }
            throw error;
        }
    }

    /**
     * Get all certificates.
     */
    async getCertificates() {
        try {
            return await this.exec('getAllCertificates', this.db.getAllCertificates);
        } catch (error) {
            return [];
        }
    }

    /**
     * Get certificates filtered by status.
     */
    async getCertificatesByStatus(status) {
        try {
            return await this.exec('getCertificatesByStatus', this.db.getCertificatesByStatus, status);
        } catch (error) {
            return [];
        }
    }

    /**
     * Find a certificate by student ID.
     */
    async findByStudentId(studentId) {
        try {
            const certs = await this.exec(
                'getCertificatesByStudentId',
                this.db.getCertificatesByStudentId,
                studentId
            );
            return certs && certs.length > 0 ? certs[0] : null;
        } catch (error) {
            return null;
        }
    }
}

// Export a single repository instance
export const certificateRepository = new CertificateRepository();

// Export the class for testing or advanced use
export { CertificateRepository };

