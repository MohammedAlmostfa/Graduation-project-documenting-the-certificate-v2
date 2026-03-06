<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Role::create(['name' => 'dean', 'guard_name' => 'api']);
        Role::create(['name' => 'president', 'guard_name' => 'api']);
        Role::create(['name' => 'officer', 'guard_name' => 'api']);
            Role::create(['name' => 'admin', 'guard_name' => 'api']);
    }
}
