@extends('layouts.app')

@section('title', 'Marketplace - CHECKSFLEET')

@section('content')
<div class="mb-8">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold">Marketplace</h1>
            <p class="text-gray-400 mt-1">Trouvez des missions de convoyage</p>
        </div>
        <div class="flex space-x-3">
            <a href="/marketplace/my/missions" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
                <i class="fas fa-briefcase mr-2"></i>Mes missions
            </a>
            <a href="/marketplace/my/offers" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
                <i class="fas fa-handshake mr-2"></i>Mes offres
            </a>
            <a href="/marketplace/create" class="btn-primary px-6 py-2 rounded-lg">
                <i class="fas fa-plus mr-2"></i>Publier une mission
            </a>
        </div>
    </div>
</div>

<!-- Search Hero -->
<div class="glass-card p-8 mb-8 bg-gradient-to-r from-teal-500 to-cyan-500 bg-opacity-10">
    <form method="GET" class="max-w-4xl mx-auto">
        <div class="grid md:grid-cols-3 gap-4 mb-4">
            <input type="text" name="origin" value="{{ $origin ?? '' }}"
                placeholder="Ville de départ"
                class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            <input type="text" name="destination" value="{{ $destination ?? '' }}"
                placeholder="Ville d'arrivée"
                class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            <button type="submit" class="btn-primary py-3 rounded-lg">
                <i class="fas fa-search mr-2"></i>Rechercher
            </button>
        </div>

        <div class="flex gap-4">
            <select name="category"
                class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                <option value="">Toutes les catégories</option>
                <option value="convoyage" {{ $category === 'convoyage' ? 'selected' : '' }}>Convoyage</option>
                <option value="transport" {{ $category === 'transport' ? 'selected' : '' }}>Transport</option>
            </select>

            <label class="flex items-center glass-card px-4 py-2 rounded-lg">
                <input type="checkbox" name="verified_only" value="1" {{ $verifiedOnly ? 'checked' : '' }} class="mr-2">
                <span class="text-sm">Profils vérifiés uniquement</span>
            </label>
        </div>
    </form>
</div>

<!-- Missions Grid -->
@if(count($missions) > 0)
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    @foreach($missions as $mission)
    <div class="glass-card overflow-hidden hover:scale-105 transition-transform">
        <!-- Header -->
        <div class="p-4 border-b border-gray-700">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mr-3">
                        <i class="fas fa-building text-teal-400"></i>
                    </div>
                    <div>
                        <p class="font-semibold">{{ $mission['creator']['full_name'] ?? 'Utilisateur' }}</p>
                        @if(isset($mission['creator']['is_verified']) && $mission['creator']['is_verified'])
                        <span class="badge badge-success text-xs">
                            <i class="fas fa-check-circle mr-1"></i>VÉRIFIÉ
                        </span>
                        @endif
                    </div>
                </div>
            </div>
            <h3 class="font-bold text-lg">{{ $mission['title'] }}</h3>
            <span class="badge badge-info text-xs mt-2">{{ ucfirst($mission['category']) }}</span>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-3">
            @if($mission['description'])
            <p class="text-sm text-gray-400">{{ Str::limit($mission['description'], 80) }}</p>
            @endif

            <div class="flex items-center text-sm">
                <i class="fas fa-map-marker-alt text-teal-400 mr-2"></i>
                <span>{{ $mission['origin_city'] }} → {{ $mission['destination_city'] }}</span>
            </div>

            @if($mission['departure_date'])
            <div class="flex items-center text-sm text-gray-400">
                <i class="fas fa-calendar mr-2"></i>
                <span>{{ date('d/m/Y', strtotime($mission['departure_date'])) }}</span>
                @if($mission['departure_time'])
                    <span class="ml-2">à {{ substr($mission['departure_time'], 0, 5) }}</span>
                @endif
            </div>
            @endif

            @if($mission['budget'])
            <div class="pt-3 border-t border-gray-700">
                <p class="text-sm text-gray-400 mb-1">Budget</p>
                <p class="text-3xl font-bold text-green-400">{{ number_format($mission['budget'], 0) }} €</p>
            </div>
            @endif
        </div>

        <!-- Footer -->
        <div class="p-4 bg-gray-900 bg-opacity-50">
            <a href="/marketplace/{{ $mission['id'] }}"
               class="block text-center btn-primary py-2 rounded-lg">
                Voir les détails
            </a>
        </div>
    </div>
    @endforeach
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-store text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucune mission disponible</h3>
    <p class="text-gray-400 mb-6">Soyez le premier à publier une mission !</p>
    <a href="/marketplace/create" class="btn-primary px-6 py-3 rounded-lg inline-block">
        <i class="fas fa-plus mr-2"></i>Publier une mission
    </a>
</div>
@endif
@endsection
