import {
    Block
} from './Block.js';
import {
    blockchainConfig
} from '../config/blockchain.js';
import {
    logger
} from '../utils/logger.js';
import {
    normalizeStudentForBlock
} from '../utils/helpers.js';
import { oqsCrypto } from '../utils/crypto-oqs.js';

/**
 * Blockchain Class
 * Stores academic certificates in a proof-of-work blockchain.
 */
export class Blockchain {

    /**
     * Initialize blockchain with genesis block
     */
    constructor() {
        // Main blockchain
        this.chain = [this.createGenesisBlock()];

        // Certificates waiting to be mined
        this.pendingCertificates = [];

        // Fast lookup for pending certificate IDs
        this.pendingCertificateIds = new Set();

        // Mining difficulty
        this.difficulty = blockchainConfig.difficulty;
    }

    /**
     * Create the first block of the blockchain
     */
    createGenesisBlock() {
        const genesisBlock = new Block(
            0,  // Genesis block has id = 0
            blockchainConfig.genesisBlock.timestamp,
            // Genesis block has no certificates
            blockchainConfig.genesisBlock.certificateIds || [],
            '', // merkleRoot (empty for genesis block)
            blockchainConfig.genesisBlock.previousHash
        );

        // Ensure the genesis block hash matches its content
        if (genesisBlock.hash === '0'.repeat(64)) {
            genesisBlock.hash = genesisBlock.calculateHash();
        }

        return genesisBlock;
    }

    /**
     * Return the latest block in the chain
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Add certificate to pending queue
     * Automatically mines when queue reaches max size
     */
    addCertificateToPending(certificate) {

        // Prevent duplicates
        if (this.pendingCertificateIds.has(certificate.id)) {
            throw new Error('Certificate already exists in the pending queue');
        }

        // Basic structure validation
        if (!certificate.id || !certificate.student) {
            throw new Error('Invalid certificate structure');
        }

        this.pendingCertificates.push(certificate);
        this.pendingCertificateIds.add(certificate.id);

        logger.info(`Certificate ${certificate.id} has been added to the pending queue`);

        // Mine block if limit reached
        if (this.pendingCertificates.length >= blockchainConfig.maxTransactionsPerBlock) {
            this.minePendingCertificates();
        }

        return certificate;
    }

    /**
     * Mine pending certificates into a new block
     * @param {string} merkleRoot - Merkle root of certificates
     * @param {number} nextBlockId - OPTIONAL: Explicit block id to use (from DB, for race condition prevention)
     */
    minePendingCertificates(merkleRoot = null, nextBlockId = null) {

        if (this.pendingCertificates.length === 0) {
            logger.info('No certificates in the pending queue for mining');
            return null;
        }

        // Use provided id or calculate from chain length
        // In race conditions, nextBlockId is provided from DB to get sequence correct
        const blockId = nextBlockId !== null ? nextBlockId : this.chain.length;

        if (nextBlockId !== null && nextBlockId !== this.chain.length) {
            logger.debug(
                `⚠️  Block id override: DB suggested ${nextBlockId}, ` +
                `but memory chain has length ${this.chain.length}. ` +
                `Using DB id ${nextBlockId} to handle potential race conditions.`
            );
        }

        logger.info(`⛏️ Mining ${this.pendingCertificates.length} certificates (block id: ${blockId})...`);

        const block = new Block(
            blockId,
            new Date().toISOString(),
            this.pendingCertificates.map(cert => cert.id),
            merkleRoot || '',
            this.getLatestBlock().hash
        );

        // Keep full certificate data in memory
        block.transactions = this.pendingCertificates.map(cert => ({
            type: 'certificate',
            certificateId: cert.id,
            certificateHash: cert.certificateHash,
            signatures: cert.signatures || [],
            student: normalizeStudentForBlock(cert.student)
        }));

        // Perform proof-of-work
        block.mineBlock(this.difficulty);

        // Add block to chain
        this.chain.push(block);

        const blockNumber = blockId;
        const minedCertificates = [...this.pendingCertificates];

        // Clear pending queue
        this.pendingCertificates = [];
        this.pendingCertificateIds.clear();

        logger.info(`✅ Block ${blockNumber} containing ${minedCertificates.length} certificates has been mined`);

        return {
            block,
            certificates: minedCertificates,
            blockNumber
        };
    }

    /**
     * Validate the blockchain integrity
     */
    isChainValid() {

        // Verify genesis block exists and has valid structure
        if (this.chain.length === 0) {
            logger.error('❌ Blockchain is empty - genesis block missing');
            return false;
        }

        const genesisBlock = this.chain[0];
        if (genesisBlock.id !== 0) {
            logger.error('❌ Genesis block has invalid id');
            return false;
        }

        if (!genesisBlock.validate()) {
            logger.error('❌ Genesis block failed validation');
            return false;
        }

        // Validate all non-genesis blocks
        for (let i = 1; i < this.chain.length; i++) {

            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // Check block hash
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                logger.error(`❌ Block ${currentBlock.id} is invalid - Hash mismatch`);
                return false;
            }

            // Check chain linkage
            if (currentBlock.previousHash !== previousBlock.hash) {
                logger.error(`❌ Block ${currentBlock.id} is not linked correctly`);
                return false;
            }

            // Check proof-of-work
            if (!currentBlock.validate()) {
                logger.error(`❌ Block ${currentBlock.id} failed validation`);
                return false;
            }
        }

        logger.info('✅ The blockchain is valid and secure');
        return true;
    }

    /**
     * Find the block containing a certificate
     */
    getCertificateBlock(certificateId) {

        // Skip genesis block
        for (let i = 1; i < this.chain.length; i++) {

            const block = this.chain[i];
            const certificateInBlock = block.certificateIds && block.certificateIds.includes(certificateId);

            if (certificateInBlock) {

                // Return full transaction if available
                const tx = (block.transactions || []).find(t => t.certificateId === certificateId) || { certificateId };

                return {
                    block: block.toJSON(),
                    transaction: tx
                };
            }
        }

        return null;
    }

    /**
     * Get blockchain statistics
     */
    getChainStats() {

        const totalBlocks = this.chain.length;

        const totalCertificates = this.chain.reduce((total, block) => {
            return total + (Array.isArray(block.certificateIds) ? block.certificateIds.length : 0);
        }, 0);

        return {
            totalBlocks,
            totalCertificates,
            pendingCertificates: this.pendingCertificates.length,
            difficulty: this.difficulty,
            latestBlock: this.getLatestBlock().id,
            chainValid: this.isChainValid()
        };
    }

    /**
     * Convert blockchain to JSON format
     */
    toJSON() {

        return {
            chain: this.chain.map(block => block.toJSON()),
            pendingCertificates: this.pendingCertificates.map(cert => cert.id),
            difficulty: this.difficulty,
            stats: this.getChainStats()
        };
    }
}

