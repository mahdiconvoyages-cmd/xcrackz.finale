import { useEffect, useState } from 'react';
import { Plus, Search, Users, Phone, Mail, Building, Trash2, X, UserCheck, Star, Calendar as CalendarIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import CalendarView from '../components/CalendarView';

interface Contact {
  id: string;
  type: string;
  category?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
  is_driver: boolean;
  driver_licenses: string[];
  availability_status: 'available' | 'busy' | 'offline';
  rating_average: number;
  missions_completed: number;
}

export default function Contacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [searchMethod, setSearchMethod] = useState<'phone' | 'email'>('phone');
  const [searchValue, setSearchValue] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [userFound, setUserFound] = useState<any>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchValue.trim()) return;
    setSearchingUser(true);
    setDuplicateWarning(false);
    try {
      let query = supabase.from('profiles').select('*');
      if (searchMethod === 'phone') {
        query = query.eq('phone', searchValue.trim());
      } else {
        query = query.eq('email', searchValue.trim().toLowerCase());
      }
      const { data: profile, error } = await query.maybeSingle();
      if (error) throw error;
      if (profile) {
        if (profile.id === user?.id) {
          alert('Vous ne pouvez pas vous ajouter vous-même');
          setSearchingUser(false);
          return;
        }
        
        // Vérification complète des doublons (email OU téléphone)
        const { data: existingByEmail } = await supabase
          .from('contacts')
          .select('id, name, email')
          .eq('user_id', user?.id)
          .eq('email', profile.email)
          .maybeSingle();
        
        const { data: existingByPhone } = profile.phone ? await supabase
          .from('contacts')
          .select('id, name, phone')
          .eq('user_id', user?.id)
          .eq('phone', profile.phone)
          .maybeSingle() : { data: null };
        
        if (existingByEmail || existingByPhone) {
          setDuplicateWarning(true);
          setUserFound(null);
          setSearchingUser(false);
          return;
        }
        
        setUserFound(profile);
      } else {
        alert('Aucun utilisateur trouvé');
        setUserFound(null);
      }
    } catch (error) {
      console.error('Error searching user:', error);
      alert('Erreur lors de la recherche');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleAddContact = async () => {
    if (!user || !userFound) return;
    try {
      const contactData: any = {
        user_id: user.id,
        name: userFound.full_name || `${userFound.first_name || ''} ${userFound.last_name || ''}`.trim(),
        email: userFound.email,
        phone: userFound.phone || '',
        company: userFound.company || '',
        address: userFound.address || '',
        type: userFound.user_type === 'convoyeur' ? 'driver' : 'customer',
      };
      const { error } = await supabase.from('contacts').insert([contactData]);
      if (error) throw error;
      alert('Contact ajouté avec succès !');
      setShowModal(false);
      setUserFound(null);
      setSearchValue('');
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Erreur lors de l\'ajout du contact');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'customer': return 'Client';
      case 'driver': return 'Chauffeur';
      case 'supplier': return 'Fournisseur';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'from-blue-500 to-cyan-500';
      case 'driver': return 'from-emerald-500 to-teal-500';
      case 'supplier': return 'from-amber-500 to-orange-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const stats = {
    total: contacts.length,
    customers: contacts.filter(c => c.type === 'customer').length,
    drivers: contacts.filter(c => c.type === 'driver').length,
    suppliers: contacts.filter(c => c.type === 'supplier').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header avec gradient animé */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-b-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Contacts</h1>
                <p className="text-white/80 text-sm">Gérez votre réseau professionnel</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center space-x-2 px-4 py-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <CalendarIcon className="w-5 h-5 text-white" />
                <span className="text-white font-medium">Planning</span>
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-white/80 text-xs font-medium mb-1">Total</div>
              <div className="text-white text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-white/80 text-xs font-medium mb-1">Clients</div>
              <div className="text-white text-2xl font-bold">{stats.customers}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-white/80 text-xs font-medium mb-1">Chauffeurs</div>
              <div className="text-white text-2xl font-bold">{stats.drivers}</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="text-white/80 text-xs font-medium mb-1">Fournisseurs</div>
              <div className="text-white text-2xl font-bold">{stats.suppliers}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all duration-300"
          />
        </div>

        {/* Type filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Tous', icon: Users },
            { value: 'customer', label: 'Clients', icon: UserCheck },
            { value: 'driver', label: 'Chauffeurs', icon: Users },
            { value: 'supplier', label: 'Fournisseurs', icon: Building }
          ].map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => setTypeFilter(filter.value)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 whitespace-nowrap ${
                  typeFilter === filter.value
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="px-8 pb-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500">Chargement des contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-xl font-semibold text-gray-700 mb-2">Aucun contact trouvé</p>
            <p className="text-gray-500">Commencez par ajouter un contact</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100 hover:border-teal-300 hover:-translate-y-1"
              >
                {/* Card header with gradient */}
                <div className={`bg-gradient-to-r ${getTypeColor(contact.type)} p-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-1">{contact.name}</h3>
                      <span className="inline-block px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                        {getTypeLabel(contact.type)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3">
                  {contact.email && (
                    <div className="flex items-center space-x-3 text-gray-600 hover:text-teal-600 transition-colors">
                      <div className="p-2 bg-teal-50 rounded-lg">
                        <Mail className="w-4 h-4 text-teal-600" />
                      </div>
                      <span className="text-sm truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center space-x-3 text-gray-600 hover:text-teal-600 transition-colors">
                      <div className="p-2 bg-cyan-50 rounded-lg">
                        <Phone className="w-4 h-4 text-cyan-600" />
                      </div>
                      <span className="text-sm">{contact.phone}</span>
                    </div>
                  )}
                  {contact.company && (
                    <div className="flex items-center space-x-3 text-gray-600 hover:text-teal-600 transition-colors">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm truncate">{contact.company}</span>
                    </div>
                  )}
                  {contact.is_driver && (
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium text-gray-700">{contact.rating_average || 0}/5</span>
                      </div>
                      <span className="text-xs text-gray-500">{contact.missions_completed || 0} missions</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'ajout de contact */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Ajouter un contact</h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setUserFound(null);
                    setSearchValue('');
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Method selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMethod('phone')}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    searchMethod === 'phone'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  <span>Téléphone</span>
                </button>
                <button
                  onClick={() => setSearchMethod('email')}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
                    searchMethod === 'email'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>

              {/* Search input */}
              <input
                type={searchMethod === 'phone' ? 'tel' : 'email'}
                placeholder={searchMethod === 'phone' ? 'Numéro de téléphone' : 'Adresse email'}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 transition-all"
              />

              {/* Search button */}
              <button
                onClick={handleSearchUser}
                disabled={searchingUser}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {searchingUser ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Rechercher</span>
                  </>
                )}
              </button>

              {/* Duplicate warning */}
              {duplicateWarning && (
                <div className="mt-4 p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-800 text-lg mb-1">Contact déjà existant</p>
                      <p className="text-sm text-red-600">
                        Ce contact est déjà dans votre liste. Vous ne pouvez pas ajouter le même contact deux fois.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* User found */}
              {userFound && (
                <div className="mt-4 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border-2 border-teal-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{userFound.full_name || 'Utilisateur'}</p>
                      <p className="text-sm text-gray-600">{userFound.email}</p>
                      {userFound.phone && <p className="text-sm text-gray-600">{userFound.phone}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-8 h-8 text-teal-600" />
                    </div>
                  </div>
                  <button
                    onClick={handleAddContact}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    Ajouter ce contact
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendrier de disponibilités */}
      {showCalendar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCalendar(false)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl overflow-hidden"
            style={{ height: '90vh', maxHeight: '900px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarView 
              ownerId={user?.id || ''} 
              ownerName={user?.user_metadata?.full_name || user?.email || 'Moi'}
              canEdit={true}
              canDelete={true}
              onClose={() => setShowCalendar(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
