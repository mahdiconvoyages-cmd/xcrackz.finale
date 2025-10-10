@extends('layouts.app')

@section('title', 'Dashboard - FleetCheck')

@section('content')
<div class="mb-8">
    <h1 class="text-3xl font-bold">Dashboard</h1>
    <p class="text-gray-400 mt-1">Bienvenue, {{ session('profile')['full_name'] ?? 'Utilisateur' }}</p>
</div>

<!-- Stats Grid -->
<div class="grid md:grid-cols-4 gap-6 mb-8">
    <div class="stat-card">
        <div class="flex justify-between items-start mb-4">
            <div>
                <p class="text-gray-400 text-sm">Missions actives</p>
                <h3 class="text-3xl font-bold mt-1">{{ $stats['active_missions'] }}</h3>
            </div>
            <div class="text-3xl text-teal-400">
                <i class="fas fa-tasks"></i>
            </div>
        </div>
        <p class="text-sm text-gray-400">
            <span class="text-green-400">{{ $stats['in_progress_missions'] }}</span> en cours
        </p>
    </div>

    <div class="stat-card">
        <div class="flex justify-between items-start mb-4">
            <div>
                <p class="text-gray-400 text-sm">Missions terminées</p>
                <h3 class="text-3xl font-bold mt-1">{{ $stats['completed_missions'] }}</h3>
            </div>
            <div class="text-3xl text-cyan-400">
                <i class="fas fa-check-circle"></i>
            </div>
        </div>
        <p class="text-sm text-teal-400">+12% ce mois</p>
    </div>

    <div class="stat-card">
        <div class="flex justify-between items-start mb-4">
            <div>
                <p class="text-gray-400 text-sm">Revenus</p>
                <h3 class="text-3xl font-bold mt-1">{{ number_format($stats['total_revenue'], 0) }}€</h3>
            </div>
            <div class="text-3xl text-green-400">
                <i class="fas fa-euro-sign"></i>
            </div>
        </div>
        <p class="text-sm text-teal-400">+8% ce mois</p>
    </div>

    <div class="stat-card">
        <div class="flex justify-between items-start mb-4">
            <div>
                <p class="text-gray-400 text-sm">Évaluation</p>
                <h3 class="text-3xl font-bold mt-1">{{ $stats['average_rating'] }}</h3>
            </div>
            <div class="text-3xl text-yellow-400">
                <i class="fas fa-star"></i>
            </div>
        </div>
        <p class="text-sm text-gray-400">{{ $stats['contacts_count'] }} contacts</p>
    </div>
</div>

<!-- Charts Row -->
<div class="grid md:grid-cols-2 gap-6 mb-8">
    <!-- Missions by Status -->
    <div class="glass-card p-6">
        <h3 class="text-xl font-bold mb-4">Missions par statut</h3>
        <canvas id="statusChart"></canvas>
    </div>

    <!-- Monthly Activity -->
    <div class="glass-card p-6">
        <h3 class="text-xl font-bold mb-4">Activité mensuelle</h3>
        <canvas id="monthlyChart"></canvas>
    </div>
</div>

<!-- Recent Missions -->
<div class="glass-card p-6">
    <div class="flex justify-between items-center mb-6">
        <h3 class="text-xl font-bold">Missions récentes</h3>
        <a href="/missions" class="text-teal-400 hover:text-teal-300">Voir tout →</a>
    </div>

    @if(count($recentMissions) > 0)
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead>
                <tr class="border-b border-gray-700">
                    <th class="text-left py-3 px-4 text-gray-400 font-semibold">Référence</th>
                    <th class="text-left py-3 px-4 text-gray-400 font-semibold">Titre</th>
                    <th class="text-left py-3 px-4 text-gray-400 font-semibold">Statut</th>
                    <th class="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
                    <th class="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                </tr>
            </thead>
            <tbody>
                @foreach($recentMissions as $mission)
                <tr class="border-b border-gray-800 hover:bg-white hover:bg-opacity-5">
                    <td class="py-3 px-4 font-mono text-sm">{{ $mission['reference'] }}</td>
                    <td class="py-3 px-4">{{ $mission['title'] }}</td>
                    <td class="py-3 px-4">
                        @if($mission['status'] === 'completed')
                            <span class="badge badge-success">Terminée</span>
                        @elseif($mission['status'] === 'in_progress')
                            <span class="badge badge-info">En cours</span>
                        @elseif($mission['status'] === 'pending')
                            <span class="badge badge-warning">En attente</span>
                        @else
                            <span class="badge">Brouillon</span>
                        @endif
                    </td>
                    <td class="py-3 px-4 text-sm text-gray-400">
                        {{ date('d/m/Y', strtotime($mission['created_at'])) }}
                    </td>
                    <td class="py-3 px-4">
                        <a href="/missions/{{ $mission['id'] }}" class="text-teal-400 hover:text-teal-300">
                            Voir <i class="fas fa-arrow-right ml-1"></i>
                        </a>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
    @else
    <p class="text-center text-gray-400 py-8">Aucune mission récente</p>
    @endif
</div>

<!-- Quick Actions -->
<div class="grid md:grid-cols-3 gap-6 mt-8">
    <a href="/missions/create" class="glass-card p-6 hover:bg-white hover:bg-opacity-10 transition">
        <div class="text-3xl text-teal-400 mb-3">
            <i class="fas fa-plus-circle"></i>
        </div>
        <h4 class="font-bold text-lg">Nouvelle mission</h4>
        <p class="text-sm text-gray-400 mt-1">Créer une nouvelle mission de convoyage</p>
    </a>

    <a href="/reports" class="glass-card p-6 hover:bg-white hover:bg-opacity-10 transition">
        <div class="text-3xl text-cyan-400 mb-3">
            <i class="fas fa-file-alt"></i>
        </div>
        <h4 class="font-bold text-lg">Voir les rapports</h4>
        <p class="text-sm text-gray-400 mt-1">Consulter les rapports de missions</p>
    </a>

    <a href="/billing" class="glass-card p-6 hover:bg-white hover:bg-opacity-10 transition">
        <div class="text-3xl text-green-400 mb-3">
            <i class="fas fa-file-invoice-dollar"></i>
        </div>
        <h4 class="font-bold text-lg">Facturation</h4>
        <p class="text-sm text-gray-400 mt-1">Gérer factures et devis</p>
    </a>
</div>
@endsection

@section('scripts')
<script>
// Status Chart
const statusCtx = document.getElementById('statusChart').getContext('2d');
new Chart(statusCtx, {
    type: 'doughnut',
    data: {
        labels: ['Terminées', 'En cours', 'En attente', 'Brouillon'],
        datasets: [{
            data: [
                {{ $stats['completed_missions'] }},
                {{ $stats['in_progress_missions'] }},
                {{ $stats['pending_missions'] }},
                {{ $stats['active_missions'] - $stats['in_progress_missions'] - $stats['pending_missions'] }}
            ],
            backgroundColor: ['#10b981', '#14b8a6', '#f59e0b', '#6b7280']
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#fff' }
            }
        }
    }
});

// Monthly Chart
const monthlyCtx = document.getElementById('monthlyChart').getContext('2d');
new Chart(monthlyCtx, {
    type: 'bar',
    data: {
        labels: @json($monthlyData['labels']),
        datasets: [
            {
                label: 'Terminées',
                data: @json($monthlyData['completed']),
                backgroundColor: '#10b981'
            },
            {
                label: 'En cours',
                data: @json($monthlyData['in_progress']),
                backgroundColor: '#14b8a6'
            },
            {
                label: 'En attente',
                data: @json($monthlyData['pending']),
                backgroundColor: '#f59e0b'
            }
        ]
    },
    options: {
        responsive: true,
        scales: {
            x: { ticks: { color: '#fff' } },
            y: { ticks: { color: '#fff' } }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#fff' }
            }
        }
    }
});
</script>
@endsection
