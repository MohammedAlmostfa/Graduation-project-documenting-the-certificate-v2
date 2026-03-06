<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class College extends Model
{
    protected $fillable = ['name', 'description'];
public $timestamps = false;
    public function departments()
    {
        return $this->hasMany(Department::class);
    }
}
