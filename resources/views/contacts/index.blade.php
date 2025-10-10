@extends('layouts.app')

@section('title', 'Contacts - FleetCheck')

@section('content')
<div class="mb-8">
    <h1 class="text-3xl font-bold">Contacts</h1>
    <p class="text-gray-400 mt-1">Gérez votre carnet d'adresses</p>
</div>

<!-- Stats -->
<div class="grid md:grid-cols-4 gap-6 mb-8">
    <div class="stat-card">
        <p class="text-gray-400 text-sm">Total</p>
        <h3 class="text-3xl font-bold mt-1">{{ $stats['total'] }}</h3>
    </div>
    <div class="stat-card">
        <p class="text-gray-400 text-sm">En attente</p>
        <h3 class="text-3xl font-bold mt-1 text-yellow-400">{{ $stats['pending'] }}</h3>
    </div>
    <div class="stat-card">
        <p class="text-gray-400 text-sm">Acceptés</p>
        <h3 class="text-3xl font-bold mt-1 text-green-400">{{ $stats['accepted'] }}</h3>
    </div>
    <div class="stat-card">
        <p class="text-gray-400 text-sm">Refusés</p>
        <h3 class="text-3xl font-bold mt-1 text-red-400">{{ $stats['rejected'] }}</h3>
    </div>
</div>

<!-- Actions Bar -->
<div class="glass-card p-6 mb-6">
    <div class="flex justify-between items-center gap-4">
        <form method="GET" class="flex-1 flex gap-4">
            <input type="text" name="search" value="{{ $search ?? '' }}"
                placeholder="Rechercher un contact..."
                class="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            <button type="submit" class="btn-primary px-6 py-2 rounded-lg">
                <i class="fas fa-search mr-2"></i>Rechercher
            </button>
        </form>

        <button onclick="document.getElementById('inviteModal').classList.remove('hidden')"
            class="btn-primary px-6 py-2 rounded-lg">
            <i class="fas fa-user-plus mr-2"></i>Inviter un contact
        </button>
    </div>
</div>

<!-- Contacts List -->
@if(count($contacts) > 0)
<div class="glass-card overflow-hidden">
    <table class="w-full">
        <thead>
            <tr class="border-b border-gray-700">
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Email</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Statut</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Date d'invitation</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach($contacts as $contact)
            <tr class="border-b border-gray-800 hover:bg-white hover:bg-opacity-5 transition">
                <td class="py-4 px-6">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mr-3">
                            <i class="fas fa-user text-teal-400"></i>
                        </div>
                        <span class="font-semibold">{{ $contact['invited_email'] }}</span>
                    </div>
                </td>
                <td class="py-4 px-6">
                    @if($contact['status'] === 'accepted')
                        <span class="badge badge-success">Accepté</span>
                    @elseif($contact['status'] === 'pending')
                        <span class="badge badge-warning">En attente</span>
                    @else
                        <span class="badge badge-error">Refusé</span>
                    @endif
                </td>
                <td class="py-4 px-6 text-sm text-gray-400">
                    {{ date('d/m/Y', strtotime($contact['created_at'])) }}
                </td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        @if($contact['status'] === 'pending' && $contact['user_id'] !== session('user')['id'])
                        <a href="/contacts/accept/{{ $contact['id'] }}"
                           class="glass-card px-3 py-1 rounded text-sm hover:bg-green-500 hover:bg-opacity-20 text-green-400">
                            <i class="fas fa-check mr-1"></i>Accepter
                        </a>
                        <form action="/contacts/{{ $contact['id'] }}/reject" method="POST" class="inline">
                            @csrf
                            <button type="submit"
                                class="glass-card px-3 py-1 rounded text-sm hover:bg-red-500 hover:bg-opacity-20 text-red-400">
                                <i class="fas fa-times mr-1"></i>Refuser
                            </button>
                        </form>
                        @endif

                        <form action="/contacts/{{ $contact['id'] }}" method="POST"
                            onsubmit="return confirm('Supprimer ce contact ?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-red-400 hover:text-red-300">
                                <i class="fas fa-trash"></i>
                            </button>
                        </form>
                    </div>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-users text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucun contact</h3>
    <p class="text-gray-400 mb-6">Commencez par inviter vos premiers contacts</p>
    <button onclick="document.getElementById('inviteModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-user-plus mr-2"></i>Inviter un contact
    </button>
</div>
@endif

<!-- Invite Modal -->
<div id="inviteModal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="glass-card p-8 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-2xl font-bold">Inviter un contact</h3>
            <button onclick="document.getElementById('inviteModal').classList.add('hidden')"
                class="text-gray-400 hover:text-white">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <form action="/contacts/invite" method="POST">
            @csrf
            <div class="mb-6">
                <label class="block text-sm font-semibold mb-2">Email du contact</label>
                <input type="email" name="email" required
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="contact@exemple.com">
                <p class="text-sm text-gray-400 mt-2">Un email d'invitation sera envoyé à cette adresse.</p>
            </div>

            <div class="flex space-x-4">
                <button type="button"
                    onclick="document.getElementById('inviteModal').classList.add('hidden')"
                    class="flex-1 glass-card px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-10">
                    Annuler
                </button>
                <button type="submit" class="flex-1 btn-primary px-4 py-3 rounded-lg">
                    <i class="fas fa-paper-plane mr-2"></i>Envoyer l'invitation
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
