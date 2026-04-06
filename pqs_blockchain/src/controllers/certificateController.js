import {
    certificateService,
    blockchainService,
    keyService,
    validationService
} from "../bootstrap.js";
import { logger } from "../utils/logger.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ValidationError } from "../utils/errors.js";
import { User } from "../models/User.js";
import { Certificate } from "../models/Certificate.js";
import { asyncWrapper } from "../utils/asyncWrapper.js";
import { certificateStatus } from "../config/security.js";
import { CreateCertificateRequest } from "../requests/CreateCertificateRequest.js";
import { CertificateIdRequest } from "../requests/CertificateIdRequest.js";
import { CertificateNumberRequest } from "../requests/CertificateNumberRequest.js";
import { StatusRequest } from "../requests/StatusRequest.js";

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
            const request = new CreateCertificateRequest(req.body);
            const certificateData = request.validate();
            const user = req.user;

            const certificate = await certificateService.createAndSignCertificate(
                certificateData,
                user
            );

            const publicCert = new Certificate(certificate).toPublicJSONWithSignatureInfo();
            res.status(201).json(ApiResponse.success("تم إنشاء الشهادة بنجاح", publicCert));
    }),

    /**
     * Add dean signature to a certificate.
     * Dean permission required.
     */
    addDeanSignature: asyncWrapper(async (req, res) => {
            const certIdRequest = new CertificateIdRequest(req.params.certificateId);
            const certificateId = certIdRequest.validate();
            const user = req.user;

            const updatedCertificate = await certificateService.signCertificate(certificateId, "dean", user);
            const cert = new Certificate(updatedCertificate);
            res.json(ApiResponse.success("تمت إضافة توقيع العميد بنجاح", cert.toPublicJSONWithSignatureInfo()));
    }),

    /**
     * Add president signature and queue certificate for blockchain.
     * President permission required.
     */
    addPresidentSignature: asyncWrapper(async (req, res) => {
            const certIdRequest = new CertificateIdRequest(req.params.certificateId);
            const certificateId = certIdRequest.validate();
            const user = req.user;

            const updated = await certificateService.signPresidentAndQueueForBlockchain(certificateId, user);
            const cert = new Certificate(updated);
            res.json(ApiResponse.success("تمت إضافة توقيع الرئيس وتمت جدولة الشهادة للتعدين", cert.toPublicJSON()));
    }),

    /**
     * Get a certificate by ID.
     */
    getCertificate: asyncWrapper(async (req, res) => {
            const certIdRequest = new CertificateIdRequest(req.params.id);
            const certificateId = certIdRequest.validate();
            const certificate = await certificateService.getCertificatePublic(certificateId);
            res.json(ApiResponse.success("تم جلب الشهادة بنجاح", certificate));
    }),

    /**
     * Validate a certificate.
     */
    validateCertificate: asyncWrapper(async (req, res) => {
        const certNumRequest = new CertificateNumberRequest(req.params.certificateNumber);
        const certificateNumber = certNumRequest.validate();

        const validationResult = await certificateService.validateCertificateByNumber(certificateNumber);
        if (validationResult.certificate) {
            validationResult.certificate = new Certificate(validationResult.certificate).toPublicJSON();
        }
        res.json(ApiResponse.success("نتيجة التحقق من الشهادة", validationResult));
    }),

    /**
     * Get all certificates.
     */
    getAllCertificates: asyncWrapper(async (req, res) => {
            const certificates = await certificateService.getAllCertificates();
            const publicCerts = certificates.map(c => new Certificate(c).toPublicJSON());
            res.json(ApiResponse.success("قائمة الشهادات", { count: publicCerts.length, certificates: publicCerts }));
    }),

    /**
     * Get certificates by status.
     */
    getCertificatesByStatus: asyncWrapper(async (req, res) => {
            const statusRequest = new StatusRequest(req.params.status);
            const status = statusRequest.validate();
            const certificates = await certificateService.getCertificatesByStatus(status);
            const publicCerts = certificates.map(c => new Certificate(c).toPublicJSON());
            res.json(ApiResponse.success(`الشهادات بالحالة: ${status}`, { status, count: publicCerts.length, certificates: publicCerts }));
    }),

    /**
     * Certificates are automatically queued for blockchain
     * after the president signature.
     */
    // manual addToBlockchain removed — president sign now queues certificates automatically
};

