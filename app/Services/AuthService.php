<?php

namespace App\Services;

use Exception;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;

class AuthService
{
    /**
     * Login a user.
     *
     * This method authenticates a user using their email and password.
     * If successful, it returns a JWT token for further authenticated requests.
     *
     * @param array $credentials User credentials: email, password.
     * @return array Contains message, status, and token data.
     */
    public function login($credentials)
    {
        try {
            if (!$token = JWTAuth::attempt($credentials)) {
                return $this->response(401, 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
            }

            $user = Auth::user();

            return $this->response(200, 'تم تسجيل الدخول بنجاح', [

                'token' => $token,
                'type' => 'bearer',
                'role' => Auth::user()->role,
            ]);
        } catch (Exception $e) {
            Log::error('Error in login: ' . $e->getMessage());
            return $this->response(500, 'حدث خطأ أثناء تسجيل الدخول');
        }
    }

    /**
     * Logout the authenticated user.
     *
     * @return array Contains message and status.
     */
    public function logout()
    {
        try {
            Auth::logout();
            return $this->response(200, 'تم تسجيل الخروج بنجاح');
        } catch (Exception $e) {
            Log::error('Error in logout: ' . $e->getMessage());
            return $this->response(500, 'حدث خطأ أثناء تسجيل الخروج');
        }
    }

    /**
     * Refresh the JWT token for the authenticated user.
     *
     * @return array Contains message, status, and new token.
     */
    public function refresh()
    {
        try {
            $newToken = JWTAuth::parseToken()->refresh();

            return $this->response(200, 'تم تجديد التوكن بنجاح', [

                'token' => $newToken,
                'type' => 'bearer',

            ]);
        } catch (Exception $e) {
            Log::error('Error in token refresh: ' . $e->getMessage());
            return $this->response(500, 'حدث خطأ أثناء تجديد التوكن');
        }
    }

    /**
     * Helper method for consistent API responses.
     */
    private function response(int $status, string $message, $data = null): array
    {
        return [
            'status' => $status,
            'message' => $message,
            'data' => $data
        ];
    }
}
