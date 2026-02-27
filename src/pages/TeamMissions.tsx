// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
// Mes Convoyages — DESIGN IDENTIQUE AU FLUTTER PremiumTheme
import React, { useEffect, useState } from 'react';
import { 
  Users, MapPin, Plus, X, Search, Truck, Package, 
  TrendingUp, Calendar, Eye, Edit, Trash2, Play, CheckCircle, 
  FileText, Clock, DollarSign, Phone, Copy, Key,
  Filter, Grid, List, Archive, LogIn, UserPlus, Car, Hash,
  Navigation, User, Building2, AlertTriangle, MapPinned,
  Receipt, ChevronRight, CircleDot, CheckCircle2, Share2, ExternalLink, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { generateMissionPDF } from '../services/missionPdfGenerator';
import { showToast } from '../components/Toast';
import JoinMissionModal from '../components/JoinMissionModal';
import ShareCodeModal from '../components/ShareCodeModal';
import { useMissionsSync, useInspectionsSync } from '../hooks/useRealtimeSync';
import { getVehicleImageUrl } from '../utils/vehicleDefaults';

/* ── PremiumTheme tokens (identique Flutter premium_theme.dart) ── */
const T = {
  primaryBlue: '#0066FF',
  primaryIndigo: '#5B8DEF',
  primaryPurple: '#8B7EE8',
  primaryTeal: '#14B8A6',
  accentGreen: '#10B981',
  accentAmber: '#F59E0B',
  accentRed: '#EF4444',
  deepOrange: '#E65100',
  lightBg: '#F8F9FA',
  fieldBg: '#F8FAFC',
  borderDefault: '#E5E7EB',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
};

const STATUS_CFG: Record<string, { color: string; label: string; bg: string; border: string; text: string }> = {
  pending:     { color: T.accentAmber,  label: 'En attente', bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
  assigned:    { color: '#8B5CF6',      label: 'Assignée',   bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },
  in_progress: { color: T.primaryBlue,  label: 'En cours',   bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
  completed:   { color: T.accentGreen,  label: 'Terminée',   bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
  cancelled:   { color: T.accentRed,    label: 'Annulée',    bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
};

// ===== INTERFACES =====
interface Mission {
  id: string; reference: string;
  pickup_address: string; delivery_address: string;
  pickup_date: string; delivery_date: string;
  pickup_contact_name?: string; pickup_contact_phone?: string;
  delivery_contact_name?: string; delivery_contact_phone?: string;
  pickup_city?: string; pickup_postcode?: string;
  delivery_city?: string; delivery_postcode?: string;
  distance?: number; status: string;
  vehicle_brand: string; vehicle_model: string; vehicle_plate: string;
  vehicle_image_url: string; vehicle_type?: 'VL' | 'VU' | 'PL';
  vehicle_vin?: string; vehicle_year?: string;
  price: number; notes: string; created_at: string; updated_at?: string;
  user_id?: string; archived?: boolean; share_code?: string;
  assigned_user_id?: string; driver_id?: string;
  mandataire_name?: string; mandataire_company?: string;
  client_name?: string; client_phone?: string; client_email?: string;
  agent_name?: string; special_instructions?: string;
  public_tracking_link?: string; report_id?: string;
  has_restitution?: boolean;
  restitution_vehicle_brand?: string; restitution_vehicle_model?: string; restitution_vehicle_plate?: string;
  restitution_pickup_address?: string; restitution_delivery_address?: string;
  restitution_pickup_date?: string; restitution_delivery_date?: string;
}

interface InspectionInfo { id: string; mission_id: string; inspection_type: string; }
type TabType = 'pending' | 'in_progress' | 'completed';
type ViewMode = 'grid' | 'list';

export default function TeamMissions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ===== STATES =====
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [inspections, setInspections] = useState<InspectionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareCodeModal, setShowShareCodeModal] = useState(false);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [driverNames, setDriverNames] = useState<Record<string, string>>({});

  // ===== DATA LOADING =====
  const loadMissions = async () => {
    if (!user) return;
    let q = supabase.from('missions').select('*').or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`);
    if (!showArchived) q = q.or('archived.is.null,archived.eq.false');
    q = q.order('created_at', { ascending: false });
    const { data: allData, error: allErr } = await q;
    if (allErr) throw allErr;
    const missionIds = (allData || []).map(m => m.id);
    let loadedInsp: InspectionInfo[] = [];
    if (missionIds.length > 0) {
      const { data: iData } = await supabase.from('vehicle_inspections').select('id, mission_id, inspection_type').in('mission_id', missionIds);
      loadedInsp = iData || [];
    }
    setInspections(loadedInsp);
    const processed = (allData || []).map(m => {
      const st = m.status || 'pending';
      return { ...m, status: st };
    });
    setMissions(processed || []);
    const dIds = [...new Set(processed.filter(m => m.assigned_user_id).map(m => m.assigned_user_id))];
    if (dIds.length > 0) {
      const { data: pr } = await supabase.from('profiles').select('id, full_name, email').in('id', dIds);
      if (pr) { const n: Record<string, string> = {}; pr.forEach(p => { n[p.id] = p.full_name || p.email || 'Chauffeur'; }); setDriverNames(n); }
    }
  };

  const loadData = async () => { if (!user) return; setLoading(true); try { await loadMissions(); } catch (e) { console.error('Error loading data:', e); } finally { setLoading(false); } };

  useEffect(() => { loadData(); }, [user?.id, showArchived]);
  useMissionsSync(user?.id || '', () => { loadMissions(); });
  useInspectionsSync(user?.id || '', () => { loadMissions(); });

  // ===== HELPERS =====
  const hasDepartureInspection = (mid: string) => inspections.some(i => i.mission_id === mid && i.inspection_type === 'departure');
  const hasArrivalInspection = (mid: string) => inspections.some(i => i.mission_id === mid && i.inspection_type === 'arrival');
  const hasRestitutionDepartureInspection = (mid: string) => inspections.some(i => i.mission_id === mid && i.inspection_type === 'restitution_departure');
  const hasRestitutionArrivalInspection = (mid: string) => inspections.some(i => i.mission_id === mid && i.inspection_type === 'restitution_arrival');
  const getInspectionId = (mid: string, type: string) => inspections.find(i => i.mission_id === mid && i.inspection_type === type)?.id;

  const handleViewDepartureReport = async (missionId: string) => {
    const { data } = await supabase.from('inspection_report_shares').select('share_token').eq('mission_id', missionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data?.share_token) { window.open(`/rapport-inspection/${data.share_token}`, '_blank'); } else {
      const tk = Date.now().toString(36) + (user?.id || '').substring(0, 8);
      await supabase.from('inspection_report_shares').insert({ mission_id: missionId, share_token: tk, user_id: user?.id, report_type: 'complete', is_active: true });
      window.open(`/rapport-inspection/${tk}`, '_blank');
    }
  };

  const handleViewArrivalReport = async (missionId: string) => {
    const { data } = await supabase.from('inspection_report_shares').select('share_token').eq('mission_id', missionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data?.share_token) { window.open(`/rapport-inspection/${data.share_token}`, '_blank'); } else {
      const tk = Date.now().toString(36) + (user?.id || '').substring(0, 8);
      await supabase.from('inspection_report_shares').insert({ mission_id: missionId, share_token: tk, user_id: user?.id, report_type: 'complete', is_active: true });
      window.open(`/rapport-inspection/${tk}`, '_blank');
    }
  };

  // ===== ACTIONS =====
  const handleStartInspection = async (mission: Mission) => {
    const { data: ei } = await supabase.from('vehicle_inspections').select('id, inspection_type').eq('mission_id', mission.id);
    const types = (ei || []).map(i => i.inspection_type);
    if (!types.includes('departure')) navigate(`/inspection/departure/${mission.id}`);
    else if (!types.includes('arrival')) navigate(`/inspection/arrival/${mission.id}`);
    else if (mission.has_restitution && !types.includes('restitution_departure')) navigate(`/inspection/departure/${mission.id}?restitution=true`);
    else if (mission.has_restitution && !types.includes('restitution_arrival')) navigate(`/inspection/arrival/${mission.id}?restitution=true`);
    else navigate(`/inspection/arrival/${mission.id}`);
  };

  const handleCompleteMission = async (mission: Mission) => {
    const hd = hasDepartureInspection(mission.id), ha = hasArrivalInspection(mission.id);
    const hrd = mission.has_restitution ? hasRestitutionDepartureInspection(mission.id) : true;
    const hra = mission.has_restitution ? hasRestitutionArrivalInspection(mission.id) : true;
    if (!hd || !ha || !hrd || !hra) {
      const m: string[] = [];
      if (!hd) m.push("inspection de départ"); if (!ha) m.push("inspection d'arrivée");
      if (!hrd) m.push("inspection départ restitution"); if (!hra) m.push("inspection arrivée restitution");
      alert(`⚠️ Impossible de terminer la mission.\n\nIl manque : ${m.join(', ')}.`); return;
    }
    if (!confirm('Êtes-vous sûr de vouloir terminer cette mission ?')) return;
    try {
      const { error } = await supabase.from('missions').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', mission.id);
      if (error) throw error; await loadMissions(); showToast('success', 'Mission terminée', 'La mission a été marquée comme terminée');
    } catch (e) { console.error(e); showToast('error', 'Erreur', 'Erreur lors de la mise à jour'); }
  };

  const handleCreateInvoice = (mission: Mission) => navigate('/billing', { state: { fromMission: mission } });

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) return;
    try { const { error } = await supabase.from('missions').delete().eq('id', missionId); if (error) throw error; await loadMissions(); showToast('success', 'Mission supprimée', 'La mission a été supprimée');
    } catch (e) { console.error(e); showToast('error', 'Erreur', 'Erreur lors de la suppression'); }
  };

  const handleArchiveMission = async (missionId: string, archive: boolean) => {
    try { const { error } = await supabase.from('missions').update({ archived: archive }).eq('id', missionId); if (error) throw error; await loadMissions(); showToast('success', archive ? 'Mission archivée' : 'Mission restaurée');
    } catch (e) { console.error(e); showToast('error', 'Erreur', 'Erreur lors de l\'archivage'); }
  };

  const handleChangeDriver = async (mission: Mission) => {
    try { const { error } = await supabase.from('missions').update({ assigned_user_id: null, driver_id: null }).eq('id', mission.id); if (error) throw error; await loadMissions(); showToast('success', 'Chauffeur retiré');
    } catch (e) { console.error(e); showToast('error', 'Erreur', 'Erreur lors du retrait du chauffeur'); }
  };

  const handleViewReport = async (missionId: string) => {
    try {
      const la = document.createElement('div'); la.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]';
      la.innerHTML = '<div class="bg-white rounded-xl p-6"><div class="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div></div>';
      document.body.appendChild(la);
      const { data, error } = await supabase.rpc('create_or_get_inspection_share', { p_mission_id: missionId, p_report_type: 'complete', p_user_id: user?.id });
      document.body.removeChild(la);
      if (error) throw error;
      if (data?.length > 0 && data[0].share_token) window.open(`/rapport-inspection/${data[0].share_token}`, '_blank');
      else throw new Error('Token non trouvé');
    } catch (e) { console.error(e); showToast('error', 'Erreur', 'Erreur lors de l\'ouverture du rapport'); }
  };

  const handleCopyShareCode = (code: string) => { navigator.clipboard.writeText(code); showToast('success', 'Code copié', 'Le code de partage a été copié'); };

  const getVehicleTypeLabel = (t?: string) => { switch (t) { case 'VL': return 'VL'; case 'VU': return 'VU'; case 'PL': return 'PL'; default: return t || 'VL'; } };

  // Filtered data
  const filteredMissions = missions
    .filter(m => {
      const ms = (m.reference + m.vehicle_brand + m.vehicle_model + (m.mandataire_name || '') + (m.vehicle_plate || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const mf = statusFilter === 'all' || m.status === statusFilter;
      // 'assigned' is shown in the 'in_progress' tab alongside 'in_progress'
      const tabMatch = activeTab === 'in_progress'
        ? (m.status === 'in_progress' || m.status === 'assigned')
        : m.status === activeTab;
      return ms && mf && tabMatch;
    })
    .sort((a, b) => new Date(b.updated_at || b.delivery_date || b.created_at).getTime() - new Date(a.updated_at || a.delivery_date || a.created_at).getTime());

  const stats = {
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress' || m.status === 'assigned').length,
    completed: missions.filter(m => m.status === 'completed').length,
  };

  const scfg = (s: string) => STATUS_CFG[s] || STATUS_CFG.pending;

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: T.lightBg }}>
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4" style={{ borderColor: T.borderDefault }} />
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-[#14B8A6] absolute top-0 left-0" style={{ borderColor: 'transparent', borderTopColor: T.primaryTeal }} />
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — Desktop-optimized + Mobile compatible
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: T.lightBg }}>
      {/* ── Sticky AppBar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)' }}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg lg:text-2xl font-extrabold tracking-tight" style={{ color: T.textPrimary }}>Mes Convoyages</h1>
            <p className="hidden lg:block text-sm mt-0.5" style={{ color: T.textSecondary }}>{missions.length} mission{missions.length > 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-md"
              style={{ backgroundColor: `${T.primaryBlue}0D`, color: T.primaryBlue, border: `1px solid ${T.primaryBlue}20` }}>
              <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Rejoindre</span>
            </button>
            <Link to="/missions/create"
              className="flex items-center gap-1.5 px-3 lg:px-5 py-2 lg:py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${T.primaryTeal}, #0F9D7A)`, boxShadow: `0 2px 8px ${T.primaryTeal}30` }}>
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nouvelle mission</span><span className="sm:hidden">Nouvelle</span>
            </Link>
          </div>
        </div>

        {/* ── Desktop stats cards + Tabs ── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-3 lg:pb-4">
          {/* Desktop: horizontal stat cards */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mb-0">
            {([
              { key: 'pending' as TabType, label: 'En attente', count: stats.pending, color: T.accentAmber, icon: Clock, desc: 'Missions à démarrer' },
              { key: 'in_progress' as TabType, label: 'En cours', count: stats.inProgress, color: T.primaryBlue, icon: TrendingUp, desc: 'Missions actives' },
              { key: 'completed' as TabType, label: 'Terminées', count: stats.completed, color: T.accentGreen, icon: CheckCircle, desc: 'Missions complétées' },
            ]).map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200"
                  style={active
                    ? { backgroundColor: '#FFF', boxShadow: `0 0 0 2px ${tab.color}50, 0 8px 24px ${tab.color}18`, border: `1px solid ${tab.color}30`, transform: 'translateY(-1px)' }
                    : { backgroundColor: '#FFF', border: `1px solid ${T.borderDefault}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.boxShadow = `0 4px 12px ${tab.color}12`; e.currentTarget.style.borderColor = `${tab.color}40`; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = T.borderDefault; } }}>
                  <div className="p-3 rounded-xl shrink-0" style={{ background: active ? `linear-gradient(135deg, ${tab.color}, ${tab.color}BB)` : T.fieldBg, boxShadow: active ? `0 3px 10px ${tab.color}30` : 'none' }}>
                    <tab.icon className="w-6 h-6" style={{ color: active ? '#FFF' : T.textTertiary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-extrabold" style={{ color: active ? tab.color : T.textPrimary }}>{tab.count}</p>
                    <p className="text-sm font-bold" style={{ color: active ? tab.color : T.textSecondary }}>{tab.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: T.textTertiary }}>{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {/* Mobile: compact tabs */}
          <div className="flex gap-2 lg:hidden">
            {([
              { key: 'pending' as TabType, label: 'En attente', count: stats.pending, color: T.accentAmber, icon: Clock },
              { key: 'in_progress' as TabType, label: 'En cours', count: stats.inProgress, color: T.primaryBlue, icon: TrendingUp },
              { key: 'completed' as TabType, label: 'Terminées', count: stats.completed, color: T.accentGreen, icon: CheckCircle },
            ]).map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={active
                    ? { backgroundColor: `${tab.color}15`, color: tab.color, boxShadow: `0 0 0 1.5px ${tab.color}40` }
                    : { color: T.textTertiary }}>
                  <div className="flex items-center gap-1.5">
                    <tab.icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={active
                      ? { backgroundColor: tab.color, color: '#FFF' }
                      : { backgroundColor: T.borderDefault, color: T.textTertiary }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-3 lg:space-y-5">
        {/* Join bar */}
        <div className="rounded-2xl p-3 lg:p-4 flex items-center gap-3" style={{ backgroundColor: `${T.primaryBlue}08`, border: `1px solid ${T.primaryBlue}20` }}>
          <div className="p-2 lg:p-3 rounded-xl" style={{ backgroundColor: `${T.primaryBlue}15` }}>
            <LogIn className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: T.primaryBlue }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm lg:text-base font-semibold" style={{ color: T.textPrimary }}>Rejoindre une mission</p>
            <p className="text-xs lg:text-sm" style={{ color: T.textSecondary }}>Entrez le code reçu par le donneur d'ordre</p>
          </div>
          <button onClick={() => setShowJoinModal(true)}
            className="px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 hover:shadow-md transition"
            style={{ backgroundColor: T.primaryBlue }}>
            <span className="hidden lg:inline">Rejoindre</span>
            <UserPlus className="w-4 h-4 lg:hidden" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl p-3 lg:p-4 bg-white" style={{ border: `1px solid ${T.borderDefault}` }}>
          <div className="flex gap-2 lg:gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5" style={{ color: T.textTertiary }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher une mission..." className="w-full rounded-xl pl-10 lg:pl-12 pr-3 py-2.5 lg:py-3 text-sm lg:text-base outline-none border transition focus:border-[#0066FF]"
                style={{ backgroundColor: T.fieldBg, borderColor: T.borderDefault, color: T.textPrimary }} />
            </div>
            <button onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 p-2.5 lg:px-4 lg:py-2.5 rounded-xl transition" title={showArchived ? 'Masquer archives' : 'Voir archives'}
              style={showArchived
                ? { backgroundColor: `${T.accentAmber}15`, color: T.accentAmber, border: `1.5px solid ${T.accentAmber}60` }
                : { backgroundColor: T.fieldBg, color: T.textTertiary, border: `1px solid ${T.borderDefault}` }}>
              <Archive className="w-4 h-4" />
              <span className="hidden lg:inline text-sm font-medium">{showArchived ? 'Archives' : 'Archives'}</span>
            </button>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: T.fieldBg }}>
              <button onClick={() => setViewMode('grid')} className="p-1.5 lg:p-2 rounded-lg transition"
                style={viewMode === 'grid' ? { backgroundColor: '#FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}>
                <Grid className="w-4 h-4" style={{ color: viewMode === 'grid' ? T.textPrimary : T.textTertiary }} />
              </button>
              <button onClick={() => setViewMode('list')} className="p-1.5 lg:p-2 rounded-lg transition"
                style={viewMode === 'list' ? { backgroundColor: '#FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}>
                <List className="w-4 h-4" style={{ color: viewMode === 'list' ? T.textPrimary : T.textTertiary }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mission Cards ── */}
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-5'
            : 'space-y-2 lg:space-y-0'
        }>
          {filteredMissions.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 lg:py-24 rounded-2xl bg-white" style={{ border: `1px solid ${T.borderDefault}` }}>
              <div className="p-5 rounded-2xl mb-5" style={{ backgroundColor: `${T.primaryTeal}10` }}>
                <Truck className="w-12 h-12 lg:w-16 lg:h-16" style={{ color: T.primaryTeal }} />
              </div>
              <p className="font-semibold text-lg mb-1" style={{ color: T.textPrimary }}>Aucune mission</p>
              <p className="text-sm mb-5" style={{ color: T.textSecondary }}>Créez votre première mission pour commencer</p>
              <Link to="/missions/create" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white hover:shadow-lg transition"
                style={{ backgroundColor: T.primaryTeal }}>
                <Plus className="w-4 h-4" /> Créer une mission
              </Link>
            </div>
          ) : viewMode === 'list' ? (
            <>
              {/* Desktop table header */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-3 text-xs font-semibold rounded-t-xl" style={{ backgroundColor: T.fieldBg, color: T.textTertiary, borderBottom: `1px solid ${T.borderDefault}` }}>
                <div className="col-span-2">Référence</div>
                <div className="col-span-2">Véhicule</div>
                <div className="col-span-3">Itinéraire</div>
                <div className="col-span-1 text-center">Date</div>
                <div className="col-span-1 text-center">Prix</div>
                <div className="col-span-1 text-center">Statut</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {filteredMissions.map((m) => {
                const sc = scfg(m.status);
                return (
                  <React.Fragment key={m.id}>
                    {/* ── Desktop list row ── */}
                    <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center px-5 py-3.5 bg-white hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                      style={{ borderBottom: `1px solid ${T.borderDefault}` }}
                      onClick={() => { setSelectedMission(m); setShowDetailsModal(true); }}>
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                        <span className="text-sm font-bold truncate" style={{ color: T.textPrimary }}>{m.reference}</span>
                        {m.assigned_user_id && m.assigned_user_id !== m.user_id && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${T.primaryBlue}15`, color: T.primaryBlue }}>Reçue</span>
                        )}
                      </div>
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <Car className="w-4 h-4 shrink-0" style={{ color: T.primaryTeal }} />
                        <span className="text-sm truncate" style={{ color: T.textPrimary }}>{m.vehicle_brand} {m.vehicle_model}</span>
                        {m.vehicle_plate && (
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}`, color: T.textSecondary }}>{m.vehicle_plate}</span>
                        )}
                      </div>
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: T.accentGreen }} />
                          <span className="text-xs truncate" style={{ color: T.textSecondary }}>{m.pickup_city || m.pickup_address}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: T.textTertiary }} />
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: T.primaryBlue }} />
                          <span className="text-xs truncate" style={{ color: T.textSecondary }}>{m.delivery_city || m.delivery_address}</span>
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <span className="text-xs" style={{ color: T.textSecondary }}>
                          {new Date(m.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <div className="col-span-1 text-center">
                        {m.price > 0 ? (
                          <span className="text-sm font-bold" style={{ color: T.primaryTeal }}>{m.price.toLocaleString('fr-FR')} €</span>
                        ) : <span className="text-xs" style={{ color: T.textTertiary }}>—</span>}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                      </div>
                      <div className="col-span-2 flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        {m.status === 'pending' && (
                          <button onClick={() => handleStartInspection(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: T.primaryTeal }}>
                            <Play className="w-3 h-3" /> Démarrer
                          </button>
                        )}
                        {m.status === 'in_progress' && (
                          <button onClick={() => handleStartInspection(m)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: T.primaryBlue }}>
                            <TrendingUp className="w-3 h-3" /> Continuer
                          </button>
                        )}
                        {m.status === 'completed' && (
                          <>
                            <button onClick={() => handleViewReport(m.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: T.accentGreen }}>
                              <FileText className="w-3 h-3" /> Rapport
                            </button>
                            <button onClick={() => handleCreateInvoice(m)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: T.accentAmber }}>
                              <Receipt className="w-3 h-3" /> Facture
                            </button>
                          </>
                        )}
                        <button onClick={async () => { try { await generateMissionPDF(m); } catch (e) { console.error(e); } }}
                          className="p-1.5 rounded-lg transition hover:scale-105" style={{ color: T.primaryPurple, backgroundColor: `${T.primaryPurple}10` }} title="PDF">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {m.user_id === user?.id && (
                          <button onClick={() => navigate(`/missions/edit/${m.id}`)}
                            className="p-1.5 rounded-lg transition hover:scale-105" style={{ color: T.primaryBlue, backgroundColor: `${T.primaryBlue}10` }} title="Modifier">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* ── Mobile list card (fallback) ── */}
                    <div className="lg:hidden rounded-2xl overflow-hidden bg-white transition-all hover:shadow-md cursor-pointer"
                      style={{ border: `1px solid ${T.borderDefault}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                      onClick={() => { setSelectedMission(m); setShowDetailsModal(true); }}>
                      <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: `${sc.color}08` }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.color }} />
                        <span className="text-sm font-bold flex-1" style={{ color: T.textPrimary }}>{m.reference}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                        <ChevronRight className="w-4 h-4" style={{ color: T.textTertiary }} />
                      </div>
                      <div className="px-4 pb-3 pt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4" style={{ color: T.primaryTeal }} />
                          <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>{m.vehicle_brand} {m.vehicle_model}</span>
                          {m.vehicle_plate && <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: T.fieldBg, color: T.textSecondary }}>{m.vehicle_plate}</span>}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: T.textSecondary }}>{m.pickup_city || m.pickup_address} → {m.delivery_city || m.delivery_address}</span>
                          {m.price > 0 && <span className="font-bold" style={{ color: T.primaryTeal }}>{m.price.toLocaleString('fr-FR')} €</span>}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          ) : (
            /* ── Grid view cards — Premium design ── */
            filteredMissions.map((m) => {
              const sc = scfg(m.status);
              return (
                <div key={m.id}
                  className="group rounded-2xl overflow-hidden bg-white transition-all duration-200 cursor-pointer"
                  style={{
                    boxShadow: `0 2px 12px ${sc.color}12, 0 1px 4px rgba(0,0,0,0.04)`,
                    border: `1px solid ${T.borderDefault}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 28px ${sc.color}20, 0 2px 8px rgba(0,0,0,0.06)`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 2px 12px ${sc.color}12, 0 1px 4px rgba(0,0,0,0.04)`; e.currentTarget.style.transform = 'translateY(0)'; }}
                  onClick={() => { setSelectedMission(m); setShowDetailsModal(true); }}>

                  <div className="flex">
                    {/* ── Left accent stripe ── */}
                    <div className="w-1.5 lg:w-[5px] shrink-0" style={{ background: `linear-gradient(to bottom, ${sc.color}, ${sc.color}55)` }} />

                    <div className="flex-1 min-w-0">
                      {/* ── Card header ── */}
                      <div className="px-4 lg:px-5 py-3 lg:py-3.5 flex items-center gap-2.5"
                        style={{ background: `linear-gradient(to right, ${sc.color}08, transparent)`, borderBottom: `1px solid ${sc.color}10` }}>
                        {/* Status icon square */}
                        <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                          style={{ background: `linear-gradient(135deg, ${sc.color}, ${sc.color}BB)`, boxShadow: `0 2px 8px ${sc.color}30` }}>
                          {m.status === 'pending'     && <Clock className="w-4 h-4 text-white" />}
                          {(m.status === 'in_progress' || m.status === 'assigned') && <TrendingUp className="w-4 h-4 text-white" />}
                          {m.status === 'completed'   && <CheckCircle className="w-4 h-4 text-white" />}
                          {m.status === 'cancelled'   && <X className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm lg:text-[15px] font-extrabold block tracking-wide" style={{ color: T.textPrimary }}>{m.reference}</span>
                          <span className="text-[10px] lg:text-xs" style={{ color: T.textTertiary }}>
                            {new Date(m.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        {m.assigned_user_id && m.assigned_user_id !== m.user_id && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.primaryBlue}15`, color: T.primaryBlue }}>Reçue</span>
                        )}
                        <span className="text-[10px] lg:text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `linear-gradient(135deg, ${sc.color}18, ${sc.color}0C)`, color: sc.text, border: `1px solid ${sc.color}30` }}>
                          {sc.label}
                        </span>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:bg-gray-100 transition"
                          style={{ backgroundColor: `${T.borderDefault}60` }}>
                          <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition" style={{ color: T.textTertiary }} />
                        </div>
                      </div>

                      <div className="px-4 lg:px-5 pb-4 lg:pb-5 pt-3 space-y-2.5">
                        {/* ── Vehicle row ── */}
                        <div className="flex items-center gap-3 p-2.5 rounded-xl"
                          style={{ background: `linear-gradient(to right, ${T.primaryTeal}08, ${T.primaryTeal}03)`, border: `1px solid ${T.primaryTeal}15` }}>
                          <div className="p-2 rounded-lg shrink-0"
                            style={{ background: `linear-gradient(135deg, ${T.primaryTeal}, ${T.primaryTeal}BB)`, boxShadow: `0 2px 6px ${T.primaryTeal}25` }}>
                            <Car className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm lg:text-[15px] font-bold block" style={{ color: T.textPrimary }}>
                              {m.vehicle_brand} {m.vehicle_model}
                            </span>
                            {m.vehicle_type && <span className="text-[10px] lg:text-xs" style={{ color: T.textTertiary }}>{m.vehicle_type}</span>}
                          </div>
                          {m.vehicle_plate && (
                            <span className="text-xs lg:text-sm font-mono font-extrabold px-2.5 py-1 rounded-lg tracking-wider"
                              style={{ backgroundColor: '#FFF', border: `1.5px solid ${T.borderDefault}`, color: T.textPrimary, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                              {m.vehicle_plate}
                            </span>
                          )}
                        </div>

                        {/* ── Restitution badge ── */}
                        {m.has_restitution && (
                          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                            style={{ background: `linear-gradient(to right, ${T.deepOrange}0D, ${T.deepOrange}06)`, border: `1px solid ${T.deepOrange}25` }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${T.deepOrange}15` }}>
                              <RefreshCw className="w-3.5 h-3.5" style={{ color: T.deepOrange }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold block" style={{ color: T.deepOrange }}>Aller-Retour (Restitution)</span>
                              {(m.restitution_vehicle_brand || m.restitution_vehicle_plate) && (
                                <span className="text-[11px]" style={{ color: `${T.deepOrange}BB` }}>
                                  {m.restitution_vehicle_brand} {m.restitution_vehicle_model}
                                  {m.restitution_vehicle_plate && ` · ${m.restitution_vehicle_plate}`}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ── Route row — vertical timeline ── */}
                        <div className="rounded-xl p-3 lg:p-3.5" style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}` }}>
                          {/* Departure */}
                          <div className="flex items-start gap-2.5">
                            <div className="flex flex-col items-center">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                style={{ background: `linear-gradient(135deg, ${T.accentGreen}, ${T.accentGreen}AA)`, boxShadow: `0 2px 6px ${T.accentGreen}30` }}>
                                <MapPin className="w-3 h-3 text-white" />
                              </div>
                              <div className="w-0.5 h-5 my-1 rounded-full" style={{ background: `linear-gradient(to bottom, ${T.accentGreen}55, ${T.primaryBlue}55)` }} />
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <p className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-0.5" style={{ color: T.accentGreen }}>DÉPART</p>
                              <p className="text-xs lg:text-sm font-semibold" style={{ color: T.textPrimary }}>{m.pickup_city || m.pickup_address}</p>
                              {m.pickup_address && m.pickup_city && <p className="hidden lg:block text-[11px] mt-0.5" style={{ color: T.textTertiary }}>{m.pickup_address}</p>}
                              {m.pickup_contact_name && (
                                <p className="flex items-center gap-1 text-[10px] lg:text-xs mt-1" style={{ color: T.textSecondary }}>
                                  <User className="w-3 h-3" style={{ color: `${T.accentGreen}88` }} />{m.pickup_contact_name}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Arrival */}
                          <div className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, ${T.primaryBlue}AA)`, boxShadow: `0 2px 6px ${T.primaryBlue}30` }}>
                              <MapPinned className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-extrabold tracking-[1.5px] uppercase mb-0.5" style={{ color: T.primaryBlue }}>ARRIVÉE</p>
                              <p className="text-xs lg:text-sm font-semibold" style={{ color: T.textPrimary }}>{m.delivery_city || m.delivery_address}</p>
                              {m.delivery_address && m.delivery_city && <p className="hidden lg:block text-[11px] mt-0.5" style={{ color: T.textTertiary }}>{m.delivery_address}</p>}
                              {m.delivery_contact_name && (
                                <p className="flex items-center gap-1 text-[10px] lg:text-xs mt-1" style={{ color: T.textSecondary }}>
                                  <User className="w-3 h-3" style={{ color: `${T.primaryBlue}88` }} />{m.delivery_contact_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── Meta rows (mandataire, driver) ── */}
                        {((m.mandataire_name || m.mandataire_company) || (m.assigned_user_id && driverNames[m.assigned_user_id])) && (
                          <div className="flex flex-wrap gap-2">
                            {(m.mandataire_name || m.mandataire_company) && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryPurple}08` }}>
                                <Building2 className="w-3.5 h-3.5" style={{ color: T.primaryPurple }} />
                                <span className="text-xs font-semibold" style={{ color: T.primaryPurple }}>{m.mandataire_name}{m.mandataire_company ? ` · ${m.mandataire_company}` : ''}</span>
                              </div>
                            )}
                            {m.assigned_user_id && driverNames[m.assigned_user_id] && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryBlue}08` }}>
                                <User className="w-3.5 h-3.5" style={{ color: T.primaryBlue }} />
                                <span className="text-xs font-semibold" style={{ color: T.primaryBlue }}>{driverNames[m.assigned_user_id]}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Price row ── */}
                        {m.price > 0 && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{ background: `linear-gradient(to right, ${T.accentGreen}0A, ${T.primaryTeal}05)`, border: `1px solid ${T.accentGreen}18` }}>
                            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${T.accentGreen}15` }}>
                              <DollarSign className="w-3.5 h-3.5" style={{ color: T.accentGreen }} />
                            </div>
                            <span className="text-xs flex-1" style={{ color: T.textSecondary }}>Prix</span>
                            <span className="text-base lg:text-lg font-extrabold tracking-wide" style={{ color: T.accentGreen }}>{m.price.toLocaleString('fr-FR')} €</span>
                          </div>
                        )}

                        {/* ── Action buttons ── */}
                        <div className="flex flex-wrap gap-1.5 lg:gap-2 pt-1.5" onClick={e => e.stopPropagation()}>
                          {m.status === 'pending' && (
                            <button onClick={() => handleStartInspection(m)}
                              className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                              style={{ background: `linear-gradient(135deg, ${T.primaryTeal}, #0F9D7A)`, boxShadow: `0 3px 10px ${T.primaryTeal}30` }}>
                              <Play className="w-3.5 h-3.5" /> Démarrer
                            </button>
                          )}
                          {m.status === 'in_progress' && (
                            <>
                              <button onClick={() => handleStartInspection(m)}
                                className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, #0052CC)`, boxShadow: `0 3px 10px ${T.primaryBlue}30` }}>
                                <TrendingUp className="w-3.5 h-3.5" /> Continuer
                              </button>
                              <button onClick={() => handleCompleteMission(m)}
                                className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                                style={{
                                  background: hasDepartureInspection(m.id) && hasArrivalInspection(m.id)
                                    ? `linear-gradient(135deg, ${T.accentGreen}, #059669)`
                                    : T.textTertiary,
                                  boxShadow: hasDepartureInspection(m.id) && hasArrivalInspection(m.id) ? `0 3px 10px ${T.accentGreen}30` : 'none',
                                }}>
                                <CheckCircle className="w-3.5 h-3.5" /> Terminer
                              </button>
                            </>
                          )}
                          {m.status === 'completed' && (
                            <>
                              <button onClick={() => handleViewReport(m.id)}
                                className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${T.primaryBlue}, #0052CC)`, boxShadow: `0 3px 10px ${T.primaryBlue}30` }}>
                                <FileText className="w-3.5 h-3.5" /> Rapport
                              </button>
                              <button onClick={() => handleCreateInvoice(m)}
                                className="flex items-center gap-1.5 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${T.accentGreen}, #059669)`, boxShadow: `0 3px 10px ${T.accentGreen}30` }}>
                                <Receipt className="w-3.5 h-3.5" /> Facture
                              </button>
                            </>
                          )}
                          {/* Secondary actions */}
                          <div className="flex gap-1 lg:gap-1.5 ml-auto">
                            <button onClick={async () => { try { await generateMissionPDF(m); } catch (e) { console.error(e); } }}
                              className="p-1.5 lg:p-2 rounded-lg transition-all hover:scale-110 hover:shadow-sm" style={{ color: T.primaryPurple, backgroundColor: `${T.primaryPurple}10` }}
                              title="PDF">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            {m.user_id === user?.id && (
                              <>
                                <button onClick={() => navigate(`/missions/edit/${m.id}`)}
                                  className="p-1.5 lg:p-2 rounded-lg transition-all hover:scale-110 hover:shadow-sm" style={{ color: T.primaryBlue, backgroundColor: `${T.primaryBlue}10` }}
                                  title="Modifier">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setSelectedMission(m); setShowShareCodeModal(true); }}
                                  className="p-1.5 lg:p-2 rounded-lg transition-all hover:scale-110 hover:shadow-sm" style={{ color: T.primaryIndigo, backgroundColor: `${T.primaryIndigo}10` }}
                                  title="Partager">
                                  <Users className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleArchiveMission(m.id, !m.archived)}
                                  className="p-1.5 lg:p-2 rounded-lg transition-all hover:scale-110 hover:shadow-sm" style={{ color: T.accentAmber, backgroundColor: `${T.accentAmber}10` }}
                                  title={m.archived ? 'Restaurer' : 'Archiver'}>
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteMission(m.id)}
                                  className="p-1.5 lg:p-2 rounded-lg transition-all hover:scale-110 hover:shadow-sm" style={{ color: T.accentRed, backgroundColor: `${T.accentRed}10` }}
                                  title="Supprimer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {m.status === 'in_progress' && (
                              <button onClick={() => navigate(`/missions/${m.id}/tracking`)}
                                className="p-1.5 lg:p-2 rounded-lg transition-all hover:scale-110 hover:shadow-sm" style={{ color: T.primaryTeal, backgroundColor: `${T.primaryTeal}10` }}
                                title="GPS Tracking">
                                <Navigation className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════
         DETAIL MODAL (PremiumTheme)
         ═══════════════════════════════════════ */}
      {showDetailsModal && selectedMission && (() => {
        const sm = selectedMission;
        const sc = scfg(sm.status);
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 lg:p-8" onClick={() => { setShowDetailsModal(false); setSelectedMission(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl lg:max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 rounded-t-2xl" style={{ borderColor: T.borderDefault }}>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setShowDetailsModal(false); setSelectedMission(null); }}
                    className="p-2 rounded-xl hover:bg-[#F8FAFC] transition">
                    <X className="w-5 h-5" style={{ color: T.textSecondary }} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold" style={{ color: T.textPrimary }}>{sm.reference}</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>{sc.label}</span>
                      {sm.has_restitution && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.deepOrange}15`, color: T.deepOrange }}>Restitution</span>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: T.textSecondary }}>
                      {sm.vehicle_brand} {sm.vehicle_model}{sm.vehicle_plate ? ` · ${sm.vehicle_plate}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Share Code */}
                {sm.share_code && sm.user_id === user?.id && (
                  <div className="rounded-2xl p-4" style={{ backgroundColor: `${T.primaryIndigo}0D`, border: `1px solid ${T.primaryIndigo}30` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4" style={{ color: T.primaryIndigo }} />
                      <span className="text-sm font-bold" style={{ color: T.primaryIndigo }}>Code de mission</span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: T.textSecondary }}>Partagez ce code pour qu'un chauffeur rejoigne</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-xl px-4 py-2.5 text-center" style={{ backgroundColor: `${T.primaryIndigo}10`, border: `1px solid ${T.primaryIndigo}30` }}>
                        <span className="text-xl font-bold tracking-widest" style={{ color: T.primaryIndigo }}>{sm.share_code}</span>
                      </div>
                      <button onClick={() => handleCopyShareCode(sm.share_code!)} className="p-2.5 rounded-xl" style={{ backgroundColor: `${T.primaryIndigo}15` }}>
                        <Copy className="w-4 h-4" style={{ color: T.primaryIndigo }} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Driver */}
                <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.primaryBlue}20` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryBlue}15` }}>
                      <User className="w-4 h-4" style={{ color: T.primaryBlue }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Chauffeur</span>
                  </div>
                  {sm.assigned_user_id && driverNames[sm.assigned_user_id] ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${T.primaryBlue}15` }}>
                        <User className="w-4 h-4" style={{ color: T.primaryBlue }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{driverNames[sm.assigned_user_id]}</p>
                        <p className="text-xs" style={{ color: T.textSecondary }}>Chauffeur actuel</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: T.textSecondary }}>Aucun chauffeur assigné</p>
                  )}
                  {sm.user_id === user?.id && sm.assigned_user_id && sm.status !== 'completed' && (
                    <button onClick={() => handleChangeDriver(sm)}
                      className="mt-3 w-full py-2 rounded-xl text-sm font-semibold transition" style={{ border: `1.5px solid ${T.accentAmber}`, color: T.accentAmber }}>
                      Changer de chauffeur
                    </button>
                  )}
                </div>

                {/* Inspections */}
                <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.primaryTeal}20` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryTeal}15` }}>
                      <CheckCircle className="w-4 h-4" style={{ color: T.primaryTeal }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Inspections</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Inspection départ', done: hasDepartureInspection(sm.id), handler: () => handleViewDepartureReport(sm.id), color: T.accentGreen },
                      { label: 'Inspection arrivée', done: hasArrivalInspection(sm.id), handler: () => handleViewArrivalReport(sm.id), color: T.primaryBlue },
                    ].map(({ label, done, handler, color }) => (
                      <div key={label} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: done ? `${color}15` : T.fieldBg }}>
                          {done ? <CheckCircle2 className="w-4 h-4" style={{ color }} /> : <CircleDot className="w-4 h-4" style={{ color: T.textTertiary }} />}
                        </div>
                        <span className="flex-1 text-sm" style={{ color: done ? T.textPrimary : T.textTertiary, textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                        <span className="text-xs font-semibold" style={{ color: done ? T.accentGreen : T.accentAmber }}>{done ? 'Fait' : 'À faire'}</span>
                        {done && (
                          <button onClick={handler} className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: `${T.primaryTeal}10`, color: T.primaryTeal }}>Rapport</button>
                        )}
                      </div>
                    ))}
                    {sm.has_restitution && (
                      <div className="pt-2 mt-2 space-y-2.5" style={{ borderTop: `1px solid ${T.deepOrange}20` }}>
                        <span className="text-xs font-bold" style={{ color: T.deepOrange }}>Restitution</span>
                        {[
                          { label: 'Départ restitution', done: hasRestitutionDepartureInspection(sm.id) },
                          { label: 'Arrivée restitution', done: hasRestitutionArrivalInspection(sm.id) },
                        ].map(({ label, done }) => (
                          <div key={label} className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: done ? `${T.deepOrange}15` : T.fieldBg }}>
                              {done ? <CheckCircle2 className="w-4 h-4" style={{ color: T.deepOrange }} /> : <CircleDot className="w-4 h-4" style={{ color: T.textTertiary }} />}
                            </div>
                            <span className="flex-1 text-sm" style={{ color: done ? T.textPrimary : T.textTertiary }}>{label}</span>
                            <span className="text-xs font-semibold" style={{ color: done ? T.deepOrange : T.accentAmber }}>{done ? 'Fait' : 'À faire'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mandataire */}
                {(sm.mandataire_name || sm.mandataire_company) && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.primaryPurple}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryPurple}15` }}>
                        <Building2 className="w-4 h-4" style={{ color: T.primaryPurple }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Mandataire</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>{sm.mandataire_name || '—'}</p>
                    {sm.mandataire_company && <p className="text-xs mt-1" style={{ color: T.textSecondary }}>{sm.mandataire_company}</p>}
                  </div>
                )}

                {/* Vehicle */}
                <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.primaryTeal}20` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryTeal}15` }}>
                      <Car className="w-4 h-4" style={{ color: T.primaryTeal }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: T.textPrimary }}>{sm.has_restitution ? 'Véhicule Aller' : 'Véhicule'}</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: Car, label: 'Marque / Modèle', val: `${sm.vehicle_brand} ${sm.vehicle_model}` },
                      { icon: Truck, label: 'Type', val: getVehicleTypeLabel(sm.vehicle_type) },
                      { icon: Hash, label: 'Immatriculation', val: sm.vehicle_plate },
                      { icon: Hash, label: 'N° VIN', val: sm.vehicle_vin },
                    ].filter(r => r.val).map(r => (
                      <div key={r.label} className="flex items-center gap-3">
                        <r.icon className="w-4 h-4" style={{ color: T.textTertiary }} />
                        <span className="text-xs flex-1" style={{ color: T.textSecondary }}>{r.label}</span>
                        <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Itinerary */}
                <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.accentGreen}20` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.accentGreen}15` }}>
                      <Navigation className="w-4 h-4" style={{ color: T.accentGreen }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Itinéraire</span>
                  </div>
                  {/* Pickup */}
                  <div className="rounded-xl p-3 mb-2" style={{ backgroundColor: `${T.accentGreen}08`, border: `1px solid ${T.accentGreen}20` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.accentGreen }} />
                      <span className="text-[10px] font-bold tracking-wider" style={{ color: T.accentGreen }}>ENLÈVEMENT</span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: T.textPrimary }}>{sm.pickup_address}</p>
                    {sm.pickup_date && <p className="text-xs mb-2" style={{ color: T.textSecondary }}>{new Date(sm.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${T.accentGreen}06` }}>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" style={{ color: T.accentGreen }} />
                        <span className="text-xs font-medium" style={{ color: T.textPrimary }}>{sm.pickup_contact_name || 'Non renseigné'}</span>
                      </div>
                      {sm.pickup_contact_phone && (
                        <a href={`tel:${sm.pickup_contact_phone}`} className="flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${T.accentGreen}10`, border: `1px solid ${T.accentGreen}30` }}>
                          <Phone className="w-3.5 h-3.5" style={{ color: T.accentGreen }} />
                          <span className="text-xs font-bold" style={{ color: T.textPrimary }}>{sm.pickup_contact_phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 my-1">
                    <div className="w-px h-5" style={{ background: `linear-gradient(to bottom, ${T.accentGreen}, ${T.primaryBlue})` }} />
                  </div>
                  {/* Delivery */}
                  <div className="rounded-xl p-3" style={{ backgroundColor: `${T.primaryBlue}08`, border: `1px solid ${T.primaryBlue}20` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.primaryBlue }} />
                      <span className="text-[10px] font-bold tracking-wider" style={{ color: T.primaryBlue }}>LIVRAISON</span>
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: T.textPrimary }}>{sm.delivery_address}</p>
                    {sm.delivery_date && <p className="text-xs mb-2" style={{ color: T.textSecondary }}>{new Date(sm.delivery_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                    <div className="rounded-lg p-2" style={{ backgroundColor: `${T.primaryBlue}06` }}>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5" style={{ color: T.primaryBlue }} />
                        <span className="text-xs font-medium" style={{ color: T.textPrimary }}>{sm.delivery_contact_name || 'Non renseigné'}</span>
                      </div>
                      {sm.delivery_contact_phone && (
                        <a href={`tel:${sm.delivery_contact_phone}`} className="flex items-center gap-2 mt-1.5 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryBlue}10`, border: `1px solid ${T.primaryBlue}30` }}>
                          <Phone className="w-3.5 h-3.5" style={{ color: T.primaryBlue }} />
                          <span className="text-xs font-bold" style={{ color: T.textPrimary }}>{sm.delivery_contact_phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Restitution */}
                {sm.has_restitution && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${T.deepOrange}30` }}>
                    <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: `${T.deepOrange}10` }}>
                      <RefreshCw className="w-4 h-4" style={{ color: T.deepOrange }} />
                      <span className="text-sm font-bold" style={{ color: T.deepOrange }}>Restitution (Retour)</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="rounded-xl p-3" style={{ backgroundColor: `${T.deepOrange}08`, border: `1px solid ${T.deepOrange}20` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="w-3.5 h-3.5" style={{ color: T.deepOrange }} />
                          <span className="text-xs font-bold" style={{ color: T.deepOrange }}>Véhicule Retour</span>
                        </div>
                        <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                          {sm.restitution_vehicle_brand || sm.vehicle_brand} {sm.restitution_vehicle_model || sm.vehicle_model}
                        </p>
                        {(sm.restitution_vehicle_plate || sm.vehicle_plate) && (
                          <span className="inline-block mt-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}` }}>
                            {sm.restitution_vehicle_plate || sm.vehicle_plate}
                          </span>
                        )}
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: `${T.deepOrange}06`, border: `1px solid ${T.deepOrange}15` }}>
                        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.deepOrange }} /><span className="text-[10px] font-bold tracking-wider" style={{ color: T.deepOrange }}>ENLÈVEMENT RETOUR</span></div>
                        <p className="text-sm" style={{ color: T.textPrimary }}>{sm.restitution_pickup_address || sm.delivery_address || '—'}</p>
                        {sm.restitution_pickup_date && <p className="text-xs mt-1" style={{ color: T.textSecondary }}>{new Date(sm.restitution_pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                      <div className="rounded-xl p-3" style={{ backgroundColor: `${T.accentRed}06`, border: `1px solid ${T.accentRed}15` }}>
                        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: T.accentRed }} /><span className="text-[10px] font-bold tracking-wider" style={{ color: T.accentRed }}>LIVRAISON RETOUR</span></div>
                        <p className="text-sm" style={{ color: T.textPrimary }}>{sm.restitution_delivery_address || sm.pickup_address || '—'}</p>
                        {sm.restitution_delivery_date && <p className="text-xs mt-1" style={{ color: T.textSecondary }}>{new Date(sm.restitution_delivery_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Price */}
                {sm.price > 0 && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.accentAmber}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.accentAmber}15` }}>
                        <DollarSign className="w-4 h-4" style={{ color: T.accentAmber }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Prix</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: T.primaryTeal }}>{sm.price.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                  </div>
                )}

                {/* Notes */}
                {sm.notes && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.borderDefault}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" style={{ color: T.textSecondary }} />
                      <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Notes</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: T.textSecondary }}>{sm.notes}</p>
                  </div>
                )}

                {/* Special Instructions */}
                {sm.special_instructions && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.accentAmber}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: T.accentAmber }} />
                      <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Instructions spéciales</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: T.textSecondary }}>{sm.special_instructions}</p>
                  </div>
                )}

                {/* GPS Tracking */}
                {sm.status === 'in_progress' && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.primaryTeal}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryTeal}15` }}>
                        <Navigation className="w-4 h-4" style={{ color: T.primaryTeal }} />
                      </div>
                      <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tracking GPS</span>
                    </div>
                    <button onClick={() => { setShowDetailsModal(false); navigate(`/missions/${sm.id}/tracking`); }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition"
                      style={{ backgroundColor: T.primaryTeal }}>
                      Voir sur la carte
                    </button>
                  </div>
                )}

                {/* Client */}
                {(sm.client_name || sm.client_phone || sm.client_email) && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: `1px solid ${T.borderDefault}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" style={{ color: T.textSecondary }} />
                      <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Client</span>
                    </div>
                    <div className="space-y-1.5">
                      {sm.client_name && <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" style={{ color: T.textTertiary }} /><span className="text-sm" style={{ color: T.textPrimary }}>{sm.client_name}</span></div>}
                      {sm.client_phone && <a href={`tel:${sm.client_phone}`} className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" style={{ color: T.textTertiary }} /><span className="text-sm" style={{ color: T.primaryBlue }}>{sm.client_phone}</span></a>}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="sticky bottom-0 bg-white border-t p-4 rounded-b-2xl" style={{ borderColor: T.borderDefault }}>
                {sm.status === 'pending' && (
                  <button onClick={() => { setShowDetailsModal(false); handleStartInspection(sm); }}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: T.primaryTeal }}>
                    Démarrer la mission
                  </button>
                )}
                {sm.status === 'in_progress' && (
                  <div className="flex gap-3">
                    <button onClick={() => { setShowDetailsModal(false); handleStartInspection(sm); }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: T.primaryBlue }}>
                      Continuer Inspection
                    </button>
                    <button onClick={() => handleCompleteMission(sm)}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: hasDepartureInspection(sm.id) && hasArrivalInspection(sm.id) ? T.accentGreen : T.textTertiary }}>
                      Terminer
                    </button>
                  </div>
                )}
                {sm.status === 'completed' && (
                  <div className="flex gap-3">
                    <button onClick={() => { setShowDetailsModal(false); handleViewReport(sm.id); }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: T.primaryBlue }}>
                      Voir le rapport
                    </button>
                    <button onClick={() => { setShowDetailsModal(false); handleCreateInvoice(sm); }}
                      className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: T.accentGreen }}>
                      Créer facture
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== OTHER MODALS ===== */}
      {showJoinModal && (
        <JoinMissionModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onSuccess={() => { setShowJoinModal(false); loadData(); }} />
      )}
      {showShareCodeModal && selectedMission && (
        <ShareCodeModal mission={selectedMission} onClose={() => { setShowShareCodeModal(false); setSelectedMission(null); }} />
      )}
    </div>
  );
}
