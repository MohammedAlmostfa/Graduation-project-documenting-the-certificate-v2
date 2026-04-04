// Centralized bootstrap for app-level singletons and initialization.
// -------------------------------------------------------
// This module instantiates services and then initializes them in a
// controlled startup sequence to avoid side effects during import.

import { CertificateService } from './services/certificateService.js';
import { KeyService } from './services/keyService.js';
import { KeyManagementService } from './services/keyManagementService.js';
import { BlockchainService } from './services/blockchainService.js';
import { CertificateValidationService } from './services/certificateValidationService.js';
import { validationService } from './services/validationService.js';

import { certificateRepository } from './repositories/certificateRepository.js';
import { userRepository } from './repositories/userRepository.js';
import { keyRepository } from './repositories/keyRepository.js';
import { blockchainRepository } from './repositories/blockchainRepository.js';
import { logger } from './utils/logger.js';

// -------------------------------------------------------
// Instantiate shared singletons
// -------------------------------------------------------
const keyManagementService = new KeyManagementService({ repo: keyRepository });
const keyService = new KeyService({ repo: userRepository, keyManagementService });
const certificateService = new CertificateService({
  repo: certificateRepository,
  keyService,
  keyManagementService
});
const blockchainService = new BlockchainService({ repo: blockchainRepository });
const certificateValidationService = new CertificateValidationService({
  blockchainService,
  certificateRepo: certificateRepository,
  keyManagementService
});

// -------------------------------------------------------
// Wire cross dependencies.
// -------------------------------------------------------
blockchainService.certificateService = certificateService;
certificateService.blockchainService = blockchainService;
certificateService.certificateValidationService = certificateValidationService;

export const initServices = async () => {
  try {
    await keyService.initDefaultUsers();
    await blockchainService.initialize();
    logger.info('✅ Application services initialized successfully');
  } catch (error) {
    logger.error(`❌ Service initialization failed: ${error.message}`, error);
    throw error;
  }
};

export const services = {
  certificateService,
  keyService,
  keyManagementService,
  blockchainService,
  certificateValidationService,
  validationService
};

export {
  certificateService,
  keyService,
  keyManagementService,
  blockchainService,
  certificateValidationService,
  validationService
};
