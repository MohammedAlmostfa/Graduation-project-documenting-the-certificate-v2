<?php

namespace App\Http\Controllers;

use App\Http\Requests\BackupRequest;
use App\Services\BackupServise;
use Illuminate\Http\Request;

/**
 * Class BackupController
 *
 * Handles backup-related operations such as:
 * - Listing all backups
 * - Creating a backup
 * - Restoring a backup
 * - Deleting a backup
 */
class BackupController extends Controller
{
    /**
     * Backup service instance.
     *
     * @var BackupServise
     */
    protected $buckupService;

    /**
     * Constructor.
     *
     * Injects the backup service dependency.
     *
     * @param BackupServise $buckupService
     */
    public function __construct(BackupServise $buckupService)
    {
        $this->buckupService = $buckupService;
    }

    /**
     * Get all backups.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        $result = $this->buckupService->GetAllBuckups();

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }

    /**
     * Create a new backup.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function store()
    {
        $result = $this->buckupService->StoreBackups();

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }

    /**
     * Restore a backup.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function restore( BackupRequest $request)
    {
        $backupName = $request->input('backupFilename');

        $result = $this->buckupService->RestoreBackups($backupName);

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }

    /**
     * Delete a backup.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function delete(BackupRequest $request)
    {
        $backupName = $request->input('backupFilename');

        $result = $this->buckupService->DeletBackups($backupName);

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }
}
