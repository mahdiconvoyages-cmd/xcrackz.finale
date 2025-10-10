@extends('layouts.app')

@section('title', 'Missions - FleetCheck')

@section('content')
<div class="mb-8">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold">Missions</h1>
            <p class="text-gray-400 mt-1">Gérez vos missions de convoyage</p>
        </div>
        <a href="/missions/create" class="btn-primary px-6 py-3 rounded-lg">
            <i class="fas fa-plus mr-2"></i>Nouvelle mission
        </a>
    </div>
</div>

<!-- View Switcher & Filters -->
<div class="glass-card p-6 mb-6">
    <div class="flex flex-wrap justify-between items-center gap-4">
        <!-- View Toggle -->
        <div class="flex space-x-2">
            <a href="/missions?view=list" class="px-4 py-2 rounded-lg {{ $view === 'list' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
                <i class="fas fa-list mr-2"></i>Liste
            </a>
            <a href="/missions?view=kanban" class="px-4 py-2 rounded-lg {{ $view === 'kanban' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
                <i class="fas fa-columns mr-2"></i>Kanban
            </a>
            <a href="/missions?view=map" class="px-4 py-2 rounded-lg {{ $view === 'map' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
                <i class="fas fa-map-marked-alt mr-2"></i>Carte
            </a>
        </div>

        <!-- Search & Filters -->
        <form method="GET" class="flex gap-4">
            <input type="hidden" name="view" value="{{ $view }}">
            <input type="text" name="search" value="{{ $search ?? '' }}"
                placeholder="Rechercher..."
                class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">

            <select name="status" class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                <option value="">Tous les statuts</option>
                <option value="draft" {{ $status === 'draft' ? 'selected' : '' }}>Brouillon</option>
                <option value="pending" {{ $status === 'pending' ? 'selected' : '' }}>En attente</option>
                <option value="in_progress" {{ $status === 'in_progress' ? 'selected' : '' }}>En cours</option>
                <option value="completed" {{ $status === 'completed' ? 'selected' : '' }}>Terminée</option>
                <option value="cancelled" {{ $status === 'cancelled' ? 'selected' : '' }}>Annulée</option>
            </select>

            <button type="submit" class="btn-primary px-6 py-2 rounded-lg">
                <i class="fas fa-search mr-2"></i>Filtrer
            </button>
        </form>

        <!-- Export -->
        <a href="/missions/export/csv" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
            <i class="fas fa-download mr-2"></i>Export CSV
        </a>
    </div>
</div>

<!-- Missions List -->
@if(isset($missions) && count($missions) > 0)
<div class="glass-card overflow-hidden">
    <table class="w-full">
        <thead>
            <tr class="border-b border-gray-700">
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Référence</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Titre</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Départ</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Arrivée</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Statut</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Date</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach($missions as $mission)
            <tr class="border-b border-gray-800 hover:bg-white hover:bg-opacity-5 transition">
                <td class="py-4 px-6 font-mono text-sm text-teal-400">{{ $mission['reference'] }}</td>
                <td class="py-4 px-6 font-semibold">{{ $mission['title'] }}</td>
                <td class="py-4 px-6 text-sm text-gray-400">{{ $mission['pickup_address'] ?? 'N/A' }}</td>
                <td class="py-4 px-6 text-sm text-gray-400">{{ $mission['delivery_address'] ?? 'N/A' }}</td>
                <td class="py-4 px-6">
                    @if($mission['status'] === 'completed')
                        <span class="badge badge-success">Terminée</span>
                    @elseif($mission['status'] === 'in_progress')
                        <span class="badge badge-info">En cours</span>
                    @elseif($mission['status'] === 'pending')
                        <span class="badge badge-warning">En attente</span>
                    @elseif($mission['status'] === 'cancelled')
                        <span class="badge badge-error">Annulée</span>
                    @else
                        <span class="badge">Brouillon</span>
                    @endif
                </td>
                <td class="py-4 px-6 text-sm text-gray-400">
                    {{ date('d/m/Y', strtotime($mission['created_at'])) }}
                </td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        <a href="/missions/{{ $mission['id'] }}" class="text-teal-400 hover:text-teal-300" title="Voir">
                            <i class="fas fa-eye"></i>
                        </a>
                        <a href="/missions/{{ $mission['id'] }}/edit" class="text-blue-400 hover:text-blue-300" title="Éditer">
                            <i class="fas fa-edit"></i>
                        </a>
                        <form action="/missions/{{ $mission['id'] }}/archive" method="POST" class="inline">
                            @csrf
                            <button type="submit" class="text-yellow-400 hover:text-yellow-300" title="Archiver">
                                <i class="fas fa-archive"></i>
                            </button>
                        </form>
                    </div>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>

<!-- Pagination -->
<div class="mt-6 flex justify-center">
    <div class="flex space-x-2">
        @if($page > 1)
        <a href="/missions?view={{ $view }}&page={{ $page - 1 }}&status={{ $status }}&search={{ $search }}"
           class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
            Précédent
        </a>
        @endif

        <span class="glass-card px-4 py-2 rounded-lg">Page {{ $page }}</span>

        <a href="/missions?view={{ $view }}&page={{ $page + 1 }}&status={{ $status }}&search={{ $search }}"
           class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
            Suivant
        </a>
    </div>
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-inbox text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucune mission</h3>
    <p class="text-gray-400 mb-6">Commencez par créer votre première mission de convoyage</p>
    <a href="/missions/create" class="btn-primary px-6 py-3 rounded-lg inline-block">
        <i class="fas fa-plus mr-2"></i>Créer une mission
    </a>
</div>
@endif
@endsection
