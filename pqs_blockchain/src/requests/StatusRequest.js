import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for validating status parameter.
 */
export class StatusRequest {
    constructor(status) {
        this.status = status;
    }

    /**
     * Validate the status.
     * @throws {ValidationError} If validation fails.
     * @returns {string} The validated status.
     */
    validate() {
        const trimmed = typeof this.status === 'string' ? this.status.trim() : '';
        if (!trimmed) {
            throw new ValidationError('معامل الحالة مطلوب');
        }
        return trimmed;
    }
}

