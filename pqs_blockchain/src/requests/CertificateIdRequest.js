import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for validating certificate ID parameter.
 */
export class CertificateIdRequest {
    constructor(certificateId) {
        this.certificateId = certificateId;
    }

    /**
     * Validate the certificate ID.
     * @throws {ValidationError} If validation fails.
     * @returns {string} The validated ID.
     */
    validate() {
        const trimmed = typeof this.certificateId === 'string' ? this.certificateId.trim() : '';
        if (!trimmed) {
            throw new ValidationError('معرّف الشهادة مطلوب');
        }
        return trimmed;
    }
}

