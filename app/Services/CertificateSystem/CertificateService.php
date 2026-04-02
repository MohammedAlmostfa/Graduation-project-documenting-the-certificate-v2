<?php

namespace App\Services\CertificateSystem;

use App\Models\Department;
use App\Models\Major;
use App\Services\Service;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Service class for interacting with the Certificate System API.
 *
 * This class provides methods to issue, retrieve, sign, and verify certificates.
 * It acts as a bridge between the application and the external Certificate System API.
 */
class CertificateService extends Service
{
    /**
     * Issue a new certificate for a student.
     *
     * This method prepares the payload by resolving the student's department name
     * from the given department_id, then sends a request to the Certificate System API
     * to issue a new certificate.
     *
     * @param array $data Validated certificate data including student and academic details
     * @return array Formatted response containing message, status, and certificate data
     */
    public function issueCertificate(array $data): array
    {

        $data['major'] = Major::findOrFail($data['major_id'])->name;

        // Send request to issue a certificate
        $response = $this->api->makeRequest('POST', '/certificates', $data);
        Log::error($data);
        // Return formatted response
        return $this->formatResponse($response, $response['data'] ?? null);
    }

    /**
     * Retrieve all certificates.
     *
     * This method fetches all certificates from the Certificate System API.
     * Pagination and filters can be added later if needed.
     *
     * @return array Formatted response containing message, status, and list of certificates
     */
    public function getAllCertificates(): array
    {
        $response = $this->api->makeRequest('GET', '/certificates');

        return $this->formatResponse($response, $response['data']['certificates'] ?? null);
    }

    /**
     * Retrieve certificates by their status.
     *
     * This method fetches certificates filtered by a given status
     * (e.g., issued, signed, revoked).
     *
     * @param string $status Status filter for certificates
     * @return array Formatted response containing message, status, and list of certificates
     */
    public function getCertificatesByStatus(string $status): array
    {
        $response = $this->api->makeRequest('GET', "/certificates/status/{$status}");

        return $this->formatResponse($response, $response['data']['certificates'] ?? null);
    }

    /**
     * Retrieve a single certificate by its ID.
     *
     * @param string $certificateId Unique identifier of the certificate
     * @return array Formatted response containing message, status, and certificate data
     */
    // public function getCertificate(string $certificateId): array
    // {
    //     $response = $this->api->makeRequest('GET', "/certificates/{$certificateId}");

    //     return $this->formatResponse($response, $response['data'] ?? null);
    // }

    /**
     * Add a signature to a certificate.
     *
     * This method checks the authenticated user's role (dean or president).
     * If authorized, it sends a signing request to the Certificate System API.
     * If the signer is the president and signing succeeds, the certificate is
     * also submitted to the blockchain.
     *
     * @param string $certificateId Unique identifier of the certificate
     * @return array Formatted response containing message, status, and updated certificate data
     */
    public function signCertificate(string $certificateId): array
    {
        $user = Auth::user();

        // Allowed roles for signing
        $allowedRoles = ['dean', 'president'];
        $signerRole = null;

        // Determine the user's role
        foreach ($allowedRoles as $role) {
            if ($user->role == $role) {
                $signerRole = $role;
                break;
            }
        }

        // If user role is not authorized
        if (!$signerRole) {
            return $this->formatResponse([
                'status'  => 403,
                'message' => 'Unauthorized role for signing',
            ], null);
        }
        // Send signing request
        $response = $this->api->makeRequest(
            'POST',
            "/certificates/{$certificateId}/{$signerRole}/sign"
        );

        return $this->formatResponse($response, $response['data'] ?? null);
    }

    // /**
    //  * Verify the authenticity of a certificate.
    //  *
    //  * This method sends a validation request to the Certificate System API
    //  * to check whether the certificate is authentic and valid.
    //  *
    //  * @param string $certificateId Unique identifier of the certificate
    //  * @return array Formatted response containing message, status, and verification result
    //  */
    // public function verifyCertificate(string $certificateId): array
    // {
    //     $response = $this->api->makeRequest('GET', "/certificates/{$certificateId}/validate");

    //     return $this->formatResponse($response, $response['data'] ?? null);
    // }
}
