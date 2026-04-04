<?php

namespace App\Http\Requests\CertificateFormRequest;

use App\Enums\CertificateType;
use App\Enums\GraduationCycle;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Foundation\Http\FormRequest;

class IssueCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {

        return true;
    }

    public function rules(): array
    {
        return [
            'studentName'     => 'required|string|max:255',
            'studentEmail'    => 'required|email|max:255',
            'studentId'       => 'required|string|max:50',
            'graduationDate'  => 'required|date',
            'gpa'             => 'required|numeric|min:60|max:90',
            'certificateType' => 'required|string|max:100',
            'major'        => 'required|string|max:255',
            'dateOfBirth'     => 'required|date',
            'nationality'     => 'required|string|max:100',
            'graduationCycle' => ['required', new Enum(GraduationCycle::class)],
            'fatherName'      => 'required|string|max:255',
            'motherName'      => 'required|string|max:255',
            'certificateType' => ['required', new Enum(CertificateType::class)]

        ];
    }
}
