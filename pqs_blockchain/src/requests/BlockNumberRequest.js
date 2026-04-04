import { ValidationError } from '../utils/errors.js';

/**
 * Form Request for validating block number parameter.
 */
export class BlockNumberRequest {
    constructor(blockNumber) {
        this.blockNumber = blockNumber;
    }

    /**
     * Validate the block number.
     * @throws {ValidationError} If validation fails.
     * @returns {number} The validated number.
     */
    validate() {
        const num = parseInt(this.blockNumber);
        if (isNaN(num) || num < 0) {
            throw new ValidationError('رقم البلوك غير صالح');
        }
        return num;
    }
}
