<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('username', 100)->unique();
            $table->string('email', 150)->unique();
            $table->string('password', 255);
            $table->string('role', 50);
            $table->string('department', 100);
            $table->timestamps();
            $table->index('role', 'idx_user_role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
