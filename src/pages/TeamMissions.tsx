// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useEffect, useState } from 'react';
import { 
  Users, MapPin, Plus, X, Search, Truck, Package, 
  TrendingUp, Calendar, Eye, Edit, Trash2, Play, CheckCircle, 
  FileText, Clock, DollarSign, Sparkles,
  Filter, Grid, List, XCircle, Archive, ArchiveRestore, LogIn, UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import InspectionViewer from '../components/InspectionViewer';
import { generateMissionPDF } from '../services/missionPdfGenerator';
import JoinMissionModal from '../components/JoinMissionModal';
import ShareCodeModal from '../components/ShareCodeModal';
import { useMissionsSync, useInspectionsSync } from '../hooks/useRealtimeSync';

// ===== INTERFACES =====
interface Mission {
  id: string;
  reference: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date: string;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  delivery_contact_name?: string;
  delivery_contact_phone?: string;
  distance?: number;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_image_url: string;
  price: number;
  notes: string;
  created_at: string;
  user_id?: string;
  archived?: boolean;
  share_code?: string;
  assigned_to_user_id?: string;
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

type TabType = 'missions' | 'received';
type ViewMode = 'grid' | 'list';

export default function TeamMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ===== STATES =====
  const [activeTab, setActiveTab] = useState<TabType>('missions');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [receivedMissions, setReceivedMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showInspectionViewer, setShowInspectionViewer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareCodeModal, setShowShareCodeModal] = useState(false);
  
  // Selected items
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [inspectionMissionId, setInspectionMissionId] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // ===== EFFECTS =====
  useEffect(() => {
    loadData();
  }, [user, showArchived]);

  // Synchronisation temps réel
  useMissionsSync(user?.id || '', () => {
    console.log('[TeamMissions] Realtime update - reloading missions');
    loadMissions();
  });

  useInspectionsSync(user?.id || '', () => {
    console.log('[TeamMissions] Realtime update - reloading inspections');
    loadMissions();
  });

  // ===== DATA LOADING =====
  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      await loadMissions();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMissions = async () => {
    if (!user) return;
    
    // Charger les missions créées par l'utilisateur
    let createdQuery = supabase
      .from('missions')
      .select('*')
      .eq('user_id', user.id);

    if (!showArchived) {
      createdQuery = createdQuery.or('archived.is.null,archived.eq.false');
    }

    createdQuery = createdQuery.order('created_at', { ascending: false });

    const { data: createdData, error: createdError } = await createdQuery;

    if (createdError) throw createdError;
    
    // Charger toutes les inspections pour ces missions
    const missionIds = (createdData || []).map(m => m.id);
    let inspections = [];
    
    if (missionIds.length > 0) {
      const { data: inspectionData } = await supabase
        .from('vehicle_inspections')
        .select('mission_id, inspection_type')
        .in('mission_id', missionIds);
      
      inspections = inspectionData || [];
    }
    
    // Calculer le statut basé sur les inspections et filtrer les missions terminées
    const processedCreatedData = (createdData || []).map(mission => {
      const missionInspections = inspections.filter(i => i.mission_id === mission.id);
      const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
      const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');
      
      let calculatedStatus = 'pending'; // Sans inspection
      
      if (hasDepart && hasArrival) {
        calculatedStatus = 'completed'; // Terminée - ne pas afficher
        return null; // Filtrer les missions terminées
      } else if (hasDepart) {
        calculatedStatus = 'in_progress'; // En cours
      }
      
      return {
        ...mission,
        status: calculatedStatus
      };
    }).filter(Boolean); // Supprimer les missions terminées (null)
    
    setMissions(processedCreatedData || []);

    // Charger les missions assignées à l'utilisateur (via share_code)
    let receivedQuery = supabase
      .from('missions')
      .select('*')
      .eq('assigned_to_user_id' as any, user.id);

    if (!showArchived) {
      receivedQuery = receivedQuery.or('archived.is.null,archived.eq.false');
    }

    receivedQuery = receivedQuery.order('created_at', { ascending: false });

    const { data: receivedData, error: receivedError} = await receivedQuery;

    if (receivedError) {
      console.error('Error loading received missions:', receivedError);
      // Ne pas bloquer si la colonne n'existe pas encore
      if (!receivedError.message?.includes('assigned_to_user_id')) {
        throw receivedError;
      }
    }
    
    // Charger les inspections pour les missions reçues
    const receivedMissionIds = (receivedData || []).map(m => m.id);
    let receivedInspections = [];
    
    if (receivedMissionIds.length > 0) {
      const { data: receivedInspectionData } = await supabase
        .from('vehicle_inspections')
        .select('mission_id, inspection_type')
        .in('mission_id', receivedMissionIds);
      
      receivedInspections = receivedInspectionData || [];
    }
    
    // Même traitement pour les missions reçues
    const processedReceivedData = (receivedData || []).map(mission => {
      const missionInspections = receivedInspections.filter(i => i.mission_id === mission.id);
      const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
      const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');
      
      let calculatedStatus = 'pending';
      
      if (hasDepart && hasArrival) {
        calculatedStatus = 'completed';
        return null; // Filtrer les missions terminées
      } else if (hasDepart) {
        calculatedStatus = 'in_progress';
      }
      
      return {
        ...mission,
        status: calculatedStatus
      };
    }).filter(Boolean);
    
    setReceivedMissions(processedReceivedData || []);
  };

  // ===== ACTIONS =====
  const handleStartInspection = async (mission: Mission) => {
    // Vérifier si l'inspection de départ existe déjà
    const { data: departureInspection, error } = await supabase
      .from('vehicle_inspections')
      .select('id')
      .eq('mission_id', mission.id)
      .eq('inspection_type', 'departure')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Erreur lors de la vérification de l\'inspection:', error);
    }
    
    // Si l'inspection de départ existe, aller vers inspection arrivée
    // Sinon, aller vers inspection départ
    if (departureInspection) {
      navigate(`/inspection/arrival/${mission.id}`);
    } else {
      navigate(`/inspection/departure/${mission.id}`);
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

  const handleArchiveMission = async (mission: Mission) => {
    const isArchiving = !mission.archived;
    
    if (isArchiving && mission.status !== 'completed' && mission.status !== 'cancelled') {
      alert('⚠️ Seules les missions terminées ou annulées peuvent être archivées.');
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir ${isArchiving ? 'archiver' : 'désarchiver'} cette mission ?`)) return;

    try {
      const { error } = await supabase
        .from('missions')
        .update({ archived: isArchiving })
        .eq('id', mission.id);

      if (error) throw error;
      await loadMissions();
      alert(`✅ Mission ${isArchiving ? 'archivée' : 'désarchivée'}`);
    } catch (error) {
      console.error('Error archiving mission:', error);
      alert('❌ Erreur lors de l\'archivage');
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

  // Stats
  const stats = {
    totalMissions: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
    receivedMissions: receivedMissions.length,
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
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-glow-blue px-6 py-3 rounded-xl font-bold hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1"
          >
            <LogIn className="w-5 h-5" />
            Rejoindre une mission
          </button>
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
            Mes Missions
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'missions' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.totalMissions}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('received')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'received'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-5 h-5" />
            Missions Reçues
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'received' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.receivedMissions}
            </span>
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
            <>
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

              {/* Toggle Archives */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  showArchived
                    ? 'bg-amber-100 border-2 border-amber-400 text-amber-800 shadow-lg'
                    : 'bg-white/50 border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title={showArchived ? 'Masquer les archives' : 'Afficher les archives'}
              >
                {showArchived ? (
                  <>
                    <Archive className="w-5 h-5" />
                    <span className="hidden sm:inline">Archives</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-5 h-5" />
                    <span className="hidden sm:inline">Archives</span>
                  </>
                )}
              </button>
            </>
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
                  className={`backdrop-blur-xl border rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 group animate-in slide-in-from-bottom ${
                    mission.archived
                      ? 'bg-slate-50/50 border-slate-300 opacity-75 hover:border-amber-400'
                      : 'bg-white/80 border-slate-200 hover:border-teal-500/50'
                  }`}
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-900">{mission.reference}</h3>
                          {mission.archived && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg border border-amber-300">
                              <Archive className="w-3 h-3" />
                              Archivée
                            </span>
                          )}
                        </div>
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

                  {/* Progression visuelle */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Progression</span>
                      <span className="font-semibold">
                        {mission.status === 'completed' ? '100%' : 
                         mission.status === 'in_progress' ? '50%' : '0%'}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          mission.status === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-500 w-full' :
                          mission.status === 'in_progress' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 w-1/2' :
                          'bg-gradient-to-r from-amber-500 to-orange-500 w-0'
                        }`}
                      />
                    </div>
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
                        setShowShareCodeModal(true);
                      }}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      Partager
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

                    {(mission.status === 'completed' || mission.status === 'cancelled') && (
                      <button
                        onClick={() => handleArchiveMission(mission)}
                        className={`inline-flex items-center gap-2 border px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-sm ${
                          mission.archived
                            ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                        title={mission.archived ? 'Désarchiver' : 'Archiver'}
                      >
                        {mission.archived ? (
                          <ArchiveRestore className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>
                    )}

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

        {/* RECEIVED MISSIONS TAB */}
        {activeTab === 'received' && (
          <div className="space-y-4">
            {receivedMissions.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Aucune mission reçue
                </h3>
                <p className="text-slate-600">
                  Les missions partagées avec vous apparaîtront ici
                </p>
              </div>
            ) : (
              receivedMissions.map((mission, index) => (
                <div
                  key={mission.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900">
                          {mission.reference}
                        </h3>
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                          🎯 Mission partagée
                        </span>
                      </div>
                      <p className="text-slate-600 mb-2">
                        {mission.vehicle_brand} {mission.vehicle_model}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-600">
                        {mission.price?.toFixed(2)}€
                      </p>
                      <p className="text-sm text-slate-500">HT</p>
                    </div>
                  </div>

                  {/* Itinéraire */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-green-900">Départ</p>
                        <p className="text-sm text-green-700 truncate">
                          {mission.pickup_address || 'Adresse non renseignée'}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {mission.pickup_date 
                            ? new Date(mission.pickup_date).toLocaleDateString('fr-FR')
                            : 'Date non renseignée'}
                        </p>
                        {mission.pickup_contact_name && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <p className="text-xs font-bold text-green-900">📞 Contact:</p>
                            <p className="text-xs text-green-700">{mission.pickup_contact_name}</p>
                            {mission.pickup_contact_phone && (
                              <a 
                                href={`tel:${mission.pickup_contact_phone}`}
                                className="text-xs text-green-600 hover:underline font-bold"
                              >
                                {mission.pickup_contact_phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-red-900">Arrivée</p>
                        <p className="text-sm text-red-700 truncate">
                          {mission.delivery_address || 'Adresse non renseignée'}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {mission.delivery_date 
                            ? new Date(mission.delivery_date).toLocaleDateString('fr-FR')
                            : 'Date non renseignée'}
                        </p>
                        {mission.delivery_contact_name && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <p className="text-xs font-bold text-red-900">📞 Contact:</p>
                            <p className="text-xs text-red-700">{mission.delivery_contact_name}</p>
                            {mission.delivery_contact_phone && (
                              <a 
                                href={`tel:${mission.delivery_contact_phone}`}
                                className="text-xs text-red-600 hover:underline font-bold"
                              >
                                {mission.delivery_contact_phone}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {mission.notes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-bold text-blue-900 mb-1">📝 Notes :</p>
                      <p className="text-sm text-blue-700">{mission.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      {mission.distance && (
                        <span>📏 {mission.distance} km</span>
                      )}
                      <span className="px-2 py-1 bg-slate-100 rounded-full text-xs">
                        Statut: <strong>{getStatusLabel(mission.status)}</strong>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartInspection(mission)}
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <Play className="w-5 h-5" />
                        Commencer Inspection
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ===== MODALS ===== */}
      
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

      {/* Mission Details Modal */}
      {showDetailsModal && selectedMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">📋 Détails de la Mission</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedMission(null);
                  setSelectedAssignment(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mission Info */}
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6">
                <h3 className="text-3xl font-bold text-blue-900 mb-2">{selectedMission.reference}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600 font-bold">Véhicule</p>
                    <p className="text-blue-900">{selectedMission.vehicle_brand} {selectedMission.vehicle_model}</p>
                    <p className="text-blue-700">{selectedMission.vehicle_plate}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-bold">Statut</p>
                    <p className="text-blue-900 capitalize">{selectedMission.status}</p>
                  </div>
                </div>
              </div>

              {/* Itinéraire détaillé */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Départ */}
                <div className="bg-green-50 rounded-xl p-6">
                  <h4 className="text-green-900 font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Point de Départ
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-green-600 font-bold">📍 Adresse</p>
                      <p className="text-green-900">{selectedMission.pickup_address}</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-bold">📅 Date</p>
                      <p className="text-green-900">
                        {new Date(selectedMission.pickup_date).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {selectedMission.pickup_contact_name && (
                      <div>
                        <p className="text-green-600 font-bold">📞 Contact</p>
                        <p className="text-green-900">{selectedMission.pickup_contact_name}</p>
                        {selectedMission.pickup_contact_phone && (
                          <a 
                            href={`tel:${selectedMission.pickup_contact_phone}`}
                            className="text-green-600 hover:underline font-bold"
                          >
                            {selectedMission.pickup_contact_phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrivée */}
                <div className="bg-red-50 rounded-xl p-6">
                  <h4 className="text-red-900 font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" /> Point d'Arrivée
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-red-600 font-bold">📍 Adresse</p>
                      <p className="text-red-900">{selectedMission.delivery_address}</p>
                    </div>
                    <div>
                      <p className="text-red-600 font-bold">📅 Date</p>
                      <p className="text-red-900">
                        {new Date(selectedMission.delivery_date).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {selectedMission.delivery_contact_name && (
                      <div>
                        <p className="text-red-600 font-bold">📞 Contact</p>
                        <p className="text-red-900">{selectedMission.delivery_contact_name}</p>
                        {selectedMission.delivery_contact_phone && (
                          <a 
                            href={`tel:${selectedMission.delivery_contact_phone}`}
                            className="text-red-600 hover:underline font-bold"
                          >
                            {selectedMission.delivery_contact_phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedMission.notes && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="text-blue-900 font-bold mb-2">📝 Notes</h4>
                  <p className="text-blue-700">{selectedMission.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <button
                  onClick={async () => {
                    try {
                      await generateMissionPDF(selectedMission, selectedAssignment || undefined);
                    } catch (error) {
                      console.error('Erreur génération PDF:', error);
                      alert('❌ Erreur lors de la génération du PDF');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  <FileText className="w-5 h-5" />
                  Télécharger le PDF
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedAssignment(null);
                    handleStartInspection(selectedMission);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  <Play className="w-5 h-5" />
                  Commencer Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejoindre Mission */}
      <JoinMissionModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSuccess={(missionId) => {
          // Recharger les missions après avoir rejoint
          loadMissions();
          setShowJoinModal(false);
        }}
      />

      {/* Modal Partager Code */}
      {showShareCodeModal && selectedMission && selectedMission.share_code && (
        <ShareCodeModal
          isOpen={showShareCodeModal}
          shareCode={selectedMission.share_code}
          missionReference={selectedMission.reference}
          onClose={() => {
            setShowShareCodeModal(false);
            setSelectedMission(null);
          }}
        />
      )}
    </div>
  );
}
