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
                this.blockchain.chain = savedChain.chain.map(blockData => {
                    const block = Object.assign(new Block(), blockData);
                    block.merkleRoot = blockData.merkleRoot || '';
                    return block;
                });
                this.blockchain.pendingCertificates = [];
                this.blockchain.pendingCertificateIds = new Set();
                logger.info('Blockchain loaded from storage');
            } else {
                logger.info('Initialized new blockchain');
            }
        } catch (error) {
            logger.info('Starting new blockchain - no previous data found');
        }
    }

    // Load pending certificates from DB
    async syncPendingFromDB() {
        if (!this.certificateService || !this.certificateService.repo) return;
        try {
            const pending = await this.certificateService.repo.getCertificatesByStatus(certificateStatus.BLOCKCHAIN_ADDED);
            this.blockchain.pendingCertificates = pending || [];
            this.blockchain.pendingCertificateIds = new Set((pending || []).map(c => c.id));
            logger.info(`Synchronized ${this.blockchain.pendingCertificates.length} pending certificates`);
        } catch (err) {
            logger.error(`Unable to sync pending certificates: ${err.message}`);
        }
    }

    // Save blockchain state
    async saveBlockchain() {
        try {
            await this.repo.saveChain(this.blockchain.toJSON());
            logger.info('Blockchain state saved');
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
            logger.info(`Certificate ${certificateId} enqueued`);
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

            const pendingCertificates = this.blockchain.pendingCertificates;
            if (!pendingCertificates || pendingCertificates.length === 0) {
                logger.debug('No pending certificates to mine');
                return null;
            }

            const certificateIds = pendingCertificates.map(c => c.id);
            const freshCerts = [];
            for (const certId of certificateIds) {
                try {
                    const certData = await this.certificateService.repo.getCertificate(certId);
                    if (certData) freshCerts.push(certData);
                } catch (err) {
                    logger.warn(`Could not fetch certificate ${certId}: ${err.message}`);
                }
            }

            if (freshCerts.length === 0) throw new Error('No certificate data for mining');

            const certHashes = freshCerts.map(c => c.certificateHash || '');
            const merkleTree = new MerkleTree(certHashes);
            const merkleRoot = merkleTree.getRoot();

            if (!merkleRoot || merkleRoot === '') {
                throw new Error('Invalid Merkle Root: cannot be empty');
            }

            const result = this.blockchain.minePendingCertificates(merkleRoot);
            if (!result) {
                logger.debug('No pending certificates to mine');
                return null;
            }

            const { block, blockNumber, certificates } = result;
            const blockHash = block.hash;

            let blockId = null;
            let updatedCertificates = [];
            let minedCertificates = [];

            try {
                const atomicResult = await this.repo.minePendingCertificatesAtomic(
                    block, certificates, merkleRoot,
                    this.certificateService.repo, blockNumber
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
