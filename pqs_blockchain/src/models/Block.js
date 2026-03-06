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
  constructor(index, timestamp, certificateIds = [], certificatesHash = '', previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    // store only list of certificate ids; kept minimal for hashing simplicity
    this.certificateIds = certificateIds;
    // a combined hash of the certificates referenced by `certificateIds`
    // (computed by the caller, e.g. Blockchain.minePendingCertificates)
    this.certificatesHash = certificatesHash;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.difficulty = 4;
    this.hash = this.calculateHash();
  }

  /**
   * Calculate the hash of the block based on its properties.
   * @returns {string} SHA3-512 hash string.
   */
  calculateHash() {
    // include combined certificates hash so any modification of certificate
    // contents (or of the id list) changes the block hash
    return oqsCrypto.hashData(
      this.index +
      this.timestamp +
      (this.certificatesHash || JSON.stringify(this.certificateIds)) +
      this.previousHash +
      this.nonce
    );
  }

  /**
   * Mine the block by finding a hash that meets the difficulty target.
   * @param {number} difficulty - Number of leading zeros required.
   * @returns {string} The mined hash.
   */
  mineBlock(difficulty) {
    this.difficulty = difficulty;
    const target = '0'.repeat(difficulty);

    logger.info(`⛏️  Mining block ${this.index}...`);

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }

    logger.info(`✅ Block mined: ${this.hash}`);
    return this.hash;
  }

  /**
   * Validate the block integrity.
   * @returns {boolean} True if block is valid, false otherwise.
   */
  validate() {
    // Check hash consistency
    if (this.hash !== this.calculateHash()) return false;

    // Check mining difficulty
    const target = '0'.repeat(this.difficulty);
    if (this.hash.substring(0, this.difficulty) !== target) return false;

    // Check certificateIds format
    if (!Array.isArray(this.certificateIds)) return false;

    return true;
  }

  /**
   * Convert block to JSON representation.
   * @returns {object} Block data in JSON format.
   */
  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      certificateIds: this.certificateIds,
      // include full transaction data for in-memory/API responses if present
      data: this.transactions || [],
      certificatesHash: this.certificatesHash,
      previousHash: this.previousHash,
      hash: this.hash,
      nonce: this.nonce,
      difficulty: this.difficulty
    };
  }
}
