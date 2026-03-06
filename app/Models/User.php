<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable, HasFactory, HasRoles;

    protected $primaryKey = 'id';
    public $incrementing = false;       // ← UUID مش auto increment
    protected $keyType = 'string';      // ← UUID string مش integer

    protected $fillable = [
        'id',
        'username',
        'email',
        'password',
        'role',
        'department',
    ];

    protected $guard_name = 'api';

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [];
    }
}
