<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Certificate System API Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for connecting to the Certificate System API
    |
    */

    'api_url' => env('CERTIFICATE_SYSTEM_API_URL', 'http://localhost:3000/api'),

    'timeout' => env('CERTIFICATE_SYSTEM_TIMEOUT', 30),

    'university' => [
        'name' => env('UNIVERSITY_NAME', 'Homs University'),
        'code' => env('UNIVERSITY_CODE', 'HU'),
    ],

    'roles' => [
        'university' => 'university',
        'dean' => 'dean',
        'university_president' => 'university_president',
    ],

    'default_signers' => ['university', 'dean', 'university_president'],
];
