// Centralized bootstrap for app-level singletons / wiring
// -------------------------------------------------------
// This module instantiates and wires together repositories and services.
// Controllers and routes can import from here to access shared singletons.
// This keeps wiring centralized and makes it easier to replace with a true
// dependency injection (DI) container later.

import { CertificateService } from './services/certificateService.js';
import { KeyService } from './services/keyService.js';
import { KeyManagementService } from './services/keyManagementService.js';
import { BlockchainService } from './services/blockchainService.js';
import { validationService } from './services/validationService.js';

import { certificateRepository } from './repositories/certificateRepository.js';
import { userRepository } from './repositories/userRepository.js';
import { keyRepository } from './repositories/keyRepository.js';
import { blockchainRepository } from './repositories/blockchainRepository.js';

// -------------------------------------------------------
// Instantiate lower-level services first
// -------------------------------------------------------

// KeyManagementService handles cryptographic key operations
const keyManagementService = new KeyManagementService({ repo: keyRepository });

// KeyService depends on userRepository and keyManagementService
const keyService = new KeyService({ repo: userRepository, keyManagementService });

// CertificateService depends on certificateRepository, keyService, and keyManagementService
const certificateService = new CertificateService({
  repo: certificateRepository,
  keyService,
  keyManagementService
});

// BlockchainService depends on blockchainRepository
// (no circular dependency at construction time)
const blockchainService = new BlockchainService({ repo: blockchainRepository });

// -------------------------------------------------------
// Wire cross-references (avoid constructor-time circular imports)
// -------------------------------------------------------
blockchainService.certificateService = certificateService;
certificateService.blockchainService = blockchainService;

// WHY: initialize() يضمن ترتيباً متسلسلاً صارماً
//      لا يمكن تشغيل syncPendingFromDB قبل اكتمال loadBlockchain
(async () => {
  try {
    await blockchainService.initialize();
    if (typeof logger !== 'undefined') {
      logger.info('✅ BlockchainService initialized successfully');
    }
  } catch (err) {
    if (typeof logger !== 'undefined') {
      logger.error(`❌ BlockchainService initialization failed: ${err.message}`);
    }
    // WHY: نُسجّل الخطأ لكن لا نوقف التطبيق
    //      البلوك تشين يمكن إعادة تهيئته لاحقاً
  }
})();

// -------------------------------------------------------
// Export singletons for use across the app
// -------------------------------------------------------
export {
  certificateService,
  keyService,
  keyManagementService,
  blockchainService,
  validationService
};
