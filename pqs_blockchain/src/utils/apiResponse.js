/**
 * ApiResponse
 * -----------
 * Utility class for standardizing API responses.
 * Provides consistent success and error response formats across the system.
 */
export class ApiResponse {
  /**
   * Success response format.
   * @param {string} message - Success message.
   * @param {any} [data=null] - Optional data payload.
   * @returns {object} Standardized success response.
   */
  static success(message, data = null) {
    return {
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Error response format.
   * @param {string} message - Error message.
   * @param {string} [errorCode='INTERNAL_ERROR'] - Error code identifier.
   * @param {any} [details=null] - Optional error details.
   * @returns {object} Standardized error response.
   */
  static error(message, errorCode = 'INTERNAL_ERROR', details = null) {
    return {
      status: 'error',
      message,
      data: null,
      error: { code: errorCode, details },
      timestamp: new Date().toISOString()
    };
  }
}

export default ApiResponse;

