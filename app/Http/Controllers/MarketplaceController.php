<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;

class MarketplaceController extends Controller
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function index(Request $request)
    {
        $search = $request->get('search');
        $origin = $request->get('origin');
        $destination = $request->get('destination');
        $category = $request->get('category');
        $verifiedOnly = $request->get('verified_only', false);

        $missions = $this->supabase->query('marketplace_missions', [
            'filter' => ['status' => 'published'],
            'order' => 'created_at.desc'
        ]);

        if (!isset($missions['error']) && is_array($missions)) {
            if ($search) {
                $missions = array_filter($missions, fn($m) =>
                    stripos($m['title'], $search) !== false ||
                    stripos($m['description'], $search) !== false
                );
            }

            if ($origin) {
                $missions = array_filter($missions, fn($m) =>
                    stripos($m['origin_city'], $origin) !== false
                );
            }

            if ($destination) {
                $missions = array_filter($missions, fn($m) =>
                    stripos($m['destination_city'], $destination) !== false
                );
            }

            if ($category) {
                $missions = array_filter($missions, fn($m) => $m['category'] === $category);
            }

            foreach ($missions as &$mission) {
                $creator = $this->supabase->query('profiles', [
                    'filter' => ['user_id' => $mission['creator_id']],
                    'limit' => 1
                ]);

                if (!empty($creator) && !isset($creator['error'])) {
                    $mission['creator'] = $creator[0];
                }
            }

            if ($verifiedOnly) {
                $missions = array_filter($missions, fn($m) =>
                    isset($m['creator']['is_verified']) && $m['creator']['is_verified']
                );
            }
        }

        return view('marketplace.index', compact('missions', 'search', 'origin', 'destination', 'category', 'verifiedOnly'));
    }

    public function create()
    {
        return view('marketplace.create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|in:convoyage,transport',
            'budget' => 'nullable|numeric',
            'origin_city' => 'required|string',
            'origin_address' => 'nullable|string',
            'destination_city' => 'required|string',
            'destination_address' => 'nullable|string',
            'departure_date' => 'nullable|date',
            'departure_time' => 'nullable'
        ]);

        $userId = session('user')['id'];

        $missionData = [
            'creator_id' => $userId,
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'budget' => $request->budget,
            'origin_city' => $request->origin_city,
            'origin_address' => $request->origin_address,
            'destination_city' => $request->destination_city,
            'destination_address' => $request->destination_address,
            'departure_date' => $request->departure_date,
            'departure_time' => $request->departure_time,
            'status' => 'published'
        ];

        $result = $this->supabase->insert('marketplace_missions', $missionData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la création'])->withInput();
        }

        return redirect('/marketplace')->with('success', 'Mission publiée sur le marketplace !');
    }

    public function show($id)
    {
        $mission = $this->getMissionById($id);

        if (!$mission) {
            return redirect('/marketplace')->withErrors(['error' => 'Mission introuvable']);
        }

        $creator = $this->supabase->query('profiles', [
            'filter' => ['user_id' => $mission['creator_id']],
            'limit' => 1
        ]);

        $responses = $this->supabase->query('marketplace_mission_responses', [
            'filter' => ['mission_id' => $id],
            'order' => 'created_at.desc'
        ]);

        if (!isset($responses['error'])) {
            foreach ($responses as &$response) {
                $responder = $this->supabase->query('profiles', [
                    'filter' => ['user_id' => $response['responder_id']],
                    'limit' => 1
                ]);

                if (!empty($responder)) {
                    $response['responder'] = $responder[0];
                }
            }
        }

        return view('marketplace.show', [
            'mission' => $mission,
            'creator' => !empty($creator) ? $creator[0] : null,
            'responses' => !isset($responses['error']) ? $responses : []
        ]);
    }

    public function respond(Request $request, $id)
    {
        $request->validate([
            'message' => 'required|string',
            'proposed_price' => 'nullable|numeric'
        ]);

        $userId = session('user')['id'];

        $existing = $this->supabase->query('marketplace_mission_responses', [
            'filter' => [
                'mission_id' => $id,
                'responder_id' => $userId
            ],
            'limit' => 1
        ]);

        if (!empty($existing) && !isset($existing['error'])) {
            return back()->withErrors(['error' => 'Vous avez déjà répondu à cette mission']);
        }

        $responseData = [
            'mission_id' => $id,
            'responder_id' => $userId,
            'message' => $request->message,
            'proposed_price' => $request->proposed_price,
            'status' => 'pending'
        ];

        $result = $this->supabase->insert('marketplace_mission_responses', $responseData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de l\'envoi']);
        }

        return back()->with('success', 'Votre proposition a été envoyée !');
    }

    public function myMissions()
    {
        $userId = session('user')['id'];

        $published = $this->supabase->query('marketplace_missions', [
            'filter' => ['creator_id' => $userId],
            'order' => 'created_at.desc'
        ]);

        foreach ($published as &$mission) {
            $responsesCount = $this->supabase->query('marketplace_mission_responses', [
                'filter' => ['mission_id' => $mission['id']]
            ]);

            $mission['responses_count'] = !isset($responsesCount['error']) ? count($responsesCount) : 0;
        }

        return view('marketplace.my-missions', compact('published'));
    }

    public function myOffers()
    {
        $userId = session('user')['id'];

        $offers = $this->supabase->query('marketplace_mission_responses', [
            'filter' => ['responder_id' => $userId],
            'order' => 'created_at.desc'
        ]);

        if (!isset($offers['error'])) {
            foreach ($offers as &$offer) {
                $mission = $this->getMissionById($offer['mission_id']);
                $offer['mission'] = $mission;
            }
        }

        return view('marketplace.my-offers', compact('offers'));
    }

    public function acceptResponse(Request $request, $missionId, $responseId)
    {
        $mission = $this->getMissionById($missionId);

        if (!$mission || $mission['creator_id'] !== session('user')['id']) {
            return back()->withErrors(['error' => 'Non autorisé']);
        }

        $this->supabase->update('marketplace_mission_responses', ['status' => 'accepted'], ['id' => $responseId], session('access_token'));

        $otherResponses = $this->supabase->query('marketplace_mission_responses', [
            'filter' => ['mission_id' => $missionId]
        ]);

        foreach ($otherResponses as $response) {
            if ($response['id'] !== $responseId && $response['status'] === 'pending') {
                $this->supabase->update('marketplace_mission_responses', ['status' => 'rejected'], ['id' => $response['id']], session('access_token'));
            }
        }

        $this->supabase->update('marketplace_missions', ['status' => 'assigned'], ['id' => $missionId], session('access_token'));

        return back()->with('success', 'Proposition acceptée !');
    }

    public function rejectResponse($missionId, $responseId)
    {
        $mission = $this->getMissionById($missionId);

        if (!$mission || $mission['creator_id'] !== session('user')['id']) {
            return back()->withErrors(['error' => 'Non autorisé']);
        }

        $this->supabase->update('marketplace_mission_responses', ['status' => 'rejected'], ['id' => $responseId], session('access_token'));

        return back()->with('success', 'Proposition rejetée');
    }

    private function getMissionById($id)
    {
        $result = $this->supabase->query('marketplace_missions', [
            'filter' => ['id' => $id],
            'limit' => 1
        ]);

        return !empty($result) && !isset($result['error']) ? $result[0] : null;
    }
}
