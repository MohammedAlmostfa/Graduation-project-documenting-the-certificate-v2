import {
    blockchainService,
    certificateService
} from '../bootstrap.js';
import {
    ApiResponse
} from '../utils/apiResponse.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { CertificateIdRequest } from '../requests/CertificateIdRequest.js';
import { BlockNumberRequest } from '../requests/BlockNumberRequest.js';

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
            res.json(ApiResponse.success('تم جلب إحصائيات البلوك تشين بنجاح', { blockchain: stats }));
    }),

    /**
     * Check blockchain integrity.
     */
    validateBlockchain: asyncWrapper(async (req, res) => {
            const validationResult = await blockchainService.validateBlockchain();
            res.json(ApiResponse.success('نتيجة التحقق من البلوك تشين', { validation: validationResult }));
    }),

    /**
     * Mine pending certificates into a block.
     */
    minePendingCertificates: asyncWrapper(async (req, res) => {
            const result = await blockchainService.minePendingCertificates();
                        if (result) {
                                res.json(ApiResponse.success('تم تعدين الشهادات المعلقة بنجاح', result));
                        } else {
                                res.status(404).json(ApiResponse.error('لا توجد شهادات معلقة للتعدين', null));
                        }
    }),

    /**
     * Get block details for a certificate.
     */
    getCertificateBlockInfo: asyncWrapper(async (req, res) => {
            const certIdRequest = new CertificateIdRequest(req.params.certificateId);
            const certificateId = certIdRequest.validate();
            const blockInfo = await blockchainService.getCertificateBlockInfo(certificateId);
            res.json(ApiResponse.success('تم جلب معلومات بلوك الشهادة بنجاح', { certificateId, blockInfo }));
    }),

    /**
     * Get a block by block number.
     */
    getBlock: asyncWrapper(async (req, res) => {
            const blockNumRequest = new BlockNumberRequest(req.params.blockNumber);
            const blockNumber = blockNumRequest.validate();
            const block = await blockchainService.getBlock(blockNumber);
            res.json(ApiResponse.success('تم جلب البلوك بنجاح', { block }));
    }),

    /**
     * Get all blockchain blocks.
     */
    getAllBlocks: asyncWrapper(async (req, res) => {
            const blocks = await blockchainService.getAllBlocks();
            res.json(ApiResponse.success('تم جلب جميع البلوكات بنجاح', { count: blocks.length, blocks }));
    }),

    /**
     * Get number of pending certificates.
     */
    getPendingCertificates: asyncWrapper(async (req, res) => {
            const stats = await blockchainService.getBlockchainStats();
            res.json(ApiResponse.success('تم جلب الشهادات المعلقة بنجاح', { pendingCount: stats.pendingCertificates, stats }));
    })
};
