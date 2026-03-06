export const helpers = {
  /**
   * Delay execution for a given number of milliseconds.
   * @param {number} ms - Time in milliseconds.
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Check if a value is not null or undefined.
   * @param {any} value
   * @returns {boolean}
   */
  isDefined(value) {
    return value !== null && value !== undefined;
  },

  /**
   * Check if an object or array is empty.
   * @param {object|array} obj
   * @returns {boolean}
   */
  isEmpty(obj) {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    return Object.keys(obj).length === 0;
  },

  /**
   * Convert an array to unique values.
   * @param {array} array
   * @returns {array}
   */
  unique(array) {
    return [...new Set(array)];
  },

  /**
   * Format a date string into a human-readable format.
   * @param {string} dateString
   * @returns {string}
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Truncate text and add ellipsis if it exceeds a given length.
   * @param {string} text
   * @param {number} length - Maximum length (default: 50).
   * @returns {string}
   */
  truncate(text, length = 50) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  },

  /**
   * Convert bytes into a human-readable format.
   * @param {number} bytes
   * @param {number} decimals - Decimal places (default: 2).
   * @returns {string}
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  /**
   * Validate email format.
   * @param {string} email
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Sanitize text by removing special characters (except Arabic letters).
   * @param {string} text
   * @returns {string}
   */
  sanitizeText(text) {
    return text.replace(/[^\w\s\u0600-\u06FF]/gi, '').trim();
  },

  /**
   * Convert an object into a query string.
   * @param {object} obj
   * @returns {string}
   */
  toQueryString(obj) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(obj)) {
      if (this.isDefined(value)) {
        params.append(key, value.toString());
      }
    }
    return params.toString();
  }
};

// Additional helper utilities related to certificates/blockchain
import { oqsCrypto } from './crypto-oqs.js';

/**
 * Normalize student object for including in a blockchain transaction.
 * Returns only the fields we want to expose on-chain.
 */
export function normalizeStudentForBlock(student) {
  if (!student) return { studentId: null, studentName: null };
  return {
    studentId: student.studentId || null,
    studentName: student.studentName || null
  };
}

/**
 * Canonicalize signatures into the reduced shape used for hashing.
 */
export function canonicalizeSignatures(signatures = []) {
  return (signatures || []).map(sig => ({
    role: sig.role,
    signerId: sig.signerId || null,
    keyId: sig.keyId || null,
    timestamp: sig.timestamp || null,
    algorithm: sig.algorithm || null,
    signature: sig.signature ? sig.signature : null
  }));
}

/**
 * Compute signaturesHash using `oqsCrypto.hashData` over the canonicalized signatures.
 */
export function computeSignaturesHash(signatures = []) {
  const canonical = canonicalizeSignatures(signatures);
  return oqsCrypto.hashData(canonical);
}

// attach to helpers object for convenience/backwards compatibility
helpers.normalizeStudentForBlock = normalizeStudentForBlock;
helpers.canonicalizeSignatures = canonicalizeSignatures;
helpers.computeSignaturesHash = computeSignaturesHash;
