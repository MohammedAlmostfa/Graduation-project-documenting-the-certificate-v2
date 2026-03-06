<?php

namespace App\Enums;

enum Role: string
{
    case ADMIN = 'admin';
    case OFFICER   = 'officer';
    case DEAN      = 'dean';
    case PRESIDENT  = 'president';

    /**
     * Get all values as array
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get all keys as array
     */
    public static function keys(): array
    {
        return array_column(self::cases(), 'name');
    }
}
