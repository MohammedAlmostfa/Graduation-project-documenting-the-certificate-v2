<?php

namespace App\Http\Requests\UserFormRequest;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
                'name'=>'nullable|string|max:255',
        'email'=>'nullable|string|email|max:255|unique:users,email',
        'password'=>'nullable|string|min:8|confirmed',
        'department_id'=>'nullable|exists:departments,id',
        ];
    }
}
