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
    };
  }, [mission]);

  useEffect(() => {
    if (currentLocation && mission?.delivery_lat && mission?.delivery_lng) {
      calculateETAAndDistance();
    }
  }, [currentLocation, mission]);

  const loadPublicMission = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('missions')
        .select(`
          *,
          driver:profiles!missions_driver_id_fkey(first_name, last_name)
        `)
        .eq('public_tracking_link', `${window.location.origin}/tracking/${token}`)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Mission introuvable. Le lien de suivi est peut-être invalide.');
        setLoading(false);
        return;
      }

      setMission(data);
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
      const { data: locationsData, error: locError } = await supabase
        .from('mission_locations')
        .select('*')
        .eq('mission_id', mission.id)
        .order('recorded_at', { ascending: true });

      if (locError) throw locError;

      const typedLocations = (locationsData || []).map((loc: any) => ({
        id: loc.id,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        speed: loc.speed ? parseFloat(loc.speed) : null,
        heading: loc.heading ? parseFloat(loc.heading) : null,
        accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        recorded_at: loc.recorded_at
      }));

      setLocations(typedLocations);

      if (typedLocations.length > 0) {
        setCurrentLocation(typedLocations[typedLocations.length - 1]);
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    }
  };

  const subscribeToLocationUpdates = () => {
    if (!mission) return;

    const channel = supabase
      .channel(`public-tracking:${mission.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_locations',
          filter: `mission_id=eq.${mission.id}`,
        },
        (payload: any) => {
          const newLocation: GPSLocation = {
            id: payload.new.id,
            latitude: parseFloat(payload.new.latitude),
            longitude: parseFloat(payload.new.longitude),
            speed: payload.new.speed ? parseFloat(payload.new.speed) : null,
            heading: payload.new.heading ? parseFloat(payload.new.heading) : null,
            accuracy: payload.new.accuracy ? parseFloat(payload.new.accuracy) : null,
            recorded_at: payload.new.recorded_at
          };

          setCurrentLocation(newLocation);
          setLocations(prev => [...prev, newLocation]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const calculateETAAndDistance = () => {
    if (!currentLocation || !mission?.delivery_lat || !mission?.delivery_lng) return;

    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      mission.delivery_lat,
      mission.delivery_lng
    );

    setDistanceRemaining(distance);

    const speed = currentLocation.speed || 0;
    if (speed > 5) {
      const hours = distance / speed;
      setEta(Math.round(hours * 60));
    } else {
      setEta(0);
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
    if (!mission?.public_tracking_link) return;

    try {
      await navigator.clipboard.writeText(mission.public_tracking_link);
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
      {/* HEADER PUBLIC */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                  <Navigation className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-3xl font-black">Suivi en Direct</h1>
                  <p className="text-white/90 text-sm mt-1">{mission.reference}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {mission.status === 'in_progress' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-xl">
                  <Activity className="w-5 h-5 animate-pulse" />
                  <span className="font-bold">LIVE</span>
                </div>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span className="font-bold">Copié!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    <span className="font-bold">Partager</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* STATS CARDS - Uniquement si en cours */}
        {mission.status === 'in_progress' && currentLocation && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* VITESSE */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Gauge className="w-7 h-7 text-blue-600" />
                </div>
                {currentLocation.speed && currentLocation.speed > 0 && (
                  <div className="px-2 py-1 bg-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Vitesse actuelle</p>
              <p className="text-4xl font-black text-blue-600">
                {currentLocation.speed ? Math.round(currentLocation.speed * 3.6) : 0}
                <span className="text-lg ml-1">km/h</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                MAJ: {new Date(currentLocation.recorded_at).toLocaleTimeString('fr-FR')}
              </p>
            </div>

            {/* DISTANCE RESTANTE */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <MapPin className="w-7 h-7 text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Distance restante</p>
              <p className="text-4xl font-black text-amber-600">
                {distanceRemaining.toFixed(1)}
                <span className="text-lg ml-1">km</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {locations.length} points GPS enregistrés
              </p>
            </div>

            {/* ETA */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <Clock className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Temps d'arrivée estimé</p>
              <p className="text-4xl font-black text-green-600">
                {formatDuration(eta)}
              </p>
              {eta > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Arrivée vers {new Date(Date.now() + eta * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* INFOS MISSION */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {mission.vehicle_brand} {mission.vehicle_model}
              </h2>
              {mission.vehicle_plate && (
                <p className="text-slate-600 font-mono text-lg">🚗 {mission.vehicle_plate}</p>
              )}
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
              mission.status === 'in_progress'
                ? 'bg-blue-500/10 text-blue-600 border-2 border-blue-200'
                : mission.status === 'completed'
                ? 'bg-green-500/10 text-green-600 border-2 border-green-200'
                : 'bg-amber-500/10 text-amber-600 border-2 border-amber-200'
            }`}>
              {mission.status === 'in_progress' ? '🚗 En cours' : mission.status === 'completed' ? '✅ Terminé' : '⏳ En attente'}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg mt-1">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Point de départ</p>
                  <p className="text-slate-900 font-medium">{mission.pickup_address}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    📅 {new Date(mission.pickup_date).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg mt-1">
                  <MapPin className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Destination</p>
                  <p className="text-slate-900 font-medium">{mission.delivery_address}</p>
                  {mission.delivery_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      📅 {new Date(mission.delivery_date).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {mission.driver && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-600 mb-2">Chauffeur</p>
              <p className="text-lg font-bold text-slate-900">
                {mission.driver.first_name} {mission.driver.last_name}
              </p>
            </div>
          )}
        </div>

        {/* CARTE GPS */}
        {mission.status === 'in_progress' && mission.pickup_lat && mission.delivery_lat && currentLocation && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">Position en temps réel</h3>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold">
                <Activity className="w-4 h-4 animate-pulse" />
                <span>LIVE</span>
              </div>
            </div>
            <div className="w-full h-[500px] rounded-xl overflow-hidden border-2 border-slate-200">
              <LeafletTracking
                pickupLat={mission.pickup_lat!}
                pickupLng={mission.pickup_lng!}
                pickupAddress={mission.pickup_address}
                deliveryLat={mission.delivery_lat!}
                deliveryLng={mission.delivery_lng!}
                deliveryAddress={mission.delivery_address}
                driverLat={currentLocation.latitude}
                driverLng={currentLocation.longitude}
                driverName={mission.driver ? `${mission.driver.first_name} ${mission.driver.last_name}` : 'Chauffeur'}
                vehiclePlate={mission.vehicle_plate}
                status={mission.status === 'in_progress' ? 'En cours' : 'En attente'}
                height="500px"
                showControls={true}
                gpsPath={locations.map(loc => [loc.latitude, loc.longitude])}
              />
            </div>
          </div>
        )}

        {/* MESSAGE SI PAS EN COURS */}
        {mission.status !== 'in_progress' && (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="p-4 bg-amber-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Mission en attente</h3>
            <p className="text-slate-600">
              Le suivi GPS sera disponible dès que la mission sera démarrée par le chauffeur.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
