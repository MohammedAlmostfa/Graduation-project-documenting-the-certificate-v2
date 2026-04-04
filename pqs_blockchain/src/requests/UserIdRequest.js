import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for validating user ID parameter.
 */
export class UserIdRequest {
    constructor(userId) {
        this.userId = userId;
    }

    /**
     * Validate the user ID.
     * @throws {ValidationError} If validation fails.
     * @returns {string} The validated ID.
     */
    validate() {
        if (!this.userId || this.userId.trim() === '') {
            throw new ValidationError('معرّف المستخدم مطلوب');
        }
        return this.userId.trim();
    }
}
