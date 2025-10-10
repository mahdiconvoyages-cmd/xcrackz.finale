@extends('layouts.app')

@section('title', 'Covoiturage - FleetCheck')

@section('content')
<!-- Hero Section -->
<div class="glass-card p-8 mb-8 bg-gradient-to-r from-teal-500 to-cyan-500 bg-opacity-10">
    <div class="max-w-4xl mx-auto text-center mb-8">
        <h1 class="text-4xl font-bold mb-4">Covoiturage pour convoyeurs</h1>
        <p class="text-xl text-gray-300">Partagez vos trajets, économisez et voyagez ensemble</p>
    </div>

    <form method="GET" class="max-w-4xl mx-auto">
        <div class="grid md:grid-cols-4 gap-4">
            <input type="text" name="origin" value="{{ $origin ?? '' }}"
                placeholder="Départ"
                class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            <input type="text" name="destination" value="{{ $destination ?? '' }}"
                placeholder="Arrivée"
                class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            <input type="date" name="date" value="{{ $date ?? '' }}"
                class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            <button type="submit" class="btn-primary py-3 rounded-lg">
                <i class="fas fa-search mr-2"></i>Rechercher
            </button>
        </div>
    </form>
</div>

<!-- Quick Actions -->
<div class="flex justify-between items-center mb-8">
    <div class="flex space-x-4">
        <a href="/covoiturage/my-trips" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
            <i class="fas fa-car mr-2"></i>Mes trajets
        </a>
        <a href="/covoiturage/messages" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
            <i class="fas fa-comments mr-2"></i>Messages
        </a>
    </div>
    <a href="/covoiturage/publish" class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Publier un trajet
    </a>
</div>

<!-- Benefits Section -->
<div class="grid md:grid-cols-4 gap-6 mb-8">
    <div class="glass-card p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-users text-teal-400 text-2xl"></i>
        </div>
        <h3 class="font-bold mb-2">Communauté fiable</h3>
        <p class="text-sm text-gray-400">Réservé aux professionnels du convoyage</p>
    </div>
    <div class="glass-card p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-euro-sign text-green-400 text-2xl"></i>
        </div>
        <h3 class="font-bold mb-2">Économies</h3>
        <p class="text-sm text-gray-400">Partagez les frais de route</p>
    </div>
    <div class="glass-card p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-cyan-500 bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-clock text-cyan-400 text-2xl"></i>
        </div>
        <h3 class="font-bold mb-2">Flexibilité</h3>
        <p class="text-sm text-gray-400">Horaires adaptés aux convoyeurs</p>
    </div>
    <div class="glass-card p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-leaf text-blue-400 text-2xl"></i>
        </div>
        <h3 class="font-bold mb-2">Impact réduit</h3>
        <p class="text-sm text-gray-400">Moins de véhicules sur la route</p>
    </div>
</div>

<!-- Rides List -->
@if(count($rides) > 0)
<div class="space-y-4">
    @foreach($rides as $ride)
    <div class="glass-card p-6 hover:scale-102 transition-transform">
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mr-4">
                        <i class="fas fa-user text-teal-400 text-xl"></i>
                    </div>
                    <div>
                        <p class="font-bold">{{ $ride['driver']['full_name'] ?? 'Conducteur' }}</p>
                        @if(isset($ride['driver']['is_verified']) && $ride['driver']['is_verified'])
                        <span class="badge badge-success text-xs">
                            <i class="fas fa-check-circle mr-1"></i>Vérifié
                        </span>
                        @endif
                    </div>
                </div>

                <div class="grid md:grid-cols-3 gap-6 mb-4">
                    <div>
                        <p class="text-sm text-gray-400 mb-1">Départ</p>
                        <p class="font-semibold text-lg">{{ $ride['origin'] }}</p>
                    </div>
                    <div class="flex items-center justify-center">
                        <i class="fas fa-arrow-right text-teal-400 text-2xl"></i>
                    </div>
                    <div>
                        <p class="text-sm text-gray-400 mb-1">Arrivée</p>
                        <p class="font-semibold text-lg">{{ $ride['destination'] }}</p>
                    </div>
                </div>

                <div class="flex flex-wrap gap-4 text-sm text-gray-400">
                    <div class="flex items-center">
                        <i class="fas fa-calendar mr-2 text-teal-400"></i>
                        {{ date('d/m/Y', strtotime($ride['departure_date'])) }}
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-clock mr-2 text-teal-400"></i>
                        {{ substr($ride['departure_time'], 0, 5) }}
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-users mr-2 text-teal-400"></i>
                        {{ $ride['available_seats_remaining'] ?? $ride['available_seats'] }} places disponibles
                    </div>
                    @if($ride['vehicle_description'])
                    <div class="flex items-center">
                        <i class="fas fa-car mr-2 text-teal-400"></i>
                        {{ $ride['vehicle_description'] }}
                    </div>
                    @endif
                </div>

                @if($ride['notes'])
                <p class="text-sm text-gray-400 mt-4 border-t border-gray-700 pt-4">{{ $ride['notes'] }}</p>
                @endif
            </div>

            <div class="ml-6 text-right">
                <p class="text-3xl font-bold text-green-400 mb-2">{{ number_format($ride['price_per_seat'], 0) }}€</p>
                <p class="text-sm text-gray-400 mb-4">par place</p>
                <a href="/covoiturage/trips/{{ $ride['id'] }}"
                   class="btn-primary px-6 py-2 rounded-lg inline-block">
                    Réserver
                </a>
            </div>
        </div>
    </div>
    @endforeach
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-car text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucun trajet disponible</h3>
    <p class="text-gray-400 mb-6">
        @if($origin || $destination || $date)
            Aucun trajet ne correspond à votre recherche. Essayez d'autres critères.
        @else
            Soyez le premier à publier un trajet !
        @endif
    </p>
    <a href="/covoiturage/publish" class="btn-primary px-6 py-3 rounded-lg inline-block">
        <i class="fas fa-plus mr-2"></i>Publier un trajet
    </a>
</div>
@endif
@endsection
