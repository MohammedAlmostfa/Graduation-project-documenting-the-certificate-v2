<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Major extends Model
{
  protected $fillable = ['name', 'college_id', 'description'];
public $timestamps = false;
    public function college()
    {
        return $this->belongsTo(College::class);
    }


    public function users()
    {
        return $this->hasMany(User::class);
    }
}
