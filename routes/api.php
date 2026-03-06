<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

use App\Http\Controllers\UserController;
use App\Http\Controllers\CertificateSystem\BlockchainController;
use App\Http\Controllers\CertificateSystem\CertificateController;

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

Route::middleware(['auth:api'])->group(function () {
    Route::apiResource('users', UserController::class);

    Route::post('blockchain/mine', [BlockchainController::class, 'mineTransactions']);


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
});
