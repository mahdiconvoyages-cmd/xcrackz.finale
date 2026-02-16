@extends('layouts.app')

@section('title', 'Facturation - CHECKSFLEET')

@section('content')
<div class="mb-8">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold">Facturation</h1>
            <p class="text-gray-400 mt-1">Gérez vos factures, devis et clients</p>
        </div>
        <a href="/billing/company" class="glass-card px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-10">
            <i class="fas fa-building mr-2"></i>Paramètres entreprise
        </a>
    </div>
</div>

<!-- Tabs -->
<div class="flex space-x-2 mb-6">
    <a href="/billing?tab=invoices" class="px-6 py-3 rounded-lg {{ $tab === 'invoices' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        Factures
    </a>
    <a href="/billing?tab=quotes" class="px-6 py-3 rounded-lg {{ $tab === 'quotes' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        Devis
    </a>
    <a href="/billing?tab=clients" class="px-6 py-3 rounded-lg {{ $tab === 'clients' ? 'bg-teal-500 text-white' : 'glass-card text-gray-300' }}">
        Clients
    </a>
</div>

@if($tab === 'invoices')
<!-- Invoices Tab -->
<div class="mb-6 flex justify-end">
    <button onclick="document.getElementById('createInvoiceModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Nouvelle facture
    </button>
</div>

@if(isset($invoices) && count($invoices) > 0)
<div class="glass-card overflow-hidden">
    <table class="w-full">
        <thead>
            <tr class="border-b border-gray-700">
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Numéro</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Client</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Montant TTC</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Statut</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Date</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoices as $invoice)
            <tr class="border-b border-gray-800 hover:bg-white hover:bg-opacity-5">
                <td class="py-4 px-6 font-mono text-teal-400">{{ $invoice['invoice_number'] }}</td>
                <td class="py-4 px-6">Client</td>
                <td class="py-4 px-6 font-bold">{{ number_format($invoice['total_ttc'], 2) }} €</td>
                <td class="py-4 px-6">
                    @if($invoice['status'] === 'paid')
                        <span class="badge badge-success">Payée</span>
                    @elseif($invoice['status'] === 'sent')
                        <span class="badge badge-info">Envoyée</span>
                    @elseif($invoice['status'] === 'overdue')
                        <span class="badge badge-error">En retard</span>
                    @else
                        <span class="badge">Brouillon</span>
                    @endif
                </td>
                <td class="py-4 px-6 text-sm text-gray-400">{{ date('d/m/Y', strtotime($invoice['invoice_date'])) }}</td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        <a href="/billing/invoices/{{ $invoice['id'] }}/pdf" class="text-teal-400 hover:text-teal-300" title="PDF">
                            <i class="fas fa-file-pdf"></i>
                        </a>
                        <button onclick="showEmailInvoiceModal('{{ $invoice['id'] }}')" class="text-blue-400 hover:text-blue-300" title="Envoyer">
                            <i class="fas fa-envelope"></i>
                        </button>
                    </div>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-file-invoice text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucune facture</h3>
    <p class="text-gray-400 mb-6">Créez votre première facture</p>
    <button onclick="document.getElementById('createInvoiceModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Nouvelle facture
    </button>
</div>
@endif

@elseif($tab === 'quotes')
<!-- Quotes Tab -->
<div class="mb-6 flex justify-end">
    <button onclick="document.getElementById('createQuoteModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Nouveau devis
    </button>
</div>

@if(isset($quotes) && count($quotes) > 0)
<div class="glass-card overflow-hidden">
    <table class="w-full">
        <thead>
            <tr class="border-b border-gray-700">
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Numéro</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Client</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Montant TTC</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Statut</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Valide jusqu'au</th>
                <th class="text-left py-4 px-6 text-gray-400 font-semibold">Actions</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quotes as $quote)
            <tr class="border-b border-gray-800 hover:bg-white hover:bg-opacity-5">
                <td class="py-4 px-6 font-mono text-cyan-400">{{ $quote['quote_number'] }}</td>
                <td class="py-4 px-6">Client</td>
                <td class="py-4 px-6 font-bold">{{ number_format($quote['total_ttc'], 2) }} €</td>
                <td class="py-4 px-6">
                    @if($quote['status'] === 'accepted')
                        <span class="badge badge-success">Accepté</span>
                    @elseif($quote['status'] === 'sent')
                        <span class="badge badge-info">Envoyé</span>
                    @elseif($quote['status'] === 'rejected')
                        <span class="badge badge-error">Refusé</span>
                    @elseif($quote['status'] === 'expired')
                        <span class="badge badge-warning">Expiré</span>
                    @else
                        <span class="badge">Brouillon</span>
                    @endif
                </td>
                <td class="py-4 px-6 text-sm text-gray-400">{{ date('d/m/Y', strtotime($quote['validity_date'])) }}</td>
                <td class="py-4 px-6">
                    <div class="flex space-x-2">
                        <a href="/billing/quotes/{{ $quote['id'] }}/pdf" class="text-cyan-400 hover:text-cyan-300" title="PDF">
                            <i class="fas fa-file-pdf"></i>
                        </a>
                        @if($quote['status'] === 'accepted')
                        <form action="/billing/quotes/{{ $quote['id'] }}/convert" method="POST" class="inline">
                            @csrf
                            <button type="submit" class="text-green-400 hover:text-green-300" title="Convertir en facture">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                        </form>
                        @endif
                    </div>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-file-contract text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucun devis</h3>
    <p class="text-gray-400 mb-6">Créez votre premier devis</p>
    <button onclick="document.getElementById('createQuoteModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Nouveau devis
    </button>
</div>
@endif

@else
<!-- Clients Tab -->
<div class="mb-6 flex justify-end">
    <button onclick="document.getElementById('createClientModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Nouveau client
    </button>
</div>

@if(count($clients) > 0)
<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
    @foreach($clients as $client)
    <div class="glass-card p-6 hover:scale-105 transition-transform">
        <div class="flex items-start justify-between mb-4">
            <div class="w-12 h-12 rounded-full bg-teal-500 bg-opacity-20 flex items-center justify-center">
                <i class="fas fa-{{ $client['is_company'] ? 'building' : 'user' }} text-teal-400 text-xl"></i>
            </div>
            @if($client['is_company'])
            <span class="badge badge-info text-xs">Entreprise</span>
            @else
            <span class="badge text-xs">Particulier</span>
            @endif
        </div>

        <h3 class="font-bold text-lg mb-2">
            {{ $client['is_company'] ? $client['company_name'] : $client['first_name'] . ' ' . $client['last_name'] }}
        </h3>

        <div class="space-y-2 text-sm text-gray-400">
            @if($client['is_company'] && $client['siret'])
            <p><i class="fas fa-id-card mr-2"></i>{{ $client['siret'] }}</p>
            @endif
            <p><i class="fas fa-map-marker-alt mr-2"></i>{{ $client['city'] }}</p>
            @if($client['email'])
            <p><i class="fas fa-envelope mr-2"></i>{{ $client['email'] }}</p>
            @endif
        </div>
    </div>
    @endforeach
</div>
@else
<div class="glass-card p-12 text-center">
    <i class="fas fa-address-book text-6xl text-gray-600 mb-4"></i>
    <h3 class="text-xl font-bold mb-2">Aucun client</h3>
    <p class="text-gray-400 mb-6">Ajoutez vos premiers clients</p>
    <button onclick="document.getElementById('createClientModal').classList.remove('hidden')"
        class="btn-primary px-6 py-3 rounded-lg">
        <i class="fas fa-plus mr-2"></i>Nouveau client
    </button>
</div>
@endif
@endif

<!-- Create Client Modal -->
<div id="createClientModal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-y-auto">
    <div class="glass-card p-8 max-w-2xl w-full mx-4 my-8">
        <h3 class="text-2xl font-bold mb-6">Nouveau client</h3>
        <form action="/billing/clients" method="POST">
            @csrf
            <div class="mb-4">
                <label class="flex items-center">
                    <input type="checkbox" name="is_company" value="1" class="mr-2" onchange="toggleCompanyFields(this)">
                    <span class="font-semibold">Client entreprise</span>
                </label>
            </div>

            <div id="companyFields" class="hidden space-y-4 mb-4">
                <input type="text" name="company_name" placeholder="Nom de l'entreprise"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                <input type="text" name="siret" placeholder="SIRET (optionnel)"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            </div>

            <div id="individualFields" class="grid grid-cols-2 gap-4 mb-4">
                <input type="text" name="first_name" placeholder="Prénom"
                    class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                <input type="text" name="last_name" placeholder="Nom"
                    class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            </div>

            <div class="space-y-4 mb-6">
                <input type="text" name="address" required placeholder="Adresse"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" name="postal_code" required placeholder="Code postal"
                        class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                    <input type="text" name="city" required placeholder="Ville"
                        class="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                </div>
                <input type="email" name="email" placeholder="Email (optionnel)"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
                <input type="tel" name="phone" placeholder="Téléphone (optionnel)"
                    class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-teal-500 focus:outline-none">
            </div>

            <div class="flex space-x-4">
                <button type="button" onclick="document.getElementById('createClientModal').classList.add('hidden')"
                    class="flex-1 glass-card px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-10">
                    Annuler
                </button>
                <button type="submit" class="flex-1 btn-primary px-4 py-3 rounded-lg">
                    Créer le client
                </button>
            </div>
        </form>
    </div>
</div>

<script>
function toggleCompanyFields(checkbox) {
    const companyFields = document.getElementById('companyFields');
    const individualFields = document.getElementById('individualFields');
    if (checkbox.checked) {
        companyFields.classList.remove('hidden');
        individualFields.classList.add('hidden');
    } else {
        companyFields.classList.add('hidden');
        individualFields.classList.remove('hidden');
    }
}
</script>
@endsection
