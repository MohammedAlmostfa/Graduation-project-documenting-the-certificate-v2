<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blockchain', function (Blueprint $table) {
            $table->id();
            $table->integer('block_index')->unique();
            $table->dateTime('timestamp');
            $table->string('previous_hash');
            $table->string('hash')->unique();
            $table->bigInteger('nonce');
            $table->integer('difficulty');
            $table->json('certificate_ids')->default('[]');
            $table->string('merkle_root')->default('');
            $table->timestamps();

            $table->index('block_index', 'idx_block_index');
            $table->index('previous_hash', 'idx_previous_hash');
            $table->index('merkle_root', 'idx_merkle_root');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blockchain');
    }
};
