import { mysqlDB } from '../storage/mysqlDB.js';
import { logger } from '../utils/logger.js';
import { BaseRepository } from './baseRepository.js';

/**
 * Key Repository
 * Handles storing and retrieving user keys.
 */
class KeyRepository extends BaseRepository {
    constructor() {
        super(mysqlDB);
    }

    /**
     * Save a user's public key.
     */
    async savePublicKey(userId, publicKeyData) {
        return this.exec('savePublicKey', this.db.saveKey, userId, 'public', publicKeyData);
    }

    /**
     * Save a user's private key.
     */
    async savePrivateKey(userId, privateKeyData) {
        return this.exec('savePrivateKey', this.db.saveKey, userId, 'private', privateKeyData);
    }

    /**
     * Get a user's public key.
     */
    async getPublicKey(userId) {
        return this.exec('getPublicKey', this.db.getKey, userId, 'public');
    }

    /**
     * Get a user's private key.
     */
    async getPrivateKey(userId) {
        return this.exec('getPrivateKey', this.db.getKey, userId, 'private');
    }
}

// Export a single repository instance
export const keyRepository = new KeyRepository();
