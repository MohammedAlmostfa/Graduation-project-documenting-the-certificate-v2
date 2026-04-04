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
  constructor(index, timestamp, certificateIds = [], merkleRoot = '', previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    // store only list of certificate ids; kept minimal for hashing simplicity
    this.certificateIds = certificateIds;
    // merkle root of all certificates (computed from Merkle Tree)
    this.merkleRoot = merkleRoot;
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
    // include merkle root so any modification of certificate contents changes the block hash
    return oqsCrypto.hashData(
      this.index +
      this.timestamp +
      this.merkleRoot +
      this.previousHash +
      this.nonce +
      this.difficulty
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
      index: this.index,
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
