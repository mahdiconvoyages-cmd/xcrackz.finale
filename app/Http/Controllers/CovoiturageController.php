<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;

class CovoiturageController extends Controller
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function index(Request $request)
    {
        $origin = $request->get('origin');
        $destination = $request->get('destination');
        $date = $request->get('date');

        $rides = $this->supabase->query('shared_rides', [
            'filter' => ['status' => 'active'],
            'order' => 'departure_date.asc'
        ]);

        if (!isset($rides['error']) && is_array($rides)) {
            if ($origin) {
                $rides = array_filter($rides, fn($r) =>
                    stripos($r['origin'], $origin) !== false
                );
            }

            if ($destination) {
                $rides = array_filter($rides, fn($r) =>
                    stripos($r['destination'], $destination) !== false
                );
            }

            if ($date) {
                $rides = array_filter($rides, fn($r) => $r['departure_date'] === $date);
            }

            foreach ($rides as &$ride) {
                $driver = $this->supabase->query('profiles', [
                    'filter' => ['user_id' => $ride['driver_id']],
                    'limit' => 1
                ]);

                if (!empty($driver)) {
                    $ride['driver'] = $driver[0];
                }

                $reservations = $this->supabase->query('ride_reservations', [
                    'filter' => [
                        'ride_id' => $ride['id'],
                        'status' => 'confirmed'
                    ]
                ]);

                $bookedSeats = 0;
                if (!isset($reservations['error'])) {
                    foreach ($reservations as $res) {
                        $bookedSeats += $res['seats_count'] ?? 1;
                    }
                }

                $ride['available_seats_remaining'] = $ride['available_seats'] - $bookedSeats;
            }
        }

        return view('covoiturage.index', compact('rides', 'origin', 'destination', 'date'));
    }

    public function publish()
    {
        return view('covoiturage.publish');
    }

    public function store(Request $request)
    {
        $request->validate([
            'origin' => 'required|string|max:255',
            'destination' => 'required|string|max:255',
            'departure_date' => 'required|date',
            'departure_time' => 'required',
            'available_seats' => 'required|integer|min:1|max:8',
            'price_per_seat' => 'required|numeric|min:0',
            'vehicle_description' => 'nullable|string',
            'notes' => 'nullable|string'
        ]);

        $userId = session('user')['id'];

        $rideData = [
            'driver_id' => $userId,
            'origin' => $request->origin,
            'destination' => $request->destination,
            'departure_date' => $request->departure_date,
            'departure_time' => $request->departure_time,
            'available_seats' => $request->available_seats,
            'price_per_seat' => $request->price_per_seat,
            'vehicle_description' => $request->vehicle_description,
            'notes' => $request->notes,
            'status' => 'active'
        ];

        $result = $this->supabase->insert('shared_rides', $rideData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la publication'])->withInput();
        }

        return redirect('/covoiturage')->with('success', 'Trajet publié !');
    }

    public function show($id)
    {
        $ride = $this->getRideById($id);

        if (!$ride) {
            return redirect('/covoiturage')->withErrors(['error' => 'Trajet introuvable']);
        }

        $driver = $this->supabase->query('profiles', [
            'filter' => ['user_id' => $ride['driver_id']],
            'limit' => 1
        ]);

        $reservations = $this->supabase->query('ride_reservations', [
            'filter' => ['ride_id' => $id],
            'order' => 'created_at.desc'
        ]);

        $bookedSeats = 0;
        if (!isset($reservations['error'])) {
            foreach ($reservations as &$reservation) {
                if ($reservation['status'] === 'confirmed') {
                    $bookedSeats += $reservation['seats_count'] ?? 1;
                }

                $passenger = $this->supabase->query('profiles', [
                    'filter' => ['user_id' => $reservation['passenger_id']],
                    'limit' => 1
                ]);

                if (!empty($passenger)) {
                    $reservation['passenger'] = $passenger[0];
                }
            }
        }

        $availableSeatsRemaining = $ride['available_seats'] - $bookedSeats;

        return view('covoiturage.show', [
            'ride' => $ride,
            'driver' => !empty($driver) ? $driver[0] : null,
            'reservations' => !isset($reservations['error']) ? $reservations : [],
            'availableSeatsRemaining' => $availableSeatsRemaining
        ]);
    }

    public function reserve(Request $request, $id)
    {
        $request->validate([
            'seats_count' => 'required|integer|min:1'
        ]);

        $userId = session('user')['id'];
        $ride = $this->getRideById($id);

        if (!$ride) {
            return back()->withErrors(['error' => 'Trajet introuvable']);
        }

        if ($ride['driver_id'] === $userId) {
            return back()->withErrors(['error' => 'Vous ne pouvez pas réserver votre propre trajet']);
        }

        $existing = $this->supabase->query('ride_reservations', [
            'filter' => [
                'ride_id' => $id,
                'passenger_id' => $userId
            ],
            'limit' => 1
        ]);

        if (!empty($existing) && !isset($existing['error'])) {
            return back()->withErrors(['error' => 'Vous avez déjà réservé ce trajet']);
        }

        $reservationData = [
            'ride_id' => $id,
            'passenger_id' => $userId,
            'seats_count' => $request->seats_count,
            'status' => 'pending'
        ];

        $result = $this->supabase->insert('ride_reservations', $reservationData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la réservation']);
        }

        return back()->with('success', 'Réservation envoyée ! En attente de confirmation du conducteur.');
    }

    public function myTrips()
    {
        $userId = session('user')['id'];

        $published = $this->supabase->query('shared_rides', [
            'filter' => ['driver_id' => $userId],
            'order' => 'departure_date.desc'
        ]);

        $booked = $this->supabase->query('ride_reservations', [
            'filter' => ['passenger_id' => $userId],
            'order' => 'created_at.desc'
        ]);

        if (!isset($booked['error'])) {
            foreach ($booked as &$reservation) {
                $ride = $this->getRideById($reservation['ride_id']);
                $reservation['ride'] = $ride;

                if ($ride) {
                    $driver = $this->supabase->query('profiles', [
                        'filter' => ['user_id' => $ride['driver_id']],
                        'limit' => 1
                    ]);
                    $reservation['driver'] = !empty($driver) ? $driver[0] : null;
                }
            }
        }

        return view('covoiturage.my-trips', [
            'published' => !isset($published['error']) ? $published : [],
            'booked' => !isset($booked['error']) ? $booked : []
        ]);
    }

    public function confirmReservation($rideId, $reservationId)
    {
        $ride = $this->getRideById($rideId);

        if (!$ride || $ride['driver_id'] !== session('user')['id']) {
            return back()->withErrors(['error' => 'Non autorisé']);
        }

        $this->supabase->update('ride_reservations', ['status' => 'confirmed'], ['id' => $reservationId], session('access_token'));

        return back()->with('success', 'Réservation confirmée !');
    }

    public function cancelReservation($rideId, $reservationId)
    {
        $userId = session('user')['id'];
        $ride = $this->getRideById($rideId);

        $reservation = $this->supabase->query('ride_reservations', [
            'filter' => ['id' => $reservationId],
            'limit' => 1
        ]);

        if (empty($reservation) || isset($reservation['error'])) {
            return back()->withErrors(['error' => 'Réservation introuvable']);
        }

        $reservation = $reservation[0];

        if ($reservation['passenger_id'] !== $userId && $ride['driver_id'] !== $userId) {
            return back()->withErrors(['error' => 'Non autorisé']);
        }

        $this->supabase->update('ride_reservations', ['status' => 'cancelled'], ['id' => $reservationId], session('access_token'));

        return back()->with('success', 'Réservation annulée');
    }

    public function messages(Request $request)
    {
        $userId = session('user')['id'];
        $rideId = $request->get('ride_id');

        $rides = $this->supabase->query('shared_rides', [
            'filter' => ['driver_id' => $userId]
        ]);

        $rideIds = [];
        if (!isset($rides['error'])) {
            foreach ($rides as $ride) {
                $rideIds[] = $ride['id'];
            }
        }

        $reservations = $this->supabase->query('ride_reservations', [
            'filter' => ['passenger_id' => $userId]
        ]);

        if (!isset($reservations['error'])) {
            foreach ($reservations as $reservation) {
                if (!in_array($reservation['ride_id'], $rideIds)) {
                    $rideIds[] = $reservation['ride_id'];
                }
            }
        }

        $conversations = [];
        foreach ($rideIds as $id) {
            $ride = $this->getRideById($id);
            if ($ride) {
                $conversations[] = $ride;
            }
        }

        $messages = [];
        if ($rideId) {
            $messages = $this->supabase->query('ride_messages', [
                'filter' => ['ride_id' => $rideId],
                'order' => 'created_at.asc'
            ]);

            if (!isset($messages['error'])) {
                foreach ($messages as &$message) {
                    $sender = $this->supabase->query('profiles', [
                        'filter' => ['user_id' => $message['sender_id']],
                        'limit' => 1
                    ]);

                    if (!empty($sender)) {
                        $message['sender'] = $sender[0];
                    }
                }
            }
        }

        return view('covoiturage.messages', compact('conversations', 'messages', 'rideId'));
    }

    public function sendMessage(Request $request, $rideId)
    {
        $request->validate([
            'content' => 'required|string'
        ]);

        $userId = session('user')['id'];

        $messageData = [
            'ride_id' => $rideId,
            'sender_id' => $userId,
            'content' => $request->content
        ];

        $result = $this->supabase->insert('ride_messages', $messageData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de l\'envoi']);
        }

        return back()->with('success', 'Message envoyé !');
    }

    private function getRideById($id)
    {
        $result = $this->supabase->query('shared_rides', [
            'filter' => ['id' => $id],
            'limit' => 1
        ]);

        return !empty($result) && !isset($result['error']) ? $result[0] : null;
    }
}
