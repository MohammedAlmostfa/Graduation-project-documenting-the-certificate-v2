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
        ApiResponse.error('بيانات الشهادة غير صالحة', 'VALIDATION_ERROR', validation.errors)
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
        ApiResponse.error('بيانات المستخدم غير صالحة', 'VALIDATION_ERROR', validation.errors)
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
        ApiResponse.error('الرقم القومي غير صالح', 'VALIDATION_ERROR', 'يجب أن يتكون الرقم القومي من 14 رقمًا')
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
        ApiResponse.error('المعدل غير صالح', 'VALIDATION_ERROR', 'يجب أن يكون المعدل بين 0 و 4')
      );
    }

    next();
  }
};
