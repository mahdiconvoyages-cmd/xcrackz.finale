@extends('layouts.app')

@section('title', 'Nouvelle mission - CHECKSFLEET')

@section('content')
<div class="mb-8">
    <div class="flex items-center text-sm text-gray-400 mb-4">
        <a href="/missions" class="hover:text-teal-400">Missions</a>
        <i class="fas fa-chevron-right mx-2 text-xs"></i>
        <span>Nouvelle mission</span>
    </div>
    <h1 class="text-3xl font-bold">Créer une mission</h1>
</div>

<form action="/missions" method="POST">
    @csrf

    <div class="grid md:grid-cols-2 gap-6">
        <!-- Informations générales -->
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-6">Informations générales</h3>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Titre de la mission *</label>
                <input type="text" name="title" required value="{{ old('title') }}"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Ex: Livraison BMW Série 3">
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Adresse de départ *</label>
                <input type="text" name="pickup_address" required value="{{ old('pickup_address') }}"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Ex: 123 Rue de la Paix, Paris">
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Adresse d'arrivée *</label>
                <input type="text" name="delivery_address" required value="{{ old('delivery_address') }}"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Ex: 456 Avenue des Champs, Lyon">
            </div>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Date départ prévue</label>
                    <input type="datetime-local" name="scheduled_pickup" value="{{ old('scheduled_pickup') }}"
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                </div>

                <div>
                    <label class="block text-sm font-semibold mb-2">Date arrivée prévue</label>
                    <input type="datetime-local" name="scheduled_delivery" value="{{ old('scheduled_delivery') }}"
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                </div>
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Assigner à</label>
                <select name="assigned_to"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                    <option value="">Sélectionner un convoyeur</option>
                    @foreach($contacts as $contact)
                        @if($contact['status'] === 'accepted')
                        <option value="{{ $contact['invited_user_id'] }}">{{ $contact['invited_email'] }}</option>
                        @endif
                    @endforeach
                </select>
            </div>
        </div>

        <!-- Informations véhicule -->
        <div class="glass-card p-6">
            <h3 class="text-xl font-bold mb-6">Informations véhicule</h3>

            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-sm font-semibold mb-2">Marque</label>
                    <input type="text" name="vehicle_make" value="{{ old('vehicle_make') }}"
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                        placeholder="Ex: BMW">
                </div>

                <div>
                    <label class="block text-sm font-semibold mb-2">Modèle</label>
                    <input type="text" name="vehicle_model" value="{{ old('vehicle_model') }}"
                        class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                        placeholder="Ex: Série 3">
                </div>
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Année</label>
                <input type="number" name="vehicle_year" value="{{ old('vehicle_year') }}"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Ex: 2023">
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Numéro VIN</label>
                <input type="text" name="vehicle_vin" value="{{ old('vehicle_vin') }}"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Ex: WBADT43452G123456">
            </div>

            <div class="mb-4">
                <label class="block text-sm font-semibold mb-2">Plaque d'immatriculation</label>
                <input type="text" name="vehicle_license_plate" value="{{ old('vehicle_license_plate') }}"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none"
                    placeholder="Ex: AB-123-CD">
            </div>

            <div class="bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg p-4 mt-6">
                <p class="text-sm text-blue-400">
                    <i class="fas fa-info-circle mr-2"></i>
                    Les informations du véhicule seront utilisées pour l'inspection départ/arrivée.
                </p>
            </div>
        </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end space-x-4 mt-6">
        <a href="/missions" class="glass-card px-6 py-3 rounded-lg hover:bg-white hover:bg-opacity-10">
            Annuler
        </a>
        <button type="submit" class="btn-primary px-8 py-3 rounded-lg">
            <i class="fas fa-save mr-2"></i>Créer la mission
        </button>
    </div>
</form>
@endsection
