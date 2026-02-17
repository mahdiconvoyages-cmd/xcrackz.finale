// @ts-nocheck - Planning Network Optimization - Réseau de convoyeurs
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Route, MapPin, Clock, Users, TrendingUp, Plus, Search, Filter,
  Calendar, Navigation, Zap, Bell, ChevronRight, ChevronDown, X,
  Check, AlertCircle, Truck, Leaf, BarChart3, Share2, Eye, Trash2,
  RefreshCw, ArrowRight, Star, Target, Map as MapIcon, MessageCircle, Send, User
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Planning {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  planning_date: string;
  start_time: string;
  end_time: string;
  flexibility_minutes: number;
  origin_city: string;
  origin_postal_code: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_city: string;
  destination_postal_code: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  status: string;
  is_return_trip: boolean;
  return_city?: string | null;
  return_postal_code?: string | null;
  return_lat?: number | null;
  return_lng?: number | null;
  vehicle_category: string;
  notes: string | null;
  created_at: string;
  expires_at?: string | null;
  waypoints?: Waypoint[];
  // Joined
  profile?: { first_name: string; last_name: string; company_name: string; avatar_url: string };
}

interface Waypoint {
  id: string;
  planning_id: string;
  city: string;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  arrival_time: string | null;
  sort_order: number;
}

interface Match {
  id: string;
  planning_a_id: string;
  planning_b_id: string;
  user_a_id: string;
  user_b_id: string;
  match_score: number;
  match_type: string;
  distance_km: number;
  time_overlap_minutes: number;
  potential_km_saved: number;
  status: string;
  created_at: string;
  // Joined
  planning_a?: Planning;
  planning_b?: Planning;
  other_user?: { first_name: string; last_name: string; company_name: string; phone: string; email: string };
  other_planning?: Planning;
}

interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface PlanningStats {
  plannings_published: number;
  matches_found: number;
  matches_accepted: number;
  km_saved: number;
  hours_saved: number;
  empty_trips_avoided: number;
  co2_saved_kg: number;
}

interface GeoSuggestion {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
}

// ============================================================================
// GEOCODING (api-adresse.data.gouv.fr - gratuit)
// ============================================================================

async function geocodeCity(query: string): Promise<GeoSuggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`);
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      label: `${f.properties.label} (${f.properties.postcode})`,
      city: f.properties.city || f.properties.label,
      postcode: f.properties.postcode || '',
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }));
  } catch {
    return [];
  }
}

// ============================================================================
// MATCH TYPE LABELS
// ============================================================================

const MATCH_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  same_route: { label: 'Même trajet', color: 'emerald', icon: Route },
  return_opportunity: { label: 'Opportunité retour', color: 'blue', icon: RefreshCw },
  nearby_route: { label: 'Trajet proche', color: 'amber', icon: Navigation },
  time_overlap: { label: 'Créneau compatible', color: 'purple', icon: Clock },
};

const VEHICLE_LABELS: Record<string, string> = {
  all: 'Tous véhicules',
  car: 'Voiture',
  utility: 'Utilitaire',
  truck: 'Poids lourd',
  motorcycle: 'Moto',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PlanningNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'plannings' | 'matches' | 'map' | 'stats'>('plannings');
  const [myPlannings, setMyPlannings] = useState<Planning[]>([]);
  const [allPlannings, setAllPlannings] = useState<Planning[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<PlanningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notifications, setNotifications] = useState<Match[]>([]);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [planningsRes, allPlanningsRes, matchesRes, statsRes] = await Promise.all([
        // Mes plannings
        supabase
          .from('convoy_plannings')
          .select('*, waypoints:planning_waypoints(*)')
          .eq('user_id', user.id)
          .order('planning_date', { ascending: false }),
        // Tous les plannings publiés (pour la carte)
        supabase
          .from('convoy_plannings')
          .select('*')
          .eq('status', 'published')
          .gte('planning_date', new Date().toISOString().split('T')[0])
          .order('planning_date', { ascending: true }),
        // Mes matches
        supabase
          .from('planning_matches')
          .select('*')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .order('match_score', { ascending: false }),
        // Mes stats du mois
        supabase
          .from('planning_stats')
          .select('*')
          .eq('user_id', user.id)
          .eq('month', new Date().getMonth() + 1)
          .eq('year', new Date().getFullYear())
          .maybeSingle(),
      ]);

      setMyPlannings(planningsRes.data || []);
      setAllPlannings(allPlanningsRes.data || []);
      setStats(statsRes.data);

      // Enrich matches with other user profile + planning details (batched)
      const rawMatches: Match[] = matchesRes.data || [];
      
      // Collect all unique IDs first
      const userIds = [...new Set(rawMatches.map(m => m.user_a_id === user.id ? m.user_b_id : m.user_a_id))];
      const planningIds = [...new Set(rawMatches.map(m => m.user_a_id === user.id ? m.planning_b_id : m.planning_a_id))];
      
      // Batch fetch all profiles and plannings in 2 queries instead of 2*N
      const [profilesRes, planningsDetailRes] = await Promise.all([
        userIds.length > 0 ? supabase.from('profiles').select('id, first_name, last_name, company_name, phone, email').in_('id', userIds) : { data: [] },
        planningIds.length > 0 ? supabase.from('convoy_plannings').select('*').in_('id', planningIds) : { data: [] },
      ]);
      
      const profilesMap = Object.fromEntries((profilesRes.data || []).map((p: any) => [p.id, p]));
      const planningsMap = Object.fromEntries((planningsDetailRes.data || []).map((p: any) => [p.id, p]));
      
      const enrichedMatches: Match[] = rawMatches.map(m => {
        const otherUserId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
        const otherPlanningId = m.user_a_id === user.id ? m.planning_b_id : m.planning_a_id;
        return {
          ...m,
          other_user: profilesMap[otherUserId] || undefined,
          other_planning: planningsMap[otherPlanningId] || undefined,
        };
      });
      
      setMatches(enrichedMatches);

      // Pending matches = notifications
      const pendingMatches = enrichedMatches.filter((m: Match) => m.status === 'pending');
      setNotifications(pendingMatches);
    } catch (err) {
      console.error('Error loading planning data:', err);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('planning-network')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'convoy_plannings' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_matches' }, () => loadData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'planning_notifications', filter: `user_id=eq.${user.id}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // ============================================================================
  // AI MATCHING - Trigger matching for a planning
  // ============================================================================

  const runAIMatching = async (planningId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('find_planning_matches', { p_planning_id: planningId });
      if (error) throw error;

      // Insert matches that don't already exist
      for (const match of (data || [])) {
        await supabase.from('planning_matches').upsert({
          planning_a_id: planningId,
          planning_b_id: match.matched_planning_id,
          user_a_id: user.id,
          user_b_id: match.matched_user_id,
          match_score: match.match_score,
          match_type: match.match_type,
          distance_km: match.distance_km,
          time_overlap_minutes: match.time_overlap_minutes,
          potential_km_saved: match.potential_km_saved,
        }, { onConflict: 'planning_a_id,planning_b_id' });
      }

      await loadData();
    } catch (err) {
      console.error('AI Matching error:', err);
    }
  };

  // ============================================================================
  // TABS
  // ============================================================================

  const tabs = [
    { id: 'plannings' as const, label: 'Mes Plannings', icon: Calendar, count: myPlannings.length },
    { id: 'matches' as const, label: 'Matching IA', icon: Zap, count: notifications.length },
    { id: 'map' as const, label: 'Carte Réseau', icon: MapIcon, count: allPlannings.length },
    { id: 'stats' as const, label: 'Statistiques', icon: BarChart3, count: null },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Share2 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">Réseau Planning</h1>
            </div>
            <p className="text-white/80 text-sm sm:text-base max-w-xl">
              Synchronisez vos trajets avec d'autres convoyeurs pour réduire les trajets à vide.
              L'IA analyse et propose les meilleures optimisations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setActiveTab('matches')}
                className="p-3 bg-white/20 rounded-xl backdrop-blur-sm hover:bg-white/30 transition-all"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-white" />
              </button>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 px-5 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Publier un planning
            </button>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Plannings actifs', value: myPlannings.filter(p => p.status === 'published').length, icon: Calendar },
            { label: 'Matchs trouvés', value: matches.length, icon: Zap },
            { label: 'Convoyeurs en ligne', value: allPlannings.length, icon: Users },
            { label: 'KM économisés', value: `${Math.round(stats?.km_saved || 0)}`, icon: Leaf },
          ].map((s, i) => (
            <div key={i} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              <div className="text-xl font-black">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === 'plannings' && (
            <PlanningsTab
              plannings={myPlannings}
              onRefresh={loadData}
              onRunMatching={runAIMatching}
              onCreateNew={() => setShowCreateForm(true)}
            />
          )}
          {activeTab === 'matches' && (
            <MatchesTab matches={matches} userId={user?.id || ''} onRefresh={loadData} />
          )}
          {activeTab === 'map' && (
            <MapTab plannings={allPlannings} userId={user?.id || ''} />
          )}
          {activeTab === 'stats' && (
            <StatsTab stats={stats} />
          )}
        </>
      )}

      {/* Create Planning Modal */}
      {showCreateForm && (
        <CreatePlanningModal
          onClose={() => setShowCreateForm(false)}
          onCreated={async (id) => {
            setShowCreateForm(false);
            await loadData();
            await runAIMatching(id);
          }}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}

// ============================================================================
// PLANNINGS TAB
// ============================================================================

function PlanningsTab({ plannings, onRefresh, onRunMatching, onCreateNew }: {
  plannings: Planning[];
  onRefresh: () => void;
  onRunMatching: (id: string) => void;
  onCreateNew: () => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce planning ?')) return;
    await supabase.from('convoy_plannings').delete().eq('id', id);
    onRefresh();
  };

  const handleToggleStatus = async (p: Planning) => {
    const newStatus = p.status === 'published' ? 'cancelled' : 'published';
    await supabase.from('convoy_plannings').update({ status: newStatus }).eq('id', p.id);
    onRefresh();
  };

  if (plannings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-10 h-10 text-indigo-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Aucun planning publié</h3>
        <p className="text-slate-500 mb-6 max-w-md mx-auto">
          Publiez votre premier planning de convoyage pour que l'IA puisse trouver des trajets compatibles.
        </p>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Publier mon premier planning
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plannings.map(p => {
        const expiresAt = p.expires_at ? new Date(p.expires_at) : null;
        const now = new Date();
        const isExpired = expiresAt ? now > expiresAt : false;
        const isExpiringSoon = expiresAt && !isExpired ? (expiresAt.getTime() - now.getTime()) < 60 * 60 * 1000 : false;
        const waypointCount = p.waypoints?.length || 0;

        const formatCountdown = (date: Date) => {
          const diff = date.getTime() - now.getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          if (days > 0) return `${days}j ${hours}h`;
          if (hours > 0) return `${hours}h ${mins}min`;
          return `${mins}min`;
        };

        return (
        <div key={p.id} className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all ${
          isExpired ? 'border-red-300 bg-red-50/30' : isExpiringSoon ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
        }`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="font-bold text-lg text-slate-800 truncate">{p.title}</h3>
                {isExpired ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />Expiré
                  </span>
                ) : isExpiringSoon ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{formatCountdown(expiresAt!)}
                  </span>
                ) : (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  p.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                  p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {p.status === 'published' ? 'Publié' : p.status === 'completed' ? 'Terminé' : p.status === 'cancelled' ? 'Annulé' : 'Brouillon'}
                </span>
                )}
                {p.is_return_trip && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    <RefreshCw className="w-3 h-3 inline mr-1" />Retour
                  </span>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <MapPin className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="font-medium">{p.origin_city}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                {p.waypoints && p.waypoints.length > 0 && (
                  <>
                    <span className="text-slate-400">{p.waypoints.length} étape{p.waypoints.length > 1 ? 's' : ''}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </>
                )}
                <span className="font-medium">{p.destination_city}</span>
              </div>

              {/* Return city */}
              {p.is_return_trip && p.return_city && (
                <div className="flex items-center gap-2 text-sm text-blue-600 mb-2 ml-5">
                  <Navigation className="w-3.5 h-3.5 rotate-180" />
                  <span className="font-medium">Retour → {p.return_city}</span>
                </div>
              )}

              {/* Details */}
              <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(p.planning_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)}
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  {VEHICLE_LABELS[p.vehicle_category] || 'Tous'}
                </span>
                {p.flexibility_minutes > 0 && (
                  <span className="text-indigo-500 font-medium">±{p.flexibility_minutes}min flex</span>
                )}
              </div>

              {/* Expiration bar */}
              {expiresAt && !isExpired && (
                <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  isExpiringSoon ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  Expire dans {formatCountdown(expiresAt)}
                  {waypointCount > 0 && (
                    <span className="ml-auto text-slate-500">Visible sur {waypointCount + 1} villes</span>
                  )}
                </div>
              )}
              {isExpired && waypointCount > 0 && (
                <div className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-700">
                  <MapPin className="w-3.5 h-3.5" />
                  Encore visible sur {waypointCount} étape{waypointCount > 1 ? 's' : ''} retour
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onRunMatching(p.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                title="Lancer le matching IA"
              >
                <Zap className="w-4 h-4" />
                Matcher
              </button>
              <button
                onClick={() => handleToggleStatus(p)}
                className={`p-2 rounded-lg transition-all ${
                  p.status === 'published'
                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
                title={p.status === 'published' ? 'Désactiver' : 'Publier'}
              >
                {p.status === 'published' ? <Eye className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// MATCHES TAB (AI Results + Chat)
// ============================================================================

function MatchesTab({ matches, userId, onRefresh }: { matches: Match[]; userId: string; onRefresh: () => void }) {
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages for selected match
  const loadChat = useCallback(async (matchId: string) => {
    const { data } = await supabase
      .from('planning_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    setChatMessages(data || []);
    
    // Mark messages as read
    if (data?.length) {
      await supabase
        .from('planning_messages')
        .update({ is_read: true })
        .eq('match_id', matchId)
        .neq('sender_id', userId);
    }
  }, [userId]);

  // Realtime chat subscription
  useEffect(() => {
    if (!chatMatchId) return;
    loadChat(chatMatchId);
    
    const channel = supabase
      .channel(`chat-${chatMatchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'planning_messages',
        filter: `match_id=eq.${chatMatchId}`,
      }, (payload) => {
        setChatMessages(prev => [...prev, payload.new as ChatMessage]);
        // Auto mark as read if not me
        if ((payload.new as ChatMessage).sender_id !== userId) {
          supabase.from('planning_messages').update({ is_read: true }).eq('id', (payload.new as ChatMessage).id);
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [chatMatchId, loadChat, userId]);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatMatchId) return;
    setSendingMessage(true);
    await supabase.from('planning_messages').insert({
      match_id: chatMatchId,
      sender_id: userId,
      content: newMessage.trim(),
    });
    setNewMessage('');
    setSendingMessage(false);
  };

  const handleRespond = async (matchId: string, response: 'accepted' | 'declined') => {
    await supabase.from('planning_matches').update({ status: response }).eq('id', matchId);
    
    if (response === 'accepted') {
      const match = matches.find(m => m.id === matchId);
      if (match) {
        await supabase.rpc('upsert_planning_stats', {
          p_user_id: userId,
          p_km_saved: match.potential_km_saved || 0,
          p_hours_saved: (match.time_overlap_minutes || 0) / 60,
          p_match_accepted: true,
        });
      }
    }
    onRefresh();
  };

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Aucun match trouvé</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Publiez un planning et lancez le matching IA pour découvrir les trajets compatibles.
        </p>
      </div>
    );
  }

  // Chat panel open
  const chatMatch = chatMatchId ? matches.find(m => m.id === chatMatchId) : null;

  return (
    <div className="flex gap-4">
      {/* Match list */}
      <div className={`space-y-4 ${chatMatchId ? 'w-1/2 hidden sm:block' : 'w-full'}`}>
        {matches.map(m => {
          const matchInfo = MATCH_LABELS[m.match_type] || MATCH_LABELS.time_overlap;
          const MatchIcon = matchInfo.icon;
          const otherUser = m.other_user;
          const otherPlanning = m.other_planning;
          
          return (
            <div key={m.id} className={`bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-lg ${
              m.status === 'pending' ? 'border-amber-300 shadow-amber-100' :
              m.status === 'accepted' ? 'border-emerald-300 shadow-emerald-100' :
              'border-slate-200'
            } ${chatMatchId === m.id ? 'ring-2 ring-indigo-500' : ''}`}>
              
              {/* Other user info */}
              {otherUser && (
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {(otherUser.first_name || '?')[0]}{(otherUser.last_name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 truncate">
                      {otherUser.first_name} {otherUser.last_name}
                    </div>
                    {otherUser.company_name && (
                      <div className="text-xs text-slate-500 truncate">{otherUser.company_name}</div>
                    )}
                  </div>
                  {m.status === 'accepted' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
                      ✅ Accepté
                    </span>
                  )}
                  {m.status === 'declined' && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex-shrink-0">
                      Décliné
                    </span>
                  )}
                </div>
              )}

              {/* Other planning details */}
              {otherPlanning && (
                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
                    <Route className="w-4 h-4 text-indigo-500" />
                    Son trajet
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="font-medium">{otherPlanning.origin_city}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <span className="font-medium">{otherPlanning.destination_city}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(otherPlanning.planning_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {otherPlanning.start_time?.slice(0,5)} - {otherPlanning.end_time?.slice(0,5)}
                    </span>
                    {otherPlanning.vehicle_category && otherPlanning.vehicle_category !== 'all' && (
                      <span className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {VEHICLE_LABELS[otherPlanning.vehicle_category] || otherPlanning.vehicle_category}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Score & Type */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-${matchInfo.color}-100 text-${matchInfo.color}-700`}>
                  <MatchIcon className="w-4 h-4" />
                  {matchInfo.label}
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.ceil(m.match_score / 20) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-700 ml-1">{m.match_score}%</span>
                </div>
              </div>

              {/* Match metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  <span>Distance: <strong>{m.distance_km?.toFixed(1)} km</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-purple-500" />
                  <span>Overlap: <strong>{m.time_overlap_minutes} min</strong></span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Leaf className="w-4 h-4" />
                  <span>Économie: <strong>{m.potential_km_saved?.toFixed(0)} km</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                {m.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleRespond(m.id, 'accepted')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Accepter
                    </button>
                    <button
                      onClick={() => handleRespond(m.id, 'declined')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
                    >
                      <X className="w-4 h-4" />
                      Décliner
                    </button>
                  </>
                )}
                {m.status === 'accepted' && (
                  <button
                    onClick={() => setChatMatchId(chatMatchId === m.id ? null : m.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      chatMatchId === m.id 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Discuter
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Panel */}
      {chatMatch && (
        <div className={`${chatMatchId ? 'w-full sm:w-1/2' : 'hidden'} flex flex-col bg-white rounded-2xl border-2 border-indigo-200 shadow-xl overflow-hidden`} style={{ height: '600px' }}>
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {(chatMatch.other_user?.first_name || '?')[0]}{(chatMatch.other_user?.last_name || '?')[0]}
              </div>
              <div className="min-w-0">
                <div className="font-bold truncate">
                  {chatMatch.other_user?.first_name} {chatMatch.other_user?.last_name}
                </div>
                {chatMatch.other_user?.company_name && (
                  <div className="text-xs text-white/70 truncate">{chatMatch.other_user.company_name}</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Contact info for accepted */}
              {chatMatch.other_user?.phone && (
                <a href={`tel:${chatMatch.other_user.phone}`} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all" title={chatMatch.other_user.phone}>
                  📞
                </a>
              )}
              {chatMatch.other_user?.email && (
                <a href={`mailto:${chatMatch.other_user.email}`} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all" title={chatMatch.other_user.email}>
                  ✉️
                </a>
              )}
              <button
                onClick={() => setChatMatchId(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all sm:hidden"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => setChatMatchId(null)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all hidden sm:block"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Planning context bar */}
          {chatMatch.other_planning && (
            <div className="bg-indigo-50 px-4 py-2 text-xs text-indigo-700 flex items-center gap-2 border-b border-indigo-100 flex-shrink-0">
              <Route className="w-3.5 h-3.5" />
              <span className="font-medium">{chatMatch.other_planning.origin_city} → {chatMatch.other_planning.destination_city}</span>
              <span className="text-indigo-400">•</span>
              <span>{new Date(chatMatch.other_planning.planning_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              <span className="text-indigo-400">•</span>
              <span>{chatMatch.other_planning.start_time?.slice(0,5)}-{chatMatch.other_planning.end_time?.slice(0,5)}</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-slate-500 text-sm">
                  Démarrez la conversation avec {chatMatch.other_user?.first_name || 'ce convoyeur'}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Coordonnez votre trajet ensemble
                </p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isMe = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-br-md' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className={`text-[10px] mt-1 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {isMe && msg.is_read && ' ✓✓'}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAP TAB - Interactive Leaflet Map
// ============================================================================

function MapTab({ plannings, userId }: { plannings: Planning[]; userId: string }) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState<Planning | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dynamically load Leaflet
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load JS
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current).setView([46.603354, 1.888334], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add markers & routes when data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const L = (window as any).L;
    const map = mapRef.current;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer: any) => {
      if (layer._url === undefined || layer._url === null) {
        // It's not a tile layer
        if (layer._latlng || layer._latlngs) map.removeLayer(layer);
      }
    });

    const bounds: any[] = [];

    plannings.forEach(p => {
      if (!p.origin_lat || !p.origin_lng || !p.destination_lat || !p.destination_lng) return;

      const isMine = p.user_id === userId;
      const color = isMine ? '#6366f1' : '#10b981';
      const opacity = isMine ? 0.9 : 0.5;

      // Origin marker
      const originIcon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      
      const originMarker = L.marker([p.origin_lat, p.origin_lng], { icon: originIcon }).addTo(map);
      originMarker.bindPopup(`
        <div style="min-width:180px">
          <strong>${p.title || 'Sans titre'}</strong><br/>
          <span style="color:#6366f1">📍 ${p.origin_city} → ${p.destination_city}</span><br/>
          <small>${new Date(p.planning_date).toLocaleDateString('fr-FR')} | ${p.start_time?.slice(0,5)} - ${p.end_time?.slice(0,5)}</small>
          ${isMine ? '<br/><em style="color:#6366f1">Mon planning</em>' : ''}
        </div>
      `);

      // Destination marker
      const destIcon = L.divIcon({
        html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"><div style="background:white;width:4px;height:4px;border-radius:50%;margin:2px auto"></div></div>`,
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      
      L.marker([p.destination_lat, p.destination_lng], { icon: destIcon }).addTo(map);

      // Route line
      L.polyline(
        [[p.origin_lat, p.origin_lng], [p.destination_lat, p.destination_lng]],
        { color, weight: isMine ? 3 : 2, opacity, dashArray: isMine ? '' : '8 4' }
      ).addTo(map);

      bounds.push([p.origin_lat, p.origin_lng]);
      bounds.push([p.destination_lat, p.destination_lng]);
    });

    if (bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [plannings, mapReady, userId]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-6 flex-wrap text-sm">
        <span className="font-semibold text-slate-700">Légende :</span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
          Mes trajets
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          Autres convoyeurs
        </span>
        <span className="text-slate-400 ml-auto">{plannings.length} plannings affichés</span>
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
        <div ref={mapContainerRef} className="w-full h-[500px] sm:h-[600px]" />
      </div>

      {/* Plannings list under map */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Route className="w-5 h-5 text-indigo-500" />
          Plannings sur la carte ({plannings.length})
        </h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {plannings.map(p => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
              p.user_id === userId ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.user_id === userId ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                <div className="min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">{p.origin_city} → {p.destination_city}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(p.planning_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · {p.start_time?.slice(0, 5)}
                  </div>
                </div>
              </div>
              {p.user_id === userId && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">MOI</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATS TAB - Dashboard d'optimisation
// ============================================================================

function StatsTab({ stats }: { stats: PlanningStats | null }) {
  const kpis = [
    {
      label: 'Plannings publiés',
      value: stats?.plannings_published || 0,
      icon: Calendar,
      color: 'indigo',
      suffix: '',
    },
    {
      label: 'Matchs trouvés',
      value: stats?.matches_found || 0,
      icon: Zap,
      color: 'amber',
      suffix: '',
    },
    {
      label: 'Matchs acceptés',
      value: stats?.matches_accepted || 0,
      icon: Check,
      color: 'emerald',
      suffix: '',
    },
    {
      label: 'KM économisés',
      value: Math.round(stats?.km_saved || 0),
      icon: Route,
      color: 'blue',
      suffix: ' km',
    },
    {
      label: 'Heures gagnées',
      value: (stats?.hours_saved || 0).toFixed(1),
      icon: Clock,
      color: 'purple',
      suffix: ' h',
    },
    {
      label: 'Trajets à vide évités',
      value: stats?.empty_trips_avoided || 0,
      icon: Target,
      color: 'teal',
      suffix: '',
    },
    {
      label: 'CO₂ économisé',
      value: (stats?.co2_saved_kg || 0).toFixed(1),
      icon: Leaf,
      color: 'green',
      suffix: ' kg',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all">
              <div className={`w-10 h-10 rounded-xl bg-${kpi.color}-100 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${kpi.color}-600`} />
              </div>
              <div className="text-2xl font-black text-slate-800">
                {kpi.value}{kpi.suffix}
              </div>
              <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Impact section */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
          <Leaf className="w-6 h-6" />
          Impact environnemental
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-black">{(stats?.co2_saved_kg || 0).toFixed(1)}</div>
            <div className="text-sm text-white/80 mt-1">kg de CO₂ évités</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-black">{Math.round(stats?.km_saved || 0)}</div>
            <div className="text-sm text-white/80 mt-1">km de trajets inutiles</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-black">{stats?.empty_trips_avoided || 0}</div>
            <div className="text-sm text-white/80 mt-1">trajets à vide évités</div>
          </div>
        </div>
      </div>

      {/* Cadre légal */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-500" />
          Cadre légal
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed">
          Ce service est strictement limité à la <strong>coordination et optimisation de planning</strong> entre convoyeurs. 
          Aucun transport de marchandises, gestion de véhicules tiers, paiement entre utilisateurs ou 
          responsabilité légale de transport n'est impliqué. Chaque convoyeur reste indépendant et 
          responsable de ses propres missions.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// CREATE PLANNING MODAL
// ============================================================================

function CreatePlanningModal({ onClose, onCreated, userId }: {
  onClose: () => void;
  onCreated: (id: string) => void;
  userId: string;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    planning_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '18:00',
    flexibility_minutes: 30,
    origin_city: '',
    origin_postal_code: '',
    origin_lat: null as number | null,
    origin_lng: null as number | null,
    destination_city: '',
    destination_postal_code: '',
    destination_lat: null as number | null,
    destination_lng: null as number | null,
    is_return_trip: false,
    return_city: '',
    return_postal_code: '',
    return_lat: null as number | null,
    return_lng: null as number | null,
    vehicle_category: 'all',
    notes: '',
  });

  const [originSuggestions, setOriginSuggestions] = useState<GeoSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<GeoSuggestion[]>([]);
  const [waypoints, setWaypoints] = useState<{ city: string; lat?: number; lng?: number; postal_code?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [returnSuggestions, setReturnSuggestions] = useState<GeoSuggestion[]>([]);
  const [showReturnDropdown, setShowReturnDropdown] = useState(false);

  const searchOrigin = async (q: string) => {
    setForm(f => ({ ...f, origin_city: q, origin_lat: null, origin_lng: null }));
    const results = await geocodeCity(q);
    setOriginSuggestions(results);
    setShowOriginDropdown(results.length > 0);
  };

  const searchDest = async (q: string) => {
    setForm(f => ({ ...f, destination_city: q, destination_lat: null, destination_lng: null }));
    const results = await geocodeCity(q);
    setDestSuggestions(results);
    setShowDestDropdown(results.length > 0);
  };

  const selectOrigin = (s: GeoSuggestion) => {
    setForm(f => ({ ...f, origin_city: s.city, origin_postal_code: s.postcode, origin_lat: s.lat, origin_lng: s.lng }));
    setShowOriginDropdown(false);
  };

  const selectDest = (s: GeoSuggestion) => {
    setForm(f => ({ ...f, destination_city: s.city, destination_postal_code: s.postcode, destination_lat: s.lat, destination_lng: s.lng }));
    setShowDestDropdown(false);
  };

  const handleSubmit = async () => {
    if (!form.origin_city || !form.destination_city || !form.planning_date) return;
    setSaving(true);

    try {
      // Auto-geocode if not already done
      let updatedForm = { ...form };
      if (!updatedForm.origin_lat) {
        const geo = await geocodeCity(updatedForm.origin_city);
        if (geo.length > 0) {
          updatedForm.origin_lat = geo[0].lat;
          updatedForm.origin_lng = geo[0].lng;
          updatedForm.origin_postal_code = geo[0].postcode;
        }
      }
      if (!updatedForm.destination_lat) {
        const geo = await geocodeCity(updatedForm.destination_city);
        if (geo.length > 0) {
          updatedForm.destination_lat = geo[0].lat;
          updatedForm.destination_lng = geo[0].lng;
          updatedForm.destination_postal_code = geo[0].postcode;
        }
      }
      setForm(updatedForm);

      const { data, error } = await supabase.from('convoy_plannings').insert({
        user_id: userId,
        title: form.title || `${form.origin_city} → ${form.destination_city}`,
        description: form.description || null,
        planning_date: form.planning_date,
        start_time: form.start_time,
        end_time: form.end_time,
        flexibility_minutes: form.flexibility_minutes,
        origin_city: updatedForm.origin_city,
        origin_postal_code: updatedForm.origin_postal_code,
        origin_lat: updatedForm.origin_lat,
        origin_lng: updatedForm.origin_lng,
        destination_city: updatedForm.destination_city,
        destination_postal_code: updatedForm.destination_postal_code,
        destination_lat: updatedForm.destination_lat,
        destination_lng: updatedForm.destination_lng,
        is_return_trip: updatedForm.is_return_trip,
        return_city: updatedForm.is_return_trip && updatedForm.return_city ? updatedForm.return_city : null,
        return_postal_code: updatedForm.is_return_trip ? updatedForm.return_postal_code || null : null,
        return_lat: updatedForm.is_return_trip ? updatedForm.return_lat : null,
        return_lng: updatedForm.is_return_trip ? updatedForm.return_lng : null,
        vehicle_category: updatedForm.vehicle_category,
        notes: updatedForm.notes || null,
        status: 'published',
      }).select('id').single();

      if (error) throw error;

      // Insert waypoints
      if (waypoints.length > 0 && data?.id) {
        const wpInserts = waypoints.map((wp, i) => ({
          planning_id: data.id,
          city: wp.city,
          postal_code: wp.postal_code || null,
          lat: wp.lat || null,
          lng: wp.lng || null,
          sort_order: i,
        }));
        await supabase.from('planning_waypoints').insert(wpInserts);
      }

      // Update stats 
      await supabase.rpc('upsert_planning_stats', {
        p_user_id: userId,
        p_km_saved: 0,
        p_hours_saved: 0,
        p_match_accepted: false,
      });

      onCreated(data.id);
    } catch (err) {
      console.error('Error creating planning:', err);
      alert('Erreur lors de la création du planning');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black">Nouveau planning</h2>
              <p className="text-sm text-white/70">Publiez votre trajet pour trouver des synergies</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titre (optionnel)</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Convoyage Paris → Lyon"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date *</label>
              <input
                type="date"
                value={form.planning_date}
                onChange={e => setForm(f => ({ ...f, planning_date: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Heure début *</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Heure fin *</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>
          </div>

          {/* Origin */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              <MapPin className="w-4 h-4 inline text-emerald-500 mr-1" />
              Ville de départ *
            </label>
            <input
              type="text"
              value={form.origin_city}
              onChange={e => searchOrigin(e.target.value)}
              onFocus={() => originSuggestions.length > 0 && setShowOriginDropdown(true)}
              placeholder="Tapez une ville..."
              className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-200 outline-none transition-all ${
                form.origin_lat ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 focus:border-indigo-500'
              }`}
            />
            {form.origin_lat && (
              <span className="absolute right-3 top-9 text-emerald-500"><Check className="w-4 h-4" /></span>
            )}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto">
                {originSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectOrigin(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              <MapPin className="w-4 h-4 inline text-red-500 mr-1" />
              Ville d'arrivée *
            </label>
            <input
              type="text"
              value={form.destination_city}
              onChange={e => searchDest(e.target.value)}
              onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
              placeholder="Tapez une ville..."
              className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-200 outline-none transition-all ${
                form.destination_lat ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 focus:border-indigo-500'
              }`}
            />
            {form.destination_lat && (
              <span className="absolute right-3 top-9 text-emerald-500"><Check className="w-4 h-4" /></span>
            )}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto">
                {destSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectDest(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-sm transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Waypoints */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Étapes intermédiaires</label>
            {waypoints.map((wp, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={wp.city}
                  onChange={e => {
                    const updated = [...waypoints];
                    updated[i] = { ...wp, city: e.target.value };
                    setWaypoints(updated);
                  }}
                  placeholder="Ville..."
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
                <button
                  onClick={() => setWaypoints(waypoints.filter((_, j) => j !== i))}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setWaypoints([...waypoints, { city: '' }])}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une étape
            </button>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Flexibilité horaire</label>
              <select
                value={form.flexibility_minutes}
                onChange={e => setForm(f => ({ ...f, flexibility_minutes: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              >
                <option value={0}>Horaire fixe</option>
                <option value={15}>± 15 min</option>
                <option value={30}>± 30 min</option>
                <option value={60}>± 1 heure</option>
                <option value={120}>± 2 heures</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type de véhicule</label>
              <select
                value={form.vehicle_category}
                onChange={e => setForm(f => ({ ...f, vehicle_category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              >
                {Object.entries(VEHICLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Return trip toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div 
              onClick={() => setForm(f => ({ ...f, is_return_trip: !f.is_return_trip, ...(!f.is_return_trip ? {} : { return_city: '', return_lat: null, return_lng: null }) }))}
              className={`w-12 h-6 rounded-full transition-all ${form.is_return_trip ? 'bg-indigo-500' : 'bg-slate-300'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform mt-0.5 ${form.is_return_trip ? 'translate-x-6.5 ml-1' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">Je reviens à vide après ce trajet</span>
          </label>

          {/* Return city field */}
          {form.is_return_trip && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-700">Ville de retour</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">Où rentrez-vous ? L'IA cherchera des convoyeurs allant dans cette direction.</p>
              <div className="relative">
                <input
                  value={form.return_city}
                  onChange={async (e) => {
                    const q = e.target.value;
                    setForm(f => ({ ...f, return_city: q, return_lat: null, return_lng: null }));
                    const results = await geocodeCity(q);
                    setReturnSuggestions(results);
                    setShowReturnDropdown(results.length > 0);
                  }}
                  placeholder="Ex: Paris, Lyon, Marseille..."
                  className="w-full px-4 py-2.5 rounded-xl border border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                />
                {form.return_lat && (
                  <Check className="absolute right-3 top-3 w-4 h-4 text-emerald-500" />
                )}
                {showReturnDropdown && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 max-h-40 overflow-y-auto">
                    {returnSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            return_city: s.city,
                            return_postal_code: s.postcode,
                            return_lat: s.lat,
                            return_lng: s.lng,
                          }));
                          setShowReturnDropdown(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-indigo-50 text-sm text-left"
                      >
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Informations complémentaires..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-all">
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.origin_city || !form.destination_city}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {saving ? 'Publication...' : 'Publier le planning'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
