import { validationService } from '../services/validationService.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for validating certificate number parameter.
 */
export class CertificateNumberRequest {
    constructor(certificateNumber) {
        this.certificateNumber = certificateNumber;
    }

    /**
     * Validate the certificate number.
     * @throws {ValidationError} If validation fails.
     * @returns {string} The validated number.
     */
    validate() {
        if (!validationService.validateCertificateNumberFormat(this.certificateNumber)) {
            throw new ValidationError('Invalid certificate number format');
        }
        return this.certificateNumber;
    }
}
