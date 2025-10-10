<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Mapbox Configuration
    |--------------------------------------------------------------------------
    |
    | Configure your Mapbox API access here.
    |
    */

    'access_token' => env('MAPBOX_ACCESS_TOKEN'),

    'api_url' => 'https://api.mapbox.com',

    'geocoding' => [
        'version' => 'v5',
        'endpoint' => 'mapbox.places',
        'limit' => 5,
    ],

    'directions' => [
        'version' => 'v5',
        'profile' => 'mapbox/driving',
        'geometries' => 'geojson',
        'overview' => 'full',
    ],
];
