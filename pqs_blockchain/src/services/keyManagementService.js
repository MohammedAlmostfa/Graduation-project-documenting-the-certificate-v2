import { oqsCrypto } from '../utils/crypto-oqs.js';
import { logger } from '../utils/logger.js';
import { keyRepository } from '../repositories/keyRepository.js';
import crypto from 'crypto';

/**
 * Service to manage storing and retrieving cryptographic keys securely.
 */
export class KeyManagementService {
    constructor({ repo } = {}) {
        this.repo = repo || keyRepository;
    }

    /**
     * Store a user's key pair (public + encrypted private key).
     */
    async storeKeyPair(userId, keyPair) {
        try {
            const publicKeyText = oqsCrypto.serializePublicKey(keyPair.publicKey);
            await this.repo.savePublicKey(userId, publicKeyText);

            const encryptedPrivateKey = this.encryptPrivateKey(keyPair.privateKey);
            await this.repo.savePrivateKey(userId, encryptedPrivateKey);

            logger.info(`Stored keys for user: ${userId}`);
        } catch (error) {
            logger.error(`Error storing keys: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get and decrypt a user's private key.
     */
    async getPrivateKey(userId) {
        try {
            const encryptedString = await this.repo.getPrivateKey(userId);
            if (!encryptedString) throw new Error('Private keys not found for user');

            const privateKeyBase64 = this.decryptPrivateKey(encryptedString);
            return Buffer.from(privateKeyBase64, 'base64');
        } catch (error) {
            logger.error(`Error retrieving private key: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get a user's public key.
     */
    async getPublicKey(userId) {
        try {
            const publicKeyText = await this.repo.getPublicKey(userId);
            if (!publicKeyText) throw new Error('Public key not found');

            return oqsCrypto.deserializePublicKey(publicKeyText);
        } catch (error) {
            logger.error(`Error retrieving public key: ${error.message}`);
            throw error;
        }
    }

    /**
     * Encrypt a private key with AES-256-GCM.
     */
    encryptPrivateKey(privateKey) {
        const algorithm = 'aes-256-gcm';
        const secret = process.env.ENCRYPTION_KEY;
        if (!secret || secret.length < 16) {
            throw new Error('ENCRYPTION_KEY must be set (min 16 chars)');
        }

        const salt = crypto.randomBytes(16);
        const key = crypto.scryptSync(secret, salt, 32);
        const iv = crypto.randomBytes(12);

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        cipher.setAAD(Buffer.from('additional-data'));

        const plaintext = privateKey.toString('base64');
        const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Combine salt, iv, authTag, and ciphertext
        const payload = Buffer.concat([salt, iv, authTag, encrypted]);
        return payload.toString('base64');
    }

    /**
     * Decrypt an encrypted private key.
     */
    decryptPrivateKey(encryptedString) {
        const secret = process.env.ENCRYPTION_KEY;
        if (!secret || secret.length < 16) {
            throw new Error('ENCRYPTION_KEY must be set');
        }

        const payload = Buffer.from(encryptedString, 'base64');
        const salt = payload.slice(0, 16);
        const iv = payload.slice(16, 28);
        const authTag = payload.slice(28, 44);
        const ciphertext = payload.slice(44);

        const key = crypto.scryptSync(secret, salt, 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(Buffer.from('additional-data'));
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted; // Base64 string
    }
}
