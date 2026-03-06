<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CertificateSystem\BlockchainController;
use App\Http\Controllers\CertificateSystem\CertificateController;


Route::get('/', function () {
    return view('welcome');
});

Route::get('certificate/verify', [CertificateController::class, 'verifyCertificate']);
   Route::get('certificate/', [CertificateController::class, 'getCertificate']);
Route::get('blockchainDashboard/info', [BlockchainController::class, 'getBlockchainInfo']);
