<?php

namespace App\Services;

use App\Services\Service;

/**
 * Class BackupsServise
 *
 * Handles all backup-related API requests:
 * - Fetch all backups
 * - Create a new backup
 * - Restore backups
 * - Delete backups
 */
class BackupServise extends Service
{
    /**
     * Get all backups.
     *
     * Sends a GET request to the API to retrieve all backups.
     *
     * @return array Formatted API response
     */
    public function GetAllBuckups()
    {
        // Send GET request to fetch backups
        $response = $this->api->makeRequest('get', '/admin/backup');

        // Format and return response
        return $this->formatResponse($response, $response['data'] ?? null);
    }

    /**
     * Create a new backup.
     *
     * Sends a POST request to trigger backup creation.
     *
     * @return array Formatted API response
     */
    public function StoreBackups()
    {
        // Send POST request to create a backup
        $response = $this->api->makeRequest('get', '/admin/backup');

        // Format and return response
        return $this->formatResponse($response, $response['data'] ?? null);
    }

    /**
     * Restore backups.
     *
     * Sends a POST request to restore backups.
     * NOTE: Endpoint may need verification (currently '/admin/stats').
     *
     * @return array Formatted API response
     */
    public function RestoreBackups($backupName)
    {
        // Send POST request to restore backups
        $response = $this->api->makeRequest('post', '/admin/backup/restore', [
            'backupFilename' => $backupName
        ]);

        // Format and return response
        return $this->formatResponse($response, $response['data'] ?? null);
    }

    /**
     * Delete backups.
     *
     * Sends a request to delete backups.
     * NOTE: Endpoint and HTTP method may need verification (currently GET '/admin/stats').
     *
     * @return array Formatted API response
     */

    public function DeletBackups($buckupNmae)
    {
        // Send request to delete backups
        $response = $this->api->makeRequest('delete', '/admin/backup', [
            'backupFilename' => $buckupNmae
        ]       );

        // Format and return response
        return $this->formatResponse($response, $response['data']['message'] ?? null);
    }
}
