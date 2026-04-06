import { oqsCrypto } from './crypto-oqs.js';
import { logger } from './logger.js';

/**
 * Merkle Tree Implementation
 * Constructs a Merkle Tree from certificate hashes
 * and computes the root hash for blockchain validation
 *
 * IMPORTANT PROPERTIES:
 * - Deterministic: Same input always produces same root
 * - Sorted: Leaves are sorted before computation to ensure order independence
 * - Canonical: Uses structured serialization to prevent collisions
 */
export class MerkleTree {
  /**
   * Create a merkle tree from leaf hashes
   * Sorts leaves alphabetically to ensure deterministic ordering
   * @param {string[]} leaves - Array of certificate hashes to include in tree
   * @param {boolean} shouldSort - Whether to sort leaves (default: true)
   */
  constructor(leaves = [], shouldSort = true) {
    // Snapshot the input to prevent external mutations
    this.originalLeaves = [...leaves];

    // Sort leaves deterministically to ensure same root regardless of input order
    // This is critical to prevent merkle root mismatches when certificates
    // are fetched in different orders across different operations
    this.leaves = shouldSort ? this._sortLeaves([...leaves]) : [...leaves];

    if (shouldSort && this.originalLeaves.length > 1) {
      this._validateSorting();
    }

    this.tree = [];
    this.root = this.computeRoot();
  }

  /**
   * Sort certificate hashes alphabetically for deterministic tree construction
   * Ensures: hash(cert_a + cert_b) always produces same root as hash(cert_b + cert_a)
   * @private
   */
  _sortLeaves(leaves) {
    // Sort by hex value to ensure consistent ordering
    return leaves.sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
  }

  /**
   * Validate that sorting is stable and consistent
   * @private
   */
  _validateSorting() {
    const resorted = this._sortLeaves([...this.leaves]);
    const isSorted = this.leaves.every((hash, idx) => hash === resorted[idx]);

    if (!isSorted) {
      logger.warn(`⚠️  Merkle tree leaves not in sorted order after construction`);
    }
  }

  /**
   * Compute the merkle root from leaves
   * Uses binary tree structure with canonical hashing
   *
   * Handles odd-length arrays by padding with ZERO hash (not duplication)
   * This prevents single certificate from being hashed with itself
   * @returns {string} The merkle root hash
   */
  computeRoot() {
    if (!this.leaves || this.leaves.length === 0) {
      return oqsCrypto.hashData('');
    }

    // For single leaf, return it directly (no hashing needed)
    if (this.leaves.length === 1) {
      return this.leaves[0];
    }

    let currentLevel = [...this.leaves];
    let level = 0;

    while (currentLevel.length > 1) {
      const nextLevel = [];
      level++;

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];

        // For odd length: use ZERO_HASH instead of duplicating the last leaf
        // This prevents: [A, B, C] → [hash(A+B), hash(C+C)] (wrong)
        // Instead: [A, B, C] → [hash(A+B), hash(C+ZERO)] (correct)
        const ZERO_HASH = '0'.repeat(128); // 128 hex chars = 64 bytes (SHA3-512 length)
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : ZERO_HASH;

        // Use canonical JSON serialization to prevent hash collisions
        // Example: hash({left: "abc", right: "def"}) prevents ambiguity
        const parentHash = oqsCrypto.hashData({
          left: left,
          right: right,
          level: level
        });

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

  /**
   * Get the sorted leaves used in this tree
   * Useful for verification and debugging
   * @returns {string[]} Sorted certificate hashes
   */
  getLeaves() {
    return [...this.leaves];
  }

  /**
   * Get information about tree structure for validation
   * @returns {object} Tree metadata
   */
  getTreeInfo() {
    return {
      leafCount: this.leaves.length,
      root: this.root,
      isSorted: this.leaves.every((hash, idx, arr) => idx === 0 || hash >= arr[idx - 1]),
      height: Math.ceil(Math.log2(Math.max(this.leaves.length, 1)))
    };
  }
}

