// @ts-nocheck
// Réseau Planning V2 — Covoiturage Intelligent entre Convoyeurs
// Carte live + Conducteur/Piéton + Matching IA route-based
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  MapPin, Clock, Users, Plus, X, Search, Check, ChevronRight,
  Calendar, Navigation, Zap, Bell, Star, Truck, Car, User,
  MessageCircle, Send, ArrowRight, Eye, Trash2, RefreshCw,
  BarChart3, Share2, Target, Route, AlertCircle, ThumbsUp,
  Phone, Mail, Award, TrendingUp, Footprints
} from 'lucide-react';

// ============================================================================
// THEME (PremiumTheme compatible)
// ============================================================================
const T = {
  primaryBlue: '#0066FF', primaryTeal: '#14B8A6', accentGreen: '#10B981',
  accentAmber: '#F59E0B', accentRed: '#EF4444', primaryPurple: '#8B5CF6',
  primaryIndigo: '#6366F1', deepOrange: '#F97316',
  textPrimary: '#0F172A', textSecondary: '#64748B', textTertiary: '#94A3B8',
  fieldBg: '#F8FAFC', borderDefault: '#E2E8F0', cardBg: '#FFFFFF',
};

// ============================================================================
// TYPES
// ============================================================================
interface RideOffer {
  id: string; user_id: string; mission_id?: string;
  origin_city: string; origin_lat: number | null; origin_lng: number | null;
  destination_city: string; destination_lat: number | null; destination_lng: number | null;
  route_cities: any[];
  departure_date: string; departure_time: string | null; estimated_arrival_time: string | null;
  flexibility_minutes: number; max_detour_km: number; seats_available: number;
  vehicle_type: string; status: string; needs_return: boolean;
  return_to_city: string | null;
  notes: string | null; created_at: string;
  // Joined
  profile?: { first_name: string; last_name: string; company_name: string; avatar_url: string; phone: string };
}

interface RideRequest {
  id: string; user_id: string; completed_mission_id?: string;
  pickup_city: string; pickup_lat: number | null; pickup_lng: number | null;
  destination_city: string; destination_lat: number | null; destination_lng: number | null;
  needed_date: string; time_window_start: string | null; time_window_end: string | null;
  flexibility_minutes: number; max_detour_km: number; accept_partial: boolean;
  request_type: string; status: string; notes: string | null; created_at: string;
  // Joined
  profile?: { first_name: string; last_name: string; company_name: string; avatar_url: string; phone: string };
}

interface RideMatch {
  id: string; offer_id: string; request_id: string;
  driver_id: string; passenger_id: string;
  pickup_city: string | null; dropoff_city: string | null;
  detour_km: number; distance_covered_km: number;
  match_score: number; match_type: string; status: string;
  rendezvous_time: string | null; rendezvous_address: string | null;
  created_at: string;
  // Joined
  other_user?: { first_name: string; last_name: string; company_name: string; phone: string; email: string; avatar_url: string };
  offer?: RideOffer; request?: RideRequest;
}

interface LiveDriver {
  mission_id: string; driver_id: string;
  current_lat: number; current_lng: number;
  speed: number; bearing: number; last_update: string;
  reference: string; pickup_city: string; delivery_city: string;
  vehicle_brand: string; vehicle_model: string; vehicle_type: string;
  first_name: string; last_name: string; company_name: string;
  offer_id: string | null; seats_available: number | null;
  max_detour_km: number | null; route_cities: any[];
  freshness: string;
}

interface ChatMessage {
  id: string; match_id: string; sender_id: string;
  content: string; is_read: boolean; created_at: string;
}

interface GeoSuggestion {
  label: string; city: string; postcode: string; lat: number; lng: number;
}

// ============================================================================
// GEOCODING
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
  } catch { return []; }
}

// ============================================================================
// CONSTANTS
// ============================================================================
const MATCH_TYPE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  on_route: { label: 'Sur la route', color: T.accentGreen, icon: Route },
  small_detour: { label: 'Petit détour', color: T.primaryBlue, icon: Navigation },
  partial: { label: 'Trajet partiel', color: T.accentAmber, icon: TrendingUp },
  return_match: { label: 'Retour', color: T.primaryPurple, icon: RefreshCw },
};

const VEHICLE_LABELS: Record<string, string> = {
  car: 'Voiture', utility: 'Utilitaire', truck: 'Poids lourd', motorcycle: 'Moto', all: 'Tous',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PlanningNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'map' | 'offers' | 'requests' | 'matches'>('map');
  const [myOffers, setMyOffers] = useState<RideOffer[]>([]);
  const [myRequests, setMyRequests] = useState<RideRequest[]>([]);
  const [allOffers, setAllOffers] = useState<RideOffer[]>([]);
  const [allRequests, setAllRequests] = useState<RideRequest[]>([]);
  const [matches, setMatches] = useState<RideMatch[]>([]);
  const [liveDrivers, setLiveDrivers] = useState<LiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [contactDriverData, setContactDriverData] = useState<{ from?: { city: string; lat: number; lng: number }; to?: { city: string; lat: number; lng: number } } | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Map state
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<LiveDriver | null>(null);

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [offersRes, requestsRes, allOffersRes, allRequestsRes, matchesRes] = await Promise.all([
        supabase.from('ride_offers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('ride_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('ride_offers').select('*, profile:profiles!ride_offers_user_id_profiles_fkey(first_name, last_name, company_name, avatar_url, phone)').in('status', ['active', 'en_route']).order('departure_date', { ascending: true }),
        supabase.from('ride_requests').select('*, profile:profiles!ride_requests_user_id_profiles_fkey(first_name, last_name, company_name, avatar_url, phone)').eq('status', 'active').order('needed_date', { ascending: true }),
        supabase.from('ride_matches').select('*').or(`driver_id.eq.${user.id},passenger_id.eq.${user.id}`).order('match_score', { ascending: false }),
      ]);

      setMyOffers(offersRes.data || []);
      setMyRequests(requestsRes.data || []);
      setAllOffers(allOffersRes.data || []);
      setAllRequests(allRequestsRes.data || []);

      // Enrich matches
      const rawMatches: RideMatch[] = matchesRes.data || [];
      const otherUserIds = [...new Set(rawMatches.map(m => m.driver_id === user.id ? m.passenger_id : m.driver_id))];
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, company_name, phone, email, avatar_url').in('id', otherUserIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
        rawMatches.forEach(m => {
          const otherId = m.driver_id === user.id ? m.passenger_id : m.driver_id;
          m.other_user = profileMap[otherId];
        });
      }
      setMatches(rawMatches);
      setPendingCount(rawMatches.filter(m => m.status === 'proposed').length);

      // Load live drivers for map
      try {
        const { data: drivers } = await supabase.from('active_drivers_on_road').select('*');
        setLiveDrivers(drivers || []);
      } catch { setLiveDrivers([]); }

    } catch (err) { console.error('Error loading data:', err); }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('reseau-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_offers' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_matches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_tracking_live' }, async () => {
        try {
          const { data } = await supabase.from('active_drivers_on_road').select('*');
          setLiveDrivers(data || []);
        } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  const runMatching = async (requestId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('find_ride_matches_for_request', { p_request_id: requestId });
      if (error) throw error;
      for (const match of (data || [])) {
        await supabase.from('ride_matches').upsert({
          offer_id: match.offer_id,
          request_id: requestId,
          driver_id: match.driver_id,
          passenger_id: user.id,
          pickup_city: match.pickup_city,
          dropoff_city: match.dropoff_city,
          detour_km: match.detour_km,
          distance_covered_km: match.distance_covered_km,
          match_score: match.match_score,
          match_type: match.match_type,
          status: 'proposed',
        }, { onConflict: 'offer_id,request_id' });
      }
      await loadData();
    } catch (err) { console.error('Matching error:', err); }
  };

  const respondToMatch = async (matchId: string, response: 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled') => {
    await supabase.from('ride_matches').update({ status: response }).eq('id', matchId);
    await loadData();
  };

  const rateRide = async (matchId: string, rating: number, badges: string[], comment: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const isDriver = match.driver_id === user?.id;
    await supabase.from('ride_ratings').upsert({
      match_id: matchId,
      rater_id: user?.id,
      rated_id: isDriver ? match.passenger_id : match.driver_id,
      rating,
      badges,
      comment: comment || null,
    }, { onConflict: 'match_id,rater_id' });
    await loadData();
  };

  const toggleOfferVisibility = async (offerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
    await supabase.from('ride_offers').update({ status: newStatus }).eq('id', offerId);
    await loadData();
  };

  // ============================================================================
  // TABS
  // ============================================================================
  const tabs = [
    { id: 'map' as const, label: 'Carte Live', icon: MapPin, count: liveDrivers.length },
    { id: 'offers' as const, label: 'Conducteurs', icon: Car, count: allOffers.length },
    { id: 'requests' as const, label: 'Passagers', icon: Footprints, count: allRequests.length },
    { id: 'matches' as const, label: 'Mes Matchs', icon: Zap, count: pendingCount },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================
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
                <h1 className="text-2xl lg:text-3xl font-black">Réseau Planning</h1>
                <p className="text-white/70 text-sm">Covoiturage intelligent entre convoyeurs</p>
              </div>
            </div>
            <p className="text-white/80 text-sm lg:text-base max-w-2xl hidden lg:block">
              Trouvez un convoyeur qui passe par votre ville pour monter avec lui, ou proposez vos places libres.
              L'IA matche automatiquement les trajets compatibles en temps réel.
            </p>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="relative">
              <button onClick={() => setActiveTab('matches')}
                className="p-3 bg-white/20 rounded-xl backdrop-blur-sm hover:bg-white/30 transition" title="Matchs">
                <Bell className="w-5 h-5" />
              </button>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">{pendingCount}</span>
              )}
            </div>
            <button onClick={() => setShowCreateOffer(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-lg text-sm">
              <Car className="w-4 h-4" />
              <span className="hidden sm:inline">J'ai une place</span>
              <span className="sm:hidden">Place</span>
            </button>
            <button onClick={() => setShowCreateRequest(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 lg:px-5 py-2.5 lg:py-3 rounded-xl font-bold hover:bg-white/30 transition text-sm border border-white/30">
              <Footprints className="w-4 h-4" />
              <span className="hidden sm:inline">Je cherche un lift</span>
              <span className="sm:hidden">Lift</span>
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            { label: 'En route', value: liveDrivers.length, icon: Navigation, color: '#10B981' },
            { label: 'Places dispo', value: allOffers.reduce((s, o) => s + (o.seats_available || 0), 0), icon: Car, color: '#0066FF' },
            { label: 'Cherchent un lift', value: allRequests.length, icon: Footprints, color: '#F59E0B' },
            { label: 'Matchs en cours', value: matches.filter(m => m.status === 'accepted').length, icon: Zap, color: '#8B5CF6' },
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
                activeTab === tab.id ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'
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
          {activeTab === 'map' && (
            <LiveMapTab
              liveDrivers={liveDrivers}
              allOffers={allOffers}
              allRequests={allRequests}
              userId={user?.id || ''}
              searchFrom={searchFrom}
              setSearchFrom={setSearchFrom}
              searchTo={searchTo}
              setSearchTo={setSearchTo}
              selectedDriver={selectedDriver}
              setSelectedDriver={setSelectedDriver}
              onContactDriver={async (driver) => {
                const fromGeo = driver.pickup_city ? await geocodeCity(driver.pickup_city) : [];
                const toGeo = driver.delivery_city ? await geocodeCity(driver.delivery_city) : [];
                setContactDriverData({
                  from: fromGeo.length > 0 ? { city: fromGeo[0].city, lat: fromGeo[0].lat, lng: fromGeo[0].lng } : undefined,
                  to: toGeo.length > 0 ? { city: toGeo[0].city, lat: toGeo[0].lat, lng: toGeo[0].lng } : undefined,
                });
                setShowCreateRequest(true);
              }}
            />
          )}
          {activeTab === 'offers' && (
            <OffersTab
              allOffers={allOffers}
              myOffers={myOffers}
              userId={user?.id || ''}
              onRefresh={loadData}
              onCreateNew={() => setShowCreateOffer(true)}
              onToggleVisibility={toggleOfferVisibility}
            />
          )}
          {activeTab === 'requests' && (
            <RequestsTab
              allRequests={allRequests}
              myRequests={myRequests}
              userId={user?.id || ''}
              onRefresh={loadData}
              onRunMatching={runMatching}
              onCreateNew={() => setShowCreateRequest(true)}
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
        </>
      )}

      {/* ── Create Offer Modal ── */}
      {showCreateOffer && (
        <CreateOfferModal userId={user?.id || ''} onClose={() => setShowCreateOffer(false)} onCreated={loadData} />
      )}
      {showCreateRequest && (
        <CreateRequestModal
          userId={user?.id || ''}
          onClose={() => { setShowCreateRequest(false); setContactDriverData(null); }}
          onCreated={loadData}
          initialFrom={contactDriverData?.from}
          initialTo={contactDriverData?.to}
        />
      )}
    </div>
  );
}


// ============================================================================
// LIVE MAP TAB — Carte avec tous les convoyeurs en route
// ============================================================================
function LiveMapTab({ liveDrivers, allOffers, allRequests, userId, searchFrom, setSearchFrom, searchTo, setSearchTo, selectedDriver, setSelectedDriver, onContactDriver }: {
  liveDrivers: LiveDriver[];
  allOffers: RideOffer[];
  allRequests: RideRequest[];
  userId: string;
  searchFrom: string; setSearchFrom: (v: string) => void;
  searchTo: string; setSearchTo: (v: string) => void;
  selectedDriver: LiveDriver | null; setSelectedDriver: (v: LiveDriver | null) => void;
  onContactDriver: (d: LiveDriver) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const routeLinesRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<GeoSuggestion[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeoSuggestion[]>([]);
  const [showFromSug, setShowFromSug] = useState(false);
  const [showToSug, setShowToSug] = useState(false);

  // Search filter state
  const [filterFromCoords, setFilterFromCoords] = useState<{ lat: number; lng: number; city: string } | null>(null);
  const [filterToCoords, setFilterToCoords] = useState<{ lat: number; lng: number; city: string } | null>(null);
  const [filterActive, setFilterActive] = useState(false);
  const [filterResultCount, setFilterResultCount] = useState<number | null>(null);

  // Haversine distance in km
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const loadLeaflet = async () => {
      if (!(window as any).L) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([46.603354, 1.888334], 6);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    };

    loadLeaflet();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const L = (window as any).L;
    const map = mapRef.current;

    // Clear old markers & route lines
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    routeLinesRef.current.forEach(l => map.removeLayer(l));
    routeLinesRef.current = [];

    const RADIUS_KM = 60; // match within 60km of search city

    // Filter logic for drivers
    const filteredDrivers = filterActive ? liveDrivers.filter(d => {
      let matchFrom = true, matchTo = true;
      if (filterFromCoords) {
        // Driver's pickup or current position near search origin
        matchFrom = haversineKm(d.current_lat, d.current_lng, filterFromCoords.lat, filterFromCoords.lng) < RADIUS_KM
          || (d.pickup_city?.toLowerCase().includes(filterFromCoords.city.toLowerCase()));
      }
      if (filterToCoords) {
        // Driver's delivery city near search destination (use city name match as fallback)
        matchTo = d.delivery_city?.toLowerCase().includes(filterToCoords.city.toLowerCase()) || false;
      }
      return matchFrom && matchTo;
    }) : liveDrivers;

    // Filter logic for requests
    const filteredRequests = filterActive ? allRequests.filter(r => {
      if (!r.pickup_lat || !r.pickup_lng) return false;
      let matchFrom = true, matchTo = true;
      if (filterFromCoords) {
        matchFrom = haversineKm(r.pickup_lat, r.pickup_lng, filterFromCoords.lat, filterFromCoords.lng) < RADIUS_KM
          || r.pickup_city?.toLowerCase().includes(filterFromCoords.city.toLowerCase());
      }
      if (filterToCoords) {
        matchTo = r.destination_city?.toLowerCase().includes(filterToCoords.city.toLowerCase()) || false;
      }
      return matchFrom && matchTo;
    }) : allRequests;

    if (filterActive) {
      setFilterResultCount(filteredDrivers.length + filteredRequests.filter(r => r.user_id !== userId).length);
    } else {
      setFilterResultCount(null);
    }

    // Add live driver markers
    filteredDrivers.forEach(d => {
      const isLive = d.freshness === 'live';
      const hasSeats = d.seats_available && d.seats_available > 0;

      const icon = L.divIcon({
        className: 'custom-driver-marker',
        html: `
          <div style="position:relative;cursor:pointer;">
            <div style="
              width:40px;height:40px;border-radius:50%;
              background:${isLive ? (hasSeats ? '#10B981' : '#0066FF') : '#94A3B8'};
              border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
              ${isLive ? 'animation:pulse 2s infinite;' : ''}
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            ${hasSeats ? `<div style="
              position:absolute;top:-5px;right:-5px;
              width:20px;height:20px;border-radius:50%;
              background:#F59E0B;color:white;font-size:11px;font-weight:800;
              display:flex;align-items:center;justify-content:center;
              border:2px solid white;
            ">${d.seats_available}</div>` : ''}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([d.current_lat, d.current_lng], { icon })
        .addTo(map)
        .on('click', () => setSelectedDriver(d));

      const popup = `
        <div style="min-width:200px;font-family:system-ui;">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${d.first_name} ${d.last_name}</div>
          ${d.company_name ? `<div style="font-size:11px;color:#64748B;">${d.company_name}</div>` : ''}
          <div style="margin:8px 0;padding:6px 8px;background:#F8FAFC;border-radius:8px;font-size:12px;">
            <span style="color:#10B981;">&#9679;</span> ${d.pickup_city || '?'} &rarr; <span style="color:#0066FF;">&#9679;</span> ${d.delivery_city || '?'}
          </div>
          <div style="font-size:11px;color:#64748B;">
            ${d.vehicle_brand} ${d.vehicle_model} &middot; ${d.reference}
          </div>
          ${hasSeats ? `<div style="margin-top:6px;font-size:12px;color:#F59E0B;font-weight:600;">&#x1FA91; ${d.seats_available} place${d.seats_available > 1 ? 's' : ''} libre${d.seats_available > 1 ? 's' : ''}</div>` : ''}
        </div>
      `;
      marker.bindPopup(popup);
      markersRef.current.push(marker);
    });

    // Add request markers (piétons)
    filteredRequests.forEach(r => {
      if (!r.pickup_lat || !r.pickup_lng || r.user_id === userId) return;
      const icon = L.divIcon({
        className: 'custom-request-marker',
        html: `
          <div style="
            width:32px;height:32px;border-radius:50%;
            background:#F59E0B;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);
            display:flex;align-items:center;justify-content:center;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <path d="M12 2a4 4 0 0 0-4 4c0 4 4 6 4 6s4-2 4-6a4 4 0 0 0-4-4z"/><circle cx="12" cy="6" r="1.5"/>
              <path d="M12 15v7"/><path d="M9 19l3 3 3-3"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([r.pickup_lat, r.pickup_lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:180px;font-family:system-ui;">
          <div style="font-size:12px;color:#F59E0B;font-weight:700;margin-bottom:4px;">&#x1F6B6; Cherche un lift</div>
          <div style="font-size:13px;font-weight:600;">${r.pickup_city} &rarr; ${r.destination_city}</div>
          <div style="font-size:11px;color:#64748B;margin-top:4px;">
            ${new Date(r.needed_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            ${r.time_window_start ? ` &middot; ${r.time_window_start.slice(0,5)}` : ''}
          </div>
        </div>
      `);
      markersRef.current.push(marker);
    });

    // Draw search area circles when filter is active
    if (filterActive) {
      if (filterFromCoords) {
        const circle = L.circle([filterFromCoords.lat, filterFromCoords.lng], {
          radius: RADIUS_KM * 1000,
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '8,6',
        }).addTo(map);
        routeLinesRef.current.push(circle);

        const fromLabel = L.marker([filterFromCoords.lat, filterFromCoords.lng], {
          icon: L.divIcon({
            className: 'search-label',
            html: `<div style="background:#10B981;color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${filterFromCoords.city}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, -15],
          }),
        }).addTo(map);
        routeLinesRef.current.push(fromLabel);
      }
      if (filterToCoords) {
        const circle = L.circle([filterToCoords.lat, filterToCoords.lng], {
          radius: RADIUS_KM * 1000,
          color: '#0066FF',
          fillColor: '#0066FF',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '8,6',
        }).addTo(map);
        routeLinesRef.current.push(circle);

        const toLabel = L.marker([filterToCoords.lat, filterToCoords.lng], {
          icon: L.divIcon({
            className: 'search-label',
            html: `<div style="background:#0066FF;color:white;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);">${filterToCoords.city}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, -15],
          }),
        }).addTo(map);
        routeLinesRef.current.push(toLabel);
      }

      // Draw dashed line between search cities
      if (filterFromCoords && filterToCoords) {
        const line = L.polyline(
          [[filterFromCoords.lat, filterFromCoords.lng], [filterToCoords.lat, filterToCoords.lng]],
          { color: '#6366F1', weight: 2, dashArray: '10,8', opacity: 0.5 }
        ).addTo(map);
        routeLinesRef.current.push(line);

        // Fit map to show both cities
        map.fitBounds([
          [filterFromCoords.lat, filterFromCoords.lng],
          [filterToCoords.lat, filterToCoords.lng],
        ], { padding: [80, 80] });
      }
    }

  }, [mapReady, liveDrivers, allRequests, userId, filterActive, filterFromCoords, filterToCoords]);

  // Geocode search
  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchFrom.length >= 2) {
        const s = await geocodeCity(searchFrom);
        setFromSuggestions(s);
        setShowFromSug(s.length > 0);
      } else { setFromSuggestions([]); setShowFromSug(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchFrom]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchTo.length >= 2) {
        const s = await geocodeCity(searchTo);
        setToSuggestions(s);
        setShowToSug(s.length > 0);
      } else { setToSuggestions([]); setShowToSug(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTo]);

  const handleSelectFrom = (s: GeoSuggestion) => {
    setSearchFrom(s.city);
    setShowFromSug(false);
    setFilterFromCoords({ lat: s.lat, lng: s.lng, city: s.city });
    if (mapRef.current) mapRef.current.setView([s.lat, s.lng], 10);
  };

  const handleSelectTo = (s: GeoSuggestion) => {
    setSearchTo(s.city);
    setShowToSug(false);
    setFilterToCoords({ lat: s.lat, lng: s.lng, city: s.city });
  };

  const handleSearch = () => {
    if (!filterFromCoords && !filterToCoords) return;
    setFilterActive(true);
  };

  const handleClearFilter = () => {
    setFilterActive(false);
    setFilterResultCount(null);
    setSearchFrom('');
    setSearchTo('');
    setFilterFromCoords(null);
    setFilterToCoords(null);
    if (mapRef.current) mapRef.current.setView([46.603354, 1.888334], 6);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm" style={{ border: `1px solid ${T.borderDefault}` }}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentGreen }} />
              <input type="text" value={searchFrom} onChange={e => setSearchFrom(e.target.value)}
                placeholder="Ville de départ..." className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: T.textPrimary }} onFocus={() => fromSuggestions.length > 0 && setShowFromSug(true)} />
            </div>
            {showFromSug && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-48 overflow-auto" style={{ borderColor: T.borderDefault }}>
                {fromSuggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSelectFrom(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center gap-2 transition">
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: T.textTertiary }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="hidden lg:flex items-center">
            <ArrowRight className="w-5 h-5" style={{ color: T.textTertiary }} />
          </div>
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: T.fieldBg, border: `1px solid ${T.borderDefault}` }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
              <input type="text" value={searchTo} onChange={e => setSearchTo(e.target.value)}
                placeholder="Ville d'arrivée..." className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: T.textPrimary }} onFocus={() => toSuggestions.length > 0 && setShowToSug(true)} />
            </div>
            {showToSug && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-48 overflow-auto" style={{ borderColor: T.borderDefault }}>
                {toSuggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSelectTo(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center gap-2 transition">
                    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: T.textTertiary }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSearch}
            disabled={!filterFromCoords && !filterToCoords}
            className={`px-5 py-3 text-white rounded-xl font-semibold text-sm transition flex items-center gap-2 ${
              filterFromCoords || filterToCoords ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'
            }`}>
            <Search className="w-4 h-4" /> Rechercher
          </button>
          {filterActive && (
            <button onClick={handleClearFilter}
              className="px-4 py-3 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition flex items-center gap-2">
              <X className="w-4 h-4" /> Effacer
            </button>
          )}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs" style={{ color: T.textTertiary }}>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" style={{ boxShadow: '0 0 0 2px white, 0 0 0 3px #10B981' }} /> Conducteur (place dispo)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Conducteur (complet)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Piéton (cherche lift)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" /> Hors ligne
          </span>
        </div>
        {/* Filter result banner */}
        {filterActive && filterResultCount !== null && (
          <div className="flex items-center gap-3 mt-3 px-4 py-2.5 rounded-xl" style={{ backgroundColor: filterResultCount > 0 ? '#EEF2FF' : '#FEF2F2' }}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              filterResultCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-600'
            }`}>
              {filterResultCount}
            </div>
            <span className="text-sm font-medium" style={{ color: filterResultCount > 0 ? '#4338CA' : '#DC2626' }}>
              {filterResultCount > 0
                ? `${filterResultCount} résultat${filterResultCount > 1 ? 's' : ''} trouvé${filterResultCount > 1 ? 's' : ''} ${filterFromCoords ? 'depuis ' + filterFromCoords.city : ''} ${filterToCoords ? '→ ' + filterToCoords.city : ''}`
                : `Aucun résultat ${filterFromCoords ? 'depuis ' + filterFromCoords.city : ''} ${filterToCoords ? '→ ' + filterToCoords.city : ''}`
              }
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-4">
        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden shadow-lg" style={{ border: `1px solid ${T.borderDefault}` }}>
          <div ref={mapContainerRef} style={{ height: '600px', width: '100%' }} />
        </div>

        {/* Sidebar — selected driver or nearby requests */}
        {selectedDriver && (
          <div className="hidden lg:block w-80 bg-white rounded-2xl shadow-lg overflow-hidden" style={{ border: `1px solid ${T.borderDefault}`, maxHeight: '600px' }}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  selectedDriver.freshness === 'live' ? 'bg-emerald-400/30 text-emerald-100' : 'bg-white/20'
                }`}>
                  {selectedDriver.freshness === 'live' ? '● EN DIRECT' : '● ' + Math.round((Date.now() - new Date(selectedDriver.last_update).getTime()) / 60000) + 'min'}
                </span>
                <button onClick={() => setSelectedDriver(null)} className="p-1 hover:bg-white/20 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                  {selectedDriver.first_name?.[0]}{selectedDriver.last_name?.[0]}
                </div>
                <div>
                  <div className="font-bold text-lg">{selectedDriver.first_name} {selectedDriver.last_name}</div>
                  {selectedDriver.company_name && <div className="text-white/70 text-xs">{selectedDriver.company_name}</div>}
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4 overflow-auto" style={{ maxHeight: '420px' }}>
              {/* Route */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: T.textTertiary }}>TRAJET</div>
                <div className="rounded-xl p-3" style={{ backgroundColor: T.fieldBg }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentGreen }} />
                    <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{selectedDriver.pickup_city || 'Départ'}</span>
                  </div>
                  <div className="ml-[5px] w-px h-4" style={{ background: T.borderDefault }} />
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
                    <span className="text-sm font-medium" style={{ color: T.textPrimary }}>{selectedDriver.delivery_city || 'Arrivée'}</span>
                  </div>
                </div>
              </div>
              {/* Vehicle */}
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: T.textTertiary }}>VÉHICULE CONVOYÉ</div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4" style={{ color: T.primaryTeal }} />
                  <span className="text-sm" style={{ color: T.textPrimary }}>{selectedDriver.vehicle_brand} {selectedDriver.vehicle_model}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: T.textSecondary }}>Mission : {selectedDriver.reference}</div>
              </div>
              {/* Seats */}
              {selectedDriver.seats_available && selectedDriver.seats_available > 0 && (
                <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: `${T.accentAmber}10`, border: `1px solid ${T.accentAmber}30` }}>
                  <div className="text-2xl">🪑</div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: T.accentAmber }}>{selectedDriver.seats_available} place{selectedDriver.seats_available > 1 ? 's' : ''} libre{selectedDriver.seats_available > 1 ? 's' : ''}</div>
                    <div className="text-xs" style={{ color: T.textSecondary }}>Détour max : {selectedDriver.max_detour_km || 15}km</div>
                  </div>
                </div>
              )}
              {/* Speed / info */}
              <div className="grid grid-cols-2 gap-2">
                {selectedDriver.speed != null && selectedDriver.speed > 0 && (
                  <div className="rounded-lg p-2 text-center" style={{ backgroundColor: T.fieldBg }}>
                    <div className="text-lg font-bold" style={{ color: T.primaryBlue }}>{Math.round(selectedDriver.speed * 3.6)}</div>
                    <div className="text-[10px]" style={{ color: T.textTertiary }}>km/h</div>
                  </div>
                )}
                <div className="rounded-lg p-2 text-center" style={{ backgroundColor: T.fieldBg }}>
                  <div className="text-lg font-bold" style={{ color: T.accentGreen }}>
                    {selectedDriver.freshness === 'live' ? 'LIVE' : Math.round((Date.now() - new Date(selectedDriver.last_update).getTime()) / 60000) + 'min'}
                  </div>
                  <div className="text-[10px]" style={{ color: T.textTertiary }}>Dernière position</div>
                </div>
              </div>
              {/* Contact button */}
              <button onClick={() => onContactDriver(selectedDriver)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-bold text-sm transition hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${T.primaryIndigo}, ${T.primaryPurple})` }}>
                <MessageCircle className="w-4 h-4" /> Contacter ce convoyeur
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile selected driver card */}
      {selectedDriver && (
        <div className="lg:hidden bg-white rounded-2xl p-4 shadow-lg" style={{ border: `1px solid ${T.borderDefault}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {selectedDriver.first_name?.[0]}{selectedDriver.last_name?.[0]}
              </div>
              <div>
                <div className="font-bold text-sm">{selectedDriver.first_name} {selectedDriver.last_name}</div>
                <div className="text-xs" style={{ color: T.textSecondary }}>
                  {selectedDriver.pickup_city} → {selectedDriver.delivery_city}
                </div>
              </div>
            </div>
            <button onClick={() => setSelectedDriver(null)} className="p-1.5 rounded-lg" style={{ backgroundColor: T.fieldBg }}>
              <X className="w-4 h-4" style={{ color: T.textTertiary }} />
            </button>
          </div>
          <div className="flex gap-2">
            {selectedDriver.seats_available && selectedDriver.seats_available > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${T.accentAmber}15`, color: T.accentAmber }}>
                🪑 {selectedDriver.seats_available} place(s)
              </span>
            )}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              selectedDriver.freshness === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {selectedDriver.freshness === 'live' ? '● En direct' : '● Il y a ' + Math.round((Date.now() - new Date(selectedDriver.last_update).getTime()) / 60000) + 'min'}
            </span>
          </div>
          <button onClick={() => onContactDriver(selectedDriver)}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-sm"
            style={{ background: `linear-gradient(135deg, ${T.primaryIndigo}, ${T.primaryPurple})` }}>
            <MessageCircle className="w-4 h-4" /> Contacter
          </button>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// OFFERS TAB — Conducteurs avec places libres
// ============================================================================
function OffersTab({ allOffers, myOffers, userId, onRefresh, onCreateNew, onToggleVisibility }: {
  allOffers: RideOffer[]; myOffers: RideOffer[]; userId: string;
  onRefresh: () => void; onCreateNew: () => void;
  onToggleVisibility: (id: string, currentStatus: string) => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette offre ?')) return;
    await supabase.from('ride_offers').delete().eq('id', id);
    onRefresh();
  };

  if (allOffers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: T.borderDefault }}>
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="w-10 h-10 text-indigo-500" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Aucun conducteur disponible</h3>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: T.textSecondary }}>
          Soyez le premier à proposer une place dans votre véhicule !
        </p>
        <button onClick={onCreateNew}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition">
          <Plus className="w-5 h-5" /> Proposer une place
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allOffers.map(o => {
        const isMine = o.user_id === userId;
        const driverName = o.profile ? `${o.profile.first_name || ''} ${o.profile.last_name || ''}`.trim() : '';
        return (
          <div key={o.id} className={`bg-white rounded-2xl p-4 lg:p-5 transition hover:shadow-md ${isMine ? 'ring-2 ring-indigo-200' : ''}`}
            style={{ border: `1px solid ${T.borderDefault}` }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {isMine && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Mon offre</span>}
                  {!isMine && driverName && (
                    <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: T.textPrimary }}>
                      <User className="w-3 h-3" style={{ color: T.primaryIndigo }} />
                      {driverName}
                      {o.profile?.company_name && <span className="text-[10px] font-normal" style={{ color: T.textTertiary }}> · {o.profile.company_name}</span>}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'en_route' ? 'bg-blue-100 text-blue-700' :
                    o.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {o.status === 'active' ? 'Disponible' : o.status === 'en_route' ? 'En route' : o.status === 'paused' ? '⏸ En pause' : o.status}
                  </span>
                  {o.seats_available > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${T.accentAmber}15`, color: T.accentAmber }}>
                      🪑 {o.seats_available} place{o.seats_available > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {/* Route */}
                <div className="flex items-center gap-2 text-sm mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentGreen }} />
                  <span className="font-semibold" style={{ color: T.textPrimary }}>{o.origin_city}</span>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
                  <span className="font-semibold" style={{ color: T.textPrimary }}>{o.destination_city}</span>
                </div>
                {/* Details */}
                <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: T.textSecondary }}>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                    {new Date(o.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  {o.departure_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {o.departure_time.slice(0,5)}</span>}
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {VEHICLE_LABELS[o.vehicle_type] || o.vehicle_type}</span>
                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> ±{o.max_detour_km}km détour</span>
                </div>
                {o.needs_return && o.return_to_city && (
                  <div className="mt-2 text-xs font-medium flex items-center gap-1" style={{ color: T.primaryPurple }}>
                    <RefreshCw className="w-3 h-3" /> Cherche aussi un retour → {o.return_to_city}
                  </div>
                )}
              </div>
              {isMine && (
                <div className="flex items-center gap-2">
                  <button onClick={() => onToggleVisibility(o.id, o.status)}
                    className={`p-2 rounded-lg transition ${o.status === 'paused' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                    title={o.status === 'paused' ? 'Réactiver' : 'Mettre en pause'}>
                    {o.status === 'paused' ? <Eye className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(o.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ============================================================================
// REQUESTS TAB — Piétons qui cherchent un lift
// ============================================================================
function RequestsTab({ allRequests, myRequests, userId, onRefresh, onRunMatching, onCreateNew }: {
  allRequests: RideRequest[]; myRequests: RideRequest[]; userId: string;
  onRefresh: () => void; onRunMatching: (id: string) => void; onCreateNew: () => void;
}) {
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette demande ?')) return;
    await supabase.from('ride_requests').delete().eq('id', id);
    onRefresh();
  };

  const REQUEST_TYPE_LABELS: Record<string, string> = {
    return: '↩️ Retour base', pickup_point: '📍 Aller au point d\'enlèvement', custom: '🎯 Personnalisé',
  };

  if (allRequests.length === 0) {
    return (
      <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: T.borderDefault }}>
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Footprints className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Aucune demande de lift</h3>
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: T.textSecondary }}>
          Publiez votre demande pour que les conducteurs vous trouvent !
        </p>
        <button onClick={onCreateNew}
          className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition">
          <Plus className="w-5 h-5" /> Je cherche un lift
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allRequests.map(r => {
        const isMine = r.user_id === userId;
        const requesterName = r.profile ? `${r.profile.first_name || ''} ${r.profile.last_name || ''}`.trim() : '';
        return (
          <div key={r.id} className={`bg-white rounded-2xl p-4 lg:p-5 transition hover:shadow-md ${isMine ? 'ring-2 ring-amber-200' : ''}`}
            style={{ border: `1px solid ${T.borderDefault}` }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  {isMine && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Ma demande</span>}
                  {!isMine && requesterName && (
                    <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: T.textPrimary }}>
                      <User className="w-3 h-3" style={{ color: T.accentAmber }} />
                      {requesterName}
                      {r.profile?.company_name && <span className="text-[10px] font-normal" style={{ color: T.textTertiary }}> · {r.profile.company_name}</span>}
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                  </span>
                  {r.accept_partial && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">Partiel OK</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentAmber }} />
                  <span className="font-semibold" style={{ color: T.textPrimary }}>{r.pickup_city}</span>
                  <ArrowRight className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
                  <span className="font-semibold" style={{ color: T.textPrimary }}>{r.destination_city}</span>
                </div>
                <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: T.textSecondary }}>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                    {new Date(r.needed_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                  {r.time_window_start && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.time_window_start.slice(0,5)} - {r.time_window_end?.slice(0,5) || '?'}</span>}
                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> ±{r.max_detour_km}km accepté</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isMine && (
                  <>
                    <button onClick={() => onRunMatching(r.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white transition hover:shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${T.accentAmber}, ${T.deepOrange})` }}>
                      <Zap className="w-3.5 h-3.5" /> Matcher
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ============================================================================
// MATCHES TAB
// ============================================================================
function MatchesTab({ matches, userId, onRefresh, onRespond, onRate }: {
  matches: RideMatch[]; userId: string; onRefresh: () => void;
  onRespond: (id: string, status: 'accepted' | 'declined' | 'in_transit' | 'completed' | 'cancelled') => void;
  onRate: (matchId: string, rating: number, badges: string[], comment: string) => void;
}) {
  const [chatMatchId, setChatMatchId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [ratingMatchId, setRatingMatchId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingBadges, setRatingBadges] = useState<string[]>([]);
  const [ratingComment, setRatingComment] = useState('');

  const BADGE_OPTIONS = [
    { id: 'punctual', label: '⏰ Ponctuel', icon: '⏰' },
    { id: 'friendly', label: '😊 Sympathique', icon: '😊' },
    { id: 'safe_driver', label: '🛡️ Conduite sûre', icon: '🛡️' },
    { id: 'clean_vehicle', label: '✨ Véhicule propre', icon: '✨' },
    { id: 'good_communication', label: '💬 Bonne com.', icon: '💬' },
  ];

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
        <h3 className="text-xl font-bold mb-2" style={{ color: T.textPrimary }}>Aucun match</h3>
        <p className="text-sm max-w-md mx-auto" style={{ color: T.textSecondary }}>
          Publiez une offre ou une demande, puis lancez le matching IA pour découvrir les trajets compatibles.
        </p>
      </div>
    );
  }

  const chatMatch = chatMatchId ? matches.find(m => m.id === chatMatchId) : null;

  return (
    <div className="flex gap-4">
      <div className={`space-y-3 ${chatMatchId ? 'w-1/2 hidden lg:block' : 'w-full'}`}>
        {matches.map(m => {
          const cfg = MATCH_TYPE_CFG[m.match_type] || MATCH_TYPE_CFG.on_route;
          const MatchIcon = cfg.icon;
          const isDriver = m.driver_id === userId;

          return (
            <div key={m.id} className={`bg-white rounded-2xl p-4 lg:p-5 transition hover:shadow-md ${
              m.status === 'proposed' ? 'ring-2 ring-amber-200' :
              m.status === 'accepted' ? 'ring-2 ring-emerald-200' : ''
            } ${chatMatchId === m.id ? 'ring-2 ring-indigo-500' : ''}`}
              style={{ border: `1px solid ${T.borderDefault}` }}>

              {/* Other user */}
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
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: isDriver ? `${T.accentAmber}15` : `${T.primaryBlue}15`, color: isDriver ? T.accentAmber : T.primaryBlue }}>
                      {isDriver ? '🚶 Passager' : '🚗 Conducteur'}
                    </span>
                  </div>
                </div>
              )}

              {/* Route info */}
              <div className="flex items-center gap-2 text-sm mb-3">
                {m.pickup_city && <span className="font-medium" style={{ color: T.textPrimary }}>{m.pickup_city}</span>}
                <ArrowRight className="w-3.5 h-3.5" style={{ color: T.textTertiary }} />
                {m.dropoff_city && <span className="font-medium" style={{ color: T.textPrimary }}>{m.dropoff_city}</span>}
              </div>

              {/* Score & type */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                  <MatchIcon className="w-3.5 h-3.5" /> {cfg.label}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < Math.ceil(m.match_score / 20) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="text-xs font-bold ml-1" style={{ color: T.textPrimary }}>{m.match_score}%</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="flex items-center gap-1.5" style={{ color: T.textSecondary }}>
                  <Navigation className="w-3 h-3" style={{ color: T.primaryBlue }} />
                  Détour : <strong>{m.detour_km?.toFixed(1)} km</strong>
                </div>
                <div className="flex items-center gap-1.5" style={{ color: T.accentGreen }}>
                  <TrendingUp className="w-3 h-3" />
                  Couvert : <strong>{m.distance_covered_km?.toFixed(0)} km</strong>
                </div>
              </div>

              {/* Status badges */}
              {m.status === 'accepted' && (
                <div className="text-xs font-bold px-3 py-1.5 rounded-lg mb-3 flex items-center gap-1.5" style={{ backgroundColor: `${T.accentGreen}10`, color: T.accentGreen }}>
                  <Check className="w-3.5 h-3.5" /> Accepté — prêt à démarrer
                </div>
              )}
              {m.status === 'in_transit' && (
                <div className="text-xs font-bold px-3 py-1.5 rounded-lg mb-3 flex items-center gap-1.5 animate-pulse" style={{ backgroundColor: '#EEF2FF', color: T.primaryIndigo }}>
                  <Navigation className="w-3.5 h-3.5" /> En cours de trajet...
                </div>
              )}
              {m.status === 'completed' && (
                <div className="text-xs font-bold px-3 py-1.5 rounded-lg mb-3 flex items-center gap-1.5" style={{ backgroundColor: `${T.primaryPurple}10`, color: T.primaryPurple }}>
                  <Award className="w-3.5 h-3.5" /> Trajet terminé
                </div>
              )}
              {m.status === 'declined' && (
                <div className="text-xs font-bold px-3 py-1.5 rounded-lg mb-3" style={{ backgroundColor: `${T.accentRed}10`, color: T.accentRed }}>
                  Décliné
                </div>
              )}
              {m.status === 'cancelled' && (
                <div className="text-xs font-bold px-3 py-1.5 rounded-lg mb-3" style={{ backgroundColor: `${T.accentAmber}10`, color: T.accentAmber }}>
                  Annulé
                </div>
              )}

              {/* Actions */}
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
                    {m.driver_id === userId && (
                      <button onClick={() => onRespond(m.id, 'in_transit')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition hover:shadow-lg bg-indigo-600 hover:bg-indigo-700">
                        <Navigation className="w-4 h-4" /> Démarrer le trajet
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
                      <Check className="w-4 h-4" /> Terminer le trajet
                    </button>
                    <button onClick={() => setChatMatchId(chatMatchId === m.id ? null : m.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition ${
                        chatMatchId === m.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}>
                      <MessageCircle className="w-4 h-4" /> Discuter
                    </button>
                  </>
                )}
                {m.status === 'completed' && (
                  <button onClick={() => setRatingMatchId(m.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition hover:shadow-lg">
                    <Star className="w-4 h-4" /> Noter le trajet
                  </button>
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
                {chatMatch.other_user?.company_name && <div className="text-xs text-white/70 truncate">{chatMatch.other_user.company_name}</div>}
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

          {/* Route context */}
          <div className="bg-indigo-50 px-4 py-2 text-xs text-indigo-700 flex items-center gap-2 border-b border-indigo-100 shrink-0">
            <Route className="w-3.5 h-3.5" />
            <span className="font-medium">{chatMatch.pickup_city} → {chatMatch.dropoff_city}</span>
            <span className="text-indigo-400">•</span>
            <span>{chatMatch.match_score}% match</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {chatMessages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-sm" style={{ color: T.textSecondary }}>Coordonnez votre trajet ensemble</p>
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

          {/* Input */}
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

      {/* Rating Modal */}
      {ratingMatchId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setRatingMatchId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold" style={{ color: T.textPrimary }}>Noter ce trajet</h3>
              <p className="text-sm mt-1" style={{ color: T.textSecondary }}>Votre avis aide la communauté</p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-5">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRatingStars(n)} className="transition hover:scale-110">
                  <Star className={`w-10 h-10 ${n <= ratingStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>

            {/* Badges */}
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: T.textSecondary }}>Points forts (optionnel)</p>
              <div className="flex flex-wrap gap-2">
                {BADGE_OPTIONS.map(b => (
                  <button key={b.id}
                    onClick={() => setRatingBadges(prev => prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id])}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      ratingBadges.includes(b.id) ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)}
              placeholder="Un commentaire ? (optionnel)"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 mb-4"
              style={{ borderColor: T.borderDefault }} rows={2} />

            {/* Submit */}
            <div className="flex gap-3">
              <button onClick={() => setRatingMatchId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: T.fieldBg, color: T.textSecondary }}>
                Plus tard
              </button>
              <button onClick={() => { onRate(ratingMatchId, ratingStars, ratingBadges, ratingComment); setRatingMatchId(null); setRatingStars(5); setRatingBadges([]); setRatingComment(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition">
                Envoyer ★
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
  const [time, setTime] = useState('08:00');
  const [seats, setSeats] = useState(1);
  const [detour, setDetour] = useState(15);
  const [vehicleType, setVehicleType] = useState('car');
  const [needsReturn, setNeedsReturn] = useState(false);
  const [returnCity, setReturnCity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      if (originCity.length >= 2 && !originGeo) { const s = await geocodeCity(originCity); setOriginSugs(s); setShowOrigin(s.length > 0); }
      else { setOriginSugs([]); setShowOrigin(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [originCity, originGeo]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (destCity.length >= 2 && !destGeo) { const s = await geocodeCity(destCity); setDestSugs(s); setShowDest(s.length > 0); }
      else { setDestSugs([]); setShowDest(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [destCity, destGeo]);

  const handleSubmit = async () => {
    if (!originGeo || !destGeo) return;
    setSaving(true);
    setSubmitError('');
    try {
      const { error } = await supabase.from('ride_offers').insert({
        user_id: userId,
        origin_city: originGeo.city, origin_lat: originGeo.lat, origin_lng: originGeo.lng,
        destination_city: destGeo.city, destination_lat: destGeo.lat, destination_lng: destGeo.lng,
        departure_date: date, departure_time: time,
        seats_available: seats, max_detour_km: detour, vehicle_type: vehicleType,
        needs_return: needsReturn, return_to_city: needsReturn ? returnCity : null,
        notes: notes || null, status: 'active',
      });
      if (error) { setSubmitError(error.message); setSaving(false); return; }
      onCreated();
      onClose();
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
            <h2 className="text-lg font-bold" style={{ color: T.textPrimary }}>Proposer une place</h2>
            <p className="text-xs" style={{ color: T.textSecondary }}>J'ai un siège libre dans mon véhicule</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50"><X className="w-5 h-5" style={{ color: T.textSecondary }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Origin */}
          <div className="relative">
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Ville de départ</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentGreen }} />
              <input type="text" value={originCity} onChange={e => { setOriginCity(e.target.value); setOriginGeo(null); }}
                placeholder="Ex: Paris, Lyon..." className="flex-1 bg-transparent outline-none text-sm" />
              {originGeo && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            {showOrigin && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-auto" style={{ borderColor: T.borderDefault }}>
                {originSugs.map((s, i) => (
                  <button key={i} onClick={() => { setOriginGeo(s); setOriginCity(s.city); setShowOrigin(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{s.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Ville d'arrivée</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
              <input type="text" value={destCity} onChange={e => { setDestCity(e.target.value); setDestGeo(null); }}
                placeholder="Ex: Marseille, Bordeaux..." className="flex-1 bg-transparent outline-none text-sm" />
              {destGeo && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            {showDest && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-auto" style={{ borderColor: T.borderDefault }}>
                {destSugs.map((s, i) => (
                  <button key={i} onClick={() => { setDestGeo(s); setDestCity(s.city); setShowDest(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{s.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Heure départ</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
            </div>
          </div>

          {/* Seats + Detour */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Places libres</label>
              <select value={seats} onChange={e => setSeats(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {[1,2,3,4].map(n => <option key={n} value={n}>{n} place{n > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Détour max (km)</label>
              <select value={detour} onChange={e => setDetour(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n} km</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle type */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Type de véhicule</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(VEHICLE_LABELS).filter(([k]) => k !== 'all').map(([key, label]) => (
                <button key={key} onClick={() => setVehicleType(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    vehicleType === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* Needs return */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: T.fieldBg }}>
            <input type="checkbox" checked={needsReturn} onChange={e => setNeedsReturn(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <div>
              <div className="text-sm font-medium" style={{ color: T.textPrimary }}>J'ai aussi besoin d'un retour</div>
              <div className="text-xs" style={{ color: T.textSecondary }}>Après ma livraison, je cherche un lift pour rentrer</div>
            </div>
          </div>
          {needsReturn && (
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Ville de retour souhaitée</label>
              <input type="text" value={returnCity} onChange={e => setReturnCity(e.target.value)}
                placeholder="Ex: Paris..." className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Route prévue, préférences..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
          </div>

          {/* Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!originGeo || !destGeo || saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition hover:shadow-lg"
            style={{ background: `linear-gradient(135deg, ${T.primaryIndigo}, ${T.primaryPurple})` }}>
            {saving ? 'Publication...' : <><Car className="w-4 h-4" /> Publier mon offre de place</>}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// CREATE REQUEST MODAL
// ============================================================================
function CreateRequestModal({ userId, onClose, onCreated, initialFrom, initialTo }: {
  userId: string; onClose: () => void; onCreated: () => void;
  initialFrom?: { city: string; lat: number; lng: number };
  initialTo?: { city: string; lat: number; lng: number };
}) {
  const [pickupCity, setPickupCity] = useState(initialFrom?.city || '');
  const [destCity, setDestCity] = useState(initialTo?.city || '');
  const [pickupGeo, setPickupGeo] = useState<GeoSuggestion | null>(
    initialFrom ? { label: initialFrom.city, city: initialFrom.city, postcode: '', lat: initialFrom.lat, lng: initialFrom.lng } : null
  );
  const [destGeo, setDestGeo] = useState<GeoSuggestion | null>(
    initialTo ? { label: initialTo.city, city: initialTo.city, postcode: '', lat: initialTo.lat, lng: initialTo.lng } : null
  );
  const [pickupSugs, setPickupSugs] = useState<GeoSuggestion[]>([]);
  const [destSugs, setDestSugs] = useState<GeoSuggestion[]>([]);
  const [showPickup, setShowPickup] = useState(false);
  const [showDest, setShowDest] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeStart, setTimeStart] = useState('08:00');
  const [timeEnd, setTimeEnd] = useState('18:00');
  const [detour, setDetour] = useState(20);
  const [acceptPartial, setAcceptPartial] = useState(true);
  const [requestType, setRequestType] = useState('return');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const t = setTimeout(async () => {
      if (pickupCity.length >= 2 && !pickupGeo) { const s = await geocodeCity(pickupCity); setPickupSugs(s); setShowPickup(s.length > 0); }
      else { setPickupSugs([]); setShowPickup(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [pickupCity, pickupGeo]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (destCity.length >= 2 && !destGeo) { const s = await geocodeCity(destCity); setDestSugs(s); setShowDest(s.length > 0); }
      else { setDestSugs([]); setShowDest(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [destCity, destGeo]);

  const handleSubmit = async () => {
    if (!pickupGeo || !destGeo) return;
    setSaving(true);
    setSubmitError('');
    try {
      const { error } = await supabase.from('ride_requests').insert({
        user_id: userId,
        pickup_city: pickupGeo.city, pickup_lat: pickupGeo.lat, pickup_lng: pickupGeo.lng,
        destination_city: destGeo.city, destination_lat: destGeo.lat, destination_lng: destGeo.lng,
        needed_date: date, time_window_start: timeStart, time_window_end: timeEnd,
        max_detour_km: detour, accept_partial: acceptPartial,
        request_type: requestType, notes: notes || null, status: 'active',
      });
      if (error) { setSubmitError(error.message); setSaving(false); return; }
      onCreated();
      onClose();
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
            <p className="text-xs" style={{ color: T.textSecondary }}>Trouvez un convoyeur qui va dans votre direction</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50"><X className="w-5 h-5" style={{ color: T.textSecondary }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Request type */}
          <div>
            <label className="text-xs font-semibold mb-2 block" style={{ color: T.textSecondary }}>Type de besoin</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'return', label: '↩️ Retour à ma base', desc: 'Après une livraison' },
                { key: 'pickup_point', label: '📍 Aller au point d\'enlèvement', desc: 'Rejoindre ma prochaine mission' },
                { key: 'custom', label: '🎯 Autre', desc: 'Trajet personnalisé' },
              ].map(t => (
                <button key={t.key} onClick={() => setRequestType(t.key)}
                  className={`flex-1 min-w-[140px] p-3 rounded-xl text-left transition ${
                    requestType === t.key ? 'bg-amber-50 border-2 border-amber-400' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                  }`}>
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: T.textTertiary }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pickup */}
          <div className="relative">
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Où êtes-vous ?</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.accentAmber }} />
              <input type="text" value={pickupCity} onChange={e => { setPickupCity(e.target.value); setPickupGeo(null); }}
                placeholder="Ville actuelle..." className="flex-1 bg-transparent outline-none text-sm" />
              {pickupGeo && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            {showPickup && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-auto" style={{ borderColor: T.borderDefault }}>
                {pickupSugs.map((s, i) => (
                  <button key={i} onClick={() => { setPickupGeo(s); setPickupCity(s.city); setShowPickup(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{s.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Où voulez-vous aller ?</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: T.primaryBlue }} />
              <input type="text" value={destCity} onChange={e => { setDestCity(e.target.value); setDestGeo(null); }}
                placeholder="Ville de destination..." className="flex-1 bg-transparent outline-none text-sm" />
              {destGeo && <Check className="w-4 h-4 text-emerald-500" />}
            </div>
            {showDest && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border z-50 max-h-40 overflow-auto" style={{ borderColor: T.borderDefault }}>
                {destSugs.map((s, i) => (
                  <button key={i} onClick={() => { setDestGeo(s); setDestCity(s.city); setShowDest(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm">{s.label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Date + Time window */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Dès</label>
              <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Jusqu'à</label>
              <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
            </div>
          </div>

          {/* Detour + partial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Détour accepté</label>
              <select value={detour} onChange={e => setDetour(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}>
                {[5,10,15,20,30,50].map(n => <option key={n} value={n}>{n} km</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" checked={acceptPartial} onChange={e => setAcceptPartial(e.target.checked)}
                className="w-4 h-4 rounded" />
              <label className="text-sm" style={{ color: T.textPrimary }}>Trajet partiel OK</label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: T.textSecondary }}>Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Infos utiles pour le conducteur..."
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }} />
          </div>

          {/* Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {submitError}
            </div>
          )}

          {/* Submit */}
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
