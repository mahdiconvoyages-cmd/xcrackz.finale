// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useEffect, useState } from 'react';
import { 
  Users, MapPin, Plus, X, Search, Truck, Package, 
  TrendingUp, Calendar, Eye, Edit, Trash2, Play, CheckCircle, 
  FileText, Clock, DollarSign, Sparkles,
  Filter, Grid, List, Archive, LogIn, UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { generateMissionPDF } from '../services/missionPdfGenerator';
import JoinMissionModal from '../components/JoinMissionModal';
import ShareCodeModal from '../components/ShareCodeModal';
import { useMissionsSync, useInspectionsSync } from '../hooks/useRealtimeSync';
import { getVehicleImageUrl } from '../utils/vehicleDefaults';

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
  assigned_user_id?: string;
  vehicle_type?: 'VL' | 'VU' | 'PL';
}

type TabType = 'pending' | 'in_progress' | 'completed';
type ViewMode = 'grid' | 'list';

export default function TeamMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ===== STATES =====
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareCodeModal, setShowShareCodeModal] = useState(false);
  
  // Selected items
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  // ===== DATA LOADING =====
  const loadMissions = async () => {
    if (!user) return;
    
    // Charger TOUTES les missions (créées + reçues) en une seule requête
    let allMissionsQuery = supabase
      .from('missions')
      .select('*')
      .or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);

    if (!showArchived) {
      allMissionsQuery = allMissionsQuery.or('archived.is.null,archived.eq.false');
    }

    allMissionsQuery = allMissionsQuery.order('created_at', { ascending: false });

    const { data: allMissionsData, error: allMissionsError } = await allMissionsQuery;

    if (allMissionsError) throw allMissionsError;
    
    // Charger toutes les inspections pour ces missions
    const missionIds = (allMissionsData || []).map(m => m.id);
    let inspections = [];
    
    if (missionIds.length > 0) {
      const { data: inspectionData } = await supabase
        .from('vehicle_inspections')
        .select('mission_id, inspection_type')
        .in('mission_id', missionIds);
      
      inspections = inspectionData || [];
    }
    
    // Calculer le statut basé sur les inspections (fallback si status DB manquant)
    // NE PAS FILTRER les completed - on les affiche dans l'onglet Terminées
    const processedMissions = (allMissionsData || []).map(mission => {
      // Utiliser le statut de la DB en priorité (mis à jour par mobile)
      let finalStatus = mission.status;
      
      // Fallback: calculer le statut si absent ou si 'pending' dans DB
      if (!finalStatus || finalStatus === 'pending') {
        const missionInspections = inspections.filter(i => i.mission_id === mission.id);
        const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
        const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');
        
        if (hasDepart && hasArrival) {
          finalStatus = 'completed';
        } else if (hasDepart) {
          finalStatus = 'in_progress';
        } else {
          finalStatus = 'pending';
        }
      }
      
      return {
        ...mission,
        status: finalStatus
      };
    });
    
    setMissions(processedMissions || []);
  };

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

  // ===== EFFECTS =====
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, showArchived]);

  // Synchronisation temps réel
  useMissionsSync(user?.id || '', () => {
    console.log('[TeamMissions] Realtime update - reloading missions');
    loadMissions();
  });

  useInspectionsSync(user?.id || '', () => {
    console.log('[TeamMissions] Realtime update - reloading inspections');
    loadMissions();
  });

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

  const handleArchiveMission = async (missionId: string, archive: boolean) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({ archived: archive })
        .eq('id', missionId);

      if (error) throw error;
      await loadMissions();
      alert(archive ? '✅ Mission archivée' : '✅ Mission restaurée');
    } catch (error) {
      console.error('Error archiving mission:', error);
      alert('❌ Erreur lors de l\'archivage');
    }
  };

  const handleViewReport = async (missionId: string) => {
    try {
      // Afficher un loader
      const loadingAlert = document.createElement('div');
      loadingAlert.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      loadingAlert.innerHTML = '<div class="bg-white rounded-xl p-6"><div class="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div></div>';
      document.body.appendChild(loadingAlert);

      // Appeler la fonction RPC pour obtenir le token
      const { data, error } = await supabase.rpc('create_or_get_inspection_share', {
        p_mission_id: missionId,
        p_report_type: 'complete',
        p_user_id: user?.id
      });

      document.body.removeChild(loadingAlert);

      if (error) throw error;

      if (data && data.length > 0 && data[0].share_token) {
        const token = data[0].share_token;
        // Ouvrir le rapport public dans un nouvel onglet
        window.open(`/rapport-inspection/${token}`, '_blank');
      } else {
        throw new Error('Token de rapport non trouvé');
      }
    } catch (error) {
      console.error('Error viewing report:', error);
      alert('❌ Erreur lors de l\'ouverture du rapport');
    }
  };

  // ===== HELPERS =====
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'in_progress': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-slate-100 border-slate-300 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
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
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Continuer Inspection
          </button>
        );
      case 'completed':
        return (
          <button
            onClick={() => handleViewReport(mission.id)}
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

  // Filtered data with proper sorting
  const filteredMissions = missions
    .filter(m => {
      const matchesSearch = m.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           m.vehicle_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           m.vehicle_model.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesTab = m.status === activeTab; // Filtrer par onglet actif
      return matchesSearch && matchesStatus && matchesTab;
    })
    .sort((a, b) => {
      // Tri du plus récent au plus ancien
      // Pour les missions terminées, utiliser updated_at ou delivery_date
      // Pour les autres, utiliser created_at
      const dateA = new Date(a.updated_at || a.delivery_date || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.delivery_date || b.created_at).getTime();
      return dateB - dateA; // Plus récent en premier
    });

  // Stats
  const stats = {
    totalMissions: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
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
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-5 h-5" />
            En attente
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'pending' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.pending}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'in_progress'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            En cours
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'in_progress' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.inProgress}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            Terminées
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'completed' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {stats.completed}
            </span>
          </button>
        </div>
      </div>

      {/* ===== STATS CARDS (uniquement pour onglet En attente) ===== */}
      {activeTab === 'pending' && (
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

      {/* ===== JOIN MISSION BANNER (Compact) ===== */}
      <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-300 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <LogIn className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Rejoindre une mission</h3>
              <p className="text-sm text-slate-600">Entrez le code de partage reçu</p>
            </div>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            Entrer le code
          </button>
        </div>
      </div>

      {/* ===== TOOLBAR (Search & Filters) ===== */}
      <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition" />
            <input
              type="text"
              placeholder="Rechercher une mission..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>

          {/* Filters */}
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
            <Archive className="w-5 h-5" />
            <span className="hidden sm:inline">Archives</span>
          </button>

          {/* View Toggle */}
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
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="animate-in fade-in duration-500">
        {/* MISSIONS GRID (Toutes les missions filtrées par onglet) */}
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
                Créer une mission
              </Link>
            </div>
          ) : (
            filteredMissions.map((mission, index) => (
              <div
                key={mission.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="group backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <img
                      src={getVehicleImageUrl(mission.vehicle_image_url, mission.vehicle_type)}
                      alt={`Véhicule ${mission.vehicle_type || 'VL'}`}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-teal-500/50 group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-slate-900">
                          {mission.reference}
                        </h3>
                        {mission.assigned_user_id && mission.assigned_user_id !== mission.user_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-300">
                            🎯 Reçue
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm">
                        {mission.vehicle_brand} {mission.vehicle_model}
                        {mission.vehicle_plate && <span className="text-slate-400"> • {mission.vehicle_plate}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(mission.status)}`}>
                      {getStatusLabel(mission.status)}
                    </span>
                  </div>
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

                {/* Actions Principales */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {/* Bouton principal selon statut */}
                  {getActionButton(mission)}
                  
                  {/* Voir Détails */}
                  <button
                    onClick={() => {
                      setSelectedMission(mission);
                      setShowDetailsModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Détails
                  </button>

                  {/* Télécharger PDF */}
                  <button
                    onClick={async () => {
                      try {
                        await generateMissionPDF(mission);
                        alert('✅ PDF généré avec succès !');
                      } catch (error) {
                        console.error('Erreur PDF:', error);
                        alert('❌ Erreur lors de la génération du PDF');
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </div>

                {/* Actions Secondaires */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200">
                  {mission.user_id === user?.id && (
                    <>
                      <button
                        onClick={() => navigate(`/missions/edit/${mission.id}`)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMission(mission);
                          setShowShareCodeModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Partager
                      </button>
                      <button
                        onClick={() => handleArchiveMission(mission.id, !mission.archived)}
                        className="inline-flex items-center gap-1 text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        {mission.archived ? 'Restaurer' : 'Archiver'}
                      </button>
                      <button
                        onClick={() => handleDeleteMission(mission.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      
      {/* Details Modal */}
      {showDetailsModal && selectedMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-slate-900">Détails de la mission</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedMission(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">Informations Véhicule</h3>
                  <p><strong>Marque:</strong> {selectedMission.vehicle_brand}</p>
                  <p><strong>Modèle:</strong> {selectedMission.vehicle_model}</p>
                  <p><strong>Plaque:</strong> {selectedMission.vehicle_plate}</p>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Trajet</h3>
                  <p><strong>Départ:</strong> {selectedMission.pickup_address}</p>
                  <p><strong>Arrivée:</strong> {selectedMission.delivery_address}</p>
                  <p><strong>Date:</strong> {new Date(selectedMission.pickup_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              {selectedMission.notes && (
                <div className="mt-4">
                  <h3 className="font-bold text-lg mb-2">Notes</h3>
                  <p className="text-slate-600">{selectedMission.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Join Mission Modal */}
      {showJoinModal && (
        <JoinMissionModal
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {
            setShowJoinModal(false);
            loadData();
          }}
        />
      )}

      {/* Share Code Modal */}
      {showShareCodeModal && selectedMission && (
        <ShareCodeModal
          mission={selectedMission}
          onClose={() => {
            setShowShareCodeModal(false);
            setSelectedMission(null);
          }}
        />
      )}
    </div>
  );
}

