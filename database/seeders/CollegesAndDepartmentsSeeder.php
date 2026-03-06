<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\College;

class CollegesAndDepartmentsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $colleges = [
            'السنة التحضيرية للكليات الطبية',
            'كلية الطب البشري',
            'كلية طب الأسنان',
            'كلية الصيدلة',
            'كلية العلوم الصحية',
            'كلية الهندسة المعلوماتية',
            'كلية الهندسة المدنية',
            'كلية الهندسة المعمارية',
            'كلية الهندسة الكيميائية و البترولية',
            'كلية الهندسة الميكانيكية و الكهربائية',
            'كلية الزراعة',
            'الكلية التطبيقية',
            'كلية الآداب و العلوم الإنسانية',
            'كلية الحقوق',
            'كلية السياحة',
            'كلية التربية',
            'كلية التربية (تدمر)',
            'كلية التربية الموسيقية',
        ];

        foreach ($colleges as $collegeName) {
            $college = College::create([
                'name' => $collegeName,
                'description' => $collegeName,
            ]);

            // إنشاء قسمين افتراضيين لكل كلية
            $college->departments()->createMany([
                ['name' => 'قسم 1'],
                ['name' => 'قسم 2'],
            ]);
        }
    }
}
