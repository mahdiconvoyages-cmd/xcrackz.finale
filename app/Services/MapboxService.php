<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class MapboxService
{
    private string $accessToken;
    private Client $client;

    public function __construct()
    {
        $this->accessToken = env('MAPBOX_ACCESS_TOKEN');
        $this->client = new Client([
            'base_uri' => 'https://api.mapbox.com/'
        ]);
    }

    public function geocode(string $query): array
    {
        try {
            $response = $this->client->get("geocoding/v5/mapbox.places/" . urlencode($query) . ".json", [
                'query' => [
                    'access_token' => $this->accessToken,
                    'limit' => 5
                ]
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getDirections(float $lng1, float $lat1, float $lng2, float $lat2): array
    {
        try {
            $coordinates = "{$lng1},{$lat1};{$lng2},{$lat2}";
            $response = $this->client->get("directions/v5/mapbox/driving/{$coordinates}", [
                'query' => [
                    'access_token' => $this->accessToken,
                    'geometries' => 'geojson',
                    'overview' => 'full'
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            if (isset($data['routes'][0])) {
                return [
                    'distance_km' => $data['routes'][0]['distance'] / 1000,
                    'duration_min' => $data['routes'][0]['duration'] / 60,
                    'geometry' => $data['routes'][0]['geometry']
                ];
            }

            return ['error' => 'No route found'];
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getCoordinates(string $address): ?array
    {
        $result = $this->geocode($address);

        if (isset($result['features'][0]['geometry']['coordinates'])) {
            $coords = $result['features'][0]['geometry']['coordinates'];
            return [
                'lng' => $coords[0],
                'lat' => $coords[1]
            ];
        }

        return null;
    }
}
