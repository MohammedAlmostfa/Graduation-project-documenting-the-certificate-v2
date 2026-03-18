// Additional helper utilities related to certificates/blockchain

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

