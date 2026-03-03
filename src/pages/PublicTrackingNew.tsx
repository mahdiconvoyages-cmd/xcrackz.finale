import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation, Gauge, Clock, MapPin, Activity, Share2, Check, X } from 'lucide-react';
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
  public_tracking_link?: string;
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

export default function PublicTracking() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [locations, setLocations] = useState<GPSLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollingRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (token) {
      loadPublicMission();
    }
  }, [token]);

  useEffect(() => {
    if (mission) {
      loadMissionLocations();
      subscribeToLocationUpdates();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current as unknown as number);
      }
    };
  }, [mission]);

  useEffect(() => {
    if (currentLocation && mission?.delivery_lat && mission?.delivery_lng) {
      calculateETAAndDistance();
    }
  }, [currentLocation, mission]);

  const loadPublicMission = async () => {
    try {
      // 1. Valider le token et récupérer la mission_id via public_tracking_links
      const { data: trackingLink, error: linkError } = await supabase
        .from('public_tracking_links')
        .select('mission_id, is_active, expires_at, access_count, max_accesses')
        .eq('token', token)
        .maybeSingle();

      if (linkError) throw linkError;

      if (!trackingLink) {
        setError('Lien de suivi invalide ou expiré');
        setLoading(false);
        return;
      }

      // Vérifier si le lien est actif et non expiré
      if (!trackingLink.is_active) {
        setError('Ce lien de suivi a été désactivé');
        setLoading(false);
        return;
      }

      if (new Date(trackingLink.expires_at) < new Date()) {
        setError('Ce lien de suivi a expiré');
        setLoading(false);
        return;
      }

      // Vérifier rate limiting
      if (trackingLink.access_count >= trackingLink.max_accesses) {
        setError('Limite d\'accès dépassée pour ce lien');
        setLoading(false);
        return;
      }

      // 2. Récupérer les détails de la mission
      const { data: missionData, error: fetchError } = await supabase
        .from('missions')
        .select(`
          *,
          driver:profiles!missions_assigned_user_id_fkey(first_name, last_name)
        `)
        .eq('id', trackingLink.mission_id)
        .maybeSingle()
        .then(res => {
          // Fallback si la FK n'existe pas
          if (res.error?.message?.includes('fkey') || res.error?.message?.includes('relationship')) {
            return supabase
              .from('missions')
              .select('*')
              .eq('id', trackingLink.mission_id)
              .maybeSingle();
          }
          return res;
        });

      if (fetchError) throw fetchError;

      if (!missionData) {
        setError('Mission introuvable');
        setLoading(false);
        return;
      }

      // 3. Incrémenter le compteur d'accès via RPC (anon ne peut pas UPDATE)
      supabase.rpc('increment_tracking_access', { p_token: token }).then(() => {}).catch(() => {});

      setMission(missionData);
    } catch (err) {
      console.error('Error loading public mission:', err);
      setError('Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  const loadMissionLocations = async () => {
    if (!mission) return;

    try {
      // 1. Récupérer l'historique depuis mission_tracking_history
      const { data: historyData, error: historyError } = await supabase
        .from('mission_tracking_history')
        .select('*')
        .eq('mission_id', mission.id)
        .order('recorded_at', { ascending: true });

      if (historyError) throw historyError;

      const historyLocations = (historyData || []).map((loc: any) => ({
        id: loc.id,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        speed: loc.speed ? parseFloat(loc.speed) : null,
        heading: loc.bearing ? parseFloat(loc.bearing) : null,
        accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        recorded_at: loc.recorded_at
      }));

      // 2. Récupérer la position actuelle depuis mission_tracking_live
      const { data: liveData, error: liveError } = await supabase
        .from('mission_tracking_live')
        .select('*')
        .eq('mission_id', mission.id)
        .eq('is_active', true)
        .maybeSingle();

      if (liveError && liveError.code !== 'PGRST116') throw liveError;

      let currentPos: GPSLocation | null = null;

      if (liveData) {
        currentPos = {
          id: liveData.id,
          latitude: parseFloat(liveData.latitude),
          longitude: parseFloat(liveData.longitude),
          speed: liveData.speed ? parseFloat(liveData.speed) : null,
          heading: liveData.bearing ? parseFloat(liveData.bearing) : null,
          accuracy: liveData.accuracy ? parseFloat(liveData.accuracy) : null,
          recorded_at: liveData.last_update
        };

        // Ajouter la position live à l'historique si elle est plus récente
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
        // Pas de position live, utiliser la dernière position de l'historique
        setLocations(historyLocations);
        if (historyLocations.length > 0) {
          setCurrentLocation(historyLocations[historyLocations.length - 1]);
        }
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const subscribeToLocationUpdates = () => {
    if (!mission) return;

    // S'abonner aux mises à jour en temps réel de mission_tracking_live
    const channel = supabase
      .channel(`public-tracking:${mission.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mission_tracking_live',
          filter: `mission_id=eq.${mission.id}`,
        },
        (payload: any) => {
          console.log('📡 Position GPS mise à jour en temps réel:', payload.new);

          const newLocation: GPSLocation = {
            id: payload.new.id,
            latitude: parseFloat(payload.new.latitude),
            longitude: parseFloat(payload.new.longitude),
            speed: payload.new.speed ? parseFloat(payload.new.speed) : null,
            heading: payload.new.bearing ? parseFloat(payload.new.bearing) : null,
            accuracy: payload.new.accuracy ? parseFloat(payload.new.accuracy) : null,
            recorded_at: payload.new.last_update
          };

          setCurrentLocation(newLocation);

          // Mettre à jour le chemin avec la nouvelle position
          setLocations(prev => {
            const filtered = prev.filter(loc => loc.id !== newLocation.id);
            return [...filtered, newLocation];
          });
        }
      )
      // S'abonner également aux INSERT de mission_tracking_live (première position)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_tracking_live',
          filter: `mission_id=eq.${mission.id}`,
        },
        (payload: any) => {
          console.log('🆕 Première position GPS reçue:', payload.new);

          const newLocation: GPSLocation = {
            id: payload.new.id,
            latitude: parseFloat(payload.new.latitude),
            longitude: parseFloat(payload.new.longitude),
            speed: payload.new.speed ? parseFloat(payload.new.speed) : null,
            heading: payload.new.bearing ? parseFloat(payload.new.bearing) : null,
            accuracy: payload.new.accuracy ? parseFloat(payload.new.accuracy) : null,
            recorded_at: payload.new.last_update
          };

          setCurrentLocation(newLocation);
          setLocations(prev => [...prev, newLocation]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Polling fallback uniquement si le realtime est déconnecté (toutes les 30s)
    // Évite 480 requêtes/minute avec 20 clients simultanés
    channel.on('system' as any, {}, (payload: any) => {
      if (payload.status === 'CLOSED' || payload.status === 'TIMED_OUT') {
        if (!pollingRef.current) {
          pollingRef.current = setInterval(() => {
            loadMissionLocations();
          }, 30000) as unknown as NodeJS.Timer;
        }
      } else if (payload.status === 'SUBSCRIBED') {
        // Realtime rétabli — arrêter le polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current as unknown as number);
          pollingRef.current = null;
        }
      }
    });
  };

  const calculateETAAndDistance = async () => {
    if (!currentLocation || !mission?.delivery_lat || !mission?.delivery_lng) return;

    // Utiliser OSRM pour calculer la distance routière et l'ETA réels
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${mission.delivery_lng},${mission.delivery_lat}?overview=false`;
      const response = await fetch(osrmUrl);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setDistanceRemaining(route.distance / 1000); // m → km
        setEta(Math.round(route.duration / 60)); // s → min
        return;
      }
    } catch (e) {
      console.warn('OSRM fallback to Haversine:', e);
    }

    // Fallback : distance à vol d'oiseau + estimation
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      mission.delivery_lat,
      mission.delivery_lng
    );

    setDistanceRemaining(distance);

    const speed = currentLocation.speed || 0;
    if (speed > 3) {
      // speed est en m/s, distance en km
      const hours = (distance * 1000) / speed;
      setEta(Math.round(hours / 60));
    } else {
      // Estimation par défaut à 60 km/h
      setEta(Math.round((distance / 60) * 60));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'Calcul...';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  const handleShare = async () => {
    if (!token) return;

    try {
      const shareUrl = `${window.location.origin}/tracking/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying link:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-slate-700">Chargement du suivi GPS...</p>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md">
          <div className="p-4 bg-red-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <X className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Erreur</h2>
          <p className="text-slate-600 mb-6">{error || 'Mission introuvable'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30">
      {/* HEADER PUBLIC — compact sur mobile */}
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
                onClick={handleShare}
                className="flex items-center gap-1 px-2 sm:px-4 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg transition-colors text-xs sm:text-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="font-bold hidden sm:inline">Copié!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span className="font-bold hidden sm:inline">Partager</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">

        {/* CARTE GPS — en premier sur mobile pour visibilité maximale */}
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
            <div className="w-full h-[40vh] sm:h-[500px]">
              <LeafletTracking
                pickupLat={mission.pickup_lat!}
                pickupLng={mission.pickup_lng!}
                pickupAddress={mission.pickup_address}
                deliveryLat={mission.delivery_lat!}
                deliveryLng={mission.delivery_lng!}
                deliveryAddress={mission.delivery_address}
                driverLat={currentLocation?.latitude ?? mission.pickup_lat!}
                driverLng={currentLocation?.longitude ?? mission.pickup_lng!}
                driverSpeed={currentLocation?.speed ?? undefined}
                driverHeading={currentLocation?.heading ?? undefined}
                driverName={mission.driver ? `${mission.driver.first_name} ${mission.driver.last_name}` : 'Chauffeur'}
                vehiclePlate={mission.vehicle_plate}
                status={mission.status === 'in_progress' ? 'En cours' : mission.status === 'completed' ? 'Terminé' : 'En attente'}
                height="100%"
                showControls={true}
                gpsPath={locations.length > 0 ? locations.map(loc => [loc.latitude, loc.longitude]) : []}
              />
            </div>
          </div>
        )}

        {/* STATS CARDS — compactes sur mobile */}
        {mission.status === 'in_progress' && currentLocation && (
          <div className="grid grid-cols-3 gap-2 sm:gap-6">
            {/* VITESSE */}
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

            {/* DISTANCE RESTANTE */}
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

            {/* ETA */}
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

        {/* INFOS MISSION — collapsible sur mobile */}
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

        {/* MESSAGE SI PAS EN COURS */}
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

        {mission.status !== 'in_progress' && mission.status !== 'completed' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg text-center">
            <div className="p-3 bg-amber-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 mb-2">Mission en attente</h3>
            <p className="text-slate-600 text-sm sm:text-base">
              Le suivi GPS sera disponible dès que la mission sera démarrée par le chauffeur.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
