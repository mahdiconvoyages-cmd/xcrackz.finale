@extends('layouts.app')

@section('title', 'Mission ' . $mission['reference'] . ' - FleetCheck')

@section('content')
<div class="mb-8">
    <div class="flex items-center text-sm text-gray-400 mb-4">
        <a href="/missions" class="hover:text-teal-400">Missions</a>
        <i class="fas fa-chevron-right mx-2 text-xs"></i>
        <span>{{ $mission['reference'] }}</span>
    </div>
    <div class="flex justify-between items-start">
        <div>
            <h1 class="text-3xl font-bold">{{ $mission['title'] }}</h1>
            <p class="text-gray-400 mt-1">{{ $mission['reference'] }}</p>
        </div>
        <div class="flex space-x-3">
            <a href="/missions/{{ $mission['id'] }}/edit" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
                <i class="fas fa-edit mr-2"></i>Éditer
            </a>
            @if($mission['status'] === 'completed')
            <a href="/reports/{{ $mission['id'] }}" class="btn-primary px-4 py-2 rounded-lg">
                <i class="fas fa-file-alt mr-2"></i>Voir rapport
            </a>
            @endif
        </div>
    </div>
</div>

<div class="grid md:grid-cols-3 gap-6">
    <!-- Main Info -->
    <div class="md:col-span-2 space-y-6">
        <!-- Status & Dates -->
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-4">Informations générales</h3>
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <p class="text-sm text-gray-400 mb-1">Statut</p>
                    @if($mission['status'] === 'completed')
                        <span class="badge badge-success text-lg">Terminée</span>
                    @elseif($mission['status'] === 'in_progress')
                        <span class="badge badge-info text-lg">En cours</span>
                    @elseif($mission['status'] === 'pending')
                        <span class="badge badge-warning text-lg">En attente</span>
                    @else
                        <span class="badge text-lg">Brouillon</span>
                    @endif
                </div>
                <div>
                    <p class="text-sm text-gray-400 mb-1">Date de création</p>
                    <p class="font-semibold">{{ date('d/m/Y à H:i', strtotime($mission['created_at'])) }}</p>
                </div>
            </div>
        </div>

        <!-- Itinerary -->
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-4">Itinéraire</h3>
            <div class="space-y-4">
                <div class="flex items-start">
                    <div class="w-10 h-10 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mr-4">
                        <i class="fas fa-map-marker-alt text-teal-400"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-gray-400">Départ</p>
                        <p class="font-semibold">{{ $mission['pickup_address'] ?? 'Non renseigné' }}</p>
                        @if($mission['scheduled_pickup'])
                        <p class="text-sm text-gray-400 mt-1">Prévu le {{ date('d/m/Y à H:i', strtotime($mission['scheduled_pickup'])) }}</p>
                        @endif
                    </div>
                </div>

                @if(isset($mission['distance_km']))
                <div class="flex items-center ml-5">
                    <div class="w-px h-12 bg-gray-700 mr-9"></div>
                    <p class="text-sm text-gray-400">
                        <i class="fas fa-route mr-2"></i>{{ number_format($mission['distance_km'], 0) }} km
                    </p>
                </div>
                @endif

                <div class="flex items-start">
                    <div class="w-10 h-10 rounded-full bg-cyan-500 bg-opacity-20 flex items-center justify-center mr-4">
                        <i class="fas fa-flag-checkered text-cyan-400"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-gray-400">Arrivée</p>
                        <p class="font-semibold">{{ $mission['delivery_address'] ?? 'Non renseigné' }}</p>
                        @if($mission['scheduled_delivery'])
                        <p class="text-sm text-gray-400 mt-1">Prévu le {{ date('d/m/Y à H:i', strtotime($mission['scheduled_delivery'])) }}</p>
                        @endif
                    </div>
                </div>
            </div>
        </div>

        <!-- Vehicle Info -->
        @if($mission['vehicle_make'] || $mission['vehicle_model'])
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-4">Véhicule</h3>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-400 mb-1">Marque / Modèle</p>
                    <p class="font-semibold">{{ $mission['vehicle_make'] }} {{ $mission['vehicle_model'] }}</p>
                </div>
                @if($mission['vehicle_year'])
                <div>
                    <p class="text-sm text-gray-400 mb-1">Année</p>
                    <p class="font-semibold">{{ $mission['vehicle_year'] }}</p>
                </div>
                @endif
                @if($mission['vehicle_vin'])
                <div>
                    <p class="text-sm text-gray-400 mb-1">Numéro VIN</p>
                    <p class="font-mono text-sm">{{ $mission['vehicle_vin'] }}</p>
                </div>
                @endif
                @if($mission['vehicle_license_plate'])
                <div>
                    <p class="text-sm text-gray-400 mb-1">Plaque</p>
                    <p class="font-mono text-sm">{{ $mission['vehicle_license_plate'] }}</p>
                </div>
                @endif
            </div>
        </div>
        @endif

        <!-- Inspections -->
        @if($inspectionDeparture || $inspectionArrival)
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-4">Inspections</h3>
            <div class="grid grid-cols-2 gap-4">
                @if($inspectionDeparture)
                <div class="border border-gray-700 rounded-lg p-4">
                    <h4 class="font-semibold mb-2 text-teal-400">
                        <i class="fas fa-clipboard-check mr-2"></i>Inspection départ
                    </h4>
                    <p class="text-sm text-gray-400">Complétée le {{ date('d/m/Y', strtotime($inspectionDeparture['created_at'])) }}</p>
                    @if(isset($inspectionDeparture['initial_mileage']))
                    <p class="text-sm mt-2">Kilométrage: {{ number_format($inspectionDeparture['initial_mileage'], 0) }} km</p>
                    @endif
                </div>
                @else
                <div class="border border-gray-700 rounded-lg p-4 opacity-50">
                    <h4 class="font-semibold mb-2">Inspection départ</h4>
                    <p class="text-sm text-gray-400">Pas encore complétée</p>
                </div>
                @endif

                @if($inspectionArrival)
                <div class="border border-gray-700 rounded-lg p-4">
                    <h4 class="font-semibold mb-2 text-cyan-400">
                        <i class="fas fa-clipboard-check mr-2"></i>Inspection arrivée
                    </h4>
                    <p class="text-sm text-gray-400">Complétée le {{ date('d/m/Y', strtotime($inspectionArrival['created_at'])) }}</p>
                    @if(isset($inspectionArrival['final_mileage']))
                    <p class="text-sm mt-2">Kilométrage: {{ number_format($inspectionArrival['final_mileage'], 0) }} km</p>
                    @endif
                </div>
                @else
                <div class="border border-gray-700 rounded-lg p-4 opacity-50">
                    <h4 class="font-semibold mb-2">Inspection arrivée</h4>
                    <p class="text-sm text-gray-400">Pas encore complétée</p>
                </div>
                @endif
            </div>
        </div>
        @endif
    </div>

    <!-- Sidebar Actions -->
    <div class="space-y-6">
        <!-- Quick Actions -->
        <div class="glass-card p-6">
            <h3 class="text-lg font-bold mb-4">Actions rapides</h3>
            <div class="space-y-3">
                <form action="/missions/{{ $mission['id'] }}/status" method="POST">
                    @csrf
                    @method('PATCH')
                    <select name="status" onchange="this.form.submit()"
                        class="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                        <option value="draft" {{ $mission['status'] === 'draft' ? 'selected' : '' }}>Brouillon</option>
                        <option value="pending" {{ $mission['status'] === 'pending' ? 'selected' : '' }}>En attente</option>
                        <option value="in_progress" {{ $mission['status'] === 'in_progress' ? 'selected' : '' }}>En cours</option>
                        <option value="completed" {{ $mission['status'] === 'completed' ? 'selected' : '' }}>Terminée</option>
                        <option value="cancelled" {{ $mission['status'] === 'cancelled' ? 'selected' : '' }}>Annulée</option>
                    </select>
                </form>

                <form action="/missions/{{ $mission['id'] }}/archive" method="POST">
                    @csrf
                    <button type="submit" class="w-full glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 text-left">
                        <i class="fas fa-archive mr-2"></i>Archiver
                    </button>
                </form>

                <form action="/missions/{{ $mission['id'] }}" method="POST"
                    onsubmit="return confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="w-full glass-card px-4 py-2 rounded-lg hover:bg-red-500 hover:bg-opacity-20 text-left text-red-400">
                        <i class="fas fa-trash mr-2"></i>Supprimer
                    </button>
                </form>
            </div>
        </div>

        <!-- Timeline -->
        <div class="glass-card p-6">
            <h3 class="text-lg font-bold mb-4">Chronologie</h3>
            <div class="space-y-4">
                <div class="flex items-start">
                    <div class="w-8 h-8 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mr-3 flex-shrink-0">
                        <i class="fas fa-plus text-teal-400 text-xs"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold">Mission créée</p>
                        <p class="text-xs text-gray-400">{{ date('d/m/Y à H:i', strtotime($mission['created_at'])) }}</p>
                    </div>
                </div>

                @if($mission['status'] !== 'draft')
                <div class="flex items-start">
                    <div class="w-8 h-8 rounded-full bg-cyan-500 bg-opacity-20 flex items-center justify-center mr-3 flex-shrink-0">
                        <i class="fas fa-check text-cyan-400 text-xs"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold">Mission activée</p>
                        <p class="text-xs text-gray-400">{{ date('d/m/Y à H:i', strtotime($mission['updated_at'])) }}</p>
                    </div>
                </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
