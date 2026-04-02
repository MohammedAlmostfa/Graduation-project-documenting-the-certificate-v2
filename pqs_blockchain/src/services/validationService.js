import { oqsCrypto } from '../utils/crypto-oqs.js';
import { logger } from '../utils/logger.js';

/**
 * Service to validate inputs and data across the application.
 */
export class ValidationService {
    /** Validate certificate data fields. */
    validateCertificateData(certificateData) {
        const errors = [];

        const nameVal = certificateData.studentName ||
            certificateData.student?.name ||
            certificateData.student?.studentName;
        const idVal = certificateData.studentId || certificateData.student?.id;
        const emailVal = certificateData.studentEmail ||
            certificateData.student?.email ||
            certificateData.student?.studentEmail;

        if (!nameVal || !String(nameVal).trim()) errors.push('Student name is required');
        if (!idVal || !String(idVal).trim()) errors.push('Student ID is required');

        if (!emailVal || !String(emailVal).trim()) {
            errors.push('Student email is required');
        } else if (!this.isValidEmail(emailVal)) {
            errors.push('Invalid email format');
        }

        if (!certificateData.major || !String(certificateData.major).trim()) errors.push('Major is required');

        if (!certificateData.graduationDate) {
            errors.push('Graduation date is required');
        } else if (!this.validateDate(certificateData.graduationDate)) {
            errors.push('Invalid graduation date');
        }

        if (!certificateData.dateOfBirth) {
            errors.push('Date of birth is required');
        } else if (!this.validateDate(certificateData.dateOfBirth)) {
            errors.push('Invalid date of birth');
        }

        if (!this.validateGPA(certificateData.gpa)) {
            errors.push('GPA must be between 60 and 99');
        }

        if (!certificateData.nationality || !String(certificateData.nationality).trim()) errors.push('Nationality is required');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /** Validate user data fields. */
    validateUserData(userData) {
        const errors = [];

        if (!userData.username || !String(userData.username).trim()) {
            errors.push('Username is required');
        } else if (userData.username.length < 3) {
            errors.push('Username must be at least 3 characters');
        }

        if (!userData.email || !String(userData.email).trim()) {
            errors.push('Email is required');
        } else if (!this.isValidEmail(userData.email)) {
            errors.push('Invalid email format');
        }

        if (!userData.password || !String(userData.password).trim()) {
            errors.push('Password is required');
        } else if (userData.password.length < 6) {
            errors.push('Password must be at least 6 characters');
        }

        if (!userData.role || !['officer', 'dean', 'president', 'admin'].includes(userData.role)) {
            errors.push('Invalid role');
        }

        if (!userData.department || (typeof userData.department === 'string' && !userData.department.trim())) errors.push('Department is required');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /** Check if email format is valid. */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /** Validate national ID (14 digits). */
    validateNationalId(nationalId) {
        if (!nationalId || !String(nationalId).trim()) return false;
        const nationalIdRegex = /^\d{14}$/;
        return nationalIdRegex.test(String(nationalId).trim());
    }

        /** Validate GPA is between 60 and 99. */
    validateGPA(gpa) {
        if (gpa === undefined || gpa === null) return true;
        const numericGPA = parseFloat(gpa);
        return !isNaN(numericGPA) && numericGPA >= 60 && numericGPA <= 99;
    }

    /** Validate date format. */
    validateDate(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
}

// Export singleton instance
export const validationService = new ValidationService();
