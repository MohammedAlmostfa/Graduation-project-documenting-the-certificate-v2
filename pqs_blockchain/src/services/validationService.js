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

        if (!nameVal || !String(nameVal).trim()) errors.push('اسم الطالب مطلوب');
        if (!idVal || !String(idVal).trim()) errors.push('معرّف الطالب مطلوب');

        if (!emailVal || !String(emailVal).trim()) {
            errors.push('البريد الإلكتروني للطالب مطلوب');
        } else if (!this.isValidEmail(emailVal)) {
            errors.push('تنسيق البريد الإلكتروني غير صالح');
        }

        if (!certificateData.major || !String(certificateData.major).trim()) errors.push('التخصص مطلوب');

        if (!certificateData.graduationDate) {
            errors.push('تاريخ التخرج مطلوب');
        } else if (!this.validateDate(certificateData.graduationDate)) {
            errors.push('تاريخ التخرج غير صالح');
        }

        if (!certificateData.dateOfBirth) {
            errors.push('تاريخ الميلاد مطلوب');
        } else if (!this.validateDate(certificateData.dateOfBirth)) {
            errors.push('تاريخ الميلاد غير صالح');
        }

        if (!this.validateGPA(certificateData.gpa)) {
            errors.push('يجب أن يكون المعدل بين 60 و 99');
        }

        if (!certificateData.nationality || !String(certificateData.nationality).trim()) errors.push('الجنسية مطلوبة');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /** Validate user data fields. */
    validateUserData(userData) {
        const errors = [];

        if (!userData.username || !String(userData.username).trim()) {
            errors.push('اسم المستخدم مطلوب');
        } else if (userData.username.length < 3) {
            errors.push('يجب أن يكون اسم المستخدم 3 أحرف على الأقل');
        }

        if (!userData.email || !String(userData.email).trim()) {
            errors.push('البريد الإلكتروني مطلوب');
        } else if (!this.isValidEmail(userData.email)) {
            errors.push('تنسيق البريد الإلكتروني غير صالح');
        }

        if (!userData.password || !String(userData.password).trim()) {
            errors.push('كلمة المرور مطلوبة');
        } else if (userData.password.length < 6) {
            errors.push('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
        }

        if (!userData.role || !['officer', 'dean', 'president', 'admin'].includes(userData.role)) {
            errors.push('دور غير صالح');
        }

        if (!userData.department || (typeof userData.department === 'string' && !userData.department.trim())) errors.push('القسم مطلوب');

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

    /** Validate certificate number format. */
    validateCertificateNumberFormat(certificateNumber) {
        if (!certificateNumber || typeof certificateNumber !== 'string') return false;
        const certNumPattern = /^CERT-\d{4}-[A-Z0-9]+$/i;
        return certNumPattern.test(certificateNumber.trim());
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

