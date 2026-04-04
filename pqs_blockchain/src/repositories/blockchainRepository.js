import { mysqlDB } from '../storage/mysqlDB.js';
import { logger } from '../utils/logger.js';
import { BaseRepository } from './baseRepository.js';

/**
 * Blockchain Repository
 * Handles database operations for the blockchain.
 */
class BlockchainRepository extends BaseRepository {
    constructor() {
        super(mysqlDB);
    }

    /**
     * Get the full blockchain from the database.
     */
    async getChain() {
        return this.exec('getChain', this.db.getChain);
    }

    /**
     * Save the full blockchain to the database.
     */
    async saveChain(chainData) {
        return this.exec('saveChain', this.db.saveChain, chainData);
    }

    /**
     * Insert a new block into the database.
     * Returns the created block ID.
     */
    async insertBlock(blockData, merkleRoot) {
        return this.exec('insertBlock', this.db.insertBlock, blockData, merkleRoot);
    }

    /**
     * Mine certificates into a block using a single DB transaction.
     * If any step fails, the transaction is rolled back.
     *
     * Steps:
     * 1. Begin transaction
     * 2. Lock certificates ready for blockchain
     * 3. Create block and compute hash
     * 4. Insert block
     * 5. Update certificates with block info
     * 6. Commit transaction
     */
    async minePendingCertificatesAtomic(block, certificates, merkleRoot, certificateRepo, blockIndex) {
        return this.exec('minePendingCertificatesAtomic', this.db.minePendingCertificatesAtomic,
            block, certificates, merkleRoot, certificateRepo, blockIndex);
    }

    /**
     * Get a block by its index.
     */
    async getBlockByIndex(index) {
        return this.exec('getBlockByIndex', this.db.getBlockByIndex, index);
    }

    /**
     * Get a block by its database ID.
     */
    async getBlockById(id) {
        return this.exec('getBlockById', this.db.getBlockById, id);
    }

    /**
     * Get all blocks.
     */
    async getAllBlocks() {
        return this.exec('getAllBlocks', this.db.getAllBlocks);
    }
}

// Export a single repository instance
export const blockchainRepository = new BlockchainRepository();
