import { useEffect, useState } from 'react';
import { Plus, Search, Building2, Mail, Phone, MapPin, Edit2, Trash2, FileText, Euro, TrendingUp, Calendar, Clock, Loader2, CheckCircle2, AlertCircle, Sparkles, DollarSign, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { searchBySiret, formatSiret, isValidSiret, formatInseeAddress } from '../services/inseeService';
import { PricingGrid, getClientPricingGrid } from '../services/pricingGridService';
import PricingGridModal from '../components/PricingGridModal';
// import QuoteGenerator from '../components/QuoteGenerator';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  created_at: string;
  user_id: string;
}

interface ClientStats {
  total_invoices: number;
  total_quotes: number;
  total_revenue: number;
  pending_amount: number;
  last_invoice_date: string | null;
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);

  // Pricing Grids states
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingClientId, setPricingClientId] = useState<string | undefined>(undefined);
  const [pricingClientName, setPricingClientName] = useState<string | undefined>(undefined);
  const [clientPricingGrids, setClientPricingGrids] = useState<Record<string, PricingGrid | null>>({});

  // Quote Generator states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteClientId, setQuoteClientId] = useState<string | undefined>(undefined);
  const [quoteClientName, setQuoteClientName] = useState<string | undefined>(undefined);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    siret: ''
  });

  // INSEE autocomplete states
  const [siretSearching, setSiretSearching] = useState(false);
  const [siretFound, setSiretFound] = useState<boolean | null>(null);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    if (user) {
      loadClients();
    }
  }, [user]);

  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  const loadClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading clients:', error);
    } else {
      setClients(data || []);
      // Load pricing grids for each client
      if (data && user) {
        await loadClientPricingGrids(data.map(c => c.id));
      }
    }
    setLoading(false);
  };

  const loadClientPricingGrids = async (clientIds: string[]) => {
    if (!user || clientIds.length === 0) return;

    // Batch load all pricing grids in parallel instead of sequential N+1
    const gridsMap: Record<string, PricingGrid | null> = {};
    const results = await Promise.all(
      clientIds.map(async (clientId) => {
        try {
          const grid = await getClientPricingGrid(user.id, clientId);
          return { clientId, grid };
        } catch (error) {
          console.error(`Error loading pricing grid for client ${clientId}:`, error);
          return { clientId, grid: null };
        }
      })
    );
    
    for (const { clientId, grid } of results) {
      gridsMap[clientId] = grid;
    }

    setClientPricingGrids(gridsMap);
  };

  const handlePricingGridSuccess = async () => {
    // Reload pricing grids after save
    if (user) {
      await loadClientPricingGrids(clients.map(c => c.id));
    }
  };

  const filterClients = () => {
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.siret?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredClients(filtered);
  };

  const loadClientStats = async (clientId: string) => {
    if (!user) return;
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, status, issue_date')
      .eq('client_id', clientId)
      .eq('user_id', user.id);

    const { data: quotes } = await supabase
      .from('quotes')
      .select('total')
      .eq('client_id', clientId)
      .eq('user_id', user.id);

    const totalRevenue = invoices?.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0) || 0;
    const pendingAmount = invoices?.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0) || 0;
    const lastInvoice = invoices?.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())[0];

    setClientStats({
      total_invoices: invoices?.length || 0,
      total_quotes: quotes?.length || 0,
      total_revenue: totalRevenue,
      pending_amount: pendingAmount,
      last_invoice_date: lastInvoice?.issue_date || null
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      alert('Le nom et l\'email sont obligatoires');
      return;
    }

    const clientData = {
      ...formData,
      user_id: user?.id
    };

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', editingClient.id);

      if (error) {
        console.error('Error updating client:', error);
        alert('Erreur lors de la mise à jour du client');
      } else {
        alert('✅ Client mis à jour avec succès');
        resetForm();
        loadClients();
      }
    } else {
      const { error } = await supabase
        .from('clients')
        .insert(clientData);

      if (error) {
        console.error('Error creating client:', error);
        alert('Erreur lors de la création du client');
      } else {
        alert('✅ Client créé avec succès');
        resetForm();
        loadClients();
      }
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      address: client.address || '',
      siret: client.siret || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error deleting client:', error);
      alert('Erreur lors de la suppression du client');
    } else {
      alert('✅ Client supprimé avec succès');
      loadClients();
    }
  };

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    await loadClientStats(client.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      siret: ''
    });
    setEditingClient(null);
    setShowModal(false);
    setSiretSearching(false);
    setSiretFound(null);
    setManualMode(false);
  };

  // Fonction pour rechercher une entreprise par SIRET
  const handleSiretSearch = async (siret: string) => {
    // Si le SIRET est valide, rechercher dans l'API INSEE
    if (isValidSiret(siret) && !manualMode) {
      setSiretSearching(true);
      setSiretFound(null);

      const company = await searchBySiret(siret);

      if (company) {
        // Auto-remplir les champs
        const newData = {
          ...formData,
          siret: company.siret,
          name: company.nomCommercial || company.denomination,
          address: formatInseeAddress(company.adresse)
        };
        
        setFormData(newData);
        setSiretFound(true);
      } else {
        console.warn('❌ Entreprise non trouvée');
        setFormData({ ...formData, siret });
        setSiretFound(false);
      }

      setSiretSearching(false);
    } else {
      // Mode manuel ou SIRET invalide
      setFormData({ ...formData, siret });
      setSiretFound(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Sans wrapper car déjà dans CRM */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                Clients
              </h1>
              <p className="text-slate-600 mt-2">
                Gérez vos clients et consultez leurs statistiques
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:shadow-lg hover:shadow-teal-500/50 transition flex items-center gap-2 font-semibold"
            >
              <Plus className="w-5 h-5" />
              Nouveau client
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un client (nom, email, SIRET)..."
              className="w-full pl-12 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-6 text-white hover:shadow-2xl hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-semibold mb-1">Total clients</p>
                <p className="text-5xl font-black">{clients.length}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white hover:shadow-2xl hover:shadow-green-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-semibold mb-1">Nouveaux ce mois</p>
                <p className="text-5xl font-black">
                  {clients.filter(c => {
                    const clientDate = new Date(c.created_at);
                    const now = new Date();
                    return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl p-6 text-white hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold mb-1">Avec email</p>
                <p className="text-5xl font-black">
                  {clients.filter(c => c.email).length}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white hover:shadow-2xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-semibold mb-1">Avec SIRET</p>
                <p className="text-5xl font-black">
                  {clients.filter(c => c.siret).length}
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Liste des clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="group bg-white/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-slate-200 hover:border-teal-400 hover:shadow-2xl hover:shadow-teal-500/20 transition-all duration-300 cursor-pointer hover:-translate-y-1"
              onClick={() => handleViewDetails(client)}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 transition-transform">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-xl truncate group-hover:text-teal-600 transition">
                    {client.name}
                  </h3>
                  <p className="text-sm text-slate-500 font-semibold mt-0.5">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    {formatDate(client.created_at)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                {client.email && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="truncate font-medium">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="truncate font-medium">{client.address}</span>
                  </div>
                )}
                {client.siret && (
                  <div className="flex items-center gap-3 text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-mono font-bold">{formatSiret(client.siret)}</span>
                  </div>
                )}
              </div>

              {/* Section Grille Tarifaire */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mt-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Grille Tarifaire
                  </h4>
                  <button
                    onClick={() => {
                      setPricingClientId(client.id);
                      setPricingClientName(client.name);
                      setShowPricingModal(true);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" />
                    Configurer
                  </button>
                </div>

                {clientPricingGrids[client.id] ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                      <span className="text-slate-600 font-semibold">Grille:</span>
                      <span className="font-bold text-slate-900">{clientPricingGrids[client.id]?.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/60 rounded-lg px-3 py-2">
                        <div className="text-slate-500 text-xs font-semibold mb-0.5">1-50km (léger)</div>
                        <div className="font-bold text-green-700">{clientPricingGrids[client.id]?.tier_1_50_light}€</div>
                      </div>
                      <div className="bg-white/60 rounded-lg px-3 py-2">
                        <div className="text-slate-500 text-xs font-semibold mb-0.5">Marge</div>
                        <div className="font-bold text-green-700">{clientPricingGrids[client.id]?.margin_percentage}%</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-green-700 font-semibold bg-green-100 rounded-lg py-2 mt-3">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tarification personnalisée active
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-semibold">Grille globale par défaut</span>
                    </div>
                    <p className="text-xs text-slate-600 italic">
                      Aucune grille personnalisée. Créez-en une pour ce client ou la grille globale sera utilisée.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-slate-200" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(client)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:shadow-blue-500/50"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:shadow-red-500/50"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-slate-600 text-2xl font-bold mb-2">
              {searchQuery ? 'Aucun client trouvé' : 'Aucun client pour le moment'}
            </p>
            <p className="text-slate-500 mb-6">
              {searchQuery ? 'Essayez une autre recherche' : 'Commencez par créer votre premier client'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:shadow-2xl hover:shadow-teal-500/50 transition-all font-bold text-lg inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer votre premier client
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal Pricing Grid */}
      <PricingGridModal
        isOpen={showPricingModal}
        onClose={() => {
          setShowPricingModal(false);
          setPricingClientId(undefined);
          setPricingClientName(undefined);
        }}
        clientId={pricingClientId}
        clientName={pricingClientName}
        existingGrid={pricingClientId ? clientPricingGrids[pricingClientId] || undefined : undefined}
        onSuccess={handlePricingGridSuccess}
      />

      {/* Modal Quote Generator - Temporairement d�sactiv�
      <QuoteGenerator
        isOpen={showQuoteModal}
        onClose={() => {
          setShowQuoteModal(false);
          setQuoteClientId(undefined);
          setQuoteClientName(undefined);
        }}
        clientId={quoteClientId}
        clientName={quoteClientName}
      />
      */}

      {/* Modal formulaire client */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <div className="flex items-center gap-2">
                {!manualMode && (
                  <div className="flex items-center gap-2 text-sm bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full">
                    <Sparkles className="w-4 h-4" />
                    <span className="font-semibold">Auto-complétion INSEE</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setManualMode(!manualMode)}
                  className="text-sm text-slate-600 hover:text-teal-600 font-semibold underline"
                >
                  {manualMode ? '✨ Activer auto-complétion' : '✍️ Saisie manuelle'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* SIRET Field avec autocomplete */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  SIRET {!manualMode && <span className="text-teal-600">(recherche automatique)</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.siret}
                    onChange={(e) => handleSiretSearch(e.target.value)}
                    className={`w-full px-4 py-3.5 pr-12 border-2 rounded-xl transition-all focus:ring-4 focus:ring-teal-500/20 ${
                      siretFound === true
                        ? 'border-green-500 bg-green-50'
                        : siretFound === false
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-300 focus:border-teal-500'
                    }`}
                    placeholder="123 456 789 01234"
                    maxLength={17}
                  />
                  {siretSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                    </div>
                  )}
                  {siretFound === true && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  )}
                  {siretFound === false && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>
                {siretFound === true && !manualMode && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Entreprise trouvée ! Les champs ont été remplis automatiquement.
                  </p>
                )}
                {siretFound === false && !manualMode && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    SIRET non trouvé dans la base INSEE. Vérifiez le numéro ou activez la saisie manuelle.
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">
                  14 chiffres • Format: XXX XXX XXX XXXXX
                </p>
              </div>

              {/* Nom du client */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Nom du client *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
                  placeholder="ACME Corporation"
                  required
                  disabled={siretSearching}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600" />
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
                  placeholder="contact@acme.com"
                  required
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-600" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all"
                  placeholder="06 12 34 56 78"
                />
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3.5 border-2 border-slate-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all resize-none"
                  placeholder="123 Rue de la Paix, 75001 Paris"
                  disabled={siretSearching}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-bold text-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={siretSearching}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white rounded-xl hover:shadow-xl hover:shadow-teal-500/50 transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {siretSearching ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Recherche...
                    </span>
                  ) : (
                    <>{editingClient ? 'Mettre à jour' : 'Créer le client'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal détails client */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center text-white font-black text-3xl shadow-xl">
                  {selectedClient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-slate-900">{selectedClient.name}</h2>
                  <p className="text-slate-600 mt-2 font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Client depuis le {formatDate(selectedClient.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setClientStats(null);
                }}
                className="p-3 hover:bg-slate-100 rounded-2xl transition-all group"
              >
                <Plus className="w-7 h-7 rotate-45 text-slate-400 group-hover:text-slate-600 transition" />
              </button>
            </div>

            {/* Informations client */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 text-purple-700 mb-3">
                  <div className="w-10 h-10 bg-purple-200 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="font-black text-lg">Email</span>
                </div>
                <p className="text-slate-900 text-lg font-semibold">{selectedClient.email}</p>
              </div>

              {selectedClient.phone && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 text-green-700 mb-3">
                    <div className="w-10 h-10 bg-green-200 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg">Téléphone</span>
                  </div>
                  <p className="text-slate-900 text-lg font-semibold">{selectedClient.phone}</p>
                </div>
              )}

              {selectedClient.address && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 text-orange-700 mb-3">
                    <div className="w-10 h-10 bg-orange-200 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg">Adresse</span>
                  </div>
                  <p className="text-slate-900 text-lg font-semibold">{selectedClient.address}</p>
                </div>
              )}

              {selectedClient.siret && (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 text-blue-700 mb-3">
                    <div className="w-10 h-10 bg-blue-200 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="font-black text-lg">SIRET</span>
                  </div>
                  <p className="text-slate-900 text-xl font-mono font-black">{formatSiret(selectedClient.siret)}</p>
                </div>
              )}
            </div>

            {/* Statistiques */}
            {clientStats && (
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  Statistiques & Performances
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-blue-500/50 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3">
                      <FileText className="w-7 h-7" />
                    </div>
                    <p className="text-sm opacity-90 font-semibold mb-1">Factures</p>
                    <p className="text-4xl font-black">{clientStats.total_invoices}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3">
                      <FileText className="w-7 h-7" />
                    </div>
                    <p className="text-sm opacity-90 font-semibold mb-1">Devis</p>
                    <p className="text-4xl font-black">{clientStats.total_quotes}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-green-500/50 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3">
                      <Euro className="w-7 h-7" />
                    </div>
                    <p className="text-sm opacity-90 font-semibold mb-1">CA Total</p>
                    <p className="text-2xl font-black leading-tight">{formatCurrency(clientStats.total_revenue)}</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:shadow-orange-500/50 transition-all hover:-translate-y-1">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3">
                      <Clock className="w-7 h-7" />
                    </div>
                    <p className="text-sm opacity-90 font-semibold mb-1">En attente</p>
                    <p className="text-2xl font-black leading-tight">{formatCurrency(clientStats.pending_amount)}</p>
                  </div>
                </div>

                {clientStats.last_invoice_date && (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 font-semibold">Dernière facture</p>
                        <p className="text-lg font-black">{formatDate(clientStats.last_invoice_date)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 pt-6 border-t-2 border-slate-200">
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setClientStats(null);
                }}
                className="w-full px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all font-black text-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
