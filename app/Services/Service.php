<?php

namespace App\Services;

use App\Support\ApiHelper;

abstract class Service
{
    protected ApiHelper $api;

    public function __construct(ApiHelper $api)
    {
        $this->api = $api;
    }

    protected function formatSuccessResponse(array $response, $data): array
    {
        return [
            'message' => $response['message'] ?? 'Success',
            'status'  => $response['status'] ?? 200,
            'data'    => $data,
        ];
    }

    protected function formatErrorResponse(array $response): array
    {
        return [
            'message' => $response['message'] ?? 'Error',
            'status'  => $response['status'] ?? 500,
            'data'    => null,
            'errors'   => $response['error'] ?? 'Unknown error',
        ];
    }

    protected function formatResponse(array $response, $data = null): array
    {
        return [
            'message' => $response['message'] ?? '',
            'status'  => $response['status'] ?? 500,
            'data' => $response['data'] ?? $data ?? null,
            'error'   => $response['error'] ?? null,
             'errors'   => $response['errors'] ?? null,
        ];
    }
}
