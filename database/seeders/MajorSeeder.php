<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class MajorSeeder extends Seeder
{
    public function run(): void
    {
        $majors = [
            ['name' => ' الطاقة الكهربائية'],
            ['name' => ' إلكترونيات  والاتصالات'],
            ['name' => '  قوى الميكانيكية'],
            ['name' => 'التحكم الآلي والحواسيب'],
            ['name' => 'ميكاترونك'],
            ['name' => 'هندسة المعادن'],
            ['name' => 'التصميم والإنتاج'],



        ];

        foreach ($majors as $major) {
            \App\Models\Major::create($major);
        }
    }
}
