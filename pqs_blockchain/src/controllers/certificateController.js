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

            res.status(201).json(ApiResponse.success("Certificate created successfully", certificate));
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
            res.json(ApiResponse.success("Dean signature added successfully", updatedCertificate));
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

            res.json(ApiResponse.success("President signature added and certificate queued for mining", updated));
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

            const certificate = await certificateService.getCertificate(id);
            res.json(ApiResponse.success("Certificate retrieved successfully", certificate));
    }),

    /**
     * Validate a certificate.
     */
    validateCertificate: asyncWrapper(async (req, res) => {
            const { id } = req.params;

            if (!id || id.trim() === '') {
                return res.status(400).json(
                    ApiResponse.error('Certificate ID is required', 'VALIDATION_ERROR', null)
                );
            }

            const validationResult = await certificateService.validateCertificate(id);
            res.json(ApiResponse.success("Certificate validation result", validationResult));
    }),

    /**
     * Get all certificates.
     */
    getAllCertificates: asyncWrapper(async (req, res) => {
            const certificates = await certificateService.getAllCertificates();
            res.json(ApiResponse.success("Certificates list", { count: certificates.length, certificates }));
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
            res.json(ApiResponse.success(`Certificates with status: ${status}`, { status, count: certificates.length, certificates }));
    }),

    /**
     * Certificates are automatically queued for blockchain
     * after the president signature.
     */
    // manual addToBlockchain removed — president sign now queues certificates automatically
};
