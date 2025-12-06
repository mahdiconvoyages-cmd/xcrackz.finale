@extends('layouts.app')

@section('title', 'Paramètres - CHECKSFLEET')

@section('content')
<div class="mb-8">
    <h1 class="text-3xl font-bold">Paramètres</h1>
    <p class="text-gray-400 mt-1">Gérez votre compte et vos préférences</p>
</div>

<!-- Tabs -->
<div class="flex space-x-2 mb-8">
    <a href="/settings?tab=profile" class="px-6 py-3 rounded-lg {{ $tab === 'profile' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        <i class="fas fa-user mr-2"></i>Profil
    </a>
    <a href="/settings?tab=notifications" class="px-6 py-3 rounded-lg {{ $tab === 'notifications' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        <i class="fas fa-bell mr-2"></i>Notifications
    </a>
    <a href="/settings?tab=security" class="px-6 py-3 rounded-lg {{ $tab === 'security' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        <i class="fas fa-shield-alt mr-2"></i>Sécurité
    </a>
    <a href="/settings?tab=preferences" class="px-6 py-3 rounded-lg {{ $tab === 'preferences' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        <i class="fas fa-cog mr-2"></i>Préférences
    </a>
</div>

@if($tab === 'profile')
<!-- Profile Tab -->
<div class="grid md:grid-cols-3 gap-6">
    <div class="md:col-span-2">
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-6">Informations personnelles</h3>
            <form action="/settings/profile" method="POST">
                @csrf
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold mb-2">Nom complet</label>
                        <input type="text" name="full_name" required value="{{ $profile['full_name'] ?? '' }}"
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Email</label>
                        <input type="email" name="email" required value="{{ $profile['email'] ?? '' }}"
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Téléphone</label>
                        <input type="tel" name="phone" value="{{ $profile['phone'] ?? '' }}"
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold mb-2">Rôle</label>
                        <select name="app_role" disabled
                            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg opacity-50 cursor-not-allowed">
                            <option value="convoyeur" {{ ($profile['app_role'] ?? '') === 'convoyeur' ? 'selected' : '' }}>Convoyeur</option>
                            <option value="donneur_d_ordre" {{ ($profile['app_role'] ?? '') === 'donneur_d_ordre' ? 'selected' : '' }}>Donneur d'ordre</option>
                        </select>
                        <p class="text-xs text-gray-400 mt-1">Le rôle ne peut pas être modifié</p>
                    </div>

                    <button type="submit" class="btn-primary px-6 py-3 rounded-lg">
                        <i class="fas fa-save mr-2"></i>Enregistrer les modifications
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Avatar -->
    <div>
        <div class="glass-card p-6">
            <h3 class="text-lg font-bold mb-4">Photo de profil</h3>
            <div class="flex flex-col items-center">
                @if(isset($profile['avatar_url']))
                <img src="{{ $profile['avatar_url'] }}" alt="Avatar" class="w-32 h-32 rounded-full mb-4 object-cover">
                @else
                <div class="w-32 h-32 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center mb-4">
                    <i class="fas fa-user text-teal-400 text-5xl"></i>
                </div>
                @endif

                <form action="/settings/avatar" method="POST" enctype="multipart/form-data" class="w-full">
                    @csrf
                    <input type="file" name="avatar" accept="image/*" id="avatarInput" class="hidden"
                        onchange="this.form.submit()">
                    <button type="button" onclick="document.getElementById('avatarInput').click()"
                        class="w-full btn-primary px-4 py-2 rounded-lg mb-2">
                        <i class="fas fa-upload mr-2"></i>Changer la photo
                    </button>
                </form>

                @if(isset($profile['avatar_url']))
                <form action="/settings/avatar" method="POST">
                    @csrf
                    @method('DELETE')
                    <button type="submit" class="w-full glass-card px-4 py-2 rounded-lg hover:bg-red-500 hover:bg-opacity-20 text-red-400">
                        <i class="fas fa-trash mr-2"></i>Supprimer
                    </button>
                </form>
                @endif
            </div>
        </div>
    </div>
</div>

@elseif($tab === 'notifications')
<!-- Notifications Tab -->
<div class="max-w-2xl">
    <div class="glass-card p-6">
        <h3 class="text-xl font-bold mb-6">Préférences de notifications</h3>
        <form action="/settings/notifications" method="POST">
            @csrf
            <div class="space-y-6">
                <div class="flex items-center justify-between p-4 glass-card rounded-lg">
                    <div>
                        <p class="font-semibold">Notifications par email</p>
                        <p class="text-sm text-gray-400">Recevez des notifications par email</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="email_notifications" value="1" class="sr-only peer" checked>
                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                </div>

                <div class="flex items-center justify-between p-4 glass-card rounded-lg">
                    <div>
                        <p class="font-semibold">Notifications push</p>
                        <p class="text-sm text-gray-400">Notifications dans votre navigateur</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="push_notifications" value="1" class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                </div>

                <div class="flex items-center justify-between p-4 glass-card rounded-lg">
                    <div>
                        <p class="font-semibold">Notifications SMS</p>
                        <p class="text-sm text-gray-400">Recevez des SMS importants</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="sms_notifications" value="1" class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                </div>

                <div class="flex items-center justify-between p-4 glass-card rounded-lg">
                    <div>
                        <p class="font-semibold">Suivi de localisation</p>
                        <p class="text-sm text-gray-400">Partager votre position pendant les missions</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="location_tracking" value="1" class="sr-only peer" checked>
                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-lg peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    </label>
                </div>

                <button type="submit" class="btn-primary px-6 py-3 rounded-lg">
                    <i class="fas fa-save mr-2"></i>Enregistrer
                </button>
            </div>
        </form>
    </div>
</div>

@elseif($tab === 'security')
<!-- Security Tab -->
<div class="max-w-2xl space-y-6">
    <div class="glass-card p-6">
        <h3 class="text-xl font-bold mb-6">Changer le mot de passe</h3>
        <form action="/settings/password" method="POST">
            @csrf
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Mot de passe actuel</label>
                    <input type="password" name="current_password" required
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                </div>

                <div>
                    <label class="block text-sm font-semibold mb-2">Nouveau mot de passe</label>
                    <input type="password" name="new_password" required
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                    <p class="text-xs text-gray-400 mt-1">Minimum 6 caractères</p>
                </div>

                <div>
                    <label class="block text-sm font-semibold mb-2">Confirmer le nouveau mot de passe</label>
                    <input type="password" name="new_password_confirmation" required
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                </div>

                <button type="submit" class="btn-primary px-6 py-3 rounded-lg">
                    <i class="fas fa-key mr-2"></i>Changer le mot de passe
                </button>
            </div>
        </form>
    </div>

    <div class="glass-card p-6">
        <h3 class="text-xl font-bold mb-4">Sessions actives</h3>
        <div class="space-y-3">
            <div class="flex items-center justify-between p-4 bg-gray-900 bg-opacity-50 rounded-lg">
                <div>
                    <p class="font-semibold">Session actuelle</p>
                    <p class="text-sm text-gray-400">Dernière activité: Maintenant</p>
                </div>
                <span class="badge badge-success">Active</span>
            </div>
        </div>
    </div>

    <div class="glass-card p-6">
        <form action="/logout" method="POST">
            @csrf
            <button type="submit" class="w-full glass-card px-6 py-3 rounded-lg hover:bg-red-500 hover:bg-opacity-20 text-red-400">
                <i class="fas fa-sign-out-alt mr-2"></i>Se déconnecter
            </button>
        </form>
    </div>
</div>

@else
<!-- Preferences Tab -->
<div class="max-w-2xl space-y-6">
    <div class="glass-card p-6">
        <h3 class="text-xl font-bold mb-6">Préférences générales</h3>
        <form action="/settings/language" method="POST">
            @csrf
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Langue</label>
                    <select name="language"
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-semibold mb-2">Fuseau horaire</label>
                    <select
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                        <option>Europe/Paris</option>
                        <option>Europe/London</option>
                        <option>America/New_York</option>
                    </select>
                </div>

                <button type="submit" class="btn-primary px-6 py-3 rounded-lg">
                    <i class="fas fa-save mr-2"></i>Enregistrer
                </button>
            </div>
        </form>
    </div>

    <div class="glass-card p-6 border-2 border-red-500">
        <h3 class="text-xl font-bold mb-4 text-red-400">Zone de danger</h3>
        <p class="text-gray-400 mb-6">La suppression de votre compte est définitive et irréversible. Toutes vos données seront perdues.</p>

        <button onclick="document.getElementById('deleteAccountModal').classList.remove('hidden')"
            class="glass-card px-6 py-3 rounded-lg hover:bg-red-500 hover:bg-opacity-20 text-red-400">
            <i class="fas fa-exclamation-triangle mr-2"></i>Supprimer mon compte
        </button>
    </div>
</div>
@endif

<!-- Delete Account Modal -->
<div id="deleteAccountModal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
    <div class="glass-card p-8 max-w-md w-full mx-4 border-2 border-red-500">
        <h3 class="text-2xl font-bold mb-4 text-red-400">Supprimer le compte</h3>
        <p class="text-gray-300 mb-6">Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.</p>

        <form action="/settings/account" method="POST">
            @csrf
            @method('DELETE')
            <input type="text" name="confirmation" required
                placeholder="SUPPRIMER"
                class="w-full px-4 py-3 bg-gray-800 border border-red-500 rounded-lg focus:border-red-400 focus:outline-none mb-4">

            <div class="flex space-x-4">
                <button type="button"
                    onclick="document.getElementById('deleteAccountModal').classList.add('hidden')"
                    class="flex-1 glass-card px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-10">
                    Annuler
                </button>
                <button type="submit" class="flex-1 bg-red-500 px-4 py-3 rounded-lg hover:bg-red-600">
                    Supprimer définitivement
                </button>
            </div>
        </form>
    </div>
</div>
@endsection
