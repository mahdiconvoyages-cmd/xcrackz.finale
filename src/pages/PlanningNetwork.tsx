// @ts-nocheck
// Réseau Planning V3 — Covoiturage Convoyeurs — Refonte complète
// 3 tabs: Publier / Matchs & Chat / Historique
// Pas de carte, pas de browsing: publie → matching auto → discussion
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Clock, Plus, X, Check, ChevronRight, ChevronDown,
  Calendar, Navigation, Zap, Bell, Star, Car, User,
  MessageCircle, Send, ArrowRight, Eye, Trash2, RefreshCw,
  Share2, Route, Phone, Award, TrendingUp, Footprints,
  History, MapPin, Truck
} from 'lucide-react';

const T = {
  primaryBlue: '#0066FF', primaryTeal: '#14B8A6', accentGreen: '#10B981',
  accentAmber: '#F59E0B', accentRed: '#EF4444', primaryPurple: '#8B5CF6',
  primaryIndigo: '#6366F1', deepOrange: '#F97316',
  textPrimary: '#0F172A', textSecondary: '#64748B', textTertiary: '#94A3B8',
  fieldBg: '#F8FAFC', borderDefault: '#E2E8F0', cardBg: '#FFFFFF',
};

// ── Types ──
interface RideOffer {
  id: string; user_id: string; mission_id?: string;
  origin_city: string; origin_lat: number | null; origin_lng: number | null;
  destination_city: string; destination_lat: number | null; destination_lng: number | null;
  route_cities: any[];
  departure_date: string; departure_time: string | null; estimated_arrival_time: string | null;
  flexibility_minutes: number; max_detour_km: number; seats_available: number;
  vehicle_type: string; status: string; needs_return: boolean;
  return_to_city: string | null; notes: string | null; created_at: string;
  profile?: { first_name: string; last_name: string; company_name: string; avatar_url: string; phone: string };
}
interface RideRequest {
  id: string; user_id: string; completed_mission_id?: string;
  pickup_city: string; pickup_lat: number | null; pickup_lng: number | null;
  destination_city: string; destination_lat: number | null; destination_lng: number | null;
  needed_date: string; time_window_start: string | null; time_window_end: string | null;
  flexibility_minutes: number; max_detour_km: number; accept_partial: boolean;
  request_type: string; status: string; notes: string | null; created_at: string;
  profile?: { first_name: string; last_name: string; company_name: string; avatar_url: string; phone: string };
}
interface RideMatch {
  id: string; offer_id: string; request_id: string;
  driver_id: string; passenger_id: string;
  pickup_city: string | null; dropoff_city: string | null;
  detour_km: number; distance_covered_km: number;
  match_score: number; match_type: string; status: string;
  rendezvous_time: string | null; rendezvous_address: string | null; created_at: string;
  other_user?: { first_name: string; last_name: string; company_name: string; phone: string; email: string; avatar_url: string };
  offer?: RideOffer; request?: RideRequest;
}
interface ChatMessage {
  id: string; match_id: string; sender_id: string;
  content: string; is_read: boolean; created_at: string;
}
interface GeoSuggestion {
  label: string; city: string; postcode: string; lat: number; lng: number;
}

// ── Geocoding ──
async function geocodeCity(query: string): Promise<GeoSuggestion[]> {
  if (query.length < 2) return [];
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`);
    const data = await res.json();
    return (data.features || []).map((f: any) => ({
      label: `${f.properties.label} (${f.properties.postcode})`,
      city: f.properties.city || f.properties.label,
      postcode: f.properties.postcode || '',
      lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
    }));
  } catch { return []; }
}

// ── Helpers ──
const VEHICLE_LABELS: Record<string, string> = {
  car: '🚗 Voiture', utility: '🚐 Utilitaire', truck: '🚛 Poids lourd', motorcycle: '🏍️ Moto',
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.getTime() === today.getTime()) return "Aujourd'hui";
  if (d.getTime() === tomorrow.getTime()) return 'Demain';
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(t: string | null): string {
  if (!t) return '';
  return t.slice(0, 5).replace(':', 'h');
}

const MATCH_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  proposed: { label: '🔔 Nouveau match', color: '#F59E0B', bg: '#FFFBEB' },
  accepted: { label: '✅ Accepté', color: '#10B981', bg: '#ECFDF5' },
  in_transit: { label: '🚗 En route', color: '#6366F1', bg: '#EEF2FF' },
  completed: { label: '🏁 Terminé', color: '#8B5CF6', bg: '#F5F3FF' },
  declined: { label: '❌ Décliné', color: '#EF4444', bg: '#FEF2F2' },
  cancelled: { label: '⛔ Annulé', color: '#94A3B8', bg: '#F8FAFC' },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function PlanningNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'publish' | 'matches' | 'history'>('publish');
  const [myOffers, setMyOffers] = useState<RideOffer[]>([]);
  const [myRequests, setMyRequests] = useState<RideRequest[]>([]);
  const [matches, setMatches] = useState<RideMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [historyMatches, setHistoryMatches] = useState<RideMatch[]>([]);

  // ── Data Loading ──
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [offersRes, requestsRes, matchesRes] = await Promise.all([
        supabase.from('ride_offers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('ride_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('ride_matches').select('*').or(`driver_id.eq.${user.id},passenger_id.eq.${user.id}`).order('match_score', { ascending: false }),
      ]);
      setMyOffers(offersRes.data || []);
      setMyRequests(requestsRes.data || []);

      const rawMatches: RideMatch[] = matchesRes.data || [];
      const otherUserIds = [...new Set(rawMatches.map(m => m.driver_id === user.id ? m.passenger_id : m.driver_id))];
      let enrichedMatches = rawMatches;
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, company_name, phone, email, avatar_url').in('id', otherUserIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
        enrichedMatches = rawMatches.map(m => {
          const otherId = m.driver_id === user.id ? m.passenger_id : m.driver_id;
          return { ...m, other_user: profileMap[otherId] };
        });
      }

      const active = enrichedMatches.filter(m => !['completed', 'cancelled', 'declined'].includes(m.status));
      const history = enrichedMatches.filter(m => ['completed', 'cancelled', 'declined'].includes(m.status));
      setMatches(active);
      setHistoryMatches(history);
      setPendingCount(active.filter(m => m.status === 'proposed').length);
    } catch (err) { console.error('Error loading data:', err); }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime with debounce to avoid hammering loadData on rapid changes
  useEffect(() => {
    if (!user) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedLoad = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadData(), 500);
    };
    const channel = supabase.channel('reseau-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_offers' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_matches' }, debouncedLoad)
      .subscribe();
    return () => { if (debounceTimer) clearTimeout(debounceTimer); supabase.removeChannel(channel); };
  }, [user, loadData]);

  // ── Actions ──
  const respondToMatch = async (matchId: string, response: string) => {
    await supabase.from('ride_matches').update({ status: response }).eq('id', matchId);
    await loadData();
  };

  const toggleOfferVisibility = async (offerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
    await supabase.from('ride_offers').update({ status: newStatus }).eq('id', offerId);
    await loadData();
  };

  const rateRide = async (matchId: string, rating: number, badges: string[], comment: string) => {
    const match = matches.find(m => m.id === matchId) || historyMatches.find(m => m.id === matchId);
    if (!match) return;
    const isDriver = match.driver_id === user?.id;
    const { error } = await supabase.from('ride_ratings').upsert({
      match_id: matchId, rater_id: user?.id,
      rated_id: isDriver ? match.passenger_id : match.driver_id,
      rating, badges, comment: comment || null,
    }, { onConflict: 'match_id,rater_id' });
    if (error) console.error('Rating error:', error);
    await loadData();
  };

  // ── Tabs ──
  const tabs = [
    { id: 'publish' as const, label: 'Publier', icon: Plus, count: myOffers.length + myRequests.length },
    { id: 'matches' as const, label: 'Matchs & Chat', icon: Zap, count: pendingCount },
    { id: 'history' as const, label: 'Historique', icon: History, count: historyMatches.length },
  ];

  return (
    <div className="min-h-screen pb-8">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-5 lg:p-8 mb-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-black">Entraide Convoyeurs</h1>
                <p className="text-white/70 text-sm">Publiez, matchez, voyagez ensemble</p>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-4 mt-2">
              {[
                { n: '1', t: 'Publiez votre trajet' },
                { n: '2', t: 'Matching automatique' },
                { n: '3', t: 'Discutez et partez' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-white/40" />}
                  <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">{s.n}</span>
                  <span className="text-white/80 text-sm">{s.t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative">
              <button onClick={() => setActiveTab('matches')}
                className="p-3 bg-white/20 rounded-xl backdrop-blur-sm hover:bg-white/30 transition" title="Matchs">
                <Bell className="w-5 h-5" />
              </button>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">{pendingCount}</span>
              )}
            </div>
            <button onClick={() => setShowCreateOffer(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-lg text-sm">
              <Car className="w-4 h-4" />
              <span className="hidden sm:inline">Je conduis</span>
              <span className="sm:hidden">Conduis</span>
            </button>
            <button onClick={() => setShowCreateRequest(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl font-bold hover:bg-white/30 transition text-sm border border-white/30">
              <Footprints className="w-4 h-4" />
              <span className="hidden sm:inline">Je cherche un lift</span>
              <span className="sm:hidden">Lift</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-none">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id ? 'bg-white/20' : tab.id === 'matches' && pendingCount > 0 ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {activeTab === 'publish' && (
            <PublishTab
              myOffers={myOffers}
              myRequests={myRequests}
              userId={user?.id || ''}
              onRefresh={loadData}
              onCreateOffer={() => setShowCreateOffer(true)}
              onCreateRequest={() => setShowCreateRequest(true)}
              onToggleVisibility={toggleOfferVisibility}
              onViewMatches={() => setActiveTab('matches')}
            />
          )}
          {activeTab === 'matches' && (
            <MatchesTab
              matches={matches}
              userId={user?.id || ''}
              onRefresh={loadData}
              onRespond={respondToMatch}
              onRate={rateRide}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              historyMatches={historyMatches}
              userId={user?.id || ''}
              onRate={rateRide}
            />
          )}
        </>
      )}

      {/* ── Create Offer Modal ── */}
      {showCreateOffer && (
        <CreateOfferModal
          userId={user?.id || ''}
          onClose={() => setShowCreateOffer(false)}
          onCreated={async () => { await loadData(); setActiveTab('matches'); }}
        />
      )}
      {showCreateRequest && (
        <CreateRequestModal
          userId={user?.id || ''}
          onClose={() => setShowCreateRequest(false)}
          onCreated={async () => { await loadData(); setActiveTab('matches'); }}
        />
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// PUBLISH TAB — My offers + My requests
// ══════════════════════════════════════════════════════════════════════════════
function PublishTab({ myOffers, myRequests, userId, onRefresh, onCreateOffer, onCreateRequest, onToggleVisibility, onViewMatches }: {
  myOffers: RideOffer[]; myRequests: RideRequest[]; userId: string;
  onRefresh: () => void; onCreateOffer: () => void; onCreateRequest: () => void;
  onToggleVisibility: (id: string, s: string) => void; onViewMatches: () => void;
}) {
  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Supprimer cette offre ?')) return;
    await supabase.from('ride_offers').delete().eq('id', id);
    onRefresh();
  };
  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Supprimer cette demande ?')) return;
    await supabase.from('ride_requests').delete().eq('id', id);
    onRefresh();
  };

  if (myOffers.length === 0 && myRequests.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <h3 className="text-lg font-bold mb-4" style={{ color: T.textPrimary }}>🚀 Comment ça marche ?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-indigo-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Car className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: T.textPrimary }}>Je conduis</div>
                  <div className="text-xs" style={{ color: T.textSecondary }}>J'ai des places libres</div>
                </div>
              </div>
              <ul className="text-xs space-y-1.5" style={{ color: T.textSecondary }}>
                <li>• Indiquez votre trajet et vos villes de passage</li>
                <li>• L'IA trouve les passagers sur votre route</li>
                <li>• Cochez "retour" pour lancer automatiquement une demande de lift après livraison</li>
              </ul>
              <button onClick={onCreateOffer}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition">
                <Car className="w-4 h-4" /> Publier mon trajet conducteur
              </button>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-amber-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Footprints className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: T.textPrimary }}>Je cherche un lift</div>
                  <div className="text-xs" style={{ color: T.textSecondary }}>Un convoyeur passe par là ?</div>
                </div>
              </div>
              <ul className="text-xs space-y-1.5" style={{ color: T.textSecondary }}>
                <li>• Indiquez d'où vous partez et où aller</li>
                <li>• Précisez votre disponibilité horaire</li>
                <li>• Les conducteurs qui passent près de vous seront matchés</li>
              </ul>
              <button onClick={onCreateRequest}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition">
                <Footprints className="w-4 h-4" /> Publier ma demande de lift
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Mes trajets conducteur ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: T.textPrimary }}>
            <Car className="w-4 h-4" style={{ color: T.primaryIndigo }} />
            Mes trajets conducteur
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{myOffers.length}</span>
          </h3>
          <button onClick={onCreateOffer}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition">
            <Plus className="w-3.5 h-3.5" /> Nouveau trajet
          </button>
        </div>
        {myOffers.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm" style={{ color: T.textSecondary }}>Aucun trajet publié</p>
            <button onClick={onCreateOffer} className="mt-2 text-sm font-semibold text-indigo-600 hover:underline">
              Publier un trajet →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myOffers.map(o => (
              <TripCard key={o.id} type="offer" item={o}
                onDelete={() => handleDeleteOffer(o.id)}
                onToggle={() => onToggleVisibility(o.id, o.status)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Mes demandes de lift ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: T.textPrimary }}>
            <Footprints className="w-4 h-4" style={{ color: T.accentAmber }} />
            Mes demandes de lift
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{myRequests.length}</span>
          </h3>
          <button onClick={onCreateRequest}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 transition">
            <Plus className="w-3.5 h-3.5" /> Nouvelle demande
          </button>
        </div>
        {myRequests.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <p className="text-sm" style={{ color: T.textSecondary }}>Aucune demande de lift</p>
            <button onClick={onCreateRequest} className="mt-2 text-sm font-semibold text-amber-600 hover:underline">
              Chercher un lift →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map(r => (
              <TripCard key={r.id} type="request" item={r}
                onDelete={() => handleDeleteRequest(r.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// TRIP CARD — Unified card for offers & requests
// ══════════════════════════════════════════════════════════════════════════════
function TripCard({ type, item, onDelete, onToggle }: {
  type: 'offer' | 'request'; item: any;
  onDelete: () => void; onToggle?: () => void;
}) {
  const isOffer = type === 'offer';
  const origin = isOffer ? item.origin_city : item.pickup_city;
  const dest = isOffer ? item.destination_city : item.destination_city;
  const date = isOffer ? item.departure_date : item.needed_date;
  const dateLabel = formatDateLabel(date);
  const isToday = dateLabel === "Aujourd'hui";
  const isTomorrow = dateLabel === 'Demain';

  let timeStr = '';
  if (isOffer) {
    timeStr = item.departure_time ? formatTime(item.departure_time) : '';
    if (item.estimated_arrival_time) timeStr += ` → ${formatTime(item.estimated_arrival_time)}`;
  } else {
    const s = formatTime(item.time_window_start);
    const e = formatTime(item.time_window_end);
    if (s && e) timeStr = `${s} — ${e}`;
    else if (s) timeStr = `à partir de ${s}`;
  }

  const waypoints: string[] = Array.isArray(item.route_cities)
    ? item.route_cities.map((c: any) => typeof c === 'string' ? c : c?.city || '').filter(Boolean)
    : [];

  return (
    <div className={`bg-white rounded-2xl p-4 transition hover:shadow-md ring-2 ${isOffer ? 'ring-indigo-200' : 'ring-amber-200'}`}
      style={{ border: `1px solid ${T.borderDefault}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isToday ? 'bg-emerald-100 text-emerald-700' :
              isTomorrow ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              <Calendar className="w-3 h-3 inline mr-1" />{dateLabel}
            </span>
            {timeStr && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                <Clock className="w-3 h-3 inline mr-1" />{timeStr}
              </span>
            )}
            {isOffer && item.status === 'paused' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⏸ En pause</span>
            )}
            {isOffer && item.seats_available > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.accentAmber}15`, color: T.accentAmber }}>
                🪑 {item.seats_available} place{item.seats_available > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="mb-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentGreen }} />
              <span className="font-semibold" style={{ color: T.textPrimary }}>{origin}</span>
              {waypoints.length === 0 && (
                <>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
                  <span className="font-semibold" style={{ color: T.textPrimary }}>{dest}</span>
                </>
              )}
            </div>
            {waypoints.length > 0 && (
              <div className="ml-[5px] pl-3 border-l-2 border-dashed" style={{ borderColor: T.borderDefault }}>
                {waypoints.map((wp, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-xs" style={{ color: T.textSecondary }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.accentAmber }} />
                    <span>{wp}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm pt-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
                  <span className="font-semibold" style={{ color: T.textPrimary }}>{dest}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: T.textSecondary }}>
            {isOffer && item.vehicle_type && (
              <span>{VEHICLE_LABELS[item.vehicle_type] || item.vehicle_type}</span>
            )}
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              Flexible {item.max_detour_km || 15}km
            </span>
            {!isOffer && item.accept_partial && (
              <span className="text-blue-600">Accepte un bout du trajet</span>
            )}
          </div>

          {isOffer && item.needs_return && item.return_to_city && (
            <div className="mt-2 text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: `${T.primaryPurple}08`, color: T.primaryPurple }}>
              <RefreshCw className="w-3 h-3" /> Lift retour auto → {item.return_to_city}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          {isOffer && onToggle && (
            <button onClick={onToggle}
              className={`p-2 rounded-lg transition ${item.status === 'paused' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
              title={item.status === 'paused' ? 'Réactiver' : 'Mettre en pause'}>
              {item.status === 'paused' ? <Eye className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onDelete} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Supprimer">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MATCHES TAB — Active matches + Chat
// ══════════════════════════════════════════════════════════════════════════════
function MatchesTab({ matches, userId, onRefresh, onRespond, onRate }: {
  matches: RideMatch[]; userId: string; onRefresh: () => void;
  onRespond: (id: string, status: string) => void;
  onRate: (matchId: string, rating: number, badges: string[], comment: string) => void;
}) {
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [ratingMatchId, setRatingMatchId] = useState<string | null>(null);

  const loadChat = useCallback(async (matchId: string) => {
    const { data } = await supabase.from('ride_messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true });
    setChatMessages(data || []);
    if (data?.length) {
      await supabase.from('ride_messages').update({ is_read: true }).eq('match_id', matchId).neq('sender_id', userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!chatMatchId) return;
    loadChat(chatMatchId);
    const channel = supabase.channel(`ride-chat-${chatMatchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ride_messages', filter: `match_id=eq.${chatMatchId}` },
        (payload: any) => {
          setChatMessages(prev => [...prev, payload.new as ChatMessage]);
          if ((payload.new as ChatMessage).sender_id !== userId) {
            supabase.from('ride_messages').update({ is_read: true }).eq('id', (payload.new as ChatMessage).id);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatMatchId, loadChat, userId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatMatchId) return;
    await supabase.from('ride_messages').insert({ match_id: chatMatchId, sender_id: userId, content: newMessage.trim() });
    setNewMessage('');
  };

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: T.borderDefault }}>
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Zap className="w-10 h-10 text-purple-500" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Aucun match actif</h3>
        <p className="text-sm max-w-md mx-auto" style={{ color: T.textSecondary }}>
          Publiez un trajet ou une demande de lift. Dès qu'un trajet compatible est trouvé, votre match apparaîtra ici avec la possibilité de discuter.
        </p>
      </div>
    );
  }

  const chatMatch = chatMatchId ? matches.find(m => m.id === chatMatchId) : null;

  return (
    <div className="flex gap-4">
      {/* Match list */}
      <div className={`space-y-3 ${chatMatchId ? 'w-1/2 hidden lg:block' : 'w-full'}`}>
        {matches.map(m => {
          const isDriver = m.driver_id === userId;
          const cfg = MATCH_STATUS_CFG[m.status] || MATCH_STATUS_CFG.proposed;
          return (
            <div key={m.id} className={`bg-white rounded-2xl p-4 transition hover:shadow-md ${chatMatchId === m.id ? 'ring-2 ring-indigo-500' : ''}`}
              style={{ border: `1px solid ${T.borderDefault}` }}>
              {m.other_user && (
                <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: `1px solid ${T.borderDefault}` }}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                    {(m.other_user.first_name || '?')[0]}{(m.other_user.last_name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: T.textPrimary }}>
                      {m.other_user.first_name} {m.other_user.last_name}
                    </div>
                    {m.other_user.company_name && <div className="text-xs truncate" style={{ color: T.textSecondary }}>{m.other_user.company_name}</div>}
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                    backgroundColor: isDriver ? `${T.accentAmber}15` : `${T.primaryBlue}15`,
                    color: isDriver ? T.accentAmber : T.primaryBlue
                  }}>
                    {isDriver ? '🚶 Passager' : '🚗 Conducteur'}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm mb-2">
                {m.pickup_city && <span className="font-medium" style={{ color: T.textPrimary }}>{m.pickup_city}</span>}
                <ArrowRight className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
                {m.dropoff_city && <span className="font-medium" style={{ color: T.textPrimary }}>{m.dropoff_city}</span>}
              </div>

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < Math.ceil(m.match_score / 20) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="text-xs font-bold ml-1" style={{ color: T.textPrimary }}>{m.match_score}%</span>
                </div>
              </div>

              {(m.detour_km != null || m.distance_covered_km != null) && (
                <div className="flex gap-4 text-xs mb-3" style={{ color: T.textSecondary }}>
                  {m.detour_km != null && (
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" style={{ color: T.primaryBlue }} />
                      Détour: <strong>{m.detour_km.toFixed(1)}km</strong>
                    </span>
                  )}
                  {m.distance_covered_km != null && (
                    <span className="flex items-center gap-1" style={{ color: T.accentGreen }}>
                      <TrendingUp className="w-3 h-3" />
                      Couvert: <strong>{m.distance_covered_km.toFixed(0)}km</strong>
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap pt-2" style={{ borderTop: `1px solid ${T.borderDefault}` }}>
                {m.status === 'proposed' && (
                  <>
                    <button onClick={() => onRespond(m.id, 'accepted')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition hover:shadow-lg"
                      style={{ backgroundColor: T.accentGreen }}>
                      <Check className="w-4 h-4" /> Accepter
                    </button>
                    <button onClick={() => onRespond(m.id, 'declined')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition"
                      style={{ backgroundColor: T.fieldBg, color: T.textSecondary }}>
                      <X className="w-4 h-4" /> Décliner
                    </button>
                  </>
                )}
                {m.status === 'accepted' && (
                  <>
                    {isDriver && (
                      <button onClick={() => onRespond(m.id, 'in_transit')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition hover:shadow-lg">
                        <Navigation className="w-4 h-4" /> Démarrer
                      </button>
                    )}
                    <button onClick={() => setChatMatchId(chatMatchId === m.id ? null : m.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition ${
                        chatMatchId === m.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}>
                      <MessageCircle className="w-4 h-4" /> Discuter
                    </button>
                    <button onClick={() => { if (confirm('Annuler ce trajet ?')) onRespond(m.id, 'cancelled'); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition">
                      <X className="w-3.5 h-3.5" /> Annuler
                    </button>
                  </>
                )}
                {m.status === 'in_transit' && (
                  <>
                    <button onClick={() => { onRespond(m.id, 'completed'); setRatingMatchId(m.id); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition hover:shadow-lg">
                      <Check className="w-4 h-4" /> Arrivé — Terminer
                    </button>
                    <button onClick={() => setChatMatchId(chatMatchId === m.id ? null : m.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition ${
                        chatMatchId === m.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}>
                      <MessageCircle className="w-4 h-4" /> Discuter
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat panel */}
      {chatMatch && (
        <div className={`${chatMatchId ? 'w-full lg:w-1/2' : 'hidden'} flex flex-col bg-white rounded-2xl border-2 border-indigo-200 shadow-xl overflow-hidden`} style={{ height: '600px' }}>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
                {(chatMatch.other_user?.first_name || '?')[0]}{(chatMatch.other_user?.last_name || '?')[0]}
              </div>
              <div className="min-w-0">
                <div className="font-bold truncate">{chatMatch.other_user?.first_name} {chatMatch.other_user?.last_name}</div>
                <div className="text-xs text-white/70 truncate">{chatMatch.pickup_city} → {chatMatch.dropoff_city}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {chatMatch.other_user?.phone && (
                <a href={`tel:${chatMatch.other_user.phone}`} className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition" title="Appeler">
                  <Phone className="w-4 h-4" />
                </a>
              )}
              <button onClick={() => setChatMatchId(null)} className="p-2 hover:bg-white/20 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-sm font-medium" style={{ color: T.textPrimary }}>Organisez votre trajet ensemble</p>
                <p className="text-xs mt-1" style={{ color: T.textSecondary }}>Lieu de rendez-vous, heure précise, etc.</p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isMe = msg.sender_id === userId;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                    isMe ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
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

          <div className="p-3 border-t bg-white shrink-0" style={{ borderColor: T.borderDefault }}>
            <div className="flex items-center gap-2">
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 px-4 py-2.5 rounded-xl border outline-none text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                style={{ borderColor: T.borderDefault }} />
              <button onClick={sendMessage} disabled={!newMessage.trim()}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {ratingMatchId && (
        <RatingModal
          matchId={ratingMatchId}
          onClose={() => setRatingMatchId(null)}
          onRate={onRate}
        />
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// HISTORY TAB — Past rides with ratings
// ══════════════════════════════════════════════════════════════════════════════
function HistoryTab({ historyMatches, userId, onRate }: {
  historyMatches: RideMatch[]; userId: string;
  onRate: (matchId: string, rating: number, badges: string[], comment: string) => void;
}) {
  const [ratingMatchId, setRatingMatchId] = useState<string | null>(null);

  if (historyMatches.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: T.borderDefault }}>
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Aucun historique</h3>
        <p className="text-sm max-w-md mx-auto" style={{ color: T.textSecondary }}>
          Vos trajets terminés, annulés ou déclinés apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {historyMatches.map(m => {
        const isDriver = m.driver_id === userId;
        const cfg = MATCH_STATUS_CFG[m.status] || MATCH_STATUS_CFG.completed;
        return (
          <div key={m.id} className="bg-white rounded-2xl p-4" style={{ border: `1px solid ${T.borderDefault}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {m.other_user && (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-xs">
                      {(m.other_user.first_name || '?')[0]}{(m.other_user.last_name || '?')[0]}
                    </div>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>
                        {m.other_user.first_name} {m.other_user.last_name}
                      </span>
                      <span className="text-xs ml-2" style={{ color: T.textTertiary }}>
                        {isDriver ? '(passager)' : '(conducteur)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm mb-2">
              <span className="font-medium" style={{ color: T.textPrimary }}>{m.pickup_city}</span>
              <ArrowRight className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
              <span className="font-medium" style={{ color: T.textPrimary }}>{m.dropoff_city}</span>
              <span className="text-xs ml-auto" style={{ color: T.textTertiary }}>
                {new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: T.textSecondary }}>
              <span>Score: {m.match_score}%</span>
              {m.distance_covered_km != null && <span>• {m.distance_covered_km.toFixed(0)}km couverts</span>}
            </div>
            {m.status === 'completed' && (
              <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${T.borderDefault}` }}>
                <button onClick={() => setRatingMatchId(m.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition hover:shadow-lg">
                  <Star className="w-4 h-4" /> Noter ce trajet
                </button>
              </div>
            )}
          </div>
        );
      })}

      {ratingMatchId && (
        <RatingModal
          matchId={ratingMatchId}
          onClose={() => setRatingMatchId(null)}
          onRate={onRate}
        />
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// RATING MODAL
// ══════════════════════════════════════════════════════════════════════════════
function RatingModal({ matchId, onClose, onRate }: {
  matchId: string; onClose: () => void;
  onRate: (matchId: string, rating: number, badges: string[], comment: string) => void;
}) {
  const [stars, setStars] = useState(5);
  const [badges, setBadges] = useState<string[]>([]);
  const [comment, setComment] = useState('');

  const BADGE_OPTIONS = [
    { id: 'punctual', label: '⏰ Ponctuel' },
    { id: 'friendly', label: '😊 Sympathique' },
    { id: 'safe_driver', label: '🛡️ Conduite sûre' },
    { id: 'clean_vehicle', label: '✨ Véhicule propre' },
    { id: 'good_communication', label: '💬 Bonne com.' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Star className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold" style={{ color: T.textPrimary }}>Noter ce trajet</h3>
          <p className="text-sm mt-1" style={{ color: T.textSecondary }}>Votre avis aide la communauté</p>
        </div>

        <div className="flex justify-center gap-2 mb-5">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => setStars(n)} className="transition hover:scale-110">
              <Star className={`w-10 h-10 ${n <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
            </button>
          ))}
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold mb-2" style={{ color: T.textSecondary }}>Points forts (optionnel)</p>
          <div className="flex flex-wrap gap-2">
            {BADGE_OPTIONS.map(b => (
              <button key={b.id}
                onClick={() => setBadges(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id])}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  badges.includes(b.id) ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Un commentaire ? (optionnel)"
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-4"
          style={{ borderColor: T.borderDefault }} rows={2} />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: T.fieldBg, color: T.textSecondary }}>
            Plus tard
          </button>
          <button onClick={() => { onRate(matchId, stars, badges, comment); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition">
            Envoyer ★
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CREATE OFFER MODAL — With waypoints + auto-return lift
// ══════════════════════════════════════════════════════════════════════════════
function CreateOfferModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [originCity, setOriginCity] = useState('');
  const [destCity, setDestCity] = useState('');
  const [originGeo, setOriginGeo] = useState<GeoSuggestion | null>(null);
  const [destGeo, setDestGeo] = useState<GeoSuggestion | null>(null);
  const [originSugs, setOriginSugs] = useState<GeoSuggestion[]>([]);
  const [destSugs, setDestSugs] = useState<GeoSuggestion[]>([]);
  const [showOrigin, setShowOrigin] = useState(false);
  const [showDest, setShowDest] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('10:00');
  const [arrivalTime, setArrivalTime] = useState('');
  const [seats, setSeats] = useState(1);
  const [detour, setDetour] = useState(15);
  const [vehicleType, setVehicleType] = useState('car');
  const [waypoints, setWaypoints] = useState<{ city: string; geo: GeoSuggestion | null }[]>([]);
  const [wpInput, setWpInput] = useState('');
  const [wpSugs, setWpSugs] = useState<GeoSuggestion[]>([]);
  const [showWpSug, setShowWpSug] = useState(false);
  const [needsReturn, setNeedsReturn] = useState(false);
  const [returnCity, setReturnCity] = useState('');
  const [returnGeo, setReturnGeo] = useState<GeoSuggestion | null>(null);
  const [returnSugs, setReturnSugs] = useState<GeoSuggestion[]>([]);
  const [showReturnSug, setShowReturnSug] = useState(false);
  const [returnFromTime, setReturnFromTime] = useState('14:00');
  const [returnToTime, setReturnToTime] = useState('20:00');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => { const t = setTimeout(async () => {
    if (originCity.length >= 2 && !originGeo) { const s = await geocodeCity(originCity); setOriginSugs(s); setShowOrigin(s.length > 0); }
    else { setOriginSugs([]); setShowOrigin(false); }
  }, 300); return () => clearTimeout(t); }, [originCity, originGeo]);

  useEffect(() => { const t = setTimeout(async () => {
    if (destCity.length >= 2 && !destGeo) { const s = await geocodeCity(destCity); setDestSugs(s); setShowDest(s.length > 0); }
    else { setDestSugs([]); setShowDest(false); }
  }, 300); return () => clearTimeout(t); }, [destCity, destGeo]);

  useEffect(() => { const t = setTimeout(async () => {
    if (wpInput.length >= 2) { const s = await geocodeCity(wpInput); setWpSugs(s); setShowWpSug(s.length > 0); }
    else { setWpSugs([]); setShowWpSug(false); }
  }, 300); return () => clearTimeout(t); }, [wpInput]);

  useEffect(() => { const t = setTimeout(async () => {
    if (returnCity.length >= 2 && !returnGeo) { const s = await geocodeCity(returnCity); setReturnSugs(s); setShowReturnSug(s.length > 0); }
    else { setReturnSugs([]); setShowReturnSug(false); }
  }, 300); return () => clearTimeout(t); }, [returnCity, returnGeo]);

  const addWaypoint = (s: GeoSuggestion) => {
    setWaypoints(prev => [...prev, { city: s.city, geo: s }]);
    setWpInput(''); setShowWpSug(false);
  };
  const removeWaypoint = (i: number) => setWaypoints(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!originGeo || !destGeo) return;
    setSaving(true); setSubmitError('');
    try {
      const routeCities = waypoints.map(w => ({ city: w.city, lat: w.geo?.lat, lng: w.geo?.lng }));
      const { error } = await supabase.from('ride_offers').insert({
        user_id: userId,
        origin_city: originGeo.city, origin_lat: originGeo.lat, origin_lng: originGeo.lng,
        destination_city: destGeo.city, destination_lat: destGeo.lat, destination_lng: destGeo.lng,
        route_cities: routeCities,
        departure_date: date, departure_time: timeStart,
        estimated_arrival_time: arrivalTime || null,
        seats_available: seats, max_detour_km: detour, vehicle_type: vehicleType,
        needs_return: needsReturn, return_to_city: needsReturn && returnGeo ? returnGeo.city : null,
        notes: notes || null, status: 'active',
      });
      if (error) { setSubmitError(error.message); setSaving(false); return; }

      // Auto-create return lift request
      if (needsReturn && returnGeo && destGeo) {
        const { error: reqError } = await supabase.from('ride_requests').insert({
          user_id: userId,
          pickup_city: destGeo.city, pickup_lat: destGeo.lat, pickup_lng: destGeo.lng,
          destination_city: returnGeo.city, destination_lat: returnGeo.lat, destination_lng: returnGeo.lng,
          needed_date: date,
          time_window_start: returnFromTime, time_window_end: returnToTime,
          max_detour_km: detour, accept_partial: true,
          request_type: 'return', status: 'active',
          notes: `Retour automatique après livraison à ${destGeo.city}`,
        });
        if (reqError) console.error('Auto-return request error:', reqError);
      }

      onCreated(); onClose();
    } catch (err: any) { setSubmitError(err?.message || 'Erreur inconnue'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-2xl z-10 flex items-center gap-3" style={{ borderColor: T.borderDefault }}>
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${T.primaryBlue}15` }}>
            <Car className="w-5 h-5" style={{ color: T.primaryBlue }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: T.textPrimary }}>Je conduis — Publier mon trajet</h2>
            <p className="text-xs" style={{ color: T.textSecondary }}>Proposez vos places libres aux convoyeurs sur votre route</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50"><X className="w-5 h-5" style={{ color: T.textSecondary }} /></button>
        </div>

        <div className="p-5 space-y-4">
          <CityInput label="Ville de départ" value={originCity} geo={originGeo} suggestions={originSugs} showSugs={showOrigin}
            onChange={v => { setOriginCity(v); setOriginGeo(null); }}
            onSelect={s => { setOriginGeo(s); setOriginCity(s.city); setShowOrigin(false); }}
            onFocus={() => originSugs.length > 0 && setShowOrigin(true)}
            dotColor={T.accentGreen} placeholder="Ex: Paris, Lyon..."
          />

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>
              Villes de passage (optionnel)
              <span className="font-normal text-[10px] ml-1">— améliorent le matching</span>
            </label>
            {waypoints.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {waypoints.map((wp, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <MapPin className="w-3 h-3" /> {wp.city}
                    <button onClick={() => removeWaypoint(i)} className="ml-1 hover:text-red-600"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: T.accentAmber }} />
                <input type="text" value={wpInput} onChange={e => setWpInput(e.target.value)}
                  placeholder="Ajouter une ville de passage..." className="flex-1 bg-transparent outline-none text-sm" />
              </div>
              {showWpSug && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-auto" style={{ borderColor: T.borderDefault }}>
                  {wpSugs.map((s, i) => (
                    <button key={i} onClick={() => addWaypoint(s)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2">
                      <Plus className="w-3 h-3 text-amber-500" /> {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <CityInput label="Ville de livraison (arrivée)" value={destCity} geo={destGeo} suggestions={destSugs} showSugs={showDest}
            onChange={v => { setDestCity(v); setDestGeo(null); }}
            onSelect={s => { setDestGeo(s); setDestCity(s.city); setShowDest(false); }}
            onFocus={() => destSugs.length > 0 && setShowDest(true)}
            dotColor={T.primaryBlue} placeholder="Ex: Marseille, Bordeaux..."
          />

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Quand partez-vous ?</label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>Date</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>Départ dès</span>
                <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>Au plus tard</span>
                <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>Arrivée ≈</span>
                <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Places</label>
              <select value={seats} onChange={e => setSeats(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Flexibilité</label>
              <select value={detour} onChange={e => setDetour(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n} km</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Véhicule</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {Object.entries(VEHICLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className={`p-4 rounded-xl transition ${needsReturn ? 'bg-purple-50 border-2 border-purple-200' : 'bg-slate-50'}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={needsReturn} onChange={e => setNeedsReturn(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
              <div>
                <div className="text-sm font-bold" style={{ color: T.textPrimary }}>
                  <RefreshCw className="w-4 h-4 inline mr-1" style={{ color: T.primaryPurple }} />
                  J'ai besoin d'un retour après livraison
                </div>
                <div className="text-xs mt-0.5" style={{ color: T.textSecondary }}>
                  Une demande de lift sera automatiquement créée depuis votre ville de livraison
                </div>
              </div>
            </label>

            {needsReturn && (
              <div className="mt-3 space-y-3 pt-3" style={{ borderTop: `1px solid ${T.primaryPurple}30` }}>
                <CityInput label="Retour vers quelle ville ?" value={returnCity} geo={returnGeo}
                  suggestions={returnSugs} showSugs={showReturnSug}
                  onChange={v => { setReturnCity(v); setReturnGeo(null); }}
                  onSelect={s => { setReturnGeo(s); setReturnCity(s.city); setShowReturnSug(false); }}
                  onFocus={() => returnSugs.length > 0 && setShowReturnSug(true)}
                  dotColor={T.primaryPurple} placeholder="Ex: Paris, base..."
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Disponible dès</label>
                    <input type="time" value={returnFromTime} onChange={e => setReturnFromTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Jusqu'à</label>
                    <input type="time" value={returnToTime} onChange={e => setReturnToTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Infos utiles : autoroute ou nationale, pause prévue..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{submitError}</div>
          )}

          <button onClick={handleSubmit} disabled={!originGeo || !destGeo || saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${T.primaryIndigo}, ${T.primaryPurple})` }}>
            {saving ? 'Publication...' : (
              <>
                <Car className="w-4 h-4" />
                Publier mon trajet{needsReturn ? ' + demande de retour' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CREATE REQUEST MODAL
// ══════════════════════════════════════════════════════════════════════════════
function CreateRequestModal({ userId, onClose, onCreated }: {
  userId: string; onClose: () => void; onCreated: () => void;
}) {
  const [pickupCity, setPickupCity] = useState('');
  const [destCity, setDestCity] = useState('');
  const [pickupGeo, setPickupGeo] = useState<GeoSuggestion | null>(null);
  const [destGeo, setDestGeo] = useState<GeoSuggestion | null>(null);
  const [pickupSugs, setPickupSugs] = useState<GeoSuggestion[]>([]);
  const [destSugs, setDestSugs] = useState<GeoSuggestion[]>([]);
  const [showPickup, setShowPickup] = useState(false);
  const [showDest, setShowDest] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('18:00');
  const [detour, setDetour] = useState(20);
  const [acceptPartial, setAcceptPartial] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => { const t = setTimeout(async () => {
    if (pickupCity.length >= 2 && !pickupGeo) { const s = await geocodeCity(pickupCity); setPickupSugs(s); setShowPickup(s.length > 0); }
    else { setPickupSugs([]); setShowPickup(false); }
  }, 300); return () => clearTimeout(t); }, [pickupCity, pickupGeo]);

  useEffect(() => { const t = setTimeout(async () => {
    if (destCity.length >= 2 && !destGeo) { const s = await geocodeCity(destCity); setDestSugs(s); setShowDest(s.length > 0); }
    else { setDestSugs([]); setShowDest(false); }
  }, 300); return () => clearTimeout(t); }, [destCity, destGeo]);

  const handleSubmit = async () => {
    if (!pickupGeo || !destGeo) return;
    setSaving(true); setSubmitError('');
    try {
      const { error } = await supabase.from('ride_requests').insert({
        user_id: userId,
        pickup_city: pickupGeo.city, pickup_lat: pickupGeo.lat, pickup_lng: pickupGeo.lng,
        destination_city: destGeo.city, destination_lat: destGeo.lat, destination_lng: destGeo.lng,
        needed_date: date, time_window_start: timeStart, time_window_end: timeEnd,
        max_detour_km: detour, accept_partial: acceptPartial,
        request_type: 'custom', status: 'active', notes: notes || null,
      });
      if (error) { setSubmitError(error.message); setSaving(false); return; }
      onCreated(); onClose();
    } catch (err: any) { setSubmitError(err?.message || 'Erreur inconnue'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-4 rounded-t-2xl z-10 flex items-center gap-3" style={{ borderColor: T.borderDefault }}>
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${T.accentAmber}15` }}>
            <Footprints className="w-5 h-5" style={{ color: T.accentAmber }} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold" style={{ color: T.textPrimary }}>Je cherche un lift</h2>
            <p className="text-xs" style={{ color: T.textSecondary }}>Un convoyeur passe peut-être par votre chemin</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50"><X className="w-5 h-5" style={{ color: T.textSecondary }} /></button>
        </div>

        <div className="p-5 space-y-4">
          <CityInput label="Où êtes-vous ?" value={pickupCity} geo={pickupGeo} suggestions={pickupSugs} showSugs={showPickup}
            onChange={v => { setPickupCity(v); setPickupGeo(null); }}
            onSelect={s => { setPickupGeo(s); setPickupCity(s.city); setShowPickup(false); }}
            onFocus={() => pickupSugs.length > 0 && setShowPickup(true)}
            dotColor={T.accentAmber} placeholder="Ville actuelle..."
          />

          <CityInput label="Où voulez-vous aller ?" value={destCity} geo={destGeo} suggestions={destSugs} showSugs={showDest}
            onChange={v => { setDestCity(v); setDestGeo(null); }}
            onSelect={s => { setDestGeo(s); setDestCity(s.city); setShowDest(false); }}
            onFocus={() => destSugs.length > 0 && setShowDest(true)}
            dotColor={T.primaryBlue} placeholder="Ville de destination..."
          />

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Quand êtes-vous disponible ?</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>Date</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>À partir de</span>
                <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
              <div>
                <span className="text-[10px]" style={{ color: T.textTertiary }}>Jusqu'à</span>
                <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Flexibilité trajet</label>
              <select value={detour} onChange={e => setDetour(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n} km</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={acceptPartial} onChange={e => setAcceptPartial(e.target.checked)}
                className="w-4 h-4 rounded" />
              <label className="text-sm" style={{ color: T.textPrimary }}>Accepte un bout du trajet</label>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Infos utiles pour le conducteur..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{submitError}</div>
          )}

          <button onClick={handleSubmit} disabled={!pickupGeo || !destGeo || saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${T.accentAmber}, ${T.deepOrange})` }}>
            {saving ? 'Publication...' : <><Footprints className="w-4 h-4" /> Publier ma demande de lift</>}
          </button>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// CITY INPUT — Reusable autocomplete
// ══════════════════════════════════════════════════════════════════════════════
function CityInput({ label, value, geo, suggestions, showSugs, onChange, onSelect, onFocus, dotColor, placeholder }: {
  label: string; value: string; geo: GeoSuggestion | null;
  suggestions: GeoSuggestion[]; showSugs: boolean;
  onChange: (v: string) => void; onSelect: (s: GeoSuggestion) => void;
  onFocus: () => void; dotColor: string; placeholder: string;
}) {
  return (
    <div className="relative">
      <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dotColor }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus}
          placeholder={placeholder} className="flex-1 bg-transparent outline-none text-sm" />
        {geo && <Check className="w-4 h-4 text-emerald-500" />}
      </div>
      {showSugs && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-auto" style={{ borderColor: T.borderDefault }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => onSelect(s)}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
