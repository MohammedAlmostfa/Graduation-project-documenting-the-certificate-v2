
import {
    Certificate
} from '../models/Certificate.js';
import {
    certificateRepository
} from '../repositories/certificateRepository.js';
import {
    userRepository
} from '../repositories/userRepository.js';
import {
    certificateStatus,
    certificateStatusLabels,
    roles
} from '../config/security.js';
import {
    logger
} from '../utils/logger.js';
import {
    NotFoundError,
    ValidationError
} from '../utils/errors.js';
import {
    oqsCrypto
} from '../utils/crypto-oqs.js';


/**
 * Service layer for managing academic certificate operations.
 * Handles certificate creation, retrieval, signing, status, and validation.
 * Permission checks, data validation, and authentication are handled externally.
 */
export class CertificateService {
    constructor({
        repo,
        keyService,
        keyManagementService
    } = {}) {
        this.repo = repo || certificateRepository;
        this.keyService = keyService;
        this.keyManagementService = keyManagementService;
        this.blockchainService = null;
        this.certificateValidationService = null;
    }

    async getCertificatePublic(certificateId) {
        const certificateData = await this.repo.getCertificate(certificateId);
        if (!certificateData) throw new NotFoundError('Certificate not found');
        const certificate = new Certificate(certificateData);
        const json = certificate.toPublicJSON();
        if (certificateStatusLabels && json.status) {
            json.statusLabel = certificateStatusLabels[json.status] || json.status;
        }
        return json;
    }
    /**
     * تحقق من الشهادة باستخدام certificateNumber
     */
    async validateCertificateByNumber(certificateNumber) {
        try {
            const certificateData = await this.repo.findByCertificateNumber(certificateNumber);
            if (!certificateData) throw new NotFoundError('Certificate not found');

            const certInstance = new Certificate(certificateData);

            if (!this.certificateValidationService) {
                return {
                    status: 'ERROR',
                    message: 'Validation service not available'
                };
            }

            const validationResult = await this.certificateValidationService.completeCertificateValidation(certificateData.id);

            if (validationResult.status === 'VALID') {
                return {
                    status: 'VALID',
                    message: 'الشهادة صحيحة وموثوقة',
                    certificate: certInstance.toJSON(),
                    validationDetails: validationResult.details
                };
            } else {
                return validationResult;
            }
        } catch (error) {
            logger.error(`Error validating certificate by number: ${error.message}`);
            return {
                status: 'ERROR',
                message: 'Error validating certificate',
                detail: error.message
            };
        }
    }

    async validateCertificateById(certificateId) {
        try {
            const certificateData = await this.repo.getCertificate(certificateId);
            if (!certificateData) throw new NotFoundError('Certificate not found');

            const certInstance = new Certificate(certificateData);

            if (!this.certificateValidationService) {
                return {
                    status: 'ERROR',
                    message: 'Validation service not available'
                };
            }

            const validationResult = await this.certificateValidationService.completeCertificateValidation(certificateId);

            if (validationResult.status === 'VALID') {
                return {
                    status: 'VALID',
                    message: 'الشهادة صحيحة وموثوقة',
                    certificate: certInstance.toJSON(),
                    validationDetails: validationResult.details
                };
            } else {
                return validationResult;
            }
        } catch (error) {
            logger.error(`Error validating certificate by ID: ${error.message}`);
            return {
                status: 'ERROR',
                message: 'Error validating certificate',
                detail: error.message
            };
        }
    }

    async validateSignatureOrderWithRoles(certificate, newRole) {
        const expectedOrder = ['officer', 'dean', 'president'];
        const currentSigs = certificate.signatures || [];
        const sigCount = currentSigs.length;

        // Validate the incoming role
        const newRoleIndex = expectedOrder.indexOf(newRole);
        if (newRoleIndex === -1) {
            return {
                valid: false,
                reason: 'INVALID_ROLE',
                detail: `دور غير معروف: ${newRole}`
            };
        }

        // Each role has a fixed position; signing out of order is rejected
        if (newRoleIndex !== sigCount) {
            return {
                valid: false,
                reason: 'WRONG_ORDER',
                detail: `الدور ${newRole} يجب أن يكون في الموضع ${newRoleIndex} لكن الموضع الحالي هو ${sigCount}`
            };
        }

        // Verify each existing signer's role from the users table
        for (let i = 0; i < currentSigs.length; i++) {
            const sig = currentSigs[i];
            if (!sig.signerId) {
                return {
                    valid: false,
                    reason: `MISSING_SIGNER_ID_AT_POSITION_${i}`,
                    detail: `التوقيع رقم ${i} لا يحتوي على signerId`
                };
            }

            const signerRole = await this._getUserRoleFromDB(sig.signerId);
            const expectedRole = expectedOrder[i];

            if (signerRole !== expectedRole) {
                return {
                    valid: false,
                    reason: `ROLE_MISMATCH_AT_POSITION_${i}`,
                    detail: `موضع ${i}: متوقع '${expectedRole}'، وُجد '${signerRole || 'unknown'}'`
                };
            }
        }

        return {
            valid: true
        };
    }

    /**
     * Retrieves a certificate by ID.

     */
    async getCertificate(certificateId) {
        try {
            const certificateData = await this.repo.getCertificate(certificateId);
            if (!certificateData) throw new NotFoundError('Certificate not found');

            const certificate = new Certificate(certificateData);
            const json = certificate.toJSON();
            if (certificateStatusLabels && json.status) {
                json.statusLabel = certificateStatusLabels[json.status] || json.status;
            }
            return json;
        } catch (error) {
            logger.error(`❌ Error retrieving certificate: ${error.message}`);
            throw error;
        }
    }

    /**
     * Adds a digital signature to a certificate.
     * Role is always fetched from the DB — never trusted from client input.
     * Signing order (Officer → Dean → President) is strictly enforced.
     */
    async addSignature(certificateId, signatureData, user) {
        try {
            const certificateData = await this.repo.getCertificate(certificateId);
            if (!certificateData) throw new NotFoundError('Certificate not found');

            const certificate = new Certificate(certificateData);

            logger.info(`🔍 Validating signatures for certificate: ${certificateId}`);
            logger.info(`🔍 Current signature count: ${certificate.signatures.length}`);

            try {
                const signaturesValid = await certificate.validateSignatures();
                if (!signaturesValid) throw new Error('One of the previous signatures is invalid');
            } catch (validationError) {
                logger.error(`❌ Error validating signatures: ${validationError.message}`);
                throw new Error(`Failed to validate current signatures: ${validationError.message}`);
            }

            // Role comes from the DB, not from the request
            const userRole = await this._getUserRoleFromDB(user.id);
            if (!userRole) {
                throw new Error(`User ${user.id} not found or has no role`);
            }

            logger.info(`✓ Signer role from database: ${userRole}`);

            const orderCheck = await this.validateSignatureOrderWithRoles(certificate, userRole);
            if (!orderCheck.valid) {
                throw new Error(`Invalid signature order: ${orderCheck.reason}. ${orderCheck.detail || ''}`);
            }

            // Sign the immutable certificateHash stored in the database
            const dataToSign = certificate.certificateHash;

            const signatureResult = await this.keyService.signDataWithUserKey(user.id, dataToSign);

            // Only signerId and signature are stored; role is fetched from DB when needed
            const storedSignatureData = {
                signerId: user.id,
                signature: signatureResult.signature
            };

            certificate.addSignature(storedSignatureData);
            certificate.updateStatus(userRole);

            await this.repo.saveCertificate(certificate.toJSON());

            logger.info(`✅ Added ${userRole} signature to certificate: ${certificateId}`);
            return certificate.toJSON();
        } catch (error) {
            logger.error(`❌ Error adding signature: ${error.message}`);
            throw error;
        }
    }

    /**
     * Fetches a user's role from the database.
     * This is the authoritative source; client-supplied roles are never trusted.
     * @param {string} userId - User ID
     * @returns {Promise<string|null>} User's role or null if not found
     */
    async _getUserRoleFromDB(userId) {
        try {
            const user = await userRepository.getUser(userId);
            if (!user || !user.role) {
                logger.warn(`⚠️ User ${userId} not found or has no role`);
                return null;
            }
            return user.role;
        } catch (error) {
            logger.error(`❌ Error fetching user role from DB: ${error.message}`);
            return null;
        }
    }

    /**
     * Finds a certificate by student ID.
     * Pass `major` to prevent duplicate certificates for the same student in the same major.
     */
    async findCertificateByStudent(studentId, major) {
        try {
            const cert = await this.repo.findByStudentId(studentId);
            if (!cert) return null;
            if (major && cert.student && cert.student.major && cert.student.major !== major) {
                return null;
            }
            return cert;
        } catch (error) {
            logger.error(`❌ Error searching for student certificate: ${error.message}`);
            return null;
        }
    }

    /**
     * Retrieves all certificates with human-readable status labels.
     * @returns {Array}
     */
    async getAllCertificates() {
        try {
            const list = await this.repo.getCertificates();
            return list.map(c => {
                if (certificateStatusLabels && c.status) {
                    c.statusLabel = certificateStatusLabels[c.status] || c.status;
                }
                return c;
            });
        } catch (error) {
            logger.error(`❌ Error retrieving all certificates: ${error.message}`);
            return [];
        }
    }

    /**
     * Retrieves certificates filtered by status.
     * @param {string} status
     * @returns {Array}
     */
    async getCertificatesByStatus(status) {
        const certs = await this.repo.getCertificatesByStatus(status);
        return certs.map(c => {
            if (certificateStatusLabels && c.status) {
                c.statusLabel = certificateStatusLabels[c.status] || c.status;
            }
            return c;
        });
    }



    /**
     * Signs a certificate using the authenticated user's key.
     * Signs over the immutable certificateHash stored in the database.
     * @param {string} role - Role to sign as (verified against DB)
     * @param {Object} user - Authenticated user performing the signature
     * @returns {Object} Updated certificate with the new signature
     */
    async signCertificate(certificateId, role, user) {
        try {
            if (!user) throw new Error('User is required for signing');

            const certificate = await this.getCertificate(certificateId);
            const certInstance = new Certificate(certificate);

            // Sign the immutable certificateHash, not reconstructed data
            const dataToSign = certInstance.certificateHash;

            if (!this.keyService) throw new Error('Key service not wired');

            const signatureResult = await this.keyService.signDataWithUserKey(user.id, dataToSign);

            // Only signature and signerId are stored
            const signatureData = {
                signature: signatureResult.signature,
                signerId: user.id
            };

            const updated = await this.addSignature(certificateId, signatureData, user);
            return updated;
        } catch (error) {
            logger.error(`❌ Error signing certificate as ${role}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates a certificate with blockchain transaction info after mining.
     * blockId and blockIndex are required and strictly validated against the blockchain table.
     * The transaction hash is always recomputed from the actual DB record.
     */
    async updateCertificateBlockchainInfo(certificateId, transactionHash, blockId, blockIndex) {
        try {
            if (blockId === undefined || blockId === null) {
                throw new Error('blockId is REQUIRED and cannot be null or undefined');
            }

            if (typeof blockId !== 'number' || blockId <= 0) {
                throw new Error(`blockId must be a positive number, got: ${blockId}`);
            }

            if (blockIndex === undefined || blockIndex === null) {
                throw new Error('blockIndex is REQUIRED and cannot be null or undefined');
            }

            if (typeof blockIndex !== 'number' || blockIndex < 0) {
                throw new Error(`blockIndex must be a non-negative number, got: ${blockIndex}`);
            }

            const certificateData = await this.repo.getCertificate(certificateId);
            if (!certificateData) throw new NotFoundError('Certificate not found');

            if (!this.blockchainService || !this.blockchainService.repo) {
                throw new Error('blockchainService not available for block verification');
            }

            const blockRow = await this.blockchainService.repo.getBlockById(blockId);
            if (!blockRow) {
                throw new Error(`Referenced block ID ${blockId} does not exist in blockchain table`);
            }

            if (blockRow.index !== blockIndex) {
                throw new Error(
                    `Block mismatch: blockId ${blockId} has index ${blockRow.index} ` +
                    `but provided blockIndex is ${blockIndex}`
                );
            }

            // Always compute the transaction hash from the actual DB record
            const computedHash = oqsCrypto.hashData(JSON.stringify(certificateData));

            const certificate = new Certificate(certificateData);
            certificate.transactionHash = computedHash;
            certificate.blockId = blockId;
            certificate.blockIndex = blockIndex;
            certificate.status = certificateStatus.COMPLETED;

            await this.repo.saveCertificate(certificate.toJSON());

            logger.info(`✅ Updated certificate ${certificateId} with blockchain info:`);
            logger.info(`   Block ID: ${blockId}, Block Index: ${blockIndex}`);
            logger.info(`   Transaction Hash: ${computedHash}`);
            logger.info(`   Status: COMPLETED`);

            return certificate.toJSON();
        } catch (error) {
            logger.error(`❌ Error updating certificate blockchain info: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates a certificate's status and optionally sets blockchain-related fields.
     */
    async setCertificateStatus(certificateId, status, extras = {}) {
        try {
            const certificateData = await this.repo.getCertificate(certificateId);
            if (!certificateData) throw new NotFoundError('Certificate not found');

            const certificate = new Certificate(certificateData);

            if (extras.transactionHash !== undefined) certificate.transactionHash = extras.transactionHash;
            if (extras.blockId !== undefined) certificate.blockId = extras.blockId;
            if (extras.blockIndex !== undefined) certificate.blockIndex = extras.blockIndex;
            if (extras.blockNumber !== undefined) certificate.blockIndex = extras.blockNumber; // WHY: كلاهما يُعيّن blockIndex لضمان التوافق مع الكود القديم والجديد

            certificate.status = status;
            certificate.updatedAt = new Date().toISOString();

            await this.repo.saveCertificate(certificate.toJSON());

            logger.info(`✅ Set status ${status} for certificate: ${certificateId}`);
            return certificate.toJSON();
        } catch (error) {
            logger.error(`❌ Error setting certificate status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates a certificate and signs it with the officer's key in one step.
     * The certificateHash is generated once, persisted, and then signed.
     * Only the signature and signerId are stored — not the role.
     */
    async createAndSignCertificate(certificateData, officerUser) {
        if (!officerUser) {
            throw new Error('Officer user is required to create and sign certificate');
        }

        const existingCert = await this.findCertificateByStudent(certificateData.studentId, certificateData.major);
        if (existingCert) {
            throw new ValidationError('Certificate already exists for this student in the same major');
        }

        const certificate = new Certificate(certificateData);

        // Sign the immutable certificateHash, not reconstructed data
        const dataToSign = certificate.certificateHash;

        const signatureResult = await this.keyService.signDataWithUserKey(officerUser.id, dataToSign);

        // Only store signature and signerId
        const officerSignature = {
            signature: signatureResult.signature,
            signerId: officerUser.id
        };

        certificate.addSignature(officerSignature);
        certificate.updateStatus(roles.OFFICER);

        await this.repo.saveCertificate(certificate.toJSON());

        logger.info(`✅ Created and signed new certificate: ${certificate.id}`);
        logger.info(`   Certificate Hash (immutable): ${certificate.certificateHash}`);
        return certificate.toJSON();
    }
}
