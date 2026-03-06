<?php

namespace App\Enums;

enum GraduationCycle: string
{
    case FIRST_SEMESTER  = 'دورة فصل أول';
    case SECOND_SEMESTER = 'دورة فصل ثاني';
    case COMPLETION      = 'دورة تكميلية';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }


    public static function keys(): array
    {
        return array_column(self::cases(), 'name');
    }
}
