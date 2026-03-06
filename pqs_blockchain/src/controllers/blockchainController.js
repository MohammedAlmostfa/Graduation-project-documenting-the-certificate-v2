import {
    blockchainService,
    certificateService
} from '../bootstrap.js';
import {
    ApiResponse
} from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';

/**
 * Blockchain Controller
 *
 * Handles blockchain API requests such as:
 * - Getting blockchain stats
 * - Validating the chain
 * - Mining certificates
 * - Retrieving block data
 */
export const blockchainController = {
    /**
     * Get blockchain statistics.
     */
    getBlockchainStats: asyncWrapper(async (req, res) => {
            const stats = await blockchainService.getBlockchainStats();
            res.json(ApiResponse.success('Blockchain statistics retrieved successfully', { blockchain: stats }));
    }),

    /**
     * Check blockchain integrity.
     */
    validateBlockchain: asyncWrapper(async (req, res) => {
            const validationResult = await blockchainService.validateBlockchain();
            res.json(ApiResponse.success('Blockchain validation result', { validation: validationResult }));
    }),

    /**
     * Mine pending certificates into a block.
     */
    minePendingCertificates: asyncWrapper(async (req, res) => {
            const result = await blockchainService.minePendingCertificates();
            if (result) {
                res.json(ApiResponse.success('Pending certificates mined successfully', result));
            } else {
                res.status(404).json(ApiResponse.error('No pending certificates to mine', null));
            }
    }),

    /**
     * Get block details for a certificate.
     */
    getCertificateBlockInfo: asyncWrapper(async (req, res) => {
            const { certificateId } = req.params;
            const blockInfo = await blockchainService.getCertificateBlockInfo(certificateId);
            res.json(ApiResponse.success('Certificate block information retrieved successfully', { certificateId, blockInfo }));
    }),

    /**
     * Get a block by block number.
     */
    getBlock: asyncWrapper(async (req, res) => {
            const { blockNumber } = req.params;
            const block = await blockchainService.getBlock(parseInt(blockNumber));
            res.json(ApiResponse.success('Block retrieved successfully', { block }));
    }),

    /**
     * Get all blockchain blocks.
     */
    getAllBlocks: asyncWrapper(async (req, res) => {
            const blocks = await blockchainService.getAllBlocks();
            res.json(ApiResponse.success('All blocks retrieved successfully', { count: blocks.length, blocks }));
    }),

    /**
     * Get number of pending certificates.
     */
    getPendingCertificates: asyncWrapper(async (req, res) => {
            const stats = await blockchainService.getBlockchainStats();
            res.json(ApiResponse.success('Pending certificates retrieved successfully', { pendingCount: stats.pendingCertificates, stats }));
    })
};
