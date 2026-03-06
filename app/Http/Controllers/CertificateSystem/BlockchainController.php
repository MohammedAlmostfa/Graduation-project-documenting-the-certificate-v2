<?php

namespace App\Http\Controllers\CertificateSystem;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\CertificateSystem\BlockchainService;

/**
 * Class BlockchainController
 *
 * This controller exposes endpoints to interact with the blockchain service.
 * It allows mining pending transactions and retrieving blocks with pagination.
 */
class BlockchainController extends Controller
{
    /**
     * @var BlockchainService
     * Service layer that handles blockchain API communication.
     */
    private BlockchainService $BlockchainService;

    /**
     * Constructor
     *
     * Injects the BlockchainService dependency to handle blockchain operations.
     *
     * @param BlockchainService $BlockchainService Injected blockchain service.
     */
    public function __construct(BlockchainService $BlockchainService)
    {
        $this->BlockchainService = $BlockchainService;
    }

    /**
     * Mine all pending blockchain transactions.
     *
     * Calls the BlockchainService to trigger mining of pending transactions.
     * Returns a standardized success or error response depending on API status.
     *
     * Example response:
     * {
     *   "message": "Block mined successfully",
     *   "status": 200,
     *   "data": {
     *       "blockHash": "abc123",
     *       "transactions": [...]
     *   }
     * }
     *
     * @return \Illuminate\Http\JsonResponse JSON response containing mined block data or error message
     */
    public function mineTransactions()
    {
        // Call the service to mine pending transactions
        $result = $this->BlockchainService->mineTransactions();

        // Return standardized success or error response
        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }


    public function getBlockchainInfo()
    {
       return view('dashboard');
    }
}
