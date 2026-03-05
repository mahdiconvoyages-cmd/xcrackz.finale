import { useEffect, useState, useRef } from 'react';
import { Navigation, Gauge, Clock, MapPin, Activity, Check, X, Search, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
  driver?: {
    first_name: string;
    last_name: string;
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

export default function PublicTrackingByCode() {
  const [code, setCode] = useState('');
  const [mission, setMission] = useState<Mission | null>(null);
  const [locations, setLocations] = useState<GPSLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Calculate ETA when position changes
  useEffect(() => {
    if (currentLocation && mission?.delivery_lat && mission?.delivery_lng) {
      calculateETAAndDistance();
    }
  }, [currentLocation, mission]);

  const lookupMission = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setMission(null);
    setLocations([]);
    setCurrentLocation(null);

    // Cleanup previous subscriptions
    channelRef.current?.unsubscribe();
    if (pollingRef.current) clearInterval(pollingRef.current);

    try {
      // Nettoyer le code saisi (enlever espaces, tirets, mettre en majuscule)
      const cleanedCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Chercher la mission par share_code OU share_code_clean
      const { data, error: fetchError } = await supabase
        .from('missions')
        .select(`
          id, reference, status, vehicle_brand, vehicle_model, vehicle_plate,
          pickup_address, delivery_address, pickup_date, delivery_date,
          pickup_lat, pickup_lng, delivery_lat, delivery_lng,
          share_code,
          driver:profiles!missions_assigned_user_id_fkey(first_name, last_name)
        `)
        .or(`share_code.eq.${code.trim().toUpperCase()},share_code_clean.eq.${cleanedCode}`)
        .maybeSingle()
        .then((res: { data: any; error: any }) => {
          // Fallback si la FK n'existe pas
          if (res.error?.message?.includes('fkey') || res.error?.message?.includes('relationship')) {
            return supabase
              .from('missions')
              .select(`
                id, reference, status, vehicle_brand, vehicle_model, vehicle_plate,
                pickup_address, delivery_address, pickup_date, delivery_date,
                pickup_lat, pickup_lng, delivery_lat, delivery_lng,
                share_code
              `)
              .or(`share_code.eq.${code.trim().toUpperCase()},share_code_clean.eq.${cleanedCode}`)
              .maybeSingle();
          }
          return res;
        });

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Aucune mission trouvée avec ce code. Vérifiez le code et réessayez.');
        setLoading(false);
        return;
      }

      if (data.status !== 'in_progress' && data.status !== 'completed') {
        setError('Cette mission n\'a pas encore démarré. Le suivi sera disponible une fois la mission en cours.');
        setLoading(false);
        return;
      }

      setMission(data as Mission);
      await loadMissionLocations(data.id);
      subscribeToLocationUpdates(data.id);
    } catch (err: any) {
      console.error('Error looking up mission:', err);
      setError(err.message || 'Erreur lors de la recherche de la mission');
    } finally {
      setLoading(false);
    }
  };

  const loadMissionLocations = async (missionId: string) => {
    try {
      // Historique
      const { data: historyData } = await supabase
        .from('mission_tracking_history')
        .select('*')
        .eq('mission_id', missionId)
        .order('recorded_at', { ascending: true });

      const historyLocations = (historyData || []).map((loc: any) => ({
        id: loc.id,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        speed: loc.speed ? parseFloat(loc.speed) : null,
        heading: loc.bearing ? parseFloat(loc.bearing) : null,
        accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        recorded_at: loc.recorded_at,
      }));

      // Position live
      const { data: liveData } = await supabase
        .from('mission_tracking_live')
        .select('*')
        .eq('mission_id', missionId)
        .eq('is_active', true)
        .maybeSingle();

      if (liveData) {
        const currentPos: GPSLocation = {
          id: liveData.id,
          latitude: parseFloat(liveData.latitude),
          longitude: parseFloat(liveData.longitude),
          speed: liveData.speed ? parseFloat(liveData.speed) : null,
          heading: liveData.bearing ? parseFloat(liveData.bearing) : null,
          accuracy: liveData.accuracy ? parseFloat(liveData.accuracy) : null,
          recorded_at: liveData.last_update,
        };

        const lastHistoryTime = historyLocations.length > 0
          ? new Date(historyLocations[historyLocations.length - 1].recorded_at).getTime()
          : 0;
        const liveTime = new Date(currentPos.recorded_at).getTime();

        if (liveTime > lastHistoryTime) {
          setLocations([...historyLocations, currentPos]);
        } else {
          setLocations(historyLocations);
        }
        setCurrentLocation(currentPos);
      } else {
        setLocations(historyLocations);
        if (historyLocations.length > 0) {
          setCurrentLocation(historyLocations[historyLocations.length - 1]);
        }
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const subscribeToLocationUpdates = (missionId: string) => {
    const channel = supabase
      .channel(`public-tracking-code:${missionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mission_tracking_live',
        filter: `mission_id=eq.${missionId}`,
      }, (payload: any) => {
        if (!payload.new) return;
        const newLocation: GPSLocation = {
          id: payload.new.id,
          latitude: parseFloat(payload.new.latitude),
          longitude: parseFloat(payload.new.longitude),
          speed: payload.new.speed ? parseFloat(payload.new.speed) : null,
          heading: payload.new.bearing ? parseFloat(payload.new.bearing) : null,
          accuracy: payload.new.accuracy ? parseFloat(payload.new.accuracy) : null,
          recorded_at: payload.new.last_update,
        };
        setCurrentLocation(newLocation);
        setLocations(prev => {
          const filtered = prev.filter(loc => loc.id !== newLocation.id);
          return [...filtered, newLocation];
        });
      })
      .subscribe();

    channelRef.current = channel;

    // Polling fallback
    channel.on('system' as any, {}, (payload: any) => {
      if (payload.status === 'CLOSED' || payload.status === 'TIMED_OUT') {
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => loadMissionLocations(missionId), 30000);
        }
      } else if (payload.status === 'SUBSCRIBED') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    });
  };

  const calculateETAAndDistance = async () => {
    if (!currentLocation || !mission?.delivery_lat || !mission?.delivery_lng) return;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${mission.delivery_lng},${mission.delivery_lat}?overview=false`;
      const response = await fetch(osrmUrl);
      const data = await response.json();
      if (data.routes?.[0]) {
        setDistanceRemaining(data.routes[0].distance / 1000);
        setEta(Math.round(data.routes[0].duration / 60));
        return;
      }
    } catch (e) {
      console.warn('OSRM fallback:', e);
    }

    // Fallback Haversine
    const R = 6371;
    const dLat = (mission.delivery_lat - currentLocation.latitude) * Math.PI / 180;
    const dLon = (mission.delivery_lng - currentLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(currentLocation.latitude * Math.PI / 180) *
      Math.cos(mission.delivery_lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    setDistanceRemaining(distance);
    const speed = currentLocation.speed || 0;
    setEta(speed > 3 ? Math.round((distance * 1000) / speed / 60) : Math.round(distance / 60 * 60));
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'Calcul...';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') lookupMission();
  };

  // ─── CODE ENTRY SCREEN ───
  if (!mission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-xl">
          <div className="max-w-lg mx-auto px-4 py-6 sm:py-10 text-center">
            <div className="p-3 sm:p-4 bg-white/20 backdrop-blur rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">Suivi de livraison</h1>
            <p className="text-white/80 text-sm sm:text-base mt-2">
              Entrez le code de suivi fourni par votre convoyeur
            </p>
          </div>
        </div>

        {/* Code entry form */}
        <div className="flex-1 flex items-start justify-center px-4 py-8 sm:py-16">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <label htmlFor="tracking-code" className="block text-sm font-bold text-slate-700 mb-3">
                Code de suivi
              </label>
              <div className="flex gap-3">
                <input
                  id="tracking-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  placeholder="Ex: XZ-ABC-123"
                  className="flex-1 px-4 py-3.5 border-2 border-slate-200 rounded-xl text-center text-lg sm:text-xl font-mono font-bold tracking-widest focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={lookupMission}
                  disabled={loading || !code.trim()}
                  className="px-5 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-colors shrink-0"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex gap-3">
                    <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  Le code de suivi vous est communiqué par votre convoyeur par SMS, WhatsApp ou e-mail.
                </p>
              </div>
            </div>

            {/* Branding */}
            <p className="text-center text-xs text-slate-400 mt-6">
              Propulsé par <span className="font-bold text-teal-600">ChecksFleet</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── TRACKING DISPLAY ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur rounded-lg sm:rounded-xl shrink-0">
                <Navigation className="w-5 h-5 sm:w-8 sm:h-8 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black truncate">Suivi en Direct</h1>
                <p className="text-white/90 text-xs sm:text-sm truncate">{mission.reference}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {mission.status === 'in_progress' && (
                <div className="flex items-center gap-1 px-2 sm:px-4 py-1.5 bg-white/20 backdrop-blur rounded-lg text-xs sm:text-sm">
                  <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5 animate-pulse" />
                  <span className="font-bold">LIVE</span>
                </div>
              )}
              <button
                onClick={() => { setMission(null); setCode(''); setError(null); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-colors text-xs sm:text-sm font-bold"
              >
                Autre code
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* MAP */}
        {mission.pickup_lat && mission.delivery_lat && (
          <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-base sm:text-xl font-black text-slate-900">
                {currentLocation ? 'Position en temps réel' : 'Trajet prévu'}
              </h3>
              {mission.status === 'in_progress' && currentLocation && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500 text-white rounded-lg text-xs font-bold">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4 animate-pulse" />
                  <span>LIVE</span>
                </div>
              )}
              {mission.status === 'completed' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 text-white rounded-lg text-xs font-bold">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>TERMINÉ</span>
                </div>
              )}
            </div>
            <LeafletTracking
              pickupLat={mission.pickup_lat!}
              pickupLng={mission.pickup_lng!}
              pickupAddress={mission.pickup_address}
              deliveryLat={mission.delivery_lat!}
              deliveryLng={mission.delivery_lng!}
              deliveryAddress={mission.delivery_address}
              driverLat={currentLocation?.latitude ?? undefined}
              driverLng={currentLocation?.longitude ?? undefined}
              driverSpeed={currentLocation?.speed ?? undefined}
              driverHeading={currentLocation?.heading ?? undefined}
              driverName={mission.driver ? `${mission.driver.first_name} ${mission.driver.last_name}` : 'Chauffeur'}
              vehiclePlate={mission.vehicle_plate}
              status={mission.status === 'in_progress' ? 'En cours' : mission.status === 'completed' ? 'Terminé' : 'En attente'}
              height={window.innerWidth < 640 ? '260px' : '480px'}
              showControls={true}
              gpsPath={locations.length > 0 ? locations.map(loc => [loc.latitude, loc.longitude]) : []}
            />
          </div>
        )}

        {/* STATS */}
        {mission.status === 'in_progress' && currentLocation && (
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-md border border-blue-200">
              <div className="flex items-center mb-2 sm:mb-4">
                <div className="p-1.5 sm:p-3 bg-blue-500/10 rounded-lg sm:rounded-xl">
                  <Gauge className="w-4 h-4 sm:w-7 sm:h-7 text-blue-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase mb-1">Vitesse</p>
              <p className="text-lg sm:text-4xl font-black text-blue-600 leading-tight">
                {currentLocation.speed ? Math.round(currentLocation.speed * 3.6) : 0}
                <span className="text-xs sm:text-lg ml-0.5">km/h</span>
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-md border border-amber-200">
              <div className="flex items-center mb-2 sm:mb-4">
                <div className="p-1.5 sm:p-3 bg-amber-500/10 rounded-lg sm:rounded-xl">
                  <MapPin className="w-4 h-4 sm:w-7 sm:h-7 text-amber-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase mb-1">Distance</p>
              <p className="text-lg sm:text-4xl font-black text-amber-600 leading-tight">
                {distanceRemaining.toFixed(0)}
                <span className="text-xs sm:text-lg ml-0.5">km</span>
              </p>
            </div>
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-md border border-green-200">
              <div className="flex items-center mb-2 sm:mb-4">
                <div className="p-1.5 sm:p-3 bg-green-500/10 rounded-lg sm:rounded-xl">
                  <Clock className="w-4 h-4 sm:w-7 sm:h-7 text-green-600" />
                </div>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase mb-1">Arrivée</p>
              <p className="text-lg sm:text-4xl font-black text-green-600 leading-tight">
                {formatDuration(eta)}
              </p>
            </div>
          </div>
        )}

        {/* MISSION INFO */}
        <details className="bg-white rounded-xl sm:rounded-2xl shadow-lg group" open>
          <summary className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-2xl font-black text-slate-900 truncate">
                {mission.vehicle_brand || mission.vehicle_model
                  ? `${mission.vehicle_brand ?? ''} ${mission.vehicle_model ?? ''}`.trim()
                  : 'Véhicule'}
              </h2>
              {mission.vehicle_plate && (
                <p className="text-slate-600 font-mono text-sm sm:text-lg">🚗 {mission.vehicle_plate}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                mission.status === 'in_progress'
                  ? 'bg-blue-500/10 text-blue-600 border border-blue-200'
                  : mission.status === 'completed'
                  ? 'bg-green-500/10 text-green-600 border border-green-200'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-200'
              }`}>
                {mission.status === 'in_progress' ? '🚗 En cours' : mission.status === 'completed' ? '✅ Terminé' : '⏳ En attente'}
              </div>
              <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </summary>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-slate-100">
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg mt-0.5 shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">Départ</p>
                  <p className="text-slate-900 font-medium text-sm sm:text-base break-words">{mission.pickup_address}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    📅 {new Date(mission.pickup_date).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg mt-0.5 shrink-0">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">Destination</p>
                  <p className="text-slate-900 font-medium text-sm sm:text-base break-words">{mission.delivery_address}</p>
                  {mission.delivery_date && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      📅 {new Date(mission.delivery_date).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {mission.driver && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1">Chauffeur</p>
                <p className="text-base font-bold text-slate-900">
                  {mission.driver.first_name} {mission.driver.last_name}
                </p>
              </div>
            )}
          </div>
        </details>

        {/* STATUS MESSAGES */}
        {mission.status === 'completed' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg text-center">
            <div className="p-3 bg-green-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 mb-2">Mission terminée</h3>
            <p className="text-slate-600 text-sm sm:text-base">
              Le véhicule a été livré à destination. Merci de votre confiance !
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
