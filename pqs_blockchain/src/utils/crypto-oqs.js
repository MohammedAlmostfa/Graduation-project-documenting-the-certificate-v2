import { createMLDSA65 } from '@openforge-sh/liboqs';
import { logger } from './logger.js';
import { securityConfig } from '../config/security.js';
import { createHash } from 'crypto';

/**
 * OQSCrypto
 * ---------
 * Provides cryptographic operations using ML-DSA-65 (post-quantum signature algorithm).
 * Includes key generation, serialization, signing, verification, and hashing.
 */
export class OQSCrypto {
  constructor() {
    this.algorithm = null;       // Algorithm instance
    this.initialized = false;    // Initialization flag
  }

  /**
   * Initialize the ML-DSA-65 algorithm.
   */
  async init() {
    if (this.initialized) return;
    try {
      this.algorithm = await createMLDSA65();
      this.initialized = true;
      logger.info('✅ ML-DSA-65 initialized successfully');
    } catch (error) {
      logger.error(`❌ Error initializing ML-DSA-65: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a new key pair.
   * @returns {Promise<object>} Public and private keys with metadata.
   */
  async generateKeyPair() {
    await this.init();
    try {
      const keypair = await this.algorithm.generateKeyPair();
      return {
        publicKey: Buffer.from(keypair.publicKey),
        privateKey: Buffer.from(keypair.secretKey), // Note: secretKey is used as privateKey
        algorithm: 'ML-DSA-65',
        keySize: {
          public: keypair.publicKey.length,
          private: keypair.secretKey.length
        }
      };
    } catch (error) {
      logger.error(`❌ Error generating key pair: ${error.message}`);
      throw error;
    }
  }

  /**
   * Serialize a public key to base64 string.
   * @param {Buffer|Uint8Array|string} publicKey
   * @returns {string|null}
   */
  serializePublicKey(publicKey) {
    try {
      if (!publicKey) return null;
      if (Buffer.isBuffer(publicKey)) return publicKey.toString('base64');
      if (publicKey instanceof Uint8Array) return Buffer.from(publicKey).toString('base64');
      if (typeof publicKey === 'string') return publicKey;
      throw new Error('Unsupported public key type for serialization');
    } catch (error) {
      logger.error(`❌ Error serializing public key: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deserialize a public key from base64 string or object back to Buffer.
   * @param {string|Buffer|Uint8Array|object} serialized
   * @returns {Buffer|null}
   */
  deserializePublicKey(serialized) {
    try {
      if (!serialized) return null;
      if (Buffer.isBuffer(serialized)) return serialized;
      if (serialized instanceof Uint8Array) return Buffer.from(serialized);
      if (typeof serialized === 'string') {
        if (serialized.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
          return Buffer.from(serialized, 'base64');
        }
        return Buffer.from(serialized);
      }
      if (typeof serialized === 'object' && serialized.type === 'Buffer' && Array.isArray(serialized.data)) {
        return Buffer.from(serialized.data);
      }
      throw new Error('Unsupported public key format for deserialization');
    } catch (error) {
      logger.error(`❌ Error deserializing public key: ${error.message}`);
      logger.error(`❌ Data type: ${typeof serialized}`);
      logger.error(`❌ Data: ${JSON.stringify(serialized)}`);
      throw error;
    }
  }

  /**
   * Sign data using private key.
   * @param {any} data - Data to sign.
   * @param {Buffer} privateKey - Private key buffer.
   * @returns {Promise<object>} Signature details.
   */
  async signData(data, privateKey) {
    await this.init();
    try {
      const message = this._canonicalizeForSigning(data);
      const messageUint8 = new TextEncoder().encode(message);
      const privateKeyUint8 = new Uint8Array(privateKey);
      const signature = await this.algorithm.sign(messageUint8, privateKeyUint8);
      return {
        signature: Buffer.from(signature).toString('base64'),
        algorithm: 'ML-DSA-65',
        messageHash: this.hashData(message)
      };
    } catch (error) {
      logger.error(`❌ Error signing data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify a signature using public key.
   * @param {any} data - Original data.
   * @param {string} signature - Base64 encoded signature.
   * @param {Buffer} publicKey - Public key buffer.
   * @returns {Promise<object>} Verification result.
   */
  async verifySignature(data, signature, publicKey) {
    await this.init();
    try {
      const message = this._canonicalizeForSigning(data);
      const messageUint8 = new TextEncoder().encode(message);
      const signatureUint8 = new Uint8Array(Buffer.from(signature, 'base64'));
      const publicKeyUint8 = new Uint8Array(publicKey);
      const isValid = await this.algorithm.verify(messageUint8, signatureUint8, publicKeyUint8);
      return {
        isValid,
        algorithm: 'ML-DSA-65',
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`❌ Error verifying signature: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Hash data using SHA3-512.
   * @param {any} data
   * @returns {string} Hex digest.
   */
  hashData(data) {
    try {
      const hash = createHash('sha3-512');
      const message = this._canonicalizeForSigning(data);
      hash.update(message);
      return hash.digest('hex');
    } catch (error) {
      logger.error(`❌ Error hashing data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Canonicalize objects to deterministic JSON (sorted keys).
   * Ensures consistent signing and hashing.
   */
  _canonicalizeForSigning(data) {
    if (typeof data === 'string') return data;
    const stringifySorted = (obj) => {
      if (obj === null) return 'null';
      if (obj === undefined) return 'null';
      if (typeof obj !== 'object') return JSON.stringify(obj);
      if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
        return JSON.stringify(Buffer.from(obj).toString('base64'));
      }
      if (Array.isArray(obj)) return '[' + obj.map(item => stringifySorted(item)).join(',') + ']';
      const keys = Object.keys(obj).sort();
      const parts = [];
      for (const k of keys) {
        const v = obj[k];
        if (v === undefined) continue;
        parts.push(JSON.stringify(k) + ':' + stringifySorted(v));
      }
      return '{' + parts.join(',') + '}';
    };
    return stringifySorted(data);
  }

  /**
   * Validate if a public key is usable by attempting a test signature verification.
   * @param {Buffer} publicKey
   * @returns {Promise<boolean>}
   */
  async isValidPublicKey(publicKey) {
    try {
      if (!publicKey || !Buffer.isBuffer(publicKey)) return false;
      const testKeyPair = await this.generateKeyPair();
      const testData = 'test_validation';
      const testSignature = await this.signData(testData, testKeyPair.privateKey);
      const result = await this.verifySignature(testData, testSignature.signature, publicKey);
      return result.isValid;
    } catch (error) {
      logger.error(`❌ Error validating public key: ${error.message}`);
      return false;
    }
  }
}

// Export singleton instance
export const oqsCrypto = new OQSCrypto();
export default oqsCrypto;
