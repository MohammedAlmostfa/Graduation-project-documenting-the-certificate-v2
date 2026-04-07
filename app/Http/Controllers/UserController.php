<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use App\Services\UserService;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\UserResource;
use App\Http\Requests\UserFormRequest\StoreUserRequest;
use App\Http\Requests\UserFormRequest\UpdateUserRequest;

/**
 * Controller for managing user-related operations.
 *
 * Provides endpoints to list, create, and retrieve users.
 * Uses the UserService layer to interact with the underlying API or database.
 */
class UserController extends Controller
{
    /**
     * @var UserService
     */
    protected $userService;

    /**
     * Constructor
     *
     * @param UserService $userService Service layer for user operations
     */
    public function __construct(UserService $userService)
    {
        $this->userService = $userService;
    }

    /**
     * Display a listing of users.
     *
     * Calls the UserService to fetch all users and returns them
     * wrapped in a UserResource collection.
     *
     * @return \Illuminate\Http\JsonResponse JSON response with list of users or error
     */
    public function index()
    {
        $result = $this->userService->GetAllUsers();

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }

    /**
     * Store a newly created user in storage.
     *
     * Validates the incoming request using StoreUserRequest,
     * then calls the UserService to create the user.
     *
     * @param StoreUserRequest $request Validated request containing user data
     * @return \Illuminate\Http\JsonResponse JSON response with created user or error
     */
    public function store(StoreUserRequest $request)
    {
        $validatedData = $request->validated();
        $result = $this->userService->createUser($validatedData);

        return $result['status'] === 201
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }

    /**
     * Display the specified user.
     *
     * Calls the UserService to fetch a single user by ID.
     * Logs the API response for debugging purposes.
     *
     * @param int $id User ID
     * @return \Illuminate\Http\JsonResponse JSON response with user data or error
     */
    public function show($id)
    {
        $result = $this->userService->getUser($id);

        // Log the raw API response for debugging
        Log::debug('API response', $result);

        return $result['status'] === 200
            ? self::success($result['data'], $result['message'], $result['status'])
            : self::error($result['errors'], $result['message'], $result['status']);
    }
}
