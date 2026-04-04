import { validationService } from '../services/validationService.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for creating a certificate.
 * Validates certificate data using ValidationService.
 */
export class CreateCertificateRequest {
    constructor(data) {
        this.data = data;
    }

    /**
     * Validate the certificate data.
     * @throws {ValidationError} If validation fails.
     * @returns {Object} The validated data.
     */
    validate() {
        const validation = validationService.validateCertificateData(this.data);
        if (!validation.isValid) {
            throw new ValidationError(validation.errors.join(', '));
        }
        return this.data;
    }
}
