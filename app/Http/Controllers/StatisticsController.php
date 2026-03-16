<?php

namespace App\Http\Controllers;

use App\Services\StatisticsServise;

class StatisticsController extends Controller
{
    protected $StatisticsServise;
  public function __construct(StatisticsServise $StatisticsServise)
{
    $this->StatisticsServise = $StatisticsServise;
}

    public function index()
    {


        $result = $this->StatisticsServise->getStatistics();

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }
}
