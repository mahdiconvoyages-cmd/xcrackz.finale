import { useEffect, useState } from 'react';
import { Plus, Search, Users, Phone, Mail, Building, Trash2, Calendar, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getContactCalendarAccess, shareCalendarWithContact, type CalendarAccess } from '../services/calendarService';
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

  const [searchPhone, setSearchPhone] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchMethod, setSearchMethod] = useState<'phone' | 'email'>('phone');
  const [searchingUser, setSearchingUser] = useState(false);
  const [userFound, setUserFound] = useState<any>(null);
  const [calendarAccess, setCalendarAccess] = useState<CalendarAccess | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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
    const searchValue = searchMethod === 'phone' ? searchPhone.trim() : searchEmail.trim();
    if (!searchValue) return;

    setSearchingUser(true);
    try {
      let query = supabase.from('profiles').select('*');

      if (searchMethod === 'phone') {
        query = query.eq('phone', searchValue);
      } else {
        query = query.eq('email', searchValue.toLowerCase());
      }

      const { data: profile, error } = await query.maybeSingle();

      if (error) throw error;

      if (profile) {
        if (profile.id === user?.id) {
          alert('Vous ne pouvez pas vous ajouter vous-même en tant que contact');
          setSearchingUser(false);
          return;
        }

        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('user_id', user?.id)
          .eq('email', profile.email)
          .maybeSingle();

        if (existingContact) {
          alert('Ce contact est déjà dans votre liste');
          setSearchingUser(false);
          return;
        }

        setUserFound(profile);
      } else {
        const searchType = searchMethod === 'phone' ? 'numéro de téléphone' : 'adresse email';
        alert(`Aucun utilisateur trouvé avec ${searchType === 'numéro de téléphone' ? 'ce' : 'cette'} ${searchType}`);
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
        name: userFound.full_name || `${userFound.first_name} ${userFound.last_name}`,
        email: userFound.email,
        phone: userFound.phone,
        company: userFound.company || '',
        address: userFound.address || '',
        category: userFound.user_type === 'convoyeur' ? 'driver' : 'client',
      };

      const { data: driverContact } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', userFound.email)
        .eq('is_driver', true)
        .maybeSingle();

      if (driverContact) {
        contactData.is_driver = driverContact.is_driver;
        contactData.driver_licenses = driverContact.driver_licenses;
        contactData.availability_status = driverContact.availability_status;
        contactData.rating_average = driverContact.rating_average;
        contactData.missions_completed = driverContact.missions_completed;
      }

      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) throw error;

      setShowModal(false);
      setSearchPhone('');
      setUserFound(null);
      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Erreur lors de l\'ajout du contact');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const resetModal = () => {
    setSearchPhone('');
    setSearchEmail('');
    setSearchMethod('phone');
    setUserFound(null);
  };

  const handleViewCalendar = async (contact: Contact) => {
    const access = await getContactCalendarAccess(contact.id);
    if (access) {
      setCalendarAccess(access);
      setShowCalendar(true);
    } else {
      alert('Ce contact ne partage pas son planning avec vous');
    }
  };

  const handleShareMyCalendar = (contact: Contact) => {
    setSelectedContact(contact);
    setShowShareModal(true);
  };

  const handleConfirmShare = async (permissionLevel: 'view' | 'edit' | 'full') => {
    if (!selectedContact) return;

    const success = await shareCalendarWithContact(selectedContact.id, permissionLevel);
    if (success) {
      alert('Planning partagé avec succès!');
      setShowShareModal(false);
      setSelectedContact(null);
    } else {
      alert('Erreur lors du partage du planning');
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      case 'customer': return 'text-blue-400 bg-blue-500/20';
      case 'driver': return 'text-green-400 bg-green-500/20';
      case 'supplier': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-slate-600 bg-slate-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient text-shadow mb-2">Contacts</h1>
          <p className="text-slate-600 text-lg">Ajoutez vos contacts par email ou numéro de téléphone</p>
        </div>
        <button
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3 rounded-lg font-semibold hover:shadow-2xl hover:shadow-slate-400/40 hover:shadow-depth-xl hover:shadow-teal-500/60 transition"
        >
          <Plus className="w-5 h-5" />
          Ajouter un contact
        </button>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl hover:shadow-depth-xl transition-all duration-300 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Tous les types</option>
            <option value="customer">Clients</option>
            <option value="driver">Chauffeurs</option>
            <option value="supplier">Fournisseurs</option>
          </select>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              {searchQuery || typeFilter !== 'all'
                ? 'Aucun contact trouvé'
                : 'Aucun contact pour le moment'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl focus:bg-white/80 p-6 border border-slate-200/50 hover:border-teal-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{contact.name}</h3>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(contact.category || contact.type)}`}>
                        {contact.category === 'driver' ? 'Chauffeur' : contact.category === 'client' ? 'Client' : getTypeLabel(contact.type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewCalendar(contact)}
                      className="p-2 hover:bg-teal-500/20 text-teal-600 rounded-lg transition"
                      title="Voir le planning"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleShareMyCalendar(contact)}
                      className="p-2 hover:bg-blue-500/20 text-blue-600 rounded-lg transition"
                      title="Partager mon planning"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {contact.company && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span>{contact.company}</span>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${contact.email}`} className="hover:text-teal-600 transition">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <a href={`tel:${contact.phone}`} className="hover:text-teal-600 transition">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.is_driver && (
                    <div className="mt-3 pt-3 border-t border-slate-200/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500">Permis:</span>
                        <div className="flex flex-wrap gap-1">
                          {contact.driver_licenses && contact.driver_licenses.length > 0 ? (
                            contact.driver_licenses.map((license) => (
                              <span key={license} className="px-2 py-0.5 bg-teal-500/20 text-teal-600 rounded text-xs font-semibold">
                                {license}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Aucun</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Statut:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          contact.availability_status === 'available' ? 'bg-green-500/20 text-green-600' :
                          contact.availability_status === 'busy' ? 'bg-orange-500/20 text-orange-600' :
                          'bg-slate-500/20 text-slate-600'
                        }`}>
                          {contact.availability_status === 'available' ? 'Disponible' :
                           contact.availability_status === 'busy' ? 'Occupé' : 'Hors ligne'}
                        </span>
                      </div>
                      {contact.missions_completed > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-slate-500">Missions:</span>
                          <span className="text-xs text-slate-600">{contact.missions_completed}</span>
                          {contact.rating_average > 0 && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-yellow-600">★ {contact.rating_average.toFixed(1)}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Ajouter un contact</h2>

            {!userFound ? (
              <div className="space-y-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSearchMethod('phone')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                      searchMethod === 'phone'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Par téléphone
                  </button>
                  <button
                    onClick={() => setSearchMethod('email')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                      searchMethod === 'email'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Par email
                  </button>
                </div>

                {searchMethod === 'phone' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Numéro de téléphone
                    </label>
                    <input
                      type="tel"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      placeholder="+33 6 12 34 56 78"
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Le numéro doit correspondre exactement à celui de l'utilisateur inscrit
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                      placeholder="exemple@email.com"
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      L'email doit correspondre exactement à celui de l'utilisateur inscrit
                    </p>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSearchUser}
                    disabled={searchingUser || (searchMethod === 'phone' ? !searchPhone.trim() : !searchEmail.trim())}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow-teal font-semibold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                  >
                    {searchingUser ? 'Recherche...' : 'Rechercher'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetModal();
                    }}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition font-semibold"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">{userFound.full_name || `${userFound.first_name} ${userFound.last_name}`}</h3>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p><strong>Email:</strong> {userFound.email}</p>
                    <p><strong>Téléphone:</strong> {userFound.phone}</p>
                    {userFound.company && <p><strong>Entreprise:</strong> {userFound.company}</p>}
                    {userFound.address && <p><strong>Adresse:</strong> {userFound.address}</p>}
                    <p><strong>Type:</strong> {userFound.user_type === 'convoyeur' ? 'Convoyeur' : 'Donneur d\'ordre'}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleAddContact}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow-teal font-semibold py-3 rounded-lg hover:shadow-lg transition"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => setUserFound(null)}
                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition font-semibold"
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showShareModal && selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Partager mon planning</h2>
            <p className="text-slate-600 mb-6">
              Partager votre planning avec <strong>{selectedContact.name}</strong>
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleConfirmShare('view')}
                className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition text-left"
              >
                <div className="font-semibold text-slate-900">Lecture seule</div>
                <div className="text-sm text-slate-600">Peut uniquement voir vos événements</div>
              </button>

              <button
                onClick={() => handleConfirmShare('edit')}
                className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="font-semibold text-slate-900">Lecture et écriture</div>
                <div className="text-sm text-slate-600">Peut voir et créer/modifier des événements</div>
              </button>

              <button
                onClick={() => handleConfirmShare('full')}
                className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left"
              >
                <div className="font-semibold text-slate-900">Contrôle total</div>
                <div className="text-sm text-slate-600">Peut tout faire, y compris supprimer</div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowShareModal(false);
                setSelectedContact(null);
              }}
              className="w-full mt-4 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition font-semibold"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showCalendar && calendarAccess && (
        <CalendarView
          ownerId={calendarAccess.calendar_owner_id}
          ownerName={calendarAccess.calendar_owner_name}
          canEdit={calendarAccess.can_edit}
          canDelete={calendarAccess.can_delete}
          onClose={() => {
            setShowCalendar(false);
            setCalendarAccess(null);
          }}
        />
      )}
    </div>
  );
}
