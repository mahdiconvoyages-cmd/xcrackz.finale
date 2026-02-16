<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Supabase Configuration
    |--------------------------------------------------------------------------
    |
    | Configure your Supabase project connection here.
    |
    */

    'url' => env('SUPABASE_URL'),
    'anon_key' => env('SUPABASE_ANON_KEY'),
    'service_role_key' => env('SUPABASE_SERVICE_ROLE_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Storage Buckets
    |--------------------------------------------------------------------------
    |
    | Define your storage buckets here.
    |
    */

    'buckets' => [
        'avatars' => [
            'name' => 'avatars',
            'public' => true,
        ],
        'mission_photos' => [
            'name' => 'mission-photos',
            'public' => true,
        ],
        'company_logos' => [
            'name' => 'company-logos',
            'public' => true,
        ],
        'verification_documents' => [
            'name' => 'verification-documents',
            'public' => false,
        ],
    ],
];
