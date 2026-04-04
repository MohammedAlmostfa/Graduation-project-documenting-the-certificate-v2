import { validationService } from '../services/validationService.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for creating a user.
 * Validates user data using ValidationService.
 */
export class CreateUserRequest {
    constructor(data) {
        this.data = data;
    }

    /**
     * Validate the user data.
     * @throws {ValidationError} If validation fails.
     * @returns {Object} The validated data.
     */
    validate() {
        const validation = validationService.validateUserData(this.data);
        if (!validation.isValid) {
            throw new ValidationError(validation.errors.join(', '));
        }
        return this.data;
    }
}
