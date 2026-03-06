<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * تحويل بيانات المستخدم إلى تنسيق JSON منظم.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'department' => [
                'id' => $this->department?->id,
                'name' => $this->department?->name,
                  ],
                'college' => [

                    'id' => $this->department?->college?->id,
                    'name' => $this->department?->college?->name,


            ],
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}
