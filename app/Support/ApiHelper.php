<?php

namespace App\Support;


use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class ApiHelper
{
    private string $baseUrl;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('certificate-system.api_url', 'http://localhost:3000/api');
        $this->timeout = config('certificate-system.timeout', 30);
    }

    public function makeRequest(string $method, string $url, array $data = [], array $query = [])
    {
        try {
            $request = Http::timeout($this->timeout)->withHeaders([
                'x-user-id' => Auth::user()->id ?? 0 ,
            ]);


            if (!empty($query)) {
                $request = $request->withQueryParameters($query);
            }

            $fullUrl = $this->resolveUrl($url);

            $response = $request->{$method}($fullUrl, $data);
            $json = $response->json() ?? [];

            return [
                'status'  => $response->status(),
                'data'    => $json['data'] ?? null,
                'message' => $json['message'] ?? ($response->failed() ? 'Request failed' : 'OK'),
                'error'  => $json['error'] ?? null,
            ];
        } catch (\Exception $e) {
            return [
                'status'  => 500,
                'data'    => null,
                'message' => 'Exception during request: ' . $e->getMessage(),
            ];


            return [
                'status'  => 500,
                'data'    => null,
                'message' => 'Exception during request',
            ];
        }
    }

    private function resolveUrl(string $url): string
    {
        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }
        return rtrim($this->baseUrl, '/') . '/' . ltrim($url, '/');
    }
}
