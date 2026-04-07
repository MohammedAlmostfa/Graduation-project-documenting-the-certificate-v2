<?php

namespace App\Services;

use App\Models\User;
use App\Models\Department;
use Illuminate\Support\Facades\Log;


class UserService extends Service
{
    public function getAllUsers(): array
    {
        $response = $this->api->makeRequest('GET', '/admin/users');

        if ($response['status'] !== 200) {
            return $this->formatErrorResponse($response);
        }

           return $this->formatResponse($response, $response['data'] ?? null);


    }

    public function createUser(array $data): array
    {


        $response = $this->api->makeRequest('POST', '/admin/users', [
            'username'   => $data['name'],
            'email'      => $data['email'],
            'role'       => $data['role'],
            'department' => $data['department'],
            'password'   => $data['password']
        ]);


        return $this->formatResponse($response, $response['data']['user'] ?? null);
    }

public function getUser(int $id): array
{
    $user = User::findOrFail($id);

    $response = $this->api->makeRequest('GET', '/admin/users/' . $user->user_id);

    return $this->formatSuccessResponse($response, $response['data'] ?? null);
}


}
