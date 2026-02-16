// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
// Mes Convoyages — DESIGN IDENTIQUE AU FLUTTER PremiumTheme
import { useEffect, useState } from 'react';
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
      let st = m.status;
      if (!st || st === 'pending') {
        const mi = loadedInsp.filter(i => i.mission_id === m.id);
        const hd = mi.some(i => i.inspection_type === 'departure');
        const ha = mi.some(i => i.inspection_type === 'arrival');
        st = hd && ha ? 'completed' : hd ? 'in_progress' : 'pending';
      }
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
      if (error) throw error; await loadMissions(); alert('✅ Mission terminée avec succès !');
    } catch (e) { console.error(e); alert('❌ Erreur lors de la mise à jour'); }
  };

  const handleCreateInvoice = (mission: Mission) => navigate('/billing', { state: { fromMission: mission } });

  const handleDeleteMission = async (missionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) return;
    try { const { error } = await supabase.from('missions').delete().eq('id', missionId); if (error) throw error; await loadMissions(); alert('✅ Mission supprimée');
    } catch (e) { console.error(e); alert('❌ Erreur lors de la suppression'); }
  };

  const handleArchiveMission = async (missionId: string, archive: boolean) => {
    try { const { error } = await supabase.from('missions').update({ archived: archive }).eq('id', missionId); if (error) throw error; await loadMissions(); alert(archive ? '✅ Mission archivée' : '✅ Mission restaurée');
    } catch (e) { console.error(e); alert('❌ Erreur'); }
  };

  const handleChangeDriver = async (mission: Mission) => {
    try { const { error } = await supabase.from('missions').update({ assigned_user_id: null, driver_id: null }).eq('id', mission.id); if (error) throw error; await loadMissions(); alert('✅ Chauffeur retiré.');
    } catch (e) { console.error(e); alert('❌ Erreur'); }
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
    } catch (e) { console.error(e); alert('❌ Erreur rapport'); }
  };

  const handleCopyShareCode = (code: string) => { navigator.clipboard.writeText(code); alert('✅ Code copié !'); };

  const getVehicleTypeLabel = (t?: string) => { switch (t) { case 'VL': return 'VL'; case 'VU': return 'VU'; case 'PL': return 'PL'; default: return t || 'VL'; } };

  // Filtered data
  const filteredMissions = missions
    .filter(m => {
      const ms = (m.reference + m.vehicle_brand + m.vehicle_model + (m.mandataire_name || '') + (m.vehicle_plate || '')).toLowerCase().includes(searchTerm.toLowerCase());
      const mf = statusFilter === 'all' || m.status === statusFilter;
      return ms && mf && m.status === activeTab;
    })
    .sort((a, b) => new Date(b.updated_at || b.delivery_date || b.created_at).getTime() - new Date(a.updated_at || a.delivery_date || a.created_at).getTime());

  const stats = {
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
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
     RENDER — Flutter PremiumTheme Design
     ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ backgroundColor: T.lightBg }}>
      {/* ── Sticky AppBar (identique Flutter) ── */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
          <h1 className="text-lg lg:text-xl font-bold" style={{ color: T.textPrimary }}>Mes Convoyages</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition"
              style={{ backgroundColor: `${T.primaryBlue}0D`, color: T.primaryBlue }}>
              <LogIn className="w-4 h-4" /> Rejoindre
            </button>
            <Link to="/missions/create"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white transition"
              style={{ backgroundColor: T.primaryTeal }}>
              <Plus className="w-4 h-4" /> Nouvelle
            </Link>
          </div>
        </div>

        {/* ── 3 Tabs (identique Flutter) ── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-3">
          <div className="flex gap-2">
            {([
              { key: 'pending' as TabType, label: 'En attente', count: stats.pending, color: T.accentAmber, icon: Clock },
              { key: 'in_progress' as TabType, label: 'En cours', count: stats.inProgress, color: T.primaryBlue, icon: TrendingUp },
              { key: 'completed' as TabType, label: 'Terminées', count: stats.completed, color: T.accentGreen, icon: CheckCircle },
            ]).map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-2.5 lg:py-3 rounded-xl text-xs lg:text-sm font-semibold transition-all"
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
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6 space-y-3 lg:space-y-4">
        {/* Join bar (identique Flutter) */}
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ backgroundColor: `${T.primaryBlue}08`, border: `1px solid ${T.primaryBlue}20` }}>
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${T.primaryBlue}15` }}>
            <LogIn className="w-5 h-5" style={{ color: T.primaryBlue }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: T.textPrimary }}>Rejoindre une mission</p>
            <p className="text-xs" style={{ color: T.textSecondary }}>Entrez le code reçu</p>
          </div>
          <button onClick={() => setShowJoinModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: T.primaryBlue }}>
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="rounded-2xl p-3 bg-white" style={{ border: `1px solid ${T.borderDefault}` }}>
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.textTertiary }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher..." className="w-full rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none border transition focus:border-[#0066FF]"
                style={{ backgroundColor: T.fieldBg, borderColor: T.borderDefault, color: T.textPrimary }} />
            </div>
            <button onClick={() => setShowArchived(!showArchived)}
              className="p-2.5 rounded-xl transition" title={showArchived ? 'Masquer archives' : 'Voir archives'}
              style={showArchived
                ? { backgroundColor: `${T.accentAmber}15`, color: T.accentAmber, border: `1.5px solid ${T.accentAmber}60` }
                : { backgroundColor: T.fieldBg, color: T.textTertiary, border: `1px solid ${T.borderDefault}` }}>
              <Archive className="w-4 h-4" />
            </button>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: T.fieldBg }}>
              <button onClick={() => setViewMode('grid')} className="p-1.5 rounded-lg transition"
                style={viewMode === 'grid' ? { backgroundColor: '#FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}>
                <Grid className="w-4 h-4" style={{ color: viewMode === 'grid' ? T.textPrimary : T.textTertiary }} />
              </button>
              <button onClick={() => setViewMode('list')} className="p-1.5 rounded-lg transition"
                style={viewMode === 'list' ? { backgroundColor: '#FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : {}}>
                <List className="w-4 h-4" style={{ color: viewMode === 'list' ? T.textPrimary : T.textTertiary }} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mission Cards (identique Flutter MissionTile) ── */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4' : 'space-y-3 max-w-4xl'}>
          {filteredMissions.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 rounded-2xl bg-white" style={{ border: `1px solid ${T.borderDefault}` }}>
              <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: `${T.primaryTeal}10` }}>
                <Truck className="w-10 h-10" style={{ color: T.primaryTeal }} />
              </div>
              <p className="font-medium mb-1" style={{ color: T.textPrimary }}>Aucune mission</p>
              <p className="text-sm mb-4" style={{ color: T.textSecondary }}>Créez votre première mission</p>
              <Link to="/missions/create" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: T.primaryTeal }}>
                <Plus className="w-4 h-4" /> Créer une mission
              </Link>
            </div>
          ) : (
            filteredMissions.map((m) => {
              const sc = scfg(m.status);
              return (
                <div key={m.id} className="rounded-2xl overflow-hidden bg-white transition-all hover:shadow-md cursor-pointer"
                  style={{ border: `1px solid ${T.borderDefault}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onClick={() => { setSelectedMission(m); setShowDetailsModal(true); }}>

                  {/* ── Header teinté (identique Flutter MissionTile) ── */}
                  <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: `${sc.color}08` }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.color }} />
                    <span className="text-sm font-bold flex-1" style={{ color: T.textPrimary }}>{m.reference}</span>
                    {m.assigned_user_id && m.assigned_user_id !== m.user_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.primaryBlue}15`, color: T.primaryBlue }}>Reçue</span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                      {sc.label}
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ color: T.textTertiary }} />
                  </div>

                  <div className="px-4 pb-4 pt-2 space-y-2.5">
                    {/* ── Vehicle row (identique Flutter) ── */}
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryTeal}15` }}>
                        <Car className="w-4 h-4" style={{ color: T.primaryTeal }} />
                      </div>
                      <span className="text-sm font-semibold flex-1" style={{ color: T.textPrimary }}>
                        {m.vehicle_brand} {m.vehicle_model}
                      </span>
                      {m.vehicle_plate && (
                        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}`, color: T.textSecondary }}>
                          {m.vehicle_plate}
                        </span>
                      )}
                    </div>

                    {/* ── Restitution badge (identique Flutter) ── */}
                    {m.has_restitution && (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ backgroundColor: `${T.deepOrange}0D`, border: `1px solid ${T.deepOrange}30` }}>
                        <RefreshCw className="w-3.5 h-3.5" style={{ color: T.deepOrange }} />
                        <span className="text-xs font-semibold" style={{ color: T.deepOrange }}>
                          Restitution
                          {(m.restitution_vehicle_brand || m.restitution_vehicle_plate) && (
                            <span className="font-normal ml-1" style={{ color: `${T.deepOrange}CC` }}>
                              {m.restitution_vehicle_brand} {m.restitution_vehicle_model}
                              {m.restitution_vehicle_plate && ` · ${m.restitution_vehicle_plate}`}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* ── Route row (identique Flutter grey container) ── */}
                    <div className="rounded-xl p-2.5" style={{ backgroundColor: T.fieldBg }}>
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: T.accentGreen }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: T.textPrimary }}>{m.pickup_city || m.pickup_address}</p>
                          {m.pickup_contact_name && <p className="text-[10px] truncate" style={{ color: T.textTertiary }}>{m.pickup_contact_name}</p>}
                        </div>
                      </div>
                      <div className="ml-1 w-px h-3 mb-1.5" style={{ backgroundColor: T.borderDefault }} />
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: T.primaryBlue }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: T.textPrimary }}>{m.delivery_city || m.delivery_address}</p>
                          {m.delivery_contact_name && <p className="text-[10px] truncate" style={{ color: T.textTertiary }}>{m.delivery_contact_name}</p>}
                        </div>
                      </div>
                    </div>

                    {/* ── Mandataire row (identique Flutter purple row) ── */}
                    {(m.mandataire_name || m.mandataire_company) && (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md" style={{ backgroundColor: `${T.primaryPurple}15` }}>
                          <Building2 className="w-3.5 h-3.5" style={{ color: T.primaryPurple }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: T.primaryPurple }}>{m.mandataire_name}{m.mandataire_company ? ` · ${m.mandataire_company}` : ''}</span>
                      </div>
                    )}

                    {/* ── Driver row (identique Flutter) ── */}
                    {m.assigned_user_id && driverNames[m.assigned_user_id] && (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md" style={{ backgroundColor: `${T.primaryBlue}15` }}>
                          <User className="w-3.5 h-3.5" style={{ color: T.primaryBlue }} />
                        </div>
                        <span className="text-xs font-medium" style={{ color: T.primaryBlue }}>{driverNames[m.assigned_user_id]}</span>
                      </div>
                    )}

                    {/* ── Date + Price row (identique Flutter) ── */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
                        <span className="text-xs" style={{ color: T.textSecondary }}>
                          {new Date(m.pickup_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </span>
                      </div>
                      {m.price > 0 && (
                        <span className="text-sm font-bold" style={{ color: T.primaryTeal }}>{m.price.toLocaleString('fr-FR')} €</span>
                      )}
                    </div>

                    {/* ── Action buttons (identique Flutter, contextual) ── */}
                    <div className="flex flex-wrap gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                      {m.status === 'pending' && (
                        <button onClick={() => handleStartInspection(m)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition"
                          style={{ backgroundColor: T.primaryTeal }}>
                          <Play className="w-3.5 h-3.5" /> Démarrer
                        </button>
                      )}
                      {m.status === 'in_progress' && (
                        <>
                          <button onClick={() => handleStartInspection(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ backgroundColor: T.primaryBlue }}>
                            <TrendingUp className="w-3.5 h-3.5" /> Continuer
                          </button>
                          <button onClick={() => handleCompleteMission(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ backgroundColor: hasDepartureInspection(m.id) && hasArrivalInspection(m.id) ? T.accentGreen : T.textTertiary }}>
                            <CheckCircle className="w-3.5 h-3.5" /> Terminer
                          </button>
                        </>
                      )}
                      {m.status === 'completed' && (
                        <>
                          <button onClick={() => handleViewReport(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ backgroundColor: T.accentGreen }}>
                            <FileText className="w-3.5 h-3.5" /> Rapport
                          </button>
                          <button onClick={() => handleCreateInvoice(m)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                            style={{ backgroundColor: T.accentAmber }}>
                            <Receipt className="w-3.5 h-3.5" /> Facture
                          </button>
                        </>
                      )}
                      {/* Secondary actions */}
                      <button onClick={async () => { try { await generateMissionPDF(m); } catch (e) { console.error(e); } }}
                        className="p-1.5 rounded-lg transition" style={{ color: T.primaryPurple, backgroundColor: `${T.primaryPurple}10` }}
                        title="PDF">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      {m.user_id === user?.id && (
                        <>
                          <button onClick={() => navigate(`/missions/edit/${m.id}`)}
                            className="p-1.5 rounded-lg transition" style={{ color: T.primaryBlue, backgroundColor: `${T.primaryBlue}10` }}
                            title="Modifier">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setSelectedMission(m); setShowShareCodeModal(true); }}
                            className="p-1.5 rounded-lg transition" style={{ color: T.primaryIndigo, backgroundColor: `${T.primaryIndigo}10` }}
                            title="Partager">
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleArchiveMission(m.id, !m.archived)}
                            className="p-1.5 rounded-lg transition" style={{ color: T.accentAmber, backgroundColor: `${T.accentAmber}10` }}
                            title={m.archived ? 'Restaurer' : 'Archiver'}>
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteMission(m.id)}
                            className="p-1.5 rounded-lg transition" style={{ color: T.accentRed, backgroundColor: `${T.accentRed}10` }}
                            title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {m.status === 'in_progress' && (
                        <button onClick={() => navigate(`/missions/${m.id}/tracking`)}
                          className="p-1.5 rounded-lg transition" style={{ color: T.primaryTeal, backgroundColor: `${T.primaryTeal}10` }}
                          title="GPS Tracking">
                          <Navigation className="w-3.5 h-3.5" />
                        </button>
                      )}
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
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailsModal(false); setSelectedMission(null); }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
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
