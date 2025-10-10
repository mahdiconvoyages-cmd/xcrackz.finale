@extends('layouts.app')

@section('title', 'Rapports - FleetCheck')

@section('content')
<div class="mb-8">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold">Rapports de missions</h1>
            <p class="text-gray-400 mt-1">Consultez les rapports des missions terminées</p>
        </div>
        <a href="/reports/export/csv" class="btn-primary px-6 py-3 rounded-lg">
            <i class="fas fa-download mr-2"></i>Export CSV
        </a>
    </div>
</div>

<!-- Filters -->
<div class="glass-card p-6 mb-6">
    <form method="GET" class="flex gap-4">
        <input type="text" name="search" value="{{ $search ?? '' }}"
            placeholder="Rechercher par référence, titre..."
            class="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">

        <label class="flex items-center glass-card px-4 py-2 rounded-lg">
            <input type="checkbox" name="archived" value="1" {{ $showArchived ? 'checked' : '' }}
                class="mr-2">
            <span class="text-sm">Afficher archivés</span>
        </label>

        <button type="submit" class="btn-primary px-6 py-2 rounded-lg">
            <i class="fas fa-search mr-2"></i>Filtrer
        </button>
    </form>
</div>

<!-- Reports Grid -->
@if(count($missions) > 0)
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    @foreach($missions as $mission)
    <div class="glass-card overflow-hidden hover:scale-105 transition-transform">
        <!-- Header -->
        <div class="bg-gradient-to-r from-teal-500 to-cyan-500 p-4">
            <h3 class="font-bold text-lg">{{ $mission['title'] }}</h3>
            <p class="text-sm opacity-90">{{ $mission['reference'] }}</p>
        </div>

        <!-- Body -->
        <div class="p-4 space-y-3">
            <div class="flex items-start text-sm">
                <i class="fas fa-map-marker-alt text-teal-400 mr-2 mt-1"></i>
                <div class="flex-1">
                    <p class="text-gray-400 text-xs">Départ</p>
                    <p>{{ Str::limit($mission['pickup_address'], 30) }}</p>
                </div>
            </div>

            <div class="flex items-start text-sm">
                <i class="fas fa-flag-checkered text-cyan-400 mr-2 mt-1"></i>
                <div class="flex-1">
                    <p class="text-gray-400 text-xs">Arrivée</p>
                    <p>{{ Str::limit($mission['delivery_address'], 30) }}</p>
                </div>
            </div>

            @if($mission['vehicle_make'])
            <div class="flex items-center text-sm pt-2 border-t border-gray-700">
                <i class="fas fa-car text-gray-400 mr-2"></i>
                <span>{{ $mission['vehicle_make'] }} {{ $mission['vehicle_model'] }}</span>
            </div>
            @endif

            <div class="text-xs text-gray-400">
                <i class="fas fa-calendar mr-1"></i>
                Terminée le {{ date('d/m/Y', strtotime($mission['updated_at'])) }}
            </div>
        </div>

        <!-- Actions -->
        <div class="p-4 bg-gray-900 bg-opacity-50 flex gap-2">
            <a href="/reports/{{ $mission['id'] }}"
               class="flex-1 text-center glass-card px-3 py-2 rounded text-sm hover:bg-white hover:bg-opacity-10">
                <i class="fas fa-eye mr-1"></i>Voir
            </a>
            <button onclick="showEmailModal('{{ $mission['id'] }}')"
                class="flex-1 text-center glass-card px-3 py-2 rounded text-sm hover:bg-white hover:bg-opacity-10">
                <i class="fas fa-envelope mr-1"></i>Email
            </button>
            <a href="/reports/{{ $mission['id'] }}/download-photos"
               class="flex-1 text-center glass-card px-3 py-2 rounded text-sm hover:bg-white hover:bg-opacity-10">
                <i class="fas fa-download mr-1"></i>ZIP
            </a>
        </div>
    </div>
    @endforeach
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-file-alt text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucun rapport</h3>
    <p class="text-gray-400 mb-6">Les rapports des missions terminées apparaîtront ici</p>
    <a href="/missions" class="btn-primary px-6 py-3 rounded-lg inline-block">
        <i class="fas fa-tasks mr-2"></i>Voir les missions
    </a>
</div>
@endif

<!-- Email Modal -->
<div id="emailModal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="glass-card p-8 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold">Envoyer par email</h3>
            <button onclick="document.getElementById('emailModal').classList.add('hidden')"
                class="text-gray-400 hover:text-white">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <form id="emailForm" method="POST">
            @csrf
            <div class="mb-6">
                <label class="block text-sm font-semibold mb-2">Email du destinataire</label>
                <input type="email" name="recipient_email" required
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="destinataire@exemple.com">
                <p class="text-sm text-gray-400 mt-2">Le rapport complet avec photos sera envoyé à cette adresse.</p>
            </div>

            <div class="flex space-x-4">
                <button type="button"
                    onclick="document.getElementById('emailModal').classList.add('hidden')"
                    class="flex-1 glass-card px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-10">
                    Annuler
                </button>
                <button type="submit" class="flex-1 btn-primary px-4 py-3 rounded-lg">
                    <i class="fas fa-paper-plane mr-2"></i>Envoyer
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function showEmailModal(missionId) {
    const modal = document.getElementById('emailModal');
    const form = document.getElementById('emailForm');
    form.action = `/reports/${missionId}/send-email`;
    modal.classList.remove('hidden');
}
</script>
@endsection
