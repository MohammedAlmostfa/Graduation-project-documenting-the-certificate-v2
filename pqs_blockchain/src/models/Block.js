import { oqsCrypto } from '../utils/crypto-oqs.js';
import { logger } from '../utils/logger.js';

/**
 * Block
 * -----
 * Represents a single block in the blockchain.
 * Each block contains an index, timestamp, data, previous hash,
 * nonce, difficulty, and its own hash.
 */
export class Block {
  constructor(id, timestamp, certificateIds = [], merkleRoot = '', previousHash = '') {
    this.id = id;  // Block ID is the block index in the chain
    this.timestamp = timestamp;
    // store only list of certificate ids; kept minimal for hashing simplicity
    this.certificateIds = certificateIds;
    // merkle root of all certificates (computed from Merkle Tree)
    this.merkleRoot = merkleRoot;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.difficulty = 4;
    this.hash = this.calculateHash();

    // Validate hash format after construction
    this._validateHashIntegrity();
  }

  /**
   * UNIFIED: Static method to compute block hash deterministically
   * Used by both Mining (Block.calculateHash) and Validation (service layer)
   * CRITICAL: Must be identical every time for same inputs
   * @param {object} blockData - { id, nonce, difficulty, merkleRoot, previousHash }
   * @returns {string} SHA3-512 hash
   */
  static computeBlockHash(blockData) {
    // CRITICAL: Canonical format with sorted keys and consistent types
    const canonicalData = {
      difficulty: Number(blockData.difficulty),    // Number
      id: Number(blockData.id),                    // Number (NOT "index"!)
      merkleRoot: String(blockData.merkleRoot),    // String
      nonce: Number(blockData.nonce),              // Number
      previousHash: String(blockData.previousHash) // String
      // timestamp deliberately excluded - metadata only
    };

    logger.debug(`🔐 [UNIFIED_HASH] Computing block hash`);
    logger.debug(`   Input types: id=${typeof blockData.id}, nonce=${typeof blockData.nonce}, difficulty=${typeof blockData.difficulty}`);
    logger.debug(`   Canonical data: ${JSON.stringify(canonicalData)}`);

    const hash = oqsCrypto.hashData(canonicalData);
    logger.debug(`   Result hash: ${hash.substring(0, 16)}...`);
    return hash;
  }

  /**
   * Validate hash field integrity to detect corruption
   * Warns if hash fields contain invalid data
   * @private
   */
  _validateHashIntegrity() {
    const validation = oqsCrypto.validateBlockHashes(this);
    if (!validation.valid) {
      logger.warn(`⚠️  Block ${this.id} has corrupted hash fields:`);
      validation.errors.forEach(err => logger.warn(`   - ${err}`));
    }
  }

  /**
   * Calculate the hash of the block based on its properties.
   * Uses the UNIFIED Block.computeBlockHash() static method
   * DETERMINISTIC: timestamp is NOT included - same data always produces same hash
   * @returns {string} SHA3-512 hash string.
   */
  calculateHash() {
    return Block.computeBlockHash({
      id: this.id,
      nonce: this.nonce,
      difficulty: this.difficulty,
      merkleRoot: this.merkleRoot,
      previousHash: this.previousHash
    });
  }

  /**
   * Mine the block by finding a hash that meets the difficulty target.
   * @param {number} difficulty - Number of leading zeros required.
   * @returns {string} The mined hash.
   */
  mineBlock(difficulty) {
    this.difficulty = difficulty;
    const target = '0'.repeat(difficulty);

    logger.info(`⛏️  Mining block ${this.id}...`);

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    logger.info(`✅ Block mined: ${this.hash}`);
    return this.hash;
  }

  /**
   * Validate the block integrity.
   * Genesis block (index 0) is exempt from strict PoW validation
   * since it's predefined and doesn't need to be mined.
   * @returns {boolean} True if block is valid, false otherwise.
   */
  validate() {
    // Genesis block is special: it's predefined and may have empty merkleRoot
    // Skip strict validation for genesis, only check basic structure
    if (this.id === 0) {
      if (!Array.isArray(this.certificateIds)) return false;
      if (!this.hash || typeof this.hash !== 'string') return false;
      return true;
    }

    // For non-genesis blocks: strict validation
    if (!this.merkleRoot || this.merkleRoot === '') return false;

    if (this.hash !== this.calculateHash()) return false;

    const target = '0'.repeat(this.difficulty);
    if (this.hash.substring(0, this.difficulty) !== target) return false;

    if (!Array.isArray(this.certificateIds)) return false;

    return true;
  }

  /**
   * Convert block to JSON representation.
   * @returns {object} Block data in JSON format.
   */
  toJSON() {
    return {
      id: this.id,  // Use id instead of index
      timestamp: this.timestamp,
      certificateIds: this.certificateIds,
      // include full transaction data for in-memory/API responses if present
      data: this.transactions || [],
      merkleRoot: this.merkleRoot,
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty
    };
  }
}

