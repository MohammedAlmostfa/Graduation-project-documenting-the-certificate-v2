<?php
// App\Models\Department.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    protected $fillable = ['name', 'description', 'college_id'];

    public function college()
    {
        return $this->belongsTo(College::class);
    }
}
