<?php

namespace App\Services;



class StatisticsServise extends Service
{
    public function getStatistics()
    {
        $response = $this->api->makeRequest('get', '/admin/stats');

        return $this->formatResponse($response, $response['data'] ?? null);
    }
}
