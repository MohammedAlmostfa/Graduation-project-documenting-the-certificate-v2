// Additional helper utilities related to certificates/blockchain

import { certificateStatusLabels } from '../config/security.js';

/**
 * Add human-readable status label to certificate objects.
 * @param {Object|Array} certificates - Single certificate or array of certificates
 * @returns {Object|Array} Certificates with statusLabel added
 */
export function addStatusLabels(certificates) {
    const addLabel = (cert) => {
        if (certificateStatusLabels && cert.status) {
            cert.statusLabel = certificateStatusLabels[cert.status] || cert.status;
        }
        return cert;
    };

    if (Array.isArray(certificates)) {
        return certificates.map(addLabel);
    }
    return addLabel(certificates);
}

/**
 * Normalize student object for including in a blockchain transaction.
 * Returns only the fields we want to expose on-chain.
 *
 * Used in: BlockchainService.minePendingCertificates()
 */
export function normalizeStudentForBlock(student) {
  if (!student) return { studentId: null, studentName: null };
  return {
    studentId: student.studentId || null,
    studentName: student.studentName || null
  };
}


