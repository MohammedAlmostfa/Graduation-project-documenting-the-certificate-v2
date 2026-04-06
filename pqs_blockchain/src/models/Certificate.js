import {
    v4 as uuidv4
} from 'uuid';
import {
    oqsCrypto
} from '../utils/crypto-oqs.js';
import {
    logger
} from '../utils/logger.js';
import {
    certificateConfig
} from '../config/certificate.js';
import {
    certificateStatus,
    roles
} from '../config/security.js';

/**
 * Digital academic certificate with quantum-safe cryptography.
 * Supports hierarchical signing: officer → dean → president.
 */
export class Certificate {

    /**
     * Create a new certificate instance
     */
    constructor(data) {

        this.id = data.id || uuidv4();

        // Build student object
        if (data.student) {
            this.student = { ...data.student };
        } else {
            this.student = {
                studentId: data.studentId,
                studentName: data.studentName,
                studentEmail: data.studentEmail,
                dateOfBirth: data.dateOfBirth,
                nationality: data.nationality,
                studentEmail: data.studentEmail,
                dateOfBirth: data.dateOfBirth,
                nationality: data.nationality,
                fatherName: data.fatherName,
                motherName: data.motherName,
                major: data.major,
                faculty: data.faculty || (data.major ? this.getFacultyFromMajor(data.major) : undefined),
                graduationDate: data.graduationDate,
                graduationCycle: data.graduationCycle,
                gpa: data.gpa,
                honors: data.honors || (data.gpa ? this.calculateHonors(data.gpa) : undefined),
                certificateType: data.certificateType || 'BACHELOR'
            };
        }

        // Normalize main student fields
        if (!this.student.name) {
            this.student.name = this.student.studentName || null;
        }

        if (!this.student.email) {
            this.student.email = this.student.studentEmail || null;
        }

        if (!this.student.id) {
            this.student.id = this.student.studentId || data.studentId || uuidv4();
        }

        // Certificate metadata
        this.issueDate = data.issueDate
            ? Certificate.normalizeTimestamp(data.issueDate)
            : Certificate.normalizeTimestamp(new Date().toISOString());

        this.certificateNumber = data.certificateNumber || this.generateCertificateNumber();
        this.signatures = data.signatures || [];
        this.status = data.status || certificateStatus.PENDING;

        this.transactionHash = data.transactionHash || null;

        // Blockchain references
        this.blockId = data.blockId || null;
        this.blockIndex = data.blockIndex || data.blockNumber || null;  // kept for compatibility

        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();

        // Immutable certificate hash
        if (data.certificateHash) {
            this.certificateHash = data.certificateHash;
        } else {
            this.certificateHash = this.calculateHash();
        }
    }

    // Compatibility getter for old code
    get blockNumber() {
        return this.blockIndex;
    }

    static normalizeTimestamp(ts) {
        if (!ts) return ts;

        let s = ts.toString();

        // Remove fractional seconds
        s = s.replace(/\.\d+Z$/, 'Z');

        // Ensure Z suffix
        if (!s.endsWith('Z')) {
            s = s.replace(/\+00:00$/, 'Z');
        }

        return s;
    }

    /**
     * Generate certificate number: CERT-YYYY-RANDOM
     */
    generateCertificateNumber() {
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 8).toUpperCase();
        return `CERT-${year}-${random}`;
    }

    /**
     * Convert academic major to faculty code
     */
    getFacultyFromMajor(major) {


         return ' كلية الهندسة الميكانيكية والكهربائي';
    }

    /**
     * Calculate honors level from GPA
     */
    calculateHonors(gpa) {
        if (gpa >= 90) return certificateConfig.honors.EXCELLENT;
        if (gpa >= 75) return certificateConfig.honors.VERY_GOOD;
        if (gpa >= 60) return certificateConfig.honors.GOOD;
        return certificateConfig.honors.PASS;
    }

    /**
     * Calculate cryptographic hash of certificate core data
     */
    calculateHash() {

        // Ensure consistent student fields
        const name = this.student.name || this.student.studentName || null;
        const email = this.student.email || this.student.studentEmail || null;
        const id = this.student.id || this.student.studentId || null;

        const immutableData = {
            certificateNumber: this.certificateNumber,
            student: {
                id,
                name,
                email,
                dateOfBirth: this.student.dateOfBirth,
                nationality: this.student.nationality,
                fatherName: this.student.fatherName,
                motherName: this.student.motherName,
                major: this.student.major,
                faculty: this.student.faculty,
                graduationDate: this.student.graduationDate,
                graduationCycle: this.student.graduationCycle,
                gpa: this.student.gpa,
                honors: this.student.honors,
                certificateType: this.student.certificateType
            },
            issueDate: this.issueDate
        };

        return oqsCrypto.hashData(immutableData);
    }

    /**
     * Add a digital signature to the certificate
     */
    addSignature(signatureData) {

        // Only store signerId and signature
        const signature = {
            signerId: signatureData.signerId || signatureData.userId || null,
            signature: signatureData.signature
        };

        this.signatures.push(signature);
        this.updatedAt = new Date().toISOString();

        // Status updates handled in service layer
        // Certificate hash is NOT recalculated after signatures

        return this;
    }

    /**
     * Basic validation for signatures structure
     */
    async validateSignatures() {

        if (!Array.isArray(this.signatures)) return false;

        for (const sig of this.signatures) {

            if (!sig.signerId) {
                logger.warn('⚠️ Signature missing signerId field');
                return false;
            }

            if (!sig.signature || typeof sig.signature !== 'string') {
                logger.warn('⚠️ Signature missing or not a string');
                return false;
            }
        }

        return true;
    }

    /**
     * Return immutable hash used for signing
     */
    getDataForSigning() {
        return this.certificateHash;
    }

    /**
     * Update certificate status based on signer role
     */
    updateStatus(signerRole) {

        if (signerRole === roles.PRESIDENT) {
            this.status = certificateStatus.BLOCKCHAIN_ADDED;
        } else if (signerRole === roles.DEAN) {
            this.status = certificateStatus.DEAN_SIGNED;
        } else if (signerRole === roles.OFFICER) {
            this.status = certificateStatus.PENDING;
        }

        this.updatedAt = new Date().toISOString();
        return this;
    }

    /**
     * Convert certificate to JSON
     */
        toJSON() {
                const trimmedSigs = (this.signatures || []).map(sig => ({
                        signerId: sig.signerId,
                        signature: sig.signature
                }));
                return {
                        id: this.id,
                        certificateNumber: this.certificateNumber,
                        student: this.student,
                        issueDate: this.issueDate,
                        signatures: trimmedSigs,
                        status: this.status,
                        certificateHash: this.certificateHash,
                        transactionHash: this.transactionHash,
                        blockId: this.blockId,
                        blockIndex: this.blockIndex,
                        blockNumber: this.blockIndex, // alias for compatibility
                        createdAt: this.createdAt,
                        updatedAt: this.updatedAt
                };
        }

        /**
         * Return certificate for API responses (no signatures)
         */
        toPublicJSON() {
            // Return only the required student fields
            const s = this.student || {};
            return {
                id: this.id,
                certificateNumber: this.certificateNumber,
                student: {
                    id: s.id || null,
                    name: s.name || null,
                    email: s.email || null,
                    dateOfBirth: s.dateOfBirth || null,
                    nationality: s.nationality || null,
                    fatherName: s.fatherName || null,
                    motherName: s.motherName || null,
                    major: s.major || null,
                    faculty: s.faculty || null,
                    graduationDate: s.graduationDate || null,
                    graduationCycle: s.graduationCycle || null,
                    gpa: s.gpa || null,
                    honors: s.honors || null,
                    certificateType: s.certificateType || null
                },
                issueDate: this.issueDate,
                status: this.status,
                certificateHash: this.certificateHash,
                transactionHash: this.transactionHash,
                blockId: this.blockId,
                blockIndex: this.blockIndex,
                createdAt: this.createdAt,
                updatedAt: this.updatedAt
            };
        }

        /**
         * Return certificate with signature count only (no signature data)
         */
        toPublicJSONWithSignatureInfo() {
            return {
                ...this.toPublicJSON(),
                signatureCount: (this.signatures || []).length,
                isFulySigned: (this.signatures || []).length >= 3
            };
        }
}

