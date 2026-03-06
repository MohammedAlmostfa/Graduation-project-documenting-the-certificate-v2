<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_signatures', function (Blueprint $table) {
            $table->id();
            $table->string('certificate_id', 36);
            $table->string('signer_id', 36)->nullable();
            $table->longText('signature')->comment('Only stores cryptographic signature');
            $table->timestamps();

            $table->foreign('certificate_id')->references('id')->on('certificates')->onDelete('cascade');
            $table->foreign('signer_id')->references('id')->on('users')->onDelete('set null');

            $table->index('certificate_id', 'idx_sig_cert');
            $table->index('signer_id', 'idx_sig_signer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_signatures');
    }
};
