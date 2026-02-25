import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Clock, Share2, Gauge, TrendingUp, Activity, Copy, Check, ArrowLeft, User, Phone, Route } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';
import LeafletTracking from '../components/LeafletTracking';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Mission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  delivery_date?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  public_tracking_link?: string;
  driver?: {
    first_name: string;
    last_name: string;
    phone?: string;
  };
}

interface GPSLocation {
  id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  recorded_at: string;
}

export default function MissionTracking() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [locations, setLocations] = useState<GPSLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Load mission on mount ──
  useEffect(() => {
    if (missionId && user) loadMissionData();
  }, [missionId, user]);

  // ── Subscribe to live GPS once mission loaded ──
  useEffect(() => {
    if (mission) {
      loadTrackingData();
      subscribeToLocationUpdates();
    }
    return () => { channelRef.current?.unsubscribe(); };
  }, [mission?.id]);

  // ── Recalc ETA when driver moves ──
  useEffect(() => {
    if (currentLocation && mission?.delivery_lat && mission?.delivery_lng) {
      calculateETAAndDistance();
    }
  }, [currentLocation, mission]);

  // ──────────────────────────────────────────────
  //  DATA LOADING
  // ──────────────────────────────────────────────

  const loadMissionData = async () => {
    if (!user || !missionId) return;
    try {
      // Try with FK join, fallback without
      let result = await supabase
        .from('missions')
        .select('*, driver:profiles!missions_assigned_user_id_fkey(first_name, last_name, phone)')
        .eq('id', missionId)
        .maybeSingle();

      if (result.error?.message?.includes('fkey') || result.error?.message?.includes('relationship')) {
        result = await supabase.from('missions').select('*').eq('id', missionId).maybeSingle();
      }
      if (result.error) throw result.error;
      setMission(result.data);
    } catch (e) {
      console.error('Error loading mission:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingData = async () => {
    if (!mission) return;
    try {
      // 1. History snapshots (every ~5 min)
      const { data: historyData } = await supabase
        .from('mission_tracking_history')
        .select('*')
        .eq('mission_id', mission.id)
        .order('recorded_at', { ascending: true });

      const historyLocations: GPSLocation[] = (historyData || []).map((r: any) => ({
        id: r.id,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        speed: r.speed ? parseFloat(r.speed) : null,
        heading: r.bearing ? parseFloat(r.bearing) : null,
        accuracy: r.accuracy ? parseFloat(r.accuracy) : null,
        recorded_at: r.recorded_at,
      }));

      // 2. Live position (UPSERT row)
      const { data: liveData } = await supabase
        .from('mission_tracking_live')
        .select('*')
        .eq('mission_id', mission.id)
        .eq('is_active', true)
        .maybeSingle();

      if (liveData) {
        const livePos: GPSLocation = {
          id: liveData.id,
          latitude: parseFloat(liveData.latitude),
          longitude: parseFloat(liveData.longitude),
          speed: liveData.speed ? parseFloat(liveData.speed) : null,
          heading: liveData.bearing ? parseFloat(liveData.bearing) : null,
          accuracy: liveData.accuracy ? parseFloat(liveData.accuracy) : null,
          recorded_at: liveData.last_update,
        };
        const lastHistTime = historyLocations.length > 0
          ? new Date(historyLocations[historyLocations.length - 1].recorded_at).getTime()
          : 0;
        if (new Date(livePos.recorded_at).getTime() > lastHistTime) {
          setLocations([...historyLocations, livePos]);
        } else {
          setLocations(historyLocations);
        }
        setCurrentLocation(livePos);
      } else {
        setLocations(historyLocations);
        if (historyLocations.length > 0) setCurrentLocation(historyLocations[historyLocations.length - 1]);
      }
    } catch (e) {
      console.error('Error loading tracking:', e);
    }
  };

  // ──────────────────────────────────────────────
  //  REALTIME
  // ──────────────────────────────────────────────

  const subscribeToLocationUpdates = () => {
    if (!mission) return;
    const ch = supabase
      .channel(`mission-tracking:${mission.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mission_tracking_live',
        filter: `mission_id=eq.${mission.id}`,
      }, (payload: any) => {
        if (!payload.new) return;
        const loc: GPSLocation = {
          id: payload.new.id,
          latitude: parseFloat(payload.new.latitude),
          longitude: parseFloat(payload.new.longitude),
          speed: payload.new.speed ? parseFloat(payload.new.speed) : null,
          heading: payload.new.bearing ? parseFloat(payload.new.bearing) : null,
          accuracy: payload.new.accuracy ? parseFloat(payload.new.accuracy) : null,
          recorded_at: payload.new.last_update,
        };
        setCurrentLocation(loc);
        setLocations(prev => {
          const filtered = prev.filter(l => l.id !== loc.id);
          return [...filtered, loc];
        });
      })
      .subscribe();
    channelRef.current = ch;
  };

  // ──────────────────────────────────────────────
  //  ETA (OSRM + Haversine fallback)
  // ──────────────────────────────────────────────

  const calculateETAAndDistance = async () => {
    if (!currentLocation || !mission?.delivery_lat || !mission?.delivery_lng) return;
    try {
      const resp = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${mission.delivery_lng},${mission.delivery_lat}?overview=false`
      );
      const data = await resp.json();
      if (data.routes?.[0]) {
        setDistanceRemaining(data.routes[0].distance / 1000);
        setEta(Math.round(data.routes[0].duration / 60));
        return;
      }
    } catch { /* fallback */ }

    // Haversine fallback
    const dist = haversine(currentLocation.latitude, currentLocation.longitude, mission.delivery_lat, mission.delivery_lng);
    setDistanceRemaining(dist);
    const speed = currentLocation.speed || 0;
    setEta(speed > 3 ? Math.round((dist * 1000 / speed) / 60) : Math.round(dist / 60 * 60));
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ──────────────────────────────────────────────
  //  SHARE LINK
  // ──────────────────────────────────────────────

  const generatePublicLink = async () => {
    if (!mission) return;
    setGeneratingLink(true);
    try {
      if (mission.public_tracking_link) {
        await navigator.clipboard.writeText(mission.public_tracking_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        return;
      }

      const { data: token, error } = await supabase
        .rpc('generate_public_tracking_link', { p_mission_id: mission.id });
      if (error) throw new Error(error.message);

      const publicLink = `${window.location.origin}/tracking/${token}`;
      await supabase.from('missions').update({ public_tracking_link: publicLink }).eq('id', mission.id);
      setMission(prev => prev ? { ...prev, public_tracking_link: publicLink } : prev);
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err: any) {
      console.error('Share error:', err);
      showToast('error', 'Erreur', err.message || 'Erreur lors de la génération du lien');
    } finally {
      setGeneratingLink(false);
    }
  };

  // ──────────────────────────────────────────────
  //  DERIVED STATE
  // ──────────────────────────────────────────────

  const speedKmh = currentLocation?.speed ? Math.round(currentLocation.speed * 3.6) : 0;
  const isMoving = speedKmh > 3;
  const timeSinceUpdate = currentLocation
    ? Math.round((Date.now() - new Date(currentLocation.recorded_at).getTime()) / 1000)
    : null;
  const isOnline = timeSinceUpdate !== null && timeSinceUpdate < 120;

  const formatDuration = (min: number) => {
    if (min === 0) return 'Calcul...';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ''}`;
  };

  // ──────────────────────────────────────────────
  //  RENDER – Loading / Not found
  // ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-teal-500" />
          </div>
          <p className="text-lg font-semibold text-slate-700">Chargement du tracking...</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50/30">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Mission introuvable</h2>
          <p className="text-slate-600 mb-6">Cette mission n'existe pas ou vous n'y avez pas accès.</p>
          <Link to="/tracking" className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700">
            Retour au tracking
          </Link>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  //  RENDER – Main page
  // ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-cyan-50/20">
      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/tracking')} className="p-2 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-black">{mission.reference}</h1>
                  {mission.status === 'in_progress' && isOnline && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/30 backdrop-blur rounded-full text-xs font-bold">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>
                <p className="text-white/80">
                  {mission.vehicle_brand} {mission.vehicle_model}
                  {mission.vehicle_plate && <span className="ml-2 font-mono bg-white/20 px-2 py-0.5 rounded">{mission.vehicle_plate}</span>}
                </p>
              </div>
            </div>

            <button
              onClick={generatePublicLink}
              disabled={generatingLink}
              className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-white/90 text-teal-600 rounded-xl font-bold transition-all hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {copied ? <><Check className="w-5 h-5" /> Lien copié!</> : generatingLink ? <><Copy className="w-5 h-5 animate-spin" /> Génération...</> : <><Share2 className="w-5 h-5" /> Partager</>}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6 space-y-6">

        {/* ── STAT CARDS (only when in_progress) ── */}
        {mission.status === 'in_progress' && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Vitesse */}
            <StatCard icon={<Gauge className="w-6 h-6 text-blue-600" />} label="Vitesse" borderClass="border-blue-200" bgClass="bg-blue-500/10" extra={isMoving && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto" />}>
              <p className="text-3xl font-black text-blue-600 mt-1">{speedKmh}<span className="text-sm ml-1 font-semibold">km/h</span></p>
            </StatCard>

            {/* Distance */}
            <StatCard icon={<Route className="w-6 h-6 text-amber-600" />} label="Distance" borderClass="border-amber-200" bgClass="bg-amber-500/10">
              <p className="text-3xl font-black text-amber-600 mt-1">{distanceRemaining.toFixed(1)}<span className="text-sm ml-1 font-semibold">km</span></p>
            </StatCard>

            {/* ETA */}
            <StatCard icon={<Clock className="w-6 h-6 text-green-600" />} label="ETA" borderClass="border-green-200" bgClass="bg-green-500/10">
              <p className="text-3xl font-black text-green-600 mt-1">{formatDuration(eta)}</p>
              {eta > 0 && (
                <p className="text-xs text-slate-400 mt-1">≈ {new Date(Date.now() + eta * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </StatCard>

            {/* Statut */}
            <StatCard icon={<Activity className="w-6 h-6 text-teal-600" />} label="Statut" borderClass="border-teal-200" bgClass="bg-teal-500/10">
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                  {isOnline ? (isMoving ? 'En mouvement' : 'À l\'arrêt') : 'Hors ligne'}
                </p>
              </div>
              {currentLocation && <p className="text-xs text-slate-400 mt-1">MAJ: {new Date(currentLocation.recorded_at).toLocaleTimeString('fr-FR')}</p>}
            </StatCard>

            {/* Chauffeur */}
            <StatCard icon={<User className="w-6 h-6 text-purple-600" />} label="Chauffeur" borderClass="border-purple-200" bgClass="bg-purple-500/10">
              {mission.driver ? (
                <>
                  <p className="text-lg font-black text-purple-600 mt-1">{mission.driver.first_name} {mission.driver.last_name}</p>
                  {mission.driver.phone && (
                    <a href={`tel:${mission.driver.phone}`} className="flex items-center gap-1 text-xs text-purple-400 mt-1 hover:text-purple-600">
                      <Phone className="w-3 h-3" /> {mission.driver.phone}
                    </a>
                  )}
                </>
              ) : <p className="text-lg font-bold text-slate-300 mt-1">Non assigné</p>}
            </StatCard>
          </div>
        )}

        {/* ── ITINÉRAIRE ── */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-start justify-between mb-5">
            <h3 className="text-xl font-black text-slate-900">Itinéraire</h3>
            <StatusBadge status={mission.status} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <AddressBlock type="pickup" address={mission.pickup_address} date={mission.pickup_date} />
            <AddressBlock type="delivery" address={mission.delivery_address} date={mission.delivery_date} />
          </div>
        </div>

        {/* ── CARTE GPS ── */}
        {mission.pickup_lat && mission.delivery_lat && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">{currentLocation ? 'Position en temps réel' : 'Itinéraire prévu'}</h3>
              {mission.status === 'in_progress' && isOnline && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold">
                  <Activity className="w-4 h-4 animate-pulse" /> LIVE
                </div>
              )}
            </div>
            <div className="w-full h-[600px] rounded-xl overflow-hidden border-2 border-slate-200">
              <LeafletTracking
                pickupLat={mission.pickup_lat!}
                pickupLng={mission.pickup_lng!}
                pickupAddress={mission.pickup_address}
                deliveryLat={mission.delivery_lat!}
                deliveryLng={mission.delivery_lng!}
                deliveryAddress={mission.delivery_address}
                driverLat={currentLocation?.latitude}
                driverLng={currentLocation?.longitude}
                driverSpeed={currentLocation?.speed ?? undefined}
                driverHeading={currentLocation?.heading ?? undefined}
                driverName={mission.driver ? `${mission.driver.first_name} ${mission.driver.last_name}` : 'Chauffeur'}
                vehiclePlate={mission.vehicle_plate}
                status={mission.status === 'in_progress' ? 'En cours' : 'En attente'}
                height="600px"
                showControls={true}
                gpsPath={locations.length > 1 ? locations.map(l => [l.latitude, l.longitude] as [number, number]) : undefined}
              />
            </div>
          </div>
        )}

        {/* ── TIMELINE GPS ── */}
        {locations.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              Historique GPS <span className="text-base font-semibold text-slate-400">({locations.length} points)</span>
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
              {locations.slice(-15).reverse().map((loc, idx) => {
                const locSpeed = loc.speed ? Math.round(loc.speed * 3.6) : 0;
                const speedColor = locSpeed > 90 ? 'text-red-600' : locSpeed > 50 ? 'text-amber-600' : 'text-blue-600';
                return (
                  <div key={loc.id + idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className={`p-2 rounded-lg ${locSpeed > 0 ? 'bg-teal-500/10' : 'bg-slate-200/60'}`}>
                      <TrendingUp className={`w-5 h-5 ${locSpeed > 0 ? 'text-teal-600' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Position #{locations.length - idx}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                        {loc.accuracy && <span> · ±{Math.round(loc.accuracy)}m</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${speedColor}`}>{locSpeed > 0 ? `${locSpeed} km/h` : 'Arrêté'}</p>
                      <p className="text-xs text-slate-400">{new Date(loc.recorded_at).toLocaleTimeString('fr-FR')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LIEN PUBLIC ── */}
        {mission.public_tracking_link && (
          <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Share2 className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-bold text-teal-900">Lien de suivi public</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-teal-200">
                <p className="text-sm text-teal-700 font-mono truncate">{mission.public_tracking_link}</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(mission.public_tracking_link!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="px-4 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? 'Copié!' : 'Copier'}
              </button>
            </div>
          </div>
        )}

        {/* ── WAITING STATE ── */}
        {mission.status !== 'in_progress' && !currentLocation && (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">En attente du chauffeur</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              Le suivi GPS sera disponible dès que le chauffeur démarrera la mission.
              La carte affichera sa position en temps réel avec la vitesse et l'ETA.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
//  SUB-COMPONENTS
// ──────────────────────────────────────────────

function StatCard({ icon, label, borderClass, bgClass, extra, children }: {
  icon: React.ReactNode; label: string; borderClass: string; bgClass: string; extra?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-lg border-2 ${borderClass} hover:shadow-xl transition-shadow`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 ${bgClass} rounded-xl`}>{icon}</div>
        {extra}
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === 'in_progress'
    ? { cls: 'bg-blue-500/10 text-blue-600 border-blue-200', txt: '🚗 En cours' }
    : status === 'completed'
    ? { cls: 'bg-green-500/10 text-green-600 border-green-200', txt: '✅ Terminé' }
    : { cls: 'bg-amber-500/10 text-amber-600 border-amber-200', txt: '⏳ En attente' };
  return <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${cfg.cls}`}>{cfg.txt}</div>;
}

function AddressBlock({ type, address, date }: { type: 'pickup' | 'delivery'; address: string; date?: string }) {
  const isPickup = type === 'pickup';
  return (
    <div className="flex items-start gap-3">
      <div className={`p-2.5 ${isPickup ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-xl mt-1`}>
        <MapPin className={`w-5 h-5 ${isPickup ? 'text-green-600' : 'text-red-600'}`} />
      </div>
      <div>
        <p className={`text-xs font-bold ${isPickup ? 'text-green-600' : 'text-red-600'} uppercase tracking-wider`}>
          {isPickup ? 'Départ' : 'Destination'}
        </p>
        <p className="text-slate-900 font-semibold mt-1">{address}</p>
        {date && <p className="text-xs text-slate-400 mt-1">{new Date(date).toLocaleString('fr-FR')}</p>}
      </div>
    </div>
  );
}
