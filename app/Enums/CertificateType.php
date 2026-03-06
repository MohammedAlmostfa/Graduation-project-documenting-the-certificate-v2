<?php

namespace App\Enums;

enum CertificateType: string
{
    case BACHELOR = 'بكالوريوس';
    case MASTER   = 'ماجستير';
    case PHD      = 'دكتوراه';
    case DIPLOMA  = 'دبلوم';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }


    public static function keys(): array
    {
        return array_column(self::cases(), 'name');
    }
}
