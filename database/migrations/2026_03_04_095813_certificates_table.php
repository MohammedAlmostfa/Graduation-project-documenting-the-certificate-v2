<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('certificate_number', 100)->unique();
            $table->string('student_id', 36);
            $table->dateTime('issue_date');
            $table->string('certificate_type', 50);
            $table->string('status', 50);
            $table->date('graduation_date')->nullable();
            $table->string('graduation_cycle', 50)->nullable();
            $table->decimal('gpa', 4, 2)->nullable();
            $table->string('honors', 100)->nullable();

            $table->string('certificate_hash', 255)->comment('Immutable certificate core hash');
            $table->string('transaction_hash', 255)->nullable();
            $table->unsignedBigInteger('block_id')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('students')->onDelete('cascade');
            $table->foreign('block_id')->references('id')->on('blockchain')->onDelete('restrict');

            $table->index('status', 'idx_cert_status');
            $table->index('student_id', 'idx_cert_student');
            $table->index('block_id', 'idx_cert_block');
            $table->unique(['student_id', 'certificate_type'], 'uq_student_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
