import { useEffect, useState } from 'react';
import { 
  Users, MapPin, Plus, X, Search, Truck, Package, 
  TrendingUp, Calendar, Eye, Edit, Trash2, Play, CheckCircle, 
  FileText, UserPlus, Clock, DollarSign, BarChart3, Sparkles,
  Filter, Grid, List, Target, XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import InspectionViewer from '../components/InspectionViewer';

// ===== INTERFACES =====
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

type TabType = 'missions' | 'team' | 'assignments' | 'stats';
type ViewMode = 'grid' | 'list';

export default function TeamMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ===== STATES =====
  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInspectionViewer, setShowInspectionViewer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  
  // Selected items
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [inspectionMissionId, setInspectionMissionId] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter] = useState<string>('all');
  
  // Forms
  const [assignmentForm, setAssignmentForm] = useState({
    contact_id: '',
    payment_ht: 0,
    commission: 0,
    notes: '',
  });

  // ===== EFFECTS =====
  useEffect(() => {
    loadData();
  }, [user]);

  // ===== DATA LOADING =====
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

    if (error) throw error;
    setAssignments(data || []);
  };

  // ===== ACTIONS =====
  const handleStartInspection = (mission: Mission) => {
    // Si la mission est en cours (in_progress), aller vers inspection arrivée
    // Sinon (pending), aller vers inspection départ
    if (mission.status === 'in_progress') {
      navigate(`/inspection/arrival/${mission.id}`);
    } else {
      navigate(`/inspection/departure/${mission.id}`);
    }
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
          status: 'assigned',
        }]);

      if (error) throw error;

      // Update mission status
      await supabase
        .from('missions')
        .update({ status: 'assigned' })
        .eq('id', selectedMission.id);

      setShowAssignModal(false);
      setSelectedMission(null);
      setAssignmentForm({ contact_id: '', payment_ht: 0, commission: 0, notes: '' });
      await loadData();
      
      alert('✅ Mission assignée avec succès!');
    } catch (error) {
      console.error('Error assigning mission:', error);
      alert('❌ Erreur lors de l\'assignation');
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
      alert('✅ Mission supprimée');
    } catch (error) {
      console.error('Error deleting mission:', error);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleReassignDriver = async (newContactId: string) => {
    if (!editingMission) return;

    try {
      // Supprimer l'ancienne assignation
      await supabase
        .from('mission_assignments')
        .delete()
        .eq('mission_id', editingMission.id);

      // Créer nouvelle assignation
      const { error } = await supabase
        .from('mission_assignments')
        .insert([{
          mission_id: editingMission.id,
          contact_id: newContactId,
          status: 'accepted',
          assigned_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setShowReassignModal(false);
      setShowEditModal(false);
      setEditingMission(null);
      await loadData();
      alert('✅ Chauffeur réassigné avec succès !');
    } catch (error) {
      console.error('Error reassigning driver:', error);
      alert('❌ Erreur lors de la réassignation');
    }
  };

  // ===== UTILS =====
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'in_progress': return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'assigned': return 'text-purple-600 bg-purple-500/10 border-purple-500/30';
      case 'pending': return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
      case 'cancelled': return 'text-red-600 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-600 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'assigned': return 'Assignée';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getActionButton = (mission: Mission) => {
    switch (mission.status) {
      case 'pending':
        return (
          <button
            onClick={() => handleStartInspection(mission)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
          >
            <Play className="w-4 h-4" />
            Démarrer Inspection
          </button>
        );
      case 'in_progress':
        return (
          <button
            onClick={() => handleStartInspection(mission)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
          >
            <Play className="w-4 h-4" />
            Continuer Inspection
          </button>
        );
      case 'completed':
        return (
          <button
            onClick={() => navigate('/rapports-inspection')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
          >
            <FileText className="w-4 h-4" />
            Voir Rapport
          </button>
        );
      default:
        return null;
    }
  };

  // Filtered data
  const filteredMissions = missions.filter(m => {
    const matchesSearch = m.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.vehicle_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.vehicle_model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const stats = {
    totalMissions: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
    totalContacts: contacts.length,
    activeAssignments: assignments.filter(a => a.status === 'assigned').length,
    totalRevenue: assignments.reduce((sum, a) => sum + (a.payment_ht || 0), 0),
    totalCommission: assignments.reduce((sum, a) => sum + (a.commission || 0), 0),
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-teal-500 animate-float" />
            Gestion d'Équipe & Missions
          </h1>
          <p className="text-slate-600 text-lg">Créez, gérez et assignez vos missions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            to="/missions/create"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow-teal px-6 py-3 rounded-xl font-bold hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Mission
          </Link>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-2 shadow-xl animate-in slide-in-from-bottom duration-500">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'missions'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-5 h-5" />
            Missions
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'missions' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.totalMissions}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'team'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-5 h-5" />
            Équipe
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'team' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.totalContacts}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Target className="w-5 h-5" />
            Assignations
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'assignments' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.activeAssignments}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'stats'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Statistiques
          </button>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      {activeTab === 'missions' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-700">
          <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-300 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-slate-500/10 rounded-xl">
                <Package className="w-6 h-6 text-slate-700" />
              </div>
              <span className="text-3xl font-black text-slate-800">{stats.totalMissions}</span>
            </div>
            <p className="text-sm font-bold text-slate-600">Total Missions</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-300 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-amber-500/20 rounded-xl">
                <Clock className="w-6 h-6 text-amber-700" />
              </div>
              <span className="text-3xl font-black text-amber-700">{stats.pending}</span>
            </div>
            <p className="text-sm font-bold text-amber-800">En Attente</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-300 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-700" />
              </div>
              <span className="text-3xl font-black text-blue-700">{stats.inProgress}</span>
            </div>
            <p className="text-sm font-bold text-blue-800">En Cours</p>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-300 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-700" />
              </div>
              <span className="text-3xl font-black text-green-700">{stats.completed}</span>
            </div>
            <p className="text-sm font-bold text-green-800">Terminées</p>
          </div>
        </div>
      )}

      {/* ===== TOOLBAR (Search & Filters) ===== */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition" />
            <input
              type="text"
              placeholder={`Rechercher ${activeTab === 'missions' ? 'une mission' : 'un membre'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Filters */}
          {activeTab === 'missions' && (
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/50 border border-slate-300 rounded-xl pl-10 pr-8 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="in_progress">En cours</option>
                <option value="assigned">Assignées</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>
          )}

          {/* View Toggle */}
          {activeTab === 'missions' && (
            <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow' : 'hover:bg-white/50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-white shadow' : 'hover:bg-white/50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="animate-in fade-in duration-500">
        {/* MISSIONS TAB */}
        {activeTab === 'missions' && (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {filteredMissions.length === 0 ? (
              <div className="col-span-full text-center py-16 backdrop-blur-xl bg-white/50 border border-slate-200 rounded-2xl">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl mb-4">
                  <Truck className="w-10 h-10 text-teal-600" />
                </div>
                <p className="text-slate-600 mb-4 text-lg font-medium">Aucune mission trouvée</p>
                <Link
                  to="/missions/create"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <Plus className="w-5 h-5" />
                  Créer une Mission
                </Link>
              </div>
            ) : (
              filteredMissions.map((mission, index) => (
                <div
                  key={mission.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-6 hover:shadow-depth-xl hover:border-teal-500/50 transition-all duration-300 group animate-in slide-in-from-bottom"
                >
                  {/* Mission Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {mission.vehicle_image_url ? (
                        <img
                          src={mission.vehicle_image_url}
                          alt="Véhicule"
                          className="w-14 h-14 rounded-xl object-cover border-2 border-teal-500/50 group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                          <Truck className="w-7 h-7 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{mission.reference}</h3>
                        <p className="text-slate-600 text-sm">
                          {mission.vehicle_brand} {mission.vehicle_model}
                          {mission.vehicle_plate && <span className="text-slate-400"> • {mission.vehicle_plate}</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(mission.status)}`}>
                      {getStatusLabel(mission.status)}
                    </span>
                  </div>

                  {/* Mission Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-600">{mission.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                      <span className="text-slate-600">{mission.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(mission.pickup_date).toLocaleDateString('fr-FR')}
                      </div>
                      {mission.price > 0 && (
                        <span className="text-xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                          {mission.price.toLocaleString('fr-FR')}€
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                    {getActionButton(mission)}
                    
                    <button
                      onClick={() => {
                        setSelectedMission(mission);
                        setShowAssignModal(true);
                      }}
                      className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assigner
                    </button>

                    <button
                      onClick={() => {
                        setEditingMission(mission);
                        setShowEditModal(true);
                      }}
                      className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteMission(mission.id)}
                      className="inline-flex items-center gap-2 bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.length === 0 ? (
              <div className="col-span-full text-center py-16 backdrop-blur-xl bg-white/50 border border-slate-200 rounded-2xl">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-2xl mb-4">
                  <Users className="w-10 h-10 text-teal-600" />
                </div>
                <p className="text-slate-600 mb-4 text-lg font-medium">Aucun membre d'équipe</p>
                <button
                  onClick={() => {
                    // TODO: Implémenter l'ajout de contact
                    console.log('Ajouter un contact');
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un Membre
                </button>
              </div>
            ) : (
              filteredContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-6 hover:shadow-depth-xl hover:border-teal-500/50 transition-all duration-300 animate-in slide-in-from-bottom"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900">{contact.name}</h3>
                      <p className="text-slate-600 text-sm">{contact.role}</p>
                      {contact.company_name && (
                        <p className="text-slate-500 text-xs">{contact.company_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Email:</span>
                      <a href={`mailto:${contact.email}`} className="text-teal-600 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Tél:</span>
                      <a href={`tel:${contact.phone}`} className="text-teal-600 hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Calendrier:</span>
                      <span className={contact.has_calendar_access ? 'text-green-600' : 'text-slate-400'}>
                        {contact.has_calendar_access ? '✅ Activé' : '❌ Désactivé'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                      <span className="font-semibold">Missions:</span> {assignments.filter(a => a.contact_id === contact.id).length}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">Mission</th>
                    <th className="px-6 py-4 text-left font-bold">Chauffeur</th>
                    <th className="px-6 py-4 text-left font-bold">Montant HT</th>
                    <th className="px-6 py-4 text-left font-bold">Commission</th>
                    <th className="px-6 py-4 text-left font-bold">Statut</th>
                    <th className="px-6 py-4 text-left font-bold">Date</th>
                    <th className="px-6 py-4 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-600">
                        Aucune assignation pour le moment
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {assignment.mission?.reference || 'N/A'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {assignment.mission?.vehicle_brand} {assignment.mission?.vehicle_model}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">
                            {assignment.contact?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-slate-600">
                            {assignment.contact?.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900">
                            {assignment.payment_ht.toLocaleString('fr-FR')}€
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-teal-600">
                            {assignment.commission.toLocaleString('fr-FR')}€
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(assignment.status)}`}>
                            {getStatusLabel(assignment.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(assignment.assigned_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded-lg transition">
                              <Edit className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-300 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <span className="text-3xl font-black text-blue-700">
                  {stats.totalRevenue.toLocaleString('fr-FR')}€
                </span>
              </div>
              <p className="text-sm font-bold text-blue-800">Chiffre d'Affaires Total</p>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-300 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <span className="text-3xl font-black text-green-700">
                  {stats.totalCommission.toLocaleString('fr-FR')}€
                </span>
              </div>
              <p className="text-sm font-bold text-green-800">Commissions Totales</p>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-300 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <Target className="w-8 h-8 text-purple-600" />
                <span className="text-3xl font-black text-purple-700">
                  {stats.activeAssignments}
                </span>
              </div>
              <p className="text-sm font-bold text-purple-800">Assignations Actives</p>
            </div>

            <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-300 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-amber-600" />
                <span className="text-3xl font-black text-amber-700">
                  {stats.totalContacts}
                </span>
              </div>
              <p className="text-sm font-bold text-amber-800">Membres d'Équipe</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      
      {/* Assignment Modal */}
      {showAssignModal && selectedMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Assigner Mission</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedMission(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignMission} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Mission: {selectedMission.reference}
                </label>
                <p className="text-sm text-slate-600">
                  {selectedMission.vehicle_brand} {selectedMission.vehicle_model}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Chauffeur *
                </label>
                <select
                  value={assignmentForm.contact_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, contact_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                >
                  <option value="">Sélectionner un chauffeur</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Montant HT (€)
                  </label>
                  <input
                    type="number"
                    value={assignmentForm.payment_ht}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, payment_ht: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Commission (€)
                  </label>
                  <input
                    type="number"
                    value={assignmentForm.commission}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, commission: parseFloat(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                  placeholder="Instructions spéciales, remarques..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedMission(null);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg transition"
                >
                  ✅ Assigner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspection Modal */}
      {showInspectionViewer && inspectionMissionId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full h-full max-w-7xl max-h-screen p-4">
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Inspection Web</h2>
                <button
                  onClick={() => {
                    setShowInspectionViewer(false);
                    setInspectionMissionId(null);
                    loadData();
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <InspectionViewer
                  missionId={inspectionMissionId}
                  onClose={() => {
                    setShowInspectionViewer(false);
                    setInspectionMissionId(null);
                    loadData();
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT MISSION + REASSIGN */}
      {showEditModal && editingMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">Modifier Mission #{editingMission.reference}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMission(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Mission Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-slate-600 mb-2"><strong>Véhicule:</strong> {editingMission.vehicle_brand} {editingMission.vehicle_model}</p>
                <p className="text-sm text-slate-600 mb-2"><strong>Immatriculation:</strong> {editingMission.vehicle_plate}</p>
                <p className="text-sm text-slate-600 mb-2"><strong>Départ:</strong> {editingMission.pickup_address}</p>
                <p className="text-sm text-slate-600 mb-2"><strong>Arrivée:</strong> {editingMission.delivery_address}</p>
                <p className="text-sm text-slate-600 mb-2"><strong>Date:</strong> {new Date(editingMission.pickup_date).toLocaleDateString('fr-FR')}</p>
                <p className="text-sm text-slate-600"><strong>Statut:</strong> {getStatusLabel(editingMission.status)}</p>
              </div>

              {/* Réassigner chauffeur si status = pending ou in_progress */}
              {(editingMission.status === 'pending' || editingMission.status === 'in_progress') && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-bold text-yellow-900">Réassigner un chauffeur</h3>
                  </div>
                  <p className="text-sm text-yellow-700 mb-4">
                    Mission en attente ou en cours. Vous pouvez changer le chauffeur assigné en cas de problème.
                  </p>
                  <button
                    onClick={() => setShowReassignModal(true)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Choisir un autre chauffeur
                  </button>
                </div>
              )}

              {editingMission.status === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-700 font-semibold">Mission terminée - Réassignation impossible</p>
                </div>
              )}

              {editingMission.status === 'cancelled' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-red-700 font-semibold">Mission annulée - Réassignation impossible</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMission(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REASSIGN DRIVER */}
      {showReassignModal && editingMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">Réassigner Chauffeur</h2>
              <button
                onClick={() => setShowReassignModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <p className="text-slate-600 mb-6">
              Sélectionnez un nouveau chauffeur pour la mission <strong>#{editingMission.reference}</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.filter(c => c.is_active).map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => {
                    if (confirm(`Confirmer la réassignation à ${contact.name} ?`)) {
                      handleReassignDriver(contact.id);
                    }
                  }}
                  className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {contact.name}
                      </h3>
                      <p className="text-xs text-slate-500">{contact.role || 'Chauffeur'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>📧 {contact.email}</p>
                    <p>📱 {contact.phone}</p>
                    {contact.company_name && <p>🏢 {contact.company_name}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-slate-200">
              <button
                onClick={() => setShowReassignModal(false)}
                className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
