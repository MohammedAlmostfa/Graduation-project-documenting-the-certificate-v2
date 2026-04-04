import { oqsCrypto } from './crypto-oqs.js';

/**
 * Merkle Tree Implementation
 * Constructs a Merkle Tree from certificate hashes
 * and computes the root hash for blockchain validation
 */
export class MerkleTree {
  /**
   * Create a merkle tree from leaf hashes
   * @param {string[]} leaves - Array of certificate hashes
   */
  constructor(leaves = []) {
    this.leaves = leaves;
    this.tree = [];
    this.root = this.computeRoot();
  }

  /**
   * Compute the merkle root from leaves
   * Uses binary tree structure with hash pairs
   * @returns {string} The merkle root hash
   */
  computeRoot() {
    if (!this.leaves || this.leaves.length === 0) {
      return oqsCrypto.hashData('');
    }

    let currentLevel = [...this.leaves];

    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parentHash = oqsCrypto.hashData(left + right);
        nextLevel.push(parentHash);
      }

      currentLevel = nextLevel;
    }

    this.root = currentLevel.length === 1 ? currentLevel[0] : oqsCrypto.hashData('');
    return this.root;
  }

  /**
   * Get the merkle root
   * @returns {string} The merkle root hash
   */
  getRoot() {
    return this.root;
  }
}
