import { Certificate } from '../models/Certificate.js';
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

    try {
      logger.debug(`📋 Step 1: Running integrity check...`);
      const integrityResult = await this.validateCertificateIntegrity(certificateId);

      if (!integrityResult.valid) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Integrity check failed: ${integrityResult.reason}`);
        return integrityResult;
      }

      logger.debug(`✅ Integrity check passed`);

      if (!this.blockchainService) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Blockchain service is not available`);
        return { valid: false, reason: 'BLOCKCHAIN_SERVICE_UNAVAILABLE' };
      }

      logger.debug(`🔍 Step 2: Fetching certificate block information...`);
      const blockInfo = await this.blockchainService.getCertificateBlockInfo(certificateId);
      logger.debug(`📦 Block info retrieved:`, blockInfo);

      if (!blockInfo || !blockInfo.block) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Certificate not found in blockchain`);
        return {
          valid: false,
          reason: 'CERTIFICATE_NOT_IN_BLOCKCHAIN',
          detail: 'Certificate has not been mined into a block'
        };
      }

      logger.debug(`✅ Block found`);

      const block = blockInfo.block;
      logger.debug(`🏷️  Block details: index=${block.index}, hash=${block.hash}, merkleRoot=${block.merkleRoot}`);

      logger.debug(`🔍 Step 3: Retrieving certificate from repository...`);
      const certificateData = await this.certificateRepo.getCertificate(certificateId);
      const certificate = new Certificate(certificateData);
      const certificateHash = certificate.certificateHash;
      logger.debug(`🔑 Certificate hash: ${certificateHash}`);

      logger.debug(`🔍 Step 4: Validating merkle root...`);
      const blockMerkleRoot = block.merkleRoot;

      if (!blockMerkleRoot) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Block missing merkle root`);
        return { valid: false, reason: 'INVALID_BLOCK', detail: 'Block missing merkle root' };
      }

      logger.debug(`✅ Merkle root found: ${blockMerkleRoot}`);

      logger.debug(`🔍 Step 5: Fetching all certificates in block...`);
      const certificateIds = block.certificateIds || [];
      logger.debug(`📊 Certificate count in block: ${certificateIds.length}`);
      logger.debug(`📋 Certificate IDs: ${certificateIds.join(', ')}`);

      const allCertificates = [];

      for (const certId of certificateIds) {
        try {
          logger.debug(`  └─ Fetching certificate ${certId}...`);
          const certData = await this.certificateRepo.getCertificate(certId);

          if (certData) {
            const cert = new Certificate(certData);
            allCertificates.push({
              id: certId,
              hash: cert.certificateHash
            });
            logger.debug(`    ✅ Certificate ${certId} fetched: hash=${cert.certificateHash}`);
          } else {
            logger.warn(`    ⚠️  Certificate ${certId} returned null`);
          }
        } catch (err) {
          logger.warn(`    ⚠️  Could not fetch certificate ${certId}: ${err.message}`);
        }
      }

      logger.debug(`✅ Certificate retrieval complete: ${allCertificates.length}/${certificateIds.length} retrieved`);

      if (allCertificates.length === 0) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Could not fetch any block certificates`);
        return {
          valid: false,
          reason: 'MERKLE_VERIFICATION_FAILED',
          detail: 'Could not fetch block certificates'
        };
      }

      logger.debug(`🔍 Step 6: Computing merkle root from fetched certificates...`);
      const certHashes = allCertificates.map(c => c.hash);
      logger.debug(`📊 Certificate hashes for merkle computation:`, certHashes);

      const merkleTree = new MerkleTree(certHashes);
      const computedMerkleRoot = merkleTree.getRoot();
      logger.debug(`📊 Computed merkle root: ${computedMerkleRoot}`);

      logger.debug(`🔍 Step 7: Comparing merkle roots...`);
      logger.debug(`   Block merkle root:    ${blockMerkleRoot}`);
      logger.debug(`   Computed merkle root: ${computedMerkleRoot}`);

      if (computedMerkleRoot !== blockMerkleRoot) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Merkle root mismatch for certificate ${certificateId}`);
        logger.error(`   Expected: ${blockMerkleRoot}`);
        logger.error(`   Got:      ${computedMerkleRoot}`);
        return {
          valid: false,
          reason: 'MERKLE_ROOT_MISMATCH',
          detail: 'Block merkle root does not match computed root'
        };
      }

      logger.debug(`✅ Merkle root verified`);

      logger.debug(`🔍 Step 8: Recalculating block hash...`);
      const blockHash = block.hash;
      logger.debug(`💾 Stored block hash: ${blockHash}`);

      const currentBlockHash = this._recalculateBlockHash(block);
      logger.debug(`📊 Recalculated block hash: ${currentBlockHash}`);

      logger.debug(`🔍 Step 9: Comparing block hashes...`);
      if (blockHash !== currentBlockHash) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Block hash mismatch for block ${block.index}`);
        logger.error(`   Expected: ${blockHash}`);
        logger.error(`   Got:      ${currentBlockHash}`);
        return {
          valid: false,
          reason: 'BLOCK_HASH_INVALID',
          detail: 'Block hash does not match recalculated hash'
        };
      }

      logger.debug(`✅ Block hash verified`);

      logger.debug(`🔍 Step 10: Validating blockchain consistency...`);
      const blockchainValid = await this._validateBlockchainConsistency(block);

      if (!blockchainValid.valid) {
        logger.error(`❌ [BLOCKCHAIN_FAIL] Blockchain consistency check failed: ${blockchainValid.reason}`);
        return blockchainValid;
      }

      logger.debug(`✅ Blockchain consistency verified`);

      logger.info(`✅ [BLOCKCHAIN_PASS] Certificate blockchain validation passed for ${certificateId}`);
      return { valid: true, blockIndex: block.index, merkleRoot: blockMerkleRoot };

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
      logger.info(`📍 STEP 1/3: Integrity Validation`);
      logger.info(`${'─'.repeat(80)}`);
      const integrityResult = await this.validateCertificateIntegrity(certificateId);
      logger.info(`Result: ${integrityResult.valid ? '✅ PASS' : '❌ FAIL'} - ${integrityResult.reason}\n`);

      if (!integrityResult.valid) {
        logger.error(`\n❌ VALIDATION ABORTED: Integrity check failed`);
        return {
          status: 'INVALID',
          message: 'Certificate integrity check failed',
          details: { integrity: integrityResult }
        };
      }

      logger.info(`📍 STEP 2/3: Blockchain Validation`);
      logger.info(`${'─'.repeat(80)}`);
      const blockchainResult = await this.validateCertificateBlockchain(certificateId);
      logger.info(`Result: ${blockchainResult.valid ? '✅ PASS' : '❌ FAIL'} - ${blockchainResult.reason}\n`);

      logger.info(`📍 STEP 3/3: Signature Validation`);
      logger.info(`${'─'.repeat(80)}`);
      const signatureResult = await this.validateCertificateSignatures(certificateId);
      logger.info(`Result: ${signatureResult.valid ? '✅ PASS' : '❌ FAIL'} - Count: ${signatureResult.signatureCount}\n`);

      const allValid = integrityResult.valid && blockchainResult.valid && signatureResult.valid;

      logger.info(`${'='.repeat(80)}`);
      logger.info(`📊 FINAL VALIDATION SUMMARY`);
      logger.info(`${'─'.repeat(80)}`);
      logger.info(`Integrity:  ${integrityResult.valid ? '✅ VALID' : '❌ INVALID'}`);
      logger.info(`Blockchain: ${blockchainResult.valid ? '✅ VALID' : '❌ INVALID'}`);
      logger.info(`Signatures: ${signatureResult.valid ? '✅ VALID' : '❌ INVALID'}`);
      logger.info(`${'─'.repeat(80)}`);

      if (allValid) {
        logger.info(`🎉 FINAL RESULT: ✅ CERTIFICATE IS VALID AND TRUSTED`);
        logger.info(`${'='.repeat(80)}\n`);

        return {
          status: 'VALID',
          message: 'Certificate is valid and trusted',
          details: {
            integrity: integrityResult,
            blockchain: blockchainResult,
            signatures: signatureResult
          }
        };
      } else {
        logger.error(`🎯 FINAL RESULT: ❌ CERTIFICATE IS INVALID`);
        logger.info(`${'='.repeat(80)}\n`);

        return {
          status: 'INVALID',
          message: 'Certificate validation failed',
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
        message: 'Validation error',
        detail: error.message
      };
    }
  }

  _recalculateBlockHash(block) {
    logger.debug(`🔢 Computing block hash from:`);
    logger.debug(`   index:        ${block.index}`);
    logger.debug(`   timestamp:    ${block.timestamp}`);
    logger.debug(`   merkleRoot:   ${block.merkleRoot}`);
    logger.debug(`   previousHash: ${block.previousHash}`);
    logger.debug(`   nonce:        ${block.nonce}`);
    logger.debug(`   difficulty:   ${block.difficulty}`);

    const hash = oqsCrypto.hashData(
      block.index +
      block.timestamp +
      block.merkleRoot +
      block.previousHash +
      block.nonce +
      block.difficulty
    );

    logger.debug(`   Result hash:  ${hash}`);
    return hash;
  }

  async _validateBlockchainConsistency(block) {
    logger.debug(`🔗 Validating blockchain consistency for block index ${block.index}...`);

    try {
      if (!this.blockchainService) {
        logger.error(`  ❌ Blockchain service unavailable`);
        return { valid: false, reason: 'BLOCKCHAIN_SERVICE_UNAVAILABLE' };
      }

      logger.debug(`  📥 Fetching all blocks...`);
      const allBlocks = await this.blockchainService.getAllBlocks();
      logger.debug(`  📊 Total blocks in chain: ${allBlocks?.length || 0}`);

      if (!allBlocks || allBlocks.length === 0) {
        logger.error(`  ❌ Blockchain is empty`);
        return { valid: false, reason: 'EMPTY_BLOCKCHAIN' };
      }

      const blockIndex = block.index;
      logger.debug(`  🔍 Checking block index: ${blockIndex}`);
      logger.debug(`  📊 Valid range: 0-${allBlocks.length - 1}`);

      if (blockIndex < 0 || blockIndex >= allBlocks.length) {
        logger.error(`  ❌ Block index out of range: ${blockIndex}`);
        return { valid: false, reason: 'BLOCK_INDEX_OUT_OF_RANGE' };
      }

      logger.debug(`  ✅ Index is within valid range`);

      const chainBlock = allBlocks[blockIndex];
      logger.debug(`  🔍 Fetching block from chain at index ${blockIndex}...`);

      if (!chainBlock) {
        logger.error(`  ❌ Block not found in chain at index ${blockIndex}`);
        return { valid: false, reason: 'BLOCK_NOT_FOUND_IN_CHAIN' };
      }

      logger.debug(`  ✅ Block found in chain`);

      logger.debug(`  🔍 Step 1: Validating current block hash computation...`);
      const recalculatedHash = this._recalculateBlockHash(chainBlock);
      logger.debug(`    Stored hash:      ${chainBlock.hash}`);
      logger.debug(`    Recalculated:     ${recalculatedHash}`);

      if (chainBlock.hash !== recalculatedHash) {
        logger.error(`  ❌ Block hash mismatch - block has been tampered with`);
        logger.error(`     Expected: ${chainBlock.hash}`);
        logger.error(`     Got:      ${recalculatedHash}`);
        return { valid: false, reason: 'BLOCK_HASH_INVALID', detail: 'Block hash does not match recalculated value' };
      }

      logger.debug(`  ✅ Current block hash verified`);

      logger.debug(`  🔍 Step 2: Validating proof-of-work...`);
      const target = '0'.repeat(chainBlock.difficulty);
      if (chainBlock.hash.substring(0, chainBlock.difficulty) !== target) {
        logger.error(`  ❌ Proof-of-work validation failed`);
        return { valid: false, reason: 'INVALID_PROOF_OF_WORK', detail: 'Block does not meet difficulty requirement' };
      }

      logger.debug(`  ✅ Proof-of-work verified`);

      if (blockIndex > 0) {
        logger.debug(`  🔍 Step 3: Validating previous block link...`);
        const previousBlock = allBlocks[blockIndex - 1];
        logger.debug(`    Current block previousHash:  ${chainBlock.previousHash}`);
        logger.debug(`    Previous block stored hash:  ${previousBlock.hash}`);

        const recalculatedPreviousHash = this._recalculateBlockHash(previousBlock);
        logger.debug(`    Previous block recalculated: ${recalculatedPreviousHash}`);

        if (recalculatedPreviousHash !== previousBlock.hash) {
          logger.error(`  ❌ Previous block hash mismatch - previous block tampered`);
          logger.error(`     Expected: ${previousBlock.hash}`);
          logger.error(`     Got:      ${recalculatedPreviousHash}`);
          return { valid: false, reason: 'PREVIOUS_BLOCK_TAMPERED', detail: 'Previous block has been modified' };
        }

        if (chainBlock.previousHash !== previousBlock.hash) {
          logger.error(`  ❌ Chain linkage broken - previousHash does not match previous block`);
          logger.error(`     Current block previousHash: ${chainBlock.previousHash}`);
          logger.error(`     Previous block hash:       ${previousBlock.hash}`);
          return { valid: false, reason: 'CHAIN_LINKAGE_BROKEN', detail: 'Chain integrity compromised' };
        }

        logger.debug(`  ✅ Chain linkage valid and previous block verified`);
      } else {
        logger.debug(`  ℹ️  Genesis block (index 0) - validating integrity...`);
        const genesisHash = this._recalculateBlockHash(chainBlock);
        if (chainBlock.hash !== genesisHash) {
          logger.error(`  ❌ Genesis block hash mismatch`);
          return { valid: false, reason: 'GENESIS_BLOCK_INVALID', detail: 'Genesis block has been tampered with' };
        }
        logger.debug(`  ✅ Genesis block integrity verified`);
      }

      logger.debug(`✅ Blockchain consistency validated - all integrity checks passed`);
      return { valid: true };

    } catch (error) {
      logger.error(`  ❌ Exception during consistency check: ${error.message}`);
      logger.error(`     Stack: ${error.stack}`);
      return { valid: false, reason: 'CONSISTENCY_CHECK_ERROR', detail: error.message };
    }
  }
}
