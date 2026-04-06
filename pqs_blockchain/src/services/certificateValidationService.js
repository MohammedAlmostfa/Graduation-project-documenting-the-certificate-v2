import { Certificate } from '../models/Certificate.js';
import { Block } from '../models/Block.js';
import { MerkleTree } from '../utils/merkleTree.js';
import { logger } from '../utils/logger.js';
import { oqsCrypto } from '../utils/crypto-oqs.js';

export class CertificateValidationService {
  constructor({ blockchainService, certificateRepo, keyManagementService } = {}) {
    this.blockchainService = blockchainService;
    this.certificateRepo = certificateRepo;
    this.keyManagementService = keyManagementService;
    logger.info('🔧 CertificateValidationService initialized');
  }

  async validateCertificateIntegrity(certificateId) {
    logger.info(`📋 START: Validating certificate integrity for ID: ${certificateId}`);

    try {
      logger.debug(`📥 Fetching certificate data from repository...`);
      const certificateData = await this.certificateRepo.getCertificate(certificateId);

      if (!certificateData) {
        logger.error(`❌ [INTEGRITY_FAIL] Certificate not found in repository: ${certificateId}`);
        return { valid: false, reason: 'CERTIFICATE_NOT_FOUND' };
      }

      logger.debug(`✅ Certificate data retrieved successfully`);
      logger.debug(`📦 Certificate data keys: ${Object.keys(certificateData).join(', ')}`);

      logger.debug(`🔨 Creating Certificate object from data...`);
      const certificate = new Certificate(certificateData);

      logger.debug(`🔑 Retrieving stored hash from certificate...`);
      const storedHash = certificate.certificateHash;
      logger.debug(`💾 Stored hash: ${storedHash}`);

      logger.debug(`🔢 Calculating hash from certificate data...`);
      const recalculatedHash = certificate.calculateHash();
      logger.debug(`📊 Recalculated hash: ${recalculatedHash}`);

      if (storedHash !== recalculatedHash) {
        logger.error(`❌ [INTEGRITY_FAIL] Hash mismatch detected for certificate ${certificateId}`);
        logger.error(`   Expected: ${storedHash}`);
        logger.error(`   Got:      ${recalculatedHash}`);
        return {
          valid: false,
          reason: 'HASH_MISMATCH',
          detail: 'Certificate data has been tampered with',
          storedHash,
          recalculatedHash
        };
      }

      logger.info(`✅ [INTEGRITY_PASS] Certificate integrity validated successfully for ${certificateId}`);
      return { valid: true };

    } catch (error) {
      logger.error(`❌ [INTEGRITY_ERROR] Exception during integrity validation: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return { valid: false, reason: 'VALIDATION_ERROR', detail: error.message };
    }
  }

  async validateCertificateBlockchain(certificateId) {
    logger.info(`🔗 START: Validating certificate blockchain for ID: ${certificateId}`);
    logger.info(`   NOTE: ALL data is read DIRECTLY from DATABASE (100% DB-driven validation)`);

    try {
      // ============================================================================
      // LAYER 1: CERTIFICATE INTEGRITY (independent of blockchain)
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`📋 LAYER 1: Certificate Integrity Check (standalone)`);
      logger.info(`${'='.repeat(80)}`);

      const integrityResult = await this.validateCertificateIntegrity(certificateId);
      logger.info(`Result: ${integrityResult.valid ? '✅ PASS' : '❌ FAIL'}`);
      // NOTE: Do NOT early return - continue with blockchain checks even if integrity fails

      // ============================================================================
      // LAYER 2: BLOCKCHAIN EXISTENCE & LINKAGE
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🔗 LAYER 2: Blockchain Linkage (read from DB - NO CACHE)`);
      logger.info(`${'='.repeat(80)}`);

      // Step 1: Get certificate from DB (fresh read)
      logger.debug(`📥 [DB_READ] Fetching certificate from repository...`);
      const certificateData = await this.certificateRepo.getCertificate(certificateId);
      if (!certificateData) {
        logger.error(`❌ Certificate ${certificateId} not found in DB`);
        return { valid: false, reason: 'CERTIFICATE_NOT_FOUND' };
      }

      // Step 2: Get blockId from DB
      const blockId = certificateData.blockId;
      logger.debug(`📥 [DB_READ] Certificate found with blockId: ${blockId}`);

      if (!blockId && blockId !== 0) {
        logger.error(`❌ Certificate has no blockId - not mined into blockchain`);
        return {
          valid: false,
          reason: 'CERTIFICATE_NOT_IN_BLOCKCHAIN',
          detail: 'Certificate has not been mined into a block'
        };
      }

      // Step 3: Read BLOCK from DB directly (FRESH READ - NOT FROM CACHE!)
      logger.debug(`📥 [DB_READ] Fetching block #${blockId} directly from database...`);
      if (!this.blockchainService || !this.blockchainService.repo) {
        logger.error(`❌ Blockchain repository not available`);
        return { valid: false, reason: 'BLOCKCHAIN_REPO_UNAVAILABLE' };
      }

      const dbBlock = await this.blockchainService.repo.getBlockByIndex(blockId);
      if (!dbBlock) {
        logger.error(`❌ Block #${blockId} not found in database`);
        return { valid: false, reason: 'BLOCK_NOT_IN_DB' };
      }

      logger.debug(`📥 [DB_READ] Block #${blockId} loaded from DB:`);
      logger.debug(`   index:         ${dbBlock.id}`);
      logger.debug(`   hash:          ${dbBlock.hash.substring(0, 16)}...`);
      logger.debug(`   previousHash:  ${dbBlock.previousHash.substring(0, 16)}...`);
      logger.debug(`   merkleRoot:    ${dbBlock.merkleRoot.substring(0, 16)}...`);
      logger.debug(`   nonce:         ${dbBlock.nonce}`);
      logger.debug(`   difficulty:    ${dbBlock.difficulty}`);

      // ============================================================================
      // LAYER 3: MERKLE ROOT VERIFICATION (recalculate from DB data)
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🌳 LAYER 3: Merkle Root Verification (from DB, recalculated)`);
      logger.info(`${'='.repeat(80)}`);

      let merkleRootValid = false;

      if (dbBlock.id === 0 && (!dbBlock.certificateIds || dbBlock.certificateIds.length === 0)) {
        logger.debug(`ℹ️  Genesis block - merkle root check not applicable`);
        merkleRootValid = true;
      } else {
        // Get certificate IDs from DB block
        const certificateIds = dbBlock.certificateIds || [];
        logger.debug(`📥 [DB_READ] Block contains ${certificateIds.length} certificates`);

        if (certificateIds.length === 0) {
          logger.error(`❌ Block has no certificates but non-empty merkleRoot`);
          merkleRootValid = false;
        } else {
          // Fetch ALL certificates from DB (fresh reads)
          logger.debug(`📥 [DB_READ] Fetching all ${certificateIds.length} certificates from DB...`);
          const allCertificates = [];

          for (const certId of certificateIds) {
            try {
              const cert = await this.certificateRepo.getCertificate(certId);
              if (cert && cert.certificateHash) {
                allCertificates.push({
                  id: certId,
                  hash: cert.certificateHash
                });
              } else {
                logger.warn(`⚠️  Certificate ${certId} has no hash in DB`);
              }
            } catch (err) {
              logger.warn(`⚠️  Could not fetch certificate ${certId} from DB: ${err.message}`);
            }
          }

          logger.debug(`📥 [DB_READ] Retrieved ${allCertificates.length}/${certificateIds.length} certificates from DB`);

          if (allCertificates.length === 0) {
            logger.error(`❌ Could not fetch any certificates from DB`);
            merkleRootValid = false;
          } else {
            // Recalculate merkle root from DB data
            logger.debug(`🔢 Recalculating merkle root from certificates...`);
            const certHashes = allCertificates.map(c => c.hash);
            const merkleTree = new MerkleTree(certHashes, true);  // sort = true
            const computedMerkleRoot = merkleTree.getRoot();

            logger.debug(`📊 Merkle Root Comparison:`);
            logger.debug(`   DB stored:     ${dbBlock.merkleRoot}`);
            logger.debug(`   Recalculated:  ${computedMerkleRoot}`);

            if (dbBlock.merkleRoot === computedMerkleRoot) {
              logger.info(`✅ Merkle root VERIFIED`);
              merkleRootValid = true;
            } else {
              logger.error(`❌ Merkle root MISMATCH`);
              logger.error(`   Block says: ${dbBlock.merkleRoot}`);
              logger.error(`   Should be:  ${computedMerkleRoot}`);
              merkleRootValid = false;
            }
          }
        }
      }

      // ============================================================================
      // LAYER 4: BLOCK HASH VERIFICATION (recalculate from DB values)
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`🔐 LAYER 4: Block Hash Verification (from DB, recalculated)`);
      logger.info(`${'='.repeat(80)}`);

      logger.debug(`🔢 Recalculating block hash from DB values...`);
      const recalculatedHash = this._recalculateBlockHashFromDB(dbBlock);

      logger.debug(`📊 Block Hash Comparison:`);
      logger.debug(`   DB stored:     ${dbBlock.hash}`);
      logger.debug(`   Recalculated:  ${recalculatedHash}`);

      const blockHashValid = dbBlock.hash === recalculatedHash;
      if (blockHashValid) {
        logger.info(`✅ Block hash VERIFIED`);
      } else {
        logger.error(`❌ Block hash MISMATCH`);
        logger.error(`   Block says: ${dbBlock.hash}`);
        logger.error(`   Should be:  ${recalculatedHash}`);
      }

      // ============================================================================
      // LAYER 5: CHAIN LINKAGE VERIFICATION (read previous block from DB)
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`⛓️  LAYER 5: Chain Linkage Verification (from DB)`);
      logger.info(`${'='.repeat(80)}`);

      let chainLinkageValid = false;

      if (dbBlock.id === 0) {
        logger.debug(`ℹ️  Genesis block - chain linkage check not applicable`);
        chainLinkageValid = true;
      } else {
        // Get previous block from DB (fresh read)
        logger.debug(`📥 [DB_READ] Fetching previous block #${dbBlock.id - 1} from DB...`);
        const previousBlock = await this.blockchainService.repo.getBlockByIndex(dbBlock.id - 1);

        if (!previousBlock) {
          logger.error(`❌ Previous block #${dbBlock.id - 1} not found in DB`);
          chainLinkageValid = false;
        } else {
          logger.debug(`📥 [DB_READ] Previous block loaded from DB`);
          logger.debug(`   Previous block hash: ${previousBlock.hash.substring(0, 16)}...`);
          logger.debug(`   Current block previousHash: ${dbBlock.previousHash.substring(0, 16)}...`);

          if (dbBlock.previousHash === previousBlock.hash) {
            logger.info(`✅ Chain linkage VERIFIED`);
            chainLinkageValid = true;
          } else {
            logger.error(`❌ Chain linkage BROKEN`);
            logger.error(`   Current block previousHash: ${dbBlock.previousHash}`);
            logger.error(`   Previous block hash:        ${previousBlock.hash}`);
            chainLinkageValid = false;
          }
        }
      }

      // ============================================================================
      // LAYER 6: PROOF-OF-WORK VERIFICATION
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`⛏️  LAYER 6: Proof-of-Work Verification`);
      logger.info(`${'='.repeat(80)}`);

      let powValid = false;

      if (dbBlock.id === 0) {
        logger.debug(`ℹ️  Genesis block - PoW exemption`);
        powValid = true;
      } else {
        const target = '0'.repeat(dbBlock.difficulty);
        const leadingZeros = dbBlock.hash.substring(0, dbBlock.difficulty);

        logger.debug(`📊 Proof-of-Work Check:`);
        logger.debug(`   Required difficulty: ${dbBlock.difficulty}`);
        logger.debug(`   Required target: '${target}'`);
        logger.debug(`   Actual leading zeros: '${leadingZeros}'`);

        if (leadingZeros === target) {
          logger.info(`✅ Proof-of-Work VERIFIED`);
          powValid = true;
        } else {
          logger.error(`❌ Proof-of-Work FAILED`);
          logger.error(`   Required: '${target}'`);
          logger.error(`   Got:      '${leadingZeros}'`);
          powValid = false;
        }
      }

      // ============================================================================
      // FINAL SUMMARY
      // ============================================================================
      logger.info(`\n${'='.repeat(80)}`);
      logger.info(`📊 BLOCKCHAIN VALIDATION SUMMARY`);
      logger.info(`${'='.repeat(80)}`);
      logger.info(`Integrity:     ${integrityResult.valid ? '✅ PASS' : '❌ FAIL'}`);
      logger.info(`Merkle Root:   ${merkleRootValid ? '✅ PASS' : '❌ FAIL'}`);
      logger.info(`Block Hash:    ${blockHashValid ? '✅ PASS' : '❌ FAIL'}`);
      logger.info(`Chain Linkage: ${chainLinkageValid ? '✅ PASS' : '❌ FAIL'}`);
      logger.info(`Proof-of-Work: ${powValid ? '✅ PASS' : '❌ FAIL'}`);
      logger.info(`${'─'.repeat(80)}`);

      const allLayersValid = integrityResult.valid && merkleRootValid && blockHashValid && chainLinkageValid && powValid;

      if (allLayersValid) {
        logger.info(`✅ BLOCKCHAIN VALIDATION PASSED - All 5 layers verified`);
        logger.info(`${'='.repeat(80)}\n`);
        return {
          valid: true,
          blockId: dbBlock.id,
          merkleRoot: dbBlock.merkleRoot,
          blockHash: dbBlock.hash
        };
      } else {
        logger.error(`❌ BLOCKCHAIN VALIDATION FAILED`);
        const failures = [];
        if (!integrityResult.valid) failures.push('Integrity');
        if (!merkleRootValid) failures.push('Merkle Root');
        if (!blockHashValid) failures.push('Block Hash');
        if (!chainLinkageValid) failures.push('Chain Linkage');
        if (!powValid) failures.push('Proof-of-Work');

        logger.error(`   Failed layers: ${failures.join(', ')}`);
        logger.info(`${'='.repeat(80)}\n`);

        return {
          valid: false,
          reason: 'BLOCKCHAIN_VALIDATION_FAILED',
          detail: `Failed layers: ${failures.join(', ')}`,
          layers: {
            integrity: integrityResult.valid,
            merkleRoot: merkleRootValid,
            blockHash: blockHashValid,
            chainLinkage: chainLinkageValid,
            proofOfWork: powValid
          }
        };
      }

    } catch (error) {
      logger.error(`❌ [BLOCKCHAIN_ERROR] Exception during blockchain validation: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return { valid: false, reason: 'VALIDATION_ERROR', detail: error.message };
    }
  }

  async validateCertificateSignatures(certificateId) {
    logger.info(`🔐 START: Validating certificate signatures for ID: ${certificateId}`);

    try {
      logger.debug(`📋 Step 1: Fetching certificate...`);
      const certificateData = await this.certificateRepo.getCertificate(certificateId);

      if (!certificateData) {
        logger.error(`❌ [SIGNATURE_FAIL] Certificate not found: ${certificateId}`);
        return { valid: false, reason: 'CERTIFICATE_NOT_FOUND' };
      }

      logger.debug(`✅ Certificate fetched successfully`);

      logger.debug(`🔨 Step 2: Creating Certificate object...`);
      const certificate = new Certificate(certificateData);

      logger.debug(`📋 Step 3: Retrieving signatures...`);
      const signatures = certificate.signatures || [];
      logger.debug(`📊 Signature count: ${signatures.length}`);

      if (signatures.length === 0) {
        logger.error(`❌ [SIGNATURE_FAIL] No signatures found on certificate`);
        return { valid: false, reason: 'NO_SIGNATURES', detail: 'Certificate has no signatures' };
      }

      logger.debug(`✅ Signatures retrieved: ${signatures.length} signature(s) found`);

      logger.debug(`🔑 Step 4: Getting data to verify (certificate hash)...`);
      const dataToVerify = certificate.certificateHash;
      logger.debug(`📊 Data to verify: ${dataToVerify}`);

      const signatureReports = [];
      let allValid = true;
      let validCount = 0;
      let failedCount = 0;

      logger.debug(`🔍 Step 5: Verifying each signature...`);

      for (let index = 0; index < signatures.length; index++) {
        const sig = signatures[index];
        logger.debug(`\n  [Signature ${index + 1}/${signatures.length}]`);

        const report = {
          signerId: sig.signerId || null,
          verified: false,
          reason: null
        };

        try {
          logger.debug(`    └─ Signer ID: ${sig.signerId || 'MISSING'}`);

          if (!sig.signerId) {
            logger.warn(`    ⚠️  Missing signer ID`);
            report.reason = 'MISSING_SIGNER_ID';
            failedCount++;
            allValid = false;
            signatureReports.push(report);
            continue;
          }

          if (!this.keyManagementService) {
            logger.warn(`    ⚠️  Key management service unavailable`);
            report.reason = 'KEY_MANAGEMENT_UNAVAILABLE';
            failedCount++;
            allValid = false;
            signatureReports.push(report);
            continue;
          }

          logger.debug(`    └─ Fetching public key for ${sig.signerId}...`);
          const publicKeyBuffer = await this.keyManagementService.getPublicKey(sig.signerId);

          if (!publicKeyBuffer) {
            logger.warn(`    ⚠️  Public key not found for signer: ${sig.signerId}`);
            report.reason = 'PUBLIC_KEY_NOT_FOUND';
            failedCount++;
            allValid = false;
            signatureReports.push(report);
            continue;
          }

          logger.debug(`    ✅ Public key retrieved`);

          logger.debug(`    └─ Verifying signature...`);
          logger.debug(`      Data: ${dataToVerify.substring(0, 32)}...`);
          logger.debug(`      Signature: ${sig.signature.substring(0, 32)}...`);

          const verifyResult = await oqsCrypto.verifySignature(dataToVerify, sig.signature, publicKeyBuffer);

          logger.debug(`    └─ Verification result:`, verifyResult);

          if (verifyResult && verifyResult.isValid) {
            logger.debug(`    ✅ Signature verified successfully for ${sig.signerId}`);
            report.verified = true;
            validCount++;
          } else {
            logger.warn(`    ❌ Signature verification failed for ${sig.signerId}`);
            report.verified = false;
            report.reason = verifyResult?.error || 'INVALID_SIGNATURE';
            failedCount++;
            allValid = false;
          }

        } catch (err) {
          logger.error(`    ❌ Exception verifying signature: ${err.message}`);
          logger.error(`       Stack: ${err.stack}`);
          report.verified = false;
          report.reason = err.message;
          failedCount++;
          allValid = false;
        }

        signatureReports.push(report);
      }

      logger.debug(`\n📊 Signature Summary:`);
      logger.debug(`   Total:   ${signatures.length}`);
      logger.debug(`   Valid:   ${validCount}`);
      logger.debug(`   Failed:  ${failedCount}`);

      if (allValid) {
        logger.info(`✅ [SIGNATURE_PASS] All signatures valid for ${certificateId}`);
      } else {
        logger.error(`❌ [SIGNATURE_FAIL] Some signatures invalid for ${certificateId}`);
      }

      return {
        valid: allValid,
        signatureCount: signatures.length,
        validCount,
        failedCount,
        signatures: signatureReports
      };

    } catch (error) {
      logger.error(`❌ [SIGNATURE_ERROR] Exception during signature validation: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      return { valid: false, reason: 'VALIDATION_ERROR', detail: error.message };
    }
  }



  async completeCertificateValidation(certificateId) {
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`🎯 START: COMPLETE CERTIFICATE VALIDATION for ID: ${certificateId}`);
    logger.info(`${'='.repeat(80)}\n`);

    try {
      logger.info(`📍 STEP 1/4: Integrity Validation`);
      logger.info(`${'─'.repeat(80)}`);
      const integrityResult = await this.validateCertificateIntegrity(certificateId);
      logger.info(`Result: ${integrityResult.valid ? '✅ PASS' : '❌ FAIL'} - ${integrityResult.reason}\n`);

      if (!integrityResult.valid) {
        logger.error(`\n❌ VALIDATION ABORTED: Integrity check failed`);
        return {
          status: 'INVALID',
          message: 'عذراً، الشهادة لم تجتز فحص الأصالة - قد تكون بيانات الشهادة قد تم تعديلها',
          details: { integrity: integrityResult }
        };
      }

      logger.info(`📍 STEP 2/4: Blockchain Validation`);
      logger.info(`${'─'.repeat(80)}`);
      const blockchainResult = await this.validateCertificateBlockchain(certificateId);
      logger.info(`Result: ${blockchainResult.valid ? '✅ PASS' : '❌ FAIL'} - ${blockchainResult.reason}\n`);

      logger.info(`📍 STEP 3/4: Signature Validation`);
      logger.info(`${'─'.repeat(80)}`);
      const signatureResult = await this.validateCertificateSignatures(certificateId);
      logger.info(`Result: ${signatureResult.valid ? '✅ PASS' : '❌ FAIL'} - Count: ${signatureResult.signatureCount}\n`);

      const allValid = integrityResult.valid && blockchainResult.valid && signatureResult.valid;

      logger.info(`${'='.repeat(80)}`);
      logger.info(`📊 FINAL VALIDATION SUMMARY (3-LAYER VERIFICATION)`);
      logger.info(`${'─'.repeat(80)}`);
      logger.info(`LAYER 1 - Integrity:          ${integrityResult.valid ? '✅ VALID' : '❌ INVALID'}`);
      logger.info(`LAYER 2 - Blockchain Linkage: ${blockchainResult.valid ? '✅ VALID' : '❌ INVALID'}`);
      logger.info(`LAYER 3 - Digital Signatures: ${signatureResult.valid ? '✅ VALID' : '❌ INVALID'}`);
      logger.info(`${'─'.repeat(80)}`);

      if (allValid) {
        logger.info(`🎉 FINAL RESULT: ✅ CERTIFICATE IS VALID AND TRUSTED`);
        logger.info(`   All 3 security layers verified successfully`);
        logger.info(`${'='.repeat(80)}\n`);

        return {
          status: 'VALID',
          message: '✅ الشهادة أصلية وموثوقة - تم التحقق من جميع طبقات الأمان بنجاح',
          layers: 3,
          details: {
            integrity: integrityResult,
            blockchain: blockchainResult,
            signatures: signatureResult
          }
        };
      } else {
        logger.error(`🎯 FINAL RESULT: ❌ CERTIFICATE IS INVALID`);
        logger.error(`   At least one security layer failed verification`);
        logger.info(`${'='.repeat(80)}\n`);

        // Build user-friendly message showing what failed
        const failedLayers = [];
        if (!integrityResult.valid) failedLayers.push('أصالة الشهادة');
        if (!blockchainResult.valid) failedLayers.push('توثيق الشهادة في السجل');
        if (!signatureResult.valid) failedLayers.push('التوقيعات الرسمية');
        const failureMessage = failedLayers.join(' و ');

        return {
          status: 'INVALID',
          message: `❌ الشهادة غير أصلية - فشل التحقق من: ${failureMessage}`,
          layers: 3,
          details: {
            integrity: integrityResult,
            blockchain: blockchainResult,
            signatures: signatureResult
          }
        };
      }

    } catch (error) {
      logger.error(`❌ CRITICAL ERROR in complete validation: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
      logger.info(`${'='.repeat(80)}\n`);

      return {
        status: 'ERROR',
        message: 'عذراً، حدث خطأ أثناء التحقق من الشهادة - يرجى المحاولة مجدداً',
        detail: error.message
      };
    }
  }

  _recalculateBlockHash(block) {
    logger.debug(`🔢 [RECALCULATE_HASH] Computing block hash using UNIFIED Block.computeBlockHash()`);
    logger.debug(`   Block ID: ${block.id} (${typeof block.id})`);
    logger.debug(`   Merkle Root: ${block.merkleRoot} (${typeof block.merkleRoot})`);
    logger.debug(`   Previous Hash: ${block.previousHash} (${typeof block.previousHash})`);
    logger.debug(`   Nonce: ${block.nonce} (${typeof block.nonce})`);
    logger.debug(`   Difficulty: ${block.difficulty} (${typeof block.difficulty})`);

    // Use the UNIFIED static method from Block class
    // This ensures Mining and Validation use the EXACT same calculation
    const hash = Block.computeBlockHash({
      id: block.id,
      nonce: block.nonce,
      difficulty: block.difficulty,
      merkleRoot: block.merkleRoot,
      previousHash: block.previousHash
    });

    logger.debug(`   Recalculated hash: ${hash.substring(0, 16)}...`);
    return hash;
  }

  /**
   * Recalculate block hash from DATABASE values (explicit DB derivation)
   * CRITICAL: This ensures we validate based on DB state, not memory
   * Uses the UNIFIED Block.computeBlockHash() static method
   * @param {object} dbBlock - Block object loaded directly from database
   * @returns {string} Recalculated hash
   */
  _recalculateBlockHashFromDB(dbBlock) {
    logger.debug(`🔢 [DB_HASH_CALC] Computing hash from DATABASE values using UNIFIED Block.computeBlockHash()`);
    logger.debug(`   Source: DATABASE (fresh read, NOT cache)`);
    logger.debug(`   Block ID: ${dbBlock.id}`);
    logger.debug(`   Merkle Root: ${dbBlock.merkleRoot.substring(0, 16)}...`);
    logger.debug(`   Previous Hash: ${dbBlock.previousHash.substring(0, 16)}...`);
    logger.debug(`   Nonce: ${dbBlock.nonce}`);
    logger.debug(`   Difficulty: ${dbBlock.difficulty}`);

    // Use the UNIFIED static method from Block class
    // This ensures Mining and Validation use the EXACT same calculation
    const calculatedHash = Block.computeBlockHash({
      id: dbBlock.id,
      nonce: dbBlock.nonce,
      difficulty: dbBlock.difficulty,
      merkleRoot: dbBlock.merkleRoot,
      previousHash: dbBlock.previousHash
    });

    logger.debug(`   Calculated hash: ${calculatedHash.substring(0, 16)}...`);
    logger.debug(`   Source confirmation: ALL values came from DATABASE`);
    return calculatedHash;
  }

  /**
   * ⛔ DEPRECATED: This method was used with in-memory cache
   * NOW: Use validateCertificateBlockchain() which is 100% DB-driven
   *
   * Unified validation: Check if block hash matches recalculation
   * @private
   * @returns {object} {valid, recalculated}
   */
  _validateBlockHashIntegrity(block) {
    logger.warn(`⚠️  _validateBlockHashIntegrity() called - this is a legacy method using cache`);
    logger.warn(`   Use validateCertificateBlockchain() instead (100% DB-driven)`);
    const recalculated = this._recalculateBlockHash(block);
    const valid = block.hash === recalculated;
    return { valid, recalculated };
  }

  /**
   * ⛔ DEPRECATED: This method was used with in-memory cache
   * NOW: Use validateCertificateBlockchain() which is 100% DB-driven
   *
   * Unified validation: Check Proof-of-Work
   * @private
   */
  _validateProofOfWork(block, blockId) {
    logger.warn(`⚠️  _validateProofOfWork() called - this is a legacy method using cache`);
    logger.warn(`   Use validateCertificateBlockchain() instead (100% DB-driven)`);
    // Genesis block (index 0) is exempt
    if (blockId === 0) {
      return { valid: true, isGenesis: true };
    }

    const target = '0'.repeat(block.difficulty);
    const leadingZeros = block.hash.substring(0, block.difficulty);
    const valid = leadingZeros === target;

    return { valid, difficulty: block.difficulty, target, actual: leadingZeros, isGenesis: false };
  }

  /**
   * ⛔ DEPRECATED: This method was used with in-memory cache
   * NOW: Use validateCertificateBlockchain() which is 100% DB-driven
   *
   * Unified validation: Check chain linkage to previous block
   * @private
   */
  _validateChainLinkage(currentBlock, previousBlock, blockId) {
    logger.warn(`⚠️  _validateChainLinkage() called - this is a legacy method using cache`);
    logger.warn(`   Use validateCertificateBlockchain() instead (100% DB-driven)`);
    // Genesis block (index 0) has no previous
    if (blockId === 0) {
      return { valid: true, isGenesis: true };
    }

    const currentPrevHash = currentBlock.previousHash;
    const previousHash = previousBlock.hash;
    const valid = currentPrevHash === previousHash;

    return { valid, currentPreviousHash: currentPrevHash, expectedPreviousHash: previousHash, isGenesis: false };
  }

  /**
   * ⛔ DEPRECATED: This method was used with in-memory cache
   * NOW: Use validateCertificateBlockchain() which is 100% DB-driven
   *
   * Unified validation: Complete block structure check
   * @private
   */
  _validateBlockStructure(block, blockId, previousBlock = null) {
    logger.warn(`⚠️  _validateBlockStructure() called - this is a legacy method using cache`);
    logger.warn(`   Use validateCertificateBlockchain() instead (100% DB-driven)`);
    const errors = {};

    // 1. Hash integrity
    const hashCheck = this._validateBlockHashIntegrity(block);
    if (!hashCheck.valid) {
      errors.hashIntegrity = {
        valid: false,
        reason: 'HASH_MISMATCH',
        stored: block.hash,
        recalculated: hashCheck.recalculated
      };
    }

    // 2. Proof-of-Work
    const powCheck = this._validateProofOfWork(block, blockId);
    if (!powCheck.valid) {
      errors.proofOfWork = {
        valid: false,
        reason: 'INVALID_PROOF_OF_WORK',
        ...powCheck
      };
    }

    // 3. Chain linkage (if not genesis)
    if (blockId > 0 && previousBlock) {
      const linkageCheck = this._validateChainLinkage(block, previousBlock, blockId);
      if (!linkageCheck.valid) {
        errors.chainLinkage = {
          valid: false,
          reason: 'CHAIN_LINKAGE_BROKEN',
          ...linkageCheck
        };
      }
    }

    const hasErrors = Object.keys(errors).length > 0;
    return {
      valid: !hasErrors,
      errors: hasErrors ? errors : null
    };
  }

  /**
   * ⛔ DEPRECATED: This method was used with in-memory cache
   * NOW: Use validateCertificateBlockchain() which is 100% DB-driven
   *
   * Validate the ENTIRE blockchain from genesis to end
   * @private
   */
  async _validateFullBlockchain() {
    logger.warn(`⚠️  _validateFullBlockchain() called - this is a legacy method using cache`);
    logger.warn(`   Use validateCertificateBlockchain() instead (100% DB-driven)`);
    return { valid: true, corruptBlocks: [] };
  }

  /**
   * ⛔ DEPRECATED: This method was used with in-memory cache
   * NOW: Use validateCertificateBlockchain() which is 100% DB-driven
   *
   * Validate blockchain consistency for block
   * @private
   */
  async _validateBlockchainConsistency(block) {
    logger.warn(`⚠️  _validateBlockchainConsistency() called - this is a legacy method using cache`);
    logger.warn(`   Use validateCertificateBlockchain() instead (100% DB-driven)`);
    return { valid: true };
  }
}

