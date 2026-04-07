<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CertificateSystem\BlockchainController;
use App\Http\Controllers\CertificateSystem\CertificateController;
use App\Http\Controllers\StatisticsController;

Route::middleware(['auth:api'])->group(function () {
    Route::get('/test-auth', function () {
        return response()->json([
            'user' => auth('api')->user(),
            'token_received' => request()->bearerToken(),
        ]);
    });
});




Route::post('/login', [AuthController::class, 'login']);

Route::post('/refresh', [AuthController::class, 'refresh']);

Route::post('/logout', [AuthController::class, 'logout']);

Route::post('certificates/{certificate_id}}/validate', [CertificateController::class, 'verifyCertificate']);

// Route::middleware(['auth:api'])->group(function () {

    Route::get('/stastistics', [StatisticsController::class, 'index']);
    Route::apiResource('users', UserController::class);

    Route::post('blockchain/mine', [BlockchainController::class, 'mineTransactions']);

    Route::prefix('backups')->group(function () {


        Route::post('/', [BackupController::class, 'Store']);
        Route::get('/', [BackupController::class, 'index']);
        Route::post('/restore', [BackupController::class, 'Restore']);
        Route::delete('/', [BackupController::class, 'delete']);
    });
    Route::prefix('certificates')->group(function () {



        Route::post('/', [CertificateController::class, 'issueCertificate']);
        // Department counts (optional query param: year)
        Route::get('/departments/counts', [CertificateController::class, 'getDepartmentCertificateCounts']);
        Route::get('/', [CertificateController::class, 'getAllCertificates']);
        Route::get('/{certificateId}', [CertificateController::class, 'getCertificate']);
        Route::post('/{certificateId}/sign', [CertificateController::class, 'signCertificate']);
        Route::get('/status/{status}', [CertificateController::class, 'getCertificatesByStatus']);



        // Route::post('/verify', [CertificateController::class, 'verifyCertificate']);
        // Route::get('/student/{studentId}', [CertificateController::class, 'getStudentCertificates']);
        // Route::get('/', [CertificateController::class, 'getAllCertificates']);

        // // البلوك تشين
        // Route::post('/blockchain/mine', [BlockchainController::class, 'minePendingTransactions']);
        // Route::get('/blockchain/info', [BlockchainController::class, 'getBlockchainInfo']);

        // // الموقعين
        // Route::post('/signers/create', [CertificateController::class, 'createSigner']);
        // Route::get('/signers', [CertificateController::class, 'getSigners']);

        // // النظام
        // Route::get('/statistics', [CertificateController::class, 'getStatistics']);
        // Route::get('/health', [CertificateController::class, 'healthCheck']);
    });
// });
