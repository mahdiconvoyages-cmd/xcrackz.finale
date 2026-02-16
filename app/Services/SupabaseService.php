<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

class SupabaseService
{
    private string $url;
    private string $anonKey;
    private string $serviceRoleKey;
    private Client $client;

    public function __construct()
    {
        $this->url = env('SUPABASE_URL');
        $this->anonKey = env('SUPABASE_ANON_KEY');
        $this->serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY', $this->anonKey);

        $this->client = new Client([
            'base_uri' => $this->url,
            'headers' => [
                'apikey' => $this->anonKey,
                'Content-Type' => 'application/json',
            ]
        ]);
    }

    public function getClient(): Client
    {
        return $this->client;
    }

    public function signUp(string $email, string $password, array $metadata = []): array
    {
        try {
            $response = $this->client->post('/auth/v1/signup', [
                'json' => [
                    'email' => $email,
                    'password' => $password,
                    'data' => $metadata
                ]
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function signIn(string $email, string $password): array
    {
        try {
            $response = $this->client->post('/auth/v1/token?grant_type=password', [
                'json' => [
                    'email' => $email,
                    'password' => $password
                ]
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getUser(string $accessToken): array
    {
        try {
            $response = $this->client->get('/auth/v1/user', [
                'headers' => [
                    'Authorization' => "Bearer {$accessToken}"
                ]
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function signOut(string $accessToken): bool
    {
        try {
            $this->client->post('/auth/v1/logout', [
                'headers' => [
                    'Authorization' => "Bearer {$accessToken}"
                ]
            ]);

            return true;
        } catch (GuzzleException $e) {
            return false;
        }
    }

    public function query(string $table, array $options = []): array
    {
        try {
            $queryParams = $this->buildQueryParams($options);
            $response = $this->client->get("/rest/v1/{$table}{$queryParams}");

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function insert(string $table, array $data, string $accessToken = null): array
    {
        try {
            $headers = [];
            if ($accessToken) {
                $headers['Authorization'] = "Bearer {$accessToken}";
            }

            $response = $this->client->post("/rest/v1/{$table}", [
                'headers' => $headers,
                'json' => $data
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function update(string $table, array $data, array $filter, string $accessToken = null): array
    {
        try {
            $headers = [];
            if ($accessToken) {
                $headers['Authorization'] = "Bearer {$accessToken}";
            }

            $queryParams = $this->buildQueryParams(['filter' => $filter]);
            $response = $this->client->patch("/rest/v1/{$table}{$queryParams}", [
                'headers' => $headers,
                'json' => $data
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function delete(string $table, array $filter, string $accessToken = null): bool
    {
        try {
            $headers = [];
            if ($accessToken) {
                $headers['Authorization'] = "Bearer {$accessToken}";
            }

            $queryParams = $this->buildQueryParams(['filter' => $filter]);
            $this->client->delete("/rest/v1/{$table}{$queryParams}", [
                'headers' => $headers
            ]);

            return true;
        } catch (GuzzleException $e) {
            return false;
        }
    }

    public function uploadFile(string $bucket, string $path, $fileContent, string $contentType = 'image/jpeg'): array
    {
        try {
            $response = $this->client->post("/storage/v1/object/{$bucket}/{$path}", [
                'headers' => [
                    'Content-Type' => $contentType
                ],
                'body' => $fileContent
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    public function getPublicUrl(string $bucket, string $path): string
    {
        return "{$this->url}/storage/v1/object/public/{$bucket}/{$path}";
    }

    public function rpc(string $functionName, array $params = [], string $accessToken = null): array
    {
        try {
            $headers = [];
            if ($accessToken) {
                $headers['Authorization'] = "Bearer {$accessToken}";
            }

            $response = $this->client->post("/rest/v1/rpc/{$functionName}", [
                'headers' => $headers,
                'json' => $params
            ]);

            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            return ['error' => $e->getMessage()];
        }
    }

    private function buildQueryParams(array $options): string
    {
        $params = [];

        if (isset($options['select'])) {
            $params[] = "select=" . urlencode($options['select']);
        }

        if (isset($options['filter'])) {
            foreach ($options['filter'] as $key => $value) {
                $params[] = "{$key}=eq.{$value}";
            }
        }

        if (isset($options['order'])) {
            $params[] = "order=" . urlencode($options['order']);
        }

        if (isset($options['limit'])) {
            $params[] = "limit={$options['limit']}";
        }

        if (isset($options['offset'])) {
            $params[] = "offset={$options['offset']}";
        }

        return !empty($params) ? '?' . implode('&', $params) : '';
    }
}
