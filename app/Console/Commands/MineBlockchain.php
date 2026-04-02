<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Support\ApiHelper;

class MineBlockchain extends Command
{
    protected $signature = 'blockchain:mine';
    protected $description = 'Mine a new blockchain block';

    protected ApiHelper $api;

    public function __construct(ApiHelper $api)
    {
        parent::__construct();
        $this->api = $api;
    }

    public function handle()
    {
        $this->info('Starting blockchain mining...');

        $response = $this->api->makeRequest('POST', '/blockchain/mine');

        if ($response['status'] !== 200) {
            $this->error('Mining failed: ' . $response['message']);
            return 1;
        }

        $this->info('Mining completed successfully!');
        return 0;
    }
}
