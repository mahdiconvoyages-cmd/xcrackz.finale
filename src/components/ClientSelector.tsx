import { useState, useEffect } from 'react';
import { Search, Plus, Building2, User, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { searchCompaniesBySiret, searchCompaniesByName, InseeCompany } from '../services/insee';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  siret?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  is_company: boolean;
}

interface ClientSelectorProps {
  onSelect: (client: Client | null) => void;
  selectedClient?: Client | null;
}

export default function ClientSelector({ onSelect, selectedClient }: ClientSelectorProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showInseeSearch, setShowInseeSearch] = useState(false);
  const [inseeSearchTerm, setInseeSearchTerm] = useState('');
  const [inseeResults, setInseeResults] = useState<InseeCompany[]>([]);
  const [inseeLoading, setInseeLoading] = useState(false);

  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    siret: '',
    address: '',
    postal_code: '',
    city: '',
    is_company: false,
  });

  useEffect(() => {
    loadClients();
  }, [user]);

  const loadClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    if (data) setClients(data);
  };

  const handleSaveClient = async () => {
    if (!user || !newClient.name) return;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...newClient, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setClients([...clients, data]);
      onSelect(data);
      setShowModal(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setNewClient({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      siret: '',
      address: '',
      postal_code: '',
      city: '',
      is_company: false,
    });
    setShowInseeSearch(false);
    setInseeResults([]);
  };

  const handleInseeSearch = async () => {
    if (!inseeSearchTerm) return;
    setInseeLoading(true);
    try {
      if (/^\d{14}$/.test(inseeSearchTerm.replace(/\s/g, ''))) {
        const result = await searchCompaniesBySiret(inseeSearchTerm);
        if (result) setInseeResults([result]);
      } else {
        const results = await searchCompaniesByName(inseeSearchTerm);
        setInseeResults(results);
      }
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la recherche');
    } finally {
      setInseeLoading(false);
    }
  };

  const selectInseeCompany = (company: InseeCompany) => {
    setNewClient({
      ...newClient,
      name: company.denomination,
      company_name: company.denomination,
      siret: company.siret,
      address: company.adresse,
      postal_code: company.codePostal,
      city: company.commune,
      is_company: true,
    });
    setShowInseeSearch(false);
    setInseeResults([]);
    setInseeSearchTerm('');
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.siret?.includes(searchTerm)
  );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">Client</label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher ou sélectionner un client..."
          value={selectedClient?.name || searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setSearchTerm('')}
          className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-12 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={() => {
            setShowModal(true);
            setSearchTerm('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {searchTerm && filteredClients.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => {
                onSelect(client);
                setSearchTerm('');
              }}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  client.is_company ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {client.is_company ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{client.name}</p>
                  {client.company_name && <p className="text-sm text-slate-600">{client.company_name}</p>}
                  {client.siret && <p className="text-xs text-slate-500">SIRET: {client.siret}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Nouveau client</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!showInseeSearch ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">Rechercher dans la base INSEE</p>
                    <p className="text-xs text-blue-700">Recherche automatique par SIRET ou nom d'entreprise</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInseeSearch(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                  >
                    Rechercher
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newClient.is_company}
                      onChange={(e) => setNewClient({ ...newClient, is_company: e.target.checked })}
                      className="w-4 h-4 text-teal-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Client professionnel</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom {newClient.is_company ? "de l'entreprise" : 'du client'} *
                  </label>
                  <input
                    type="text"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                    required
                  />
                </div>

                {newClient.is_company && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Raison sociale</label>
                      <input
                        type="text"
                        value={newClient.company_name}
                        onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">SIRET</label>
                      <input
                        type="text"
                        value={newClient.siret}
                        onChange={(e) => setNewClient({ ...newClient, siret: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                        placeholder="123 456 789 00012"
                      />
                    </div>
                  </>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Adresse</label>
                  <textarea
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Code postal</label>
                    <input
                      type="text"
                      value={newClient.postal_code}
                      onChange={(e) => setNewClient({ ...newClient, postal_code: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ville</label>
                    <input
                      type="text"
                      value={newClient.city}
                      onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleSaveClient}
                    disabled={!newClient.name}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:shadow-xl transition disabled:opacity-50"
                  >
                    Ajouter le client
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 rounded-lg font-semibold text-slate-700"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setShowInseeSearch(false); setInseeResults([]); }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-semibold"
                >
                  ← Retour au formulaire
                </button>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rechercher par SIRET ou nom d'entreprise
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inseeSearchTerm}
                      onChange={(e) => setInseeSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleInseeSearch()}
                      placeholder="123456789000 12 ou Nom entreprise"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleInseeSearch}
                      disabled={inseeLoading || !inseeSearchTerm}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                    >
                      {inseeLoading ? 'Recherche...' : 'Rechercher'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Entrez un SIRET (14 chiffres) ou le nom d'une entreprise (min. 3 caractères)
                  </p>
                </div>

                {inseeResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">{inseeResults.length} résultat(s) trouvé(s)</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {inseeResults.map((company) => (
                        <button
                          key={company.siret}
                          type="button"
                          onClick={() => selectInseeCompany(company)}
                          className="w-full text-left p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{company.denomination}</p>
                              <p className="text-sm text-slate-600">{company.adresse}</p>
                              <p className="text-sm text-slate-600">{company.codePostal} {company.commune}</p>
                              <p className="text-xs text-slate-500 mt-1">SIRET: {company.siret}</p>
                            </div>
                            <Check className="w-5 h-5 text-teal-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
