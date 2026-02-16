<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use App\Services\MapboxService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MissionController extends Controller
{
    private SupabaseService $supabase;
    private MapboxService $mapbox;

    public function __construct(SupabaseService $supabase, MapboxService $mapbox)
    {
        $this->supabase = $supabase;
        $this->mapbox = $mapbox;
    }

    public function index(Request $request)
    {
        $userId = session('user')['id'];
        $view = $request->get('view', 'list');
        $status = $request->get('status');
        $search = $request->get('search');
        $page = $request->get('page', 1);
        $perPage = 50;

        $options = [
            'order' => 'created_at.desc',
            'limit' => $perPage,
            'offset' => ($page - 1) * $perPage
        ];

        $missions = $this->supabase->query('missions', $options);

        if (!isset($missions['error'])) {
            $missions = array_filter($missions, function ($mission) use ($userId) {
                return $mission['creator_id'] === $userId || $mission['assigned_to'] === $userId;
            });

            if ($status) {
                $missions = array_filter($missions, fn($m) => $m['status'] === $status);
            }

            if ($search) {
                $missions = array_filter($missions, function ($m) use ($search) {
                    return stripos($m['title'], $search) !== false ||
                        stripos($m['reference'], $search) !== false ||
                        stripos($m['pickup_address'], $search) !== false ||
                        stripos($m['delivery_address'], $search) !== false;
                });
            }
        }

        if ($view === 'kanban') {
            return view('missions.kanban', compact('missions'));
        } elseif ($view === 'map') {
            return view('missions.map', compact('missions'));
        }

        return view('missions.index', compact('missions', 'view', 'status', 'search', 'page'));
    }

    public function create()
    {
        $contacts = $this->getContacts();
        return view('missions.create', compact('contacts'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'pickup_address' => 'required|string',
            'delivery_address' => 'required|string',
            'vehicle_make' => 'nullable|string',
            'vehicle_model' => 'nullable|string',
            'vehicle_year' => 'nullable|integer',
            'vehicle_vin' => 'nullable|string',
            'vehicle_license_plate' => 'nullable|string',
            'scheduled_pickup' => 'nullable|date',
            'scheduled_delivery' => 'nullable|date',
            'assigned_to' => 'nullable|uuid'
        ]);

        $userId = session('user')['id'];

        $pickupCoords = $this->mapbox->getCoordinates($request->pickup_address);
        $deliveryCoords = $this->mapbox->getCoordinates($request->delivery_address);

        $distanceKm = null;
        if ($pickupCoords && $deliveryCoords) {
            $directions = $this->mapbox->getDirections(
                $pickupCoords['lng'],
                $pickupCoords['lat'],
                $deliveryCoords['lng'],
                $deliveryCoords['lat']
            );
            $distanceKm = $directions['distance_km'] ?? null;
        }

        $reference = 'MISS-' . date('Y') . '-' . strtoupper(Str::random(6));

        $missionData = [
            'creator_id' => $userId,
            'reference' => $reference,
            'title' => $request->title,
            'status' => 'draft',
            'pickup_address' => $request->pickup_address,
            'delivery_address' => $request->delivery_address,
            'pickup_lat' => $pickupCoords['lat'] ?? null,
            'pickup_lng' => $pickupCoords['lng'] ?? null,
            'delivery_lat' => $deliveryCoords['lat'] ?? null,
            'delivery_lng' => $deliveryCoords['lng'] ?? null,
            'distance_km' => $distanceKm,
            'vehicle_make' => $request->vehicle_make,
            'vehicle_model' => $request->vehicle_model,
            'vehicle_year' => $request->vehicle_year,
            'vehicle_vin' => $request->vehicle_vin,
            'vehicle_license_plate' => $request->vehicle_license_plate,
            'scheduled_pickup' => $request->scheduled_pickup,
            'scheduled_delivery' => $request->scheduled_delivery,
            'assigned_to' => $request->assigned_to,
            'archived' => false
        ];

        $result = $this->supabase->insert('missions', $missionData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la création'])->withInput();
        }

        return redirect('/missions')->with('success', 'Mission créée avec succès !');
    }

    public function show($id)
    {
        $mission = $this->getMissionById($id);

        if (!$mission) {
            return redirect('/missions')->withErrors(['error' => 'Mission introuvable']);
        }

        $inspectionDeparture = $this->supabase->query('inspection_departures', [
            'filter' => ['mission_id' => $id],
            'limit' => 1
        ]);

        $inspectionArrival = $this->supabase->query('inspection_arrivals', [
            'filter' => ['mission_id' => $id],
            'limit' => 1
        ]);

        return view('missions.show', [
            'mission' => $mission,
            'inspectionDeparture' => !empty($inspectionDeparture) ? $inspectionDeparture[0] : null,
            'inspectionArrival' => !empty($inspectionArrival) ? $inspectionArrival[0] : null
        ]);
    }

    public function edit($id)
    {
        $mission = $this->getMissionById($id);
        $contacts = $this->getContacts();

        if (!$mission) {
            return redirect('/missions')->withErrors(['error' => 'Mission introuvable']);
        }

        return view('missions.edit', compact('mission', 'contacts'));
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'status' => 'required|in:draft,pending,in_progress,completed,cancelled',
            'pickup_address' => 'required|string',
            'delivery_address' => 'required|string'
        ]);

        $updateData = [
            'title' => $request->title,
            'status' => $request->status,
            'pickup_address' => $request->pickup_address,
            'delivery_address' => $request->delivery_address,
            'vehicle_make' => $request->vehicle_make,
            'vehicle_model' => $request->vehicle_model,
            'vehicle_year' => $request->vehicle_year,
            'vehicle_vin' => $request->vehicle_vin,
            'vehicle_license_plate' => $request->vehicle_license_plate,
            'scheduled_pickup' => $request->scheduled_pickup,
            'scheduled_delivery' => $request->scheduled_delivery,
            'assigned_to' => $request->assigned_to,
            'updated_at' => date('c')
        ];

        $result = $this->supabase->update('missions', $updateData, ['id' => $id], session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la mise à jour'])->withInput();
        }

        return redirect("/missions/{$id}")->with('success', 'Mission mise à jour !');
    }

    public function destroy($id)
    {
        $result = $this->supabase->delete('missions', ['id' => $id], session('access_token'));

        if (!$result) {
            return back()->withErrors(['error' => 'Erreur lors de la suppression']);
        }

        return redirect('/missions')->with('success', 'Mission supprimée');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:draft,pending,in_progress,completed,cancelled'
        ]);

        $updateData = [
            'status' => $request->status,
            'updated_at' => date('c')
        ];

        $result = $this->supabase->update('missions', $updateData, ['id' => $id], session('access_token'));

        return response()->json(['success' => !isset($result['error'])]);
    }

    public function archive($id)
    {
        $result = $this->supabase->update('missions', ['archived' => true], ['id' => $id], session('access_token'));

        return redirect()->back()->with('success', 'Mission archivée');
    }

    public function exportCsv(Request $request)
    {
        $userId = session('user')['id'];
        $missions = $this->supabase->query('missions', ['filter' => ['creator_id' => $userId]]);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="missions_' . date('Y-m-d') . '.csv"');

        $output = fopen('php://output', 'w');
        fputcsv($output, ['Référence', 'Titre', 'Statut', 'Départ', 'Arrivée', 'Distance (km)', 'Date création']);

        if (!isset($missions['error'])) {
            foreach ($missions as $mission) {
                fputcsv($output, [
                    $mission['reference'],
                    $mission['title'],
                    $mission['status'],
                    $mission['pickup_address'],
                    $mission['delivery_address'],
                    $mission['distance_km'] ?? 'N/A',
                    date('d/m/Y', strtotime($mission['created_at']))
                ]);
            }
        }

        fclose($output);
        exit;
    }

    private function getMissionById($id)
    {
        $missions = $this->supabase->query('missions', [
            'filter' => ['id' => $id],
            'limit' => 1
        ]);

        return !empty($missions) && !isset($missions['error']) ? $missions[0] : null;
    }

    private function getContacts()
    {
        $userId = session('user')['id'];
        $contacts = $this->supabase->query('contacts', [
            'filter' => ['user_id' => $userId, 'status' => 'accepted']
        ]);

        return !isset($contacts['error']) ? $contacts : [];
    }
}
