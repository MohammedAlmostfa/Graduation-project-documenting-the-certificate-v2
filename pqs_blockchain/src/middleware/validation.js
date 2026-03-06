import { validationService } from '../services/validationService.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Validation Middleware
 * ---------------------
 * Provides reusable validation functions for certificates, users,
 * signatures, national IDs, and GPA values.
 */
export const validation = {
  /**
   * Validate certificate data in request body
   */
  validateCertificate: (req, res, next) => {
    const validation = validationService.validateCertificateData(req.body);

    if (!validation.isValid) {
      return res.status(400).json(
        ApiResponse.error('Invalid certificate data', 'VALIDATION_ERROR', validation.errors)
      );
    }

    next();
  },

  /**
   * Validate certificate ID in request params
   */
  validateSignature: (req, res, next) => {
    const { certificateId } = req.params;

    if (!certificateId || certificateId.trim() === '') {
      return res.status(400).json(
        ApiResponse.error('Certificate ID is required in URL', 'VALIDATION_ERROR', null)
      );
    }

    next();
  },

  /**
   * Validate user data in request body
   */
  validateUser: (req, res, next) => {
    const validation = validationService.validateUserData(req.body);
    if (!validation.isValid) {
      return res.status(400).json(
        ApiResponse.error('Invalid user data', 'VALIDATION_ERROR', validation.errors)
      );
    }
    next();
  },


  /**
   * Validate national ID inside student object
   */
  validateNationalId: (req, res, next) => {
    const { nationalId } = req.body.student || {};

    if (nationalId && !validationService.validateNationalId(nationalId)) {
      return res.status(400).json(
        ApiResponse.error('Invalid national ID', 'VALIDATION_ERROR', 'National ID must be 14 digits')
      );
    }

    next();
  },

  /**
   * Validate GPA inside degree object
   */
  validateGPA: (req, res, next) => {
    const { gpa } = req.body.degree || {};

    if (gpa !== undefined && !validationService.validateGPA(gpa)) {
      return res.status(400).json(
        ApiResponse.error('Invalid GPA', 'VALIDATION_ERROR', 'GPA must be between 0 and 4')
      );
    }

    next();
  }
};
