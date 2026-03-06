// Cryptographic and authentication configuration

export const securityConfig = {
  signatureAlgorithm: 'ML-DSA-65',
  hashAlgorithm: 'SHA3-512',
  keySize: 256,
  oqs: {
    algorithm: 'ML-DSA-65',
    enableKEM: false,
    enableSIG: true
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'university-certificate-system-secret-2024',
    expiresIn: '24h'
  },
  password: {
    minLength: 8,
    saltRounds: 12
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
};

// Role definitions (hierarchical)
export const roles = {
  OFFICER: 'officer',
  DEAN: 'dean',
  PRESIDENT: 'president',
  ADMIN: 'admin'
};

export const roleHierarchy = {
  officer: 1,
  dean: 2,
  president: 3,
  admin: 4
};

// Certificate lifecycle statuses
export const certificateStatus = {
  PENDING: 'pending',
  DEAN_SIGNED: 'dean_signed',
  BLOCKCHAIN_ADDED: 'blockchain_added',
  COMPLETED: 'completed',
  REJECTED: 'rejected'
};

// User-facing labels (Arabic)
export const certificateStatusLabels = {
  [certificateStatus.PENDING]: 'قيد المراجعة',
  [certificateStatus.DEAN_SIGNED]: 'موقعة من العميد',
  [certificateStatus.BLOCKCHAIN_ADDED]: 'مضافة إلى البلوك تشين',
  [certificateStatus.COMPLETED]: 'مكتملة',
  [certificateStatus.REJECTED]: 'مرفوضة'
};

