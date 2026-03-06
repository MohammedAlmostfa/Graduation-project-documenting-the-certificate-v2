<?php

namespace App\Http\Controllers\CertificateSystem;

use App\Http\Controllers\Controller;
use App\Services\CertificateSystem\CertificateService;
use App\Http\Requests\CertificateFormRequest\IssueCertificateRequest;

use function Illuminate\Log\log;

/**
 * Controller for managing certificate-related operations.
 *
 * Provides endpoints to issue, retrieve, verify, and sign certificates.
 * Delegates business logic to the CertificateService layer.
 */
class CertificateController extends Controller
{
    /**
     * @var CertificateService
     */
    private CertificateService $certificateService;

    /**
     * Constructor
     *
     * @param CertificateService $certificateService Service layer for certificate operations
     */
    public function __construct(CertificateService $certificateService)
    {
        $this->certificateService = $certificateService;
    }


    public function getCertificate()
    {
        return view('certificate');
        //     $result = $this->certificateService->getCertificate($certificateHash);

        // return $result['status'] === 200
        //     ? self::success($result['data'], $result['message'], $result['status'])
        //     : self::error(null, $result['message'], $result['status']);
    }

    /**
     * Retrieve certificates filtered by status.
     *
     * Calls the CertificateService to fetch certificates with a given status.
     *
     * @param string $Status Status filter (e.g., issued, signed, revoked)
     * @return \Illuminate\Http\JsonResponse JSON response with list of certificates or error
     */
    public function getCertificatesByStatus(string $status)
    {
        $result = $this->certificateService->getCertificatesByStatus($status);

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error(null, $result['message'], $result['status']);
    }

    /**
     * Retrieve all certificates with optional pagination and filters.
     *
     * Calls the CertificateService to fetch all certificates.
     *
     * @return \Illuminate\Http\JsonResponse JSON response with list of certificates or error
     */
    public function getAllCertificates()
    {
        $result = $this->certificateService->getAllCertificates();

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['error'], $result['message'], $result['status']);
    }

    /**
     * Get counts of certificates per department.
     * Optional query parameter: year (e.g., ?year=2025). If omitted, returns totals across all years.
     * Returns list of departments with their certificate counts and an overall total.
     */
    public function getDepartmentCertificateCounts(\Illuminate\Http\Request $request)
    {
        $year = $request->query('year');

        $result = $this->certificateService->getAllCertificates();

        if ($result['status'] !== 200) {
            return self::error($result['error'] ?? null, $result['message'] ?? 'Failed to fetch certificates', $result['status'] ?? 500);
        }
        // Normalize different possible shapes returned by CertificateService:
        // - ['data' => ['count' => n, 'certificates' => [...]]]
        // - ['data' => [...certificates array...]]
        $data = $result['data'] ?? null;

        if (is_array($data) && array_key_exists('certificates', $data) && is_array($data['certificates'])) {
            $certificates = $data['certificates'];
        } elseif (is_object($data) && property_exists($data, 'certificates') && is_array($data->certificates)) {
            $certificates = $data->certificates;
        } elseif (is_array($data)) {
            // If data itself is an indexed array of certificates
            $certificates = $data;
        } else {
            $certificates = [];
        }
        $countsByDepartment = [];
        $total = 0;

        foreach ($certificates as $cert) {
            // Try several possible locations for department/major and issue date
            $dept = null;
            if (is_array($cert) && isset($cert['student']['major'])) {
                $dept = $cert['student']['major'];
            } elseif (is_object($cert) && isset($cert->student->major)) {
                $dept = $cert->student->major;
            };
            if (empty($dept)) {
                // skip certificates without a department
                continue;
            }


            $issueDate = $cert['issueDate'] ?? $cert['createdAt'] ?? ($cert['created_at'] ?? null);

            $certYear = null;
            if ($issueDate) {
                try {
                    $certYear = date('Y', strtotime($issueDate));
                } catch (\Throwable $e) {
                    $certYear = null;
                }
            }

            // If year filter is provided, skip non-matching certificates
            if ($year) {
                if ($certYear === null || (string)$certYear !== (string)$year) {
                    continue;
                }
            }

            if (!isset($countsByDepartment[$dept])) {
                $countsByDepartment[$dept] = 0;
            }
            $countsByDepartment[$dept]++;
            $total++;
        }

        // Prepare response array: list of { department, count }
        $departments = [];
        foreach ($countsByDepartment as $d => $c) {
            $departments[] = ['department' => $d, 'count' => $c];
        }

        // Sort departments by count desc
        usort($departments, function ($a, $b) {
            return $b['count'] <=> $a['count'];
        });

        $data = [
            'year' => $year ?? 'all',
            'totalCertificates' => $total,
            'departments' => $departments,
        ];

        return self::success($data, 'Certificate counts by department', 200);
    }

    /**
     * Issue a new certificate.
     *
     * Validates the incoming request using IssueCertificateRequest,
     * then calls the CertificateService to issue the certificate.
     *
     * @param IssueCertificateRequest $request Validated request containing certificate details
     * @return \Illuminate\Http\JsonResponse JSON response with success or error message
     */
    public function issueCertificate(IssueCertificateRequest $request)
    {
        $validated = $request->validated();

        $result = $this->certificateService->issueCertificate($validated);

        return $result['status'] === 201
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['error'], $result['message'], $result['status']);
    }


    public function verifyCertificate()
    {
        return view('verification');
    }

    /**
     * Sign a certificate by its ID.
     *
     * Calls the CertificateService to sign a certificate.
     * If the signer is the president, the certificate may also be pushed to the blockchain.
     *
     * @param string $certificateId Unique certificate ID
     * @return \Illuminate\Http\JsonResponse JSON response with updated certificate or error
     */
    public function signCertificate(string $certificateId)
    {
        $result = $this->certificateService->signCertificate($certificateId);

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['error'], $result['message'], $result['status']);
    }
}
