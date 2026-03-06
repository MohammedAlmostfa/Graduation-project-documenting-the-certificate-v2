<?php

namespace App\Services\CertificateSystem;

use App\Services\Service;
use Exception;
use App\Support\ApiHelper;

/**
 * BlockchainService
 *
 * This service handles communication with the blockchain API.
 * It provides methods to mine pending transactions and to fetch blocks.
 */
class BlockchainService extends Service
{
    /**
     * Mine all pending transactions.
     *
     * Calls the blockchain API endpoint `/blockchain/mine` to process
     * pending transactions and add them to a new block.
     *
     * @return array Formatted response containing:
     *   - message: API message
     *   - status: HTTP status code
     *   - data: API response data (newly mined block or transaction details)
     *
     * @throws Exception If the API request fails
     */
    public function mineTransactions(): array
    {
        // Send request to blockchain API to mine pending transactions
        $response = $this->api->makeRequest('POST', '/blockchain/mine');

        // Return a structured response using the shared formatResponse method
        return $this->formatResponse($response, $response['data'] ?? null);
    }
}
