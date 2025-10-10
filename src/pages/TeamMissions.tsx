import { useEffect, useState } from 'react';
import { Users, MapPin, Clock, Plus, X, Check, Search, UserPlus, Truck, Package, TrendingUp, Calendar, Eye, CreditCard as Edit, Trash2, Play, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import InspectionViewer from '../components/InspectionViewer';

interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_image_url: string;
  price: number;
  notes: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  role: string;
  has_calendar_access: boolean;
  is_active: boolean;
}

interface Assignment {
  id: string;
  mission_id: string;
  contact_id: string;
  payment_ht: number;
  commission: number;
  status: string;
  assigned_at: string;
  mission?: Mission;
  contact?: Contact;
}


export default function TeamMissions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'missions' | 'team' | 'assignments'>('missions');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchMission, setSearchMission] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [missionToStart, setMissionToStart] = useState<Mission | null>(null);
  const [showInspectionViewer, setShowInspectionViewer] = useState(false);
  const [inspectionMissionId, setInspectionMissionId] = useState<string | null>(null);

  const [assignmentForm, setAssignmentForm] = useState({
    contact_id: '',
    payment_ht: 0,
    commission: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await Promise.all([
        loadMissions(),
        loadContacts(),
        loadAssignments(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', user!.id)
      .order('pickup_date', { ascending: true });

    if (error) throw error;
    setMissions(data || []);
  };

  const loadContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    setContacts(data || []);
  };

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from('mission_assignments')
      .select(`
        *,
        mission:missions(*),
        contact:contacts(*)
      `)
      .eq('user_id', user!.id)
      .order('assigned_at', { ascending: false });

    if (error) {
      console.error('Error loading data:', error);
      return;
    }
    setAssignments(data || []);
  };


  const handleAssignMission = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMission || !assignmentForm.contact_id) return;

    try {
      const { error } = await supabase
        .from('mission_assignments')
        .insert([{
          mission_id: selectedMission.id,
          contact_id: assignmentForm.contact_id,
          user_id: user!.id,
          assigned_by: user!.id,
          payment_ht: assignmentForm.payment_ht,
          commission: assignmentForm.commission,
          notes: assignmentForm.notes,
        }]);

      if (error) throw error;

      await loadData();
      setShowAssignModal(false);
      setSelectedMission(null);
      setAssignmentForm({
        contact_id: '',
        payment_ht: 0,
        commission: 0,
        notes: '',
      });
    } catch (error) {
      console.error('Error assigning mission:', error);
      alert('Erreur lors de l\'assignation de la mission');
    }
  };


  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || contact.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const unassignedMissions = missions.filter(mission =>
    !assignments.some(a => a.mission_id === mission.id)
  );

  const missionStats = {
    total: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    in_progress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
  };

  const filteredMissions = missions.filter((mission) => {
    const matchesSearch =
      mission.reference.toLowerCase().includes(searchMission.toLowerCase()) ||
      mission.vehicle_brand.toLowerCase().includes(searchMission.toLowerCase()) ||
      mission.vehicle_model.toLowerCase().includes(searchMission.toLowerCase()) ||
      mission.vehicle_plate?.toLowerCase().includes(searchMission.toLowerCase());

    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'in_progress': return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'pending': return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
      case 'cancelled': return 'text-red-600 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-600 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const handleStartMission = (mission: Mission) => {
    setMissionToStart(mission);
    setShowStartModal(true);
  };

  const confirmStartMission = () => {
    if (!missionToStart) return;
    window.location.href = `/inspection/departure/${missionToStart.id}`;
  };

  const handleCompleteMission = async (missionId: string) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({ status: 'completed' })
        .eq('id', missionId);

      if (error) throw error;
      await loadMissions();
    } catch (error: any) {
      console.error('Error completing mission:', error);
      const errorMessage = error?.message || 'Une erreur est survenue';
      alert(`Erreur lors de la finalisation de la mission: ${errorMessage}`);
    }
  };

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) return;

    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) throw error;
      await loadMissions();
    } catch (error) {
      console.error('Error deleting mission:', error);
      alert('Erreur lors de la suppression de la mission');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Gestion d'équipe & Missions
          </h1>
          <p className="text-slate-600 text-lg">Planifiez et assignez vos missions</p>
        </div>
        <Link
          to="/missions/create"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Nouvelle mission
        </Link>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('missions')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'missions'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-600 hover:text-teal-600'
          }`}
        >
          <Truck className="w-5 h-5 inline mr-2" />
          Missions ({missions.length})
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'team'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-600 hover:text-teal-600'
          }`}
        >
          <Users className="w-5 h-5 inline mr-2" />
          Équipe
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'assignments'
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-600 hover:text-teal-600'
          }`}
        >
          <Check className="w-5 h-5 inline mr-2" />
          Assignations ({assignments.length})
        </button>
      </div>

      {activeTab === 'missions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-slate-500/10 backdrop-blur rounded-xl">
                  <Package className="w-6 h-6 text-slate-700" />
                </div>
                <span className="text-3xl font-black text-slate-800">{missionStats.total}</span>
              </div>
              <p className="text-sm font-bold text-slate-600">Total des missions</p>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/40 shadow-xl shadow-amber-300/50 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-amber-500/20 backdrop-blur rounded-xl">
                  <Calendar className="w-6 h-6 text-amber-700" />
                </div>
                <span className="text-3xl font-black text-amber-700">{missionStats.pending}</span>
              </div>
              <p className="text-sm font-bold text-amber-800">En attente</p>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/40 shadow-xl shadow-blue-300/50 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-500/20 backdrop-blur rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-700" />
                </div>
                <span className="text-3xl font-black text-blue-700">{missionStats.in_progress}</span>
              </div>
              <p className="text-sm font-bold text-blue-800">En cours</p>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/40 shadow-xl shadow-green-300/50 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-green-500/20 backdrop-blur rounded-xl">
                  <Truck className="w-6 h-6 text-green-700" />
                </div>
                <span className="text-3xl font-black text-green-700">{missionStats.completed}</span>
              </div>
              <p className="text-sm font-bold text-green-800">Terminées</p>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une mission..."
                  value={searchMission}
                  onChange={(e) => setSearchMission(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredMissions.map((mission) => (
                <div
                  key={mission.id}
                  className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-slate-900">{mission.reference}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(mission.status)}`}>
                          {getStatusLabel(mission.status)}
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        {mission.vehicle_brand} {mission.vehicle_model}
                        {mission.vehicle_plate && <span className="text-slate-500"> • {mission.vehicle_plate}</span>}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-green-500" />
                          {mission.pickup_address}
                        </span>
                        <span>→</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-red-500" />
                          {mission.delivery_address}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
                        </span>
                        {mission.price > 0 && (
                          <span className="font-semibold text-teal-600">
                            {mission.price.toFixed(2)}€
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                    {mission.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStartMission(mission)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition text-sm font-semibold"
                        >
                          <Play className="w-4 h-4" />
                          Démarrer
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMission(mission);
                            setShowAssignModal(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition text-sm font-semibold"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assigner
                        </button>
                      </>
                    )}

                    {(mission.status === 'completed' || mission.status === 'in_progress') && (
                      <button
                        onClick={() => {
                          setInspectionMissionId(mission.id);
                          setShowInspectionViewer(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition text-sm font-semibold"
                      >
                        <FileText className="w-4 h-4" />
                        États des lieux
                      </button>
                    )}

                    {mission.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          window.location.href = `/inspection/arrival/${mission.id}`;
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition text-sm font-semibold"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Inspection d'arrivée
                      </button>
                    )}

                    {mission.status !== 'completed' && (
                      <button
                        onClick={() => handleDeleteMission(mission.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-semibold"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="driver">Chauffeur</option>
              <option value="manager">Manager</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
            <Link
              to="/contacts"
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg"
            >
              <UserPlus className="w-5 h-5" />
              Ajouter
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-xl p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {contact.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{contact.name}</h3>
                      <p className="text-sm text-slate-600">{contact.role}</p>
                    </div>
                  </div>
                  {contact.has_calendar_access && (
                    <div className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Calendrier ✓
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <p>{contact.email}</p>
                  <p>{contact.phone}</p>
                  {contact.company_name && <p className="font-semibold">{contact.company_name}</p>}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition text-sm font-semibold">
                    Voir missions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {unassignedMissions.length > 0 && (
            <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-400/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-amber-900 mb-4">
                Missions non assignées ({unassignedMissions.length})
              </h3>
              <div className="space-y-3">
                {unassignedMissions.map(mission => (
                  <div
                    key={mission.id}
                    className="flex items-center justify-between bg-white rounded-xl p-4"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{mission.reference}</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {mission.vehicle_brand} {mission.vehicle_model} {mission.vehicle_plate && `• ${mission.vehicle_plate}`}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {mission.pickup_address}
                        </span>
                        <span>
                          → {mission.delivery_address}
                        </span>
                      </div>
                      <p className="text-sm text-teal-600 font-semibold mt-2">
                        {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMission(mission);
                        setShowAssignModal(true);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:from-teal-600 hover:to-cyan-600 transition"
                    >
                      Assigner
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Toutes les assignations
            </h3>
            <div className="space-y-3">
              {assignments.map(assignment => (
                <div
                  key={assignment.id}
                  className="border border-slate-200 rounded-xl p-4 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{assignment.mission?.reference}</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {assignment.mission?.vehicle_brand} {assignment.mission?.vehicle_model}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {assignment.contact?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(assignment.assigned_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-teal-600">
                        {assignment.payment_ht.toFixed(2)}€ HT
                      </div>
                      {assignment.commission > 0 && (
                        <div className="text-xs text-slate-600">
                          Commission: {assignment.commission.toFixed(2)}€
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showStartModal && missionToStart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">État des lieux départ</h3>
              <button
                onClick={() => {
                  setShowStartModal(false);
                  setMissionToStart(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-slate-700 text-center">
                Êtes-vous sûr de vouloir réaliser l'état des lieux de départ sur la version web ?
              </p>
            </div>

            <div className="mb-4 p-4 bg-teal-50 rounded-xl">
              <h4 className="font-semibold text-slate-900">{missionToStart.reference}</h4>
              <p className="text-sm text-slate-600 mt-1">
                {missionToStart.vehicle_brand} {missionToStart.vehicle_model}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStartModal(false);
                  setMissionToStart(null);
                }}
                className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold"
              >
                Non
              </button>
              <button
                onClick={confirmStartMission}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition shadow-lg font-semibold"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && selectedMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Assigner une mission</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 p-4 bg-teal-50 rounded-xl">
              <h4 className="font-semibold text-slate-900">{selectedMission.reference}</h4>
              <p className="text-sm text-slate-600 mt-1">
                {selectedMission.vehicle_brand} {selectedMission.vehicle_model} {selectedMission.vehicle_plate && `• ${selectedMission.vehicle_plate}`}
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span>{selectedMission.pickup_address} → {selectedMission.delivery_address}</span>
              </div>
              <p className="text-sm text-teal-600 font-semibold mt-2">
                {new Date(selectedMission.pickup_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            <form onSubmit={handleAssignMission} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Contact / Chauffeur
                </label>
                <select
                  value={assignmentForm.contact_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, contact_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">Sélectionner un contact</option>
                  {contacts.map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Paiement HT (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignmentForm.payment_ht}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, payment_ht: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Commission (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assignmentForm.commission}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, commission: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition shadow-lg"
                >
                  Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInspectionViewer && inspectionMissionId && (
        <InspectionViewer
          missionId={inspectionMissionId}
          onClose={() => {
            setShowInspectionViewer(false);
            setInspectionMissionId(null);
          }}
        />
      )}
    </div>
  );
}
