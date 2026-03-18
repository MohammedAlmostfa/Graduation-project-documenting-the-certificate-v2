import {
    certificateService,
    blockchainService,
    keyService,
    validationService
} from "../bootstrap.js";
import { logger } from "../utils/logger.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/User.js";
import { Certificate } from "../models/Certificate.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { certificateStatus } from "../config/security.js";

/**
 * Certificate Controller
 *
 * Handles certificate API requests.
 * - Receives HTTP requests
 * - Validates input data
 * - Calls service layer
 * - Returns formatted responses
 *
 * Permissions are handled by middleware.
 * Validation is handled by ValidationService.
 */
export const certificateController = {
    /**
     * Create and sign a certificate.
     * Officer permission required.
     */
    createCertificate: asyncWrapper(async (req, res) => {
            const certificateData = req.body;
            const user = req.user;

            // Validate certificate data
            const validation = validationService.validateCertificateData(certificateData);
            if (!validation.isValid) {
                return res.status(400).json(
                    ApiResponse.error('Invalid certificate data', 'VALIDATION_ERROR', validation.errors)
                );
            }

            const certificate = await certificateService.createAndSignCertificate(
                certificateData,
                user
            );

            const publicCert = new Certificate(certificate).toPublicJSONWithSignatureInfo();
            res.status(201).json(ApiResponse.success("Certificate created successfully", publicCert));
    }),

    /**
     * Add dean signature to a certificate.
     * Dean permission required.
     */
    addDeanSignature: asyncWrapper(async (req, res) => {
            const { certificateId } = req.params;
            const user = req.user;

            // Check certificate ID
            if (!certificateId || certificateId.trim() === '') {
                return res.status(400).json(
                    ApiResponse.error('Certificate ID is required', 'VALIDATION_ERROR', null)
                );
            }

            const updatedCertificate = await certificateService.signCertificate(certificateId, "dean", user);
            const cert = new Certificate(updatedCertificate);
            res.json(ApiResponse.success("Dean signature added successfully", cert.toPublicJSONWithSignatureInfo()));
    }),

    /**
     * Add president signature and queue certificate for blockchain.
     * President permission required.
     */
    addPresidentSignature: asyncWrapper(async (req, res) => {
            const { certificateId } = req.params;
            const user = req.user;

            // Check certificate ID
            if (!certificateId || certificateId.trim() === '') {
                return res.status(400).json(
                    ApiResponse.error('Certificate ID is required', 'VALIDATION_ERROR', null)
                );
            }

            // Ensure certificate is signed by dean first
            const certificate = await certificateService.getCertificate(certificateId);
            if (certificate.status !== certificateStatus.DEAN_SIGNED) {
                return res.status(400).json(
                    ApiResponse.error('Certificate must be signed by dean before president', 'INVALID_STATE', null)
                );
            }

            // Add president signature
            await certificateService.signCertificate(certificateId, "president", user);

            // Update status and prepare for blockchain
            const updated = await certificateService.setCertificateStatus(certificateId, certificateStatus.BLOCKCHAIN_ADDED);

            try {
                if (blockchainService && typeof blockchainService.enqueueCertificateById === 'function') {
                    await blockchainService.enqueueCertificateById(certificateId);
                } else if (blockchainService && blockchainService.syncPendingFromDB) {
                    await blockchainService.syncPendingFromDB();
                }
            } catch (err) {
                logger.error(`❌ Failed to enqueue certificate for mining: ${err.message}`);
            }

            const cert = new Certificate(updated);
            res.json(ApiResponse.success("President signature added and certificate queued for mining", cert.toPublicJSON()));
    }),

    /**
     * Get a certificate by ID.
     */
    getCertificate: asyncWrapper(async (req, res) => {
            const { id } = req.params;

            if (!id || id.trim() === '') {
                return res.status(400).json(
                    ApiResponse.error('Certificate ID is required', 'VALIDATION_ERROR', null)
                );
            }

            const certificate = await certificateService.getCertificatePublic(id);
            res.json(ApiResponse.success("Certificate retrieved successfully", certificate));
    }),

    /**
     * Validate a certificate.
     */
    validateCertificate: asyncWrapper(async (req, res) => {
        const { certificateNumber } = req.params;
        // تحقق من وجود certificateNumber وأنه نصي وغير فارغ
        if (!certificateNumber || typeof certificateNumber !== 'string' || certificateNumber.trim() === '') {
            return res.status(400).json(
                ApiResponse.error('Certificate number is required', 'VALIDATION_ERROR', null)
            );
        }
        // تحقق من أن certificateNumber يطابق النمط المتوقع (مثال: CERT-2026-)
        const certNumPattern = /^CERT-\d{4}-[A-Z0-9]+$/i;
        if (!certNumPattern.test(certificateNumber)) {
            return res.status(400).json(
                ApiResponse.error('Invalid certificate number format', 'VALIDATION_ERROR', null)
            );
        }
        const validationResult = await certificateService.validateCertificateByNumber(certificateNumber);
                if (validationResult.certificate) {
                    validationResult.certificate = new Certificate(validationResult.certificate).toPublicJSON();
                }
                res.json(ApiResponse.success("Certificate validation result", validationResult));
    }),

    /**
     * Get all certificates.
     */
    getAllCertificates: asyncWrapper(async (req, res) => {
            const certificates = await certificateService.getAllCertificates();
            const publicCerts = certificates.map(c => new Certificate(c).toPublicJSON());
            res.json(ApiResponse.success("Certificates list", { count: publicCerts.length, certificates: publicCerts }));
    }),

    /**
     * Get certificates by status.
     */
    getCertificatesByStatus: asyncWrapper(async (req, res) => {
            const { status } = req.params;

            if (!status || status.trim() === '') {
                return res.status(400).json(
                    ApiResponse.error('Status parameter is required', 'VALIDATION_ERROR', null)
                );
            }

            const certificates = await certificateService.getCertificatesByStatus(status);
            const publicCerts = certificates.map(c => new Certificate(c).toPublicJSON());
            res.json(ApiResponse.success(`Certificates with status: ${status}`, { status, count: publicCerts.length, certificates: publicCerts }));
    }),

    /**
     * Certificates are automatically queued for blockchain
     * after the president signature.
     */
    // manual addToBlockchain removed — president sign now queues certificates automatically
};
