import { Blockchain } from '../models/Blockchain.js';
import { Block } from '../models/Block.js';
import { MerkleTree } from '../utils/merkleTree.js';
import { logger } from '../utils/logger.js';
import { blockchainRepository } from '../repositories/blockchainRepository.js';
import { certificateStatus } from '../config/security.js';
import { oqsCrypto } from '../utils/crypto-oqs.js';

export class BlockchainService {
    constructor({ repo, certificateService } = {}) {
        this.repo = repo || blockchainRepository;
        this.blockchain = new Blockchain();
        this.prefix = 'blockchain:';
        this.certificateService = certificateService;
    }

    // Initialize service: load chain and pending certificates
    async initialize() {
        await this.loadBlockchain();
        await this.syncPendingFromDB();
    }

    // Load blockchain from storage
    async loadBlockchain() {
        try {
            const savedChain = await this.repo.getChain();
            if (savedChain && Array.isArray(savedChain.chain)) {
                const corruptedBlocks = [];

                this.blockchain.chain = savedChain.chain.map(blockData => {
                    // CRITICAL: Normalize data types from database (which are strings)
                    // Ensure types match what Block constructor expects
                    const normalizedData = {
                        id: Number(blockData.id),
                        timestamp: blockData.timestamp,
                        certificateIds: blockData.certificateIds || [],
                        merkleRoot: String(blockData.merkleRoot || ''),
                        previousHash: String(blockData.previousHash || '0'),
                        nonce: Number(blockData.nonce || 0),
                        difficulty: Number(blockData.difficulty || 4),
                        hash: blockData.hash
                    };

                    const block = Object.assign(new Block(), normalizedData);



                    // Validate hash integrity during load
                    const validation = oqsCrypto.validateBlockHashes(block);
                    if (!validation.valid) {
                        corruptedBlocks.push({
                            index: block.id,
                            errors: validation.errors
                        });
                    }

                    return block;
                });

                if (corruptedBlocks.length > 0) {
                    logger.warn(`⚠️  Loaded blockchain with ${corruptedBlocks.length} corrupted blocks:`);
                    corruptedBlocks.forEach(block => {
                        logger.warn(`   Block ${block.id}:`);
                        block.errors.forEach(err => logger.warn(`      - ${err}`));
                    });
                }

                this.blockchain.pendingCertificates = [];
                this.blockchain.pendingCertificateIds = new Set();
            }
        } catch (error) {
        }
    }

    // Load pending certificates from DB
    async syncPendingFromDB() {
        if (!this.certificateService || !this.certificateService.repo) return;
        try {
            const pending = await this.certificateService.repo.getCertificatesByStatus(certificateStatus.BLOCKCHAIN_ADDED);
            this.blockchain.pendingCertificates = pending || [];
            this.blockchain.pendingCertificateIds = new Set((pending || []).map(c => c.id));
        } catch (err) {
            logger.error(`Unable to sync pending certificates: ${err.message}`);
        }
    }

    // Save blockchain state
    async saveBlockchain() {
        try {
            await this.repo.saveChain(this.blockchain.toJSON());
        } catch (error) {
            logger.error(`Error saving blockchain: ${error.message}`);
            throw error;
        }
    }

    // Enqueue a certificate for mining
    async enqueueCertificateById(certificateId) {
        try {
            if (!this.certificateService || !this.certificateService.getCertificate) {
                throw new Error('certificateService not available');
            }
            const certificate = await this.certificateService.getCertificate(certificateId);
            if (!certificate || certificate.status !== certificateStatus.BLOCKCHAIN_ADDED) {
                throw new Error('Certificate not ready for blockchain');
            }
            this.blockchain.addCertificateToPending(certificate);
            await this.saveBlockchain();
            return {
                certificateId,
                status: 'pending',
                position: this.blockchain.pendingCertificates.length
            };
        } catch (err) {
            logger.error(`Error enqueuing certificate ${certificateId}: ${err.message}`);
            throw err;
        }
    }

    // Mine all pending certificates into a new block
    async minePendingCertificates() {
        try {
            if (!this.certificateService || !this.certificateService.repo) {
                throw new Error('certificateService not available');
            }

            if (!this.repo) {
                throw new Error('blockchainRepository not available');
            }

            const pendingCertificates = this.blockchain.pendingCertificates;
            if (!pendingCertificates || pendingCertificates.length === 0) {
                return null;
            }

            // CRITICAL: Get the actual last block from DB (NOT memory) for deterministic chain building
            // This ensures:
            // 1. blockId is next sequential (no gaps)
            // 2. previousHash = actual last block hash
            // 3. Prevents race conditions from stale memory state
            const lastBlockFromDB = await this.repo.getLastBlockFromDB();
            const nextBlockId = lastBlockFromDB.nextId;
            const previousHashFromDB = lastBlockFromDB.hash;

            const certificateIds = pendingCertificates.map(c => c.id);
            const certHashSnapshot = {};

            // Atomically fetch and snapshot ALL certificate hashes at once
            for (const certId of certificateIds) {
                try {
                    const certData = await this.certificateService.repo.getCertificate(certId);
                    if (certData && certData.certificateHash) {
                        certHashSnapshot[certId] = certData.certificateHash;
                    } else {
                        logger.warn(`Certificate ${certId}: no hash available`);
                    }
                } catch (err) {
                    logger.warn(`Could not fetch certificate ${certId}: ${err.message}`);
                }
            }

            if (Object.keys(certHashSnapshot).length === 0) {
                throw new Error('No certificate hashes available for mining');
            }

            // Extract hashes in stable order (sorted by certificate ID for determinism)
            const sortedCertIds = certificateIds.sort();
            const certHashes = sortedCertIds
                .filter(id => certHashSnapshot[id])
                .map(id => certHashSnapshot[id]);

            // MerkleTree constructor sorts leaves internally for deterministic computation
            const merkleTree = new MerkleTree(certHashes, true);
            const merkleRoot = merkleTree.getRoot();

            if (!merkleRoot || merkleRoot === '') {
                throw new Error('Invalid Merkle Root: cannot be empty');
            }

            // CRITICAL: Pass nextBlockId AND previousHash from DB to blockchain
            // This ensures new block is connected to actual last block in chain
            const result = this.blockchain.minePendingCertificates(
                merkleRoot,
                nextBlockId,
                previousHashFromDB  // ← NEW: Pass actual previousHash from DB
            );
            if (!result) {
                return null;
            }

            const { block, blockNumber, certificates } = result;
            const blockHash = block.hash;

            // Verify block index matches the one we determined from DB
            if (blockNumber !== nextBlockId) {
                logger.warn(
                    `⚠️  Block index mismatch detected: ` +
                    `DB suggested ${nextBlockId}, ` +
                    `but block has index ${blockNumber}. ` +
                    `Using DB value for mining...`
                );
                // The atomic operation will validate this and fail if there's a race condition
            }

            let blockId = null;
            let updatedCertificates = [];
            let minedCertificates = [];

            try {
                const atomicResult = await this.repo.minePendingCertificatesAtomic(
                    block, certificates, merkleRoot,
                    this.certificateService.repo, nextBlockId  // Use DB-determined index
                );

                blockId = atomicResult.blockId;
                minedCertificates = atomicResult.minedCertificates;
                updatedCertificates = atomicResult.updatedCertificates;

                await this.syncPendingFromDB();

                const minedCertIds = minedCertificates.map(c => c.id);
                logger.info(`✅ ${minedCertIds.length} certificates mined and status updated to COMPLETED`);
                for (const certId of minedCertIds) {
                    const cert = await this.certificateService.getCertificate(certId);
                    if (cert.status !== certificateStatus.COMPLETED) {
                        logger.warn(`⚠️ Certificate ${certId} status not updated: ${cert.status}`);
                    }
                }

                logger.info(`⛏️  Mining completed:`);
                logger.info(`   Block: ${blockNumber}`);
                logger.info(`   Certificates mined: ${minedCertificates.length}`);
                logger.info(`   Pending queue cleared: ${this.blockchain.pendingCertificates.length === 0}`);
                logger.info(`   Status sync verified ✅`);

            } catch (atomicErr) {
                logger.error(`Atomic mining failed: ${atomicErr.message}`);
                throw new Error(`Atomic mining transaction failed: ${atomicErr.message}`);
            }

            await this.saveBlockchain();

            block.blockId = blockId;

            return {
                blockNumber,
                blockHash,
                certificatesMined: minedCertificates.length,
                minedCertificates,
                merkleRoot,
                timestamp: block.timestamp
            };

        } catch (error) {
            logger.error(`Error mining certificates: ${error.message}`);
            throw error;
        }
    }

    // Validate blockchain
    async validateBlockchain() {
        try {
            const isValid = this.blockchain.isChainValid();
            return { valid: isValid, stats: this.blockchain.getChainStats() };
        } catch (error) {
            logger.error(`Error validating blockchain: ${error.message}`);
            return { valid: false, error: error.message };
        }
    }

    // Get block info for a certificate
    async getCertificateBlockInfo(certificateId) {
        try {
            const blockInfo = this.blockchain.getCertificateBlock(certificateId);
            if (!blockInfo) throw new Error('Certificate not found');
            return blockInfo;
        } catch (error) {
            logger.error(`Error fetching certificate block info: ${error.message}`);
            throw error;
        }
    }

    // Get blockchain stats
    async getBlockchainStats() {
        try {
            return this.blockchain.getChainStats();
        } catch (error) {
            logger.error(`Error fetching blockchain stats: ${error.message}`);
            throw error;
        }
    }

    // Get a specific block
    async getBlock(blockNumber) {
        try {
            if (blockNumber < 0 || blockNumber >= this.blockchain.chain.length) {
                throw new Error('Invalid block number');
            }
            return this.blockchain.chain[blockNumber].toJSON();
        } catch (error) {
            logger.error(`Error fetching block: ${error.message}`);
            throw error;
        }
    }

    // Get all blocks
    async getAllBlocks() {
        try {
            return this.blockchain.chain.map(block => block.toJSON());
        } catch (error) {
            logger.error(`Error fetching all blocks: ${error.message}`);
            throw error;
        }
    }
}

