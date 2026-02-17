import { useEffect, useState, useRef } from 'react';
import { Navigation, Gauge, Clock, MapPin, Activity, TrendingUp, Users, Share2, Check, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
  driver_id?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  price?: number;
  notes?: string;
  driver?: {
    first_name: string;
    last_name: string;
    phone: string;
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

export default function TrackingCommand() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [locations, setLocations] = useState<GPSLocation[]>([]);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadActiveMissions();
  }, [user]);

  useEffect(() => {
    if (selectedMission) {
      loadMissionTracking(selectedMission.id);
      subscribeToLocationUpdates(selectedMission.id);
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [selectedMission]);

  useEffect(() => {
    if (currentLocation && selectedMission?.delivery_lat && selectedMission?.delivery_lng) {
      calculateETAAndDistance();
    }
  }, [currentLocation, selectedMission]);

  const loadActiveMissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          driver:profiles!missions_assigned_user_id_fkey(first_name, last_name, phone)
        `)
        .or(`user_id.eq.${user.id},assigned_user_id.eq.${user.id}`)
        .in('status', ['pending', 'in_progress'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      setMissions(data || []);
      
      if (data && data.length > 0) {
        setSelectedMission(data[0]);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMissionTracking = async (missionId: string) => {
    try {
      // Charger historique des positions GPS
      const { data: historyData, error: histError } = await supabase
        .from('mission_tracking_history')
        .select('*')
        .eq('mission_id', missionId)
        .order('recorded_at', { ascending: true });

      if (histError) throw histError;
      
      const typedLocations = (historyData || []).map((loc: any) => ({
        id: loc.id,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        speed: loc.speed ? parseFloat(loc.speed) : null,
        heading: loc.bearing ? parseFloat(loc.bearing) : null,
        accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        recorded_at: loc.recorded_at
      }));

      setLocations(typedLocations);
      
      // Charger position actuelle depuis mission_tracking_live
      const { data: liveData, error: liveError } = await supabase
        .from('mission_tracking_live')
        .select('*')
        .eq('mission_id', missionId)
        .single();

      if (!liveError && liveData) {
        const currentPos = {
          id: liveData.id,
          latitude: parseFloat(liveData.latitude),
          longitude: parseFloat(liveData.longitude),
          speed: liveData.speed ? parseFloat(liveData.speed) : null,
          heading: liveData.bearing ? parseFloat(liveData.bearing) : null,
          accuracy: liveData.accuracy ? parseFloat(liveData.accuracy) : null,
          recorded_at: liveData.last_update
        };
        setCurrentLocation(currentPos);
      } else if (typedLocations.length > 0) {
        setCurrentLocation(typedLocations[typedLocations.length - 1]);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const subscribeToLocationUpdates = (missionId: string) => {
    const channel = supabase
      .channel(`tracking:${missionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mission_tracking_live',
          filter: `mission_id=eq.${missionId}`,
        },
        (payload: any) => {
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
  };

  const generatePublicLink = async () => {
    if (!selectedMission) return;

    setGeneratingLink(true);
    try {
      // Vérifier si un lien existe déjà
      if (selectedMission.public_tracking_link) {
        await navigator.clipboard.writeText(selectedMission.public_tracking_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
        setGeneratingLink(false);
        return;
      }

      // Générer un nouveau token via la fonction SQL (crée l'entrée dans public_tracking_links)
      const { data: tokenData, error: rpcError } = await supabase
        .rpc('generate_public_tracking_link', { p_mission_id: selectedMission.id });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        throw new Error(`Erreur: ${rpcError.message}`);
      }

      const generatedToken = tokenData as string;
      const publicLink = `${window.location.origin}/tracking/${generatedToken}`;

      // Sauvegarder le lien dans la mission
      const { data, error } = await supabase
        .from('missions')
        .update({ public_tracking_link: publicLink })
        .eq('id', selectedMission.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Erreur base de données: ${error.message}`);
      }

      // Mettre à jour l'état local avec les données retournées
      if (data) {
        setSelectedMission(data as Mission);
        
        // Recharger la liste des missions pour sync
        loadActiveMissions();
      }

      // Copier dans le presse-papier
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error: any) {
      console.error('Error generating public link:', error);
      alert(error.message || 'Erreur lors de la génération du lien');
    } finally {
      setGeneratingLink(false);
    }
  };

  const calculateETAAndDistance = async () => {
    if (!currentLocation || !selectedMission?.delivery_lat || !selectedMission?.delivery_lng) return;

    // Utiliser OSRM pour le calcul routier réel
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${selectedMission.delivery_lng},${selectedMission.delivery_lat}?overview=false`;
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

    // Fallback Haversine
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      selectedMission.delivery_lat,
      selectedMission.delivery_lng
    );

    setDistanceRemaining(distance);

    const speed = currentLocation.speed || 0;
    if (speed > 3) {
      const hours = (distance * 1000) / speed;
      setEta(Math.round(hours / 60));
    } else {
      setEta(Math.round((distance / 60) * 60));
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return 'Calcul...';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Navigation className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Aucune mission active</h2>
        <p className="text-slate-600">Les missions en cours apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30">
      {/* HEADER PREMIUM */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                  <Navigation className="w-8 h-8 animate-pulse" />
                </div>
                <h1 className="text-4xl font-black">Command Center GPS</h1>
              </div>
              <p className="text-white/90 text-lg ml-[60px]">Suivi temps réel · Vitesse · ETA · Timeline</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 px-5 py-3 bg-white/20 backdrop-blur rounded-xl">
                <Activity className="w-6 h-6 animate-pulse" />
                <span className="font-bold text-lg">LIVE</span>
              </div>
              
              {/* Bouton Partager */}
              {selectedMission && (
                <button
                  onClick={generatePublicLink}
                  disabled={generatingLink}
                  className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-white/90 text-teal-600 rounded-xl font-bold transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Lien copié!</span>
                    </>
                  ) : generatingLink ? (
                    <>
                      <Link2 className="w-5 h-5 animate-spin" />
                      <span>Génération...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-5 h-5" />
                      <span>Partager le suivi</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* STATS CARDS */}
        {selectedMission && selectedMission.status === 'in_progress' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* VITESSE */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Gauge className="w-7 h-7 text-blue-600" />
                </div>
                {currentLocation && currentLocation.speed && currentLocation.speed > 0 && (
                  <div className="px-2 py-1 bg-green-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Vitesse</p>
              <p className="text-4xl font-black text-blue-600">
                {currentLocation?.speed ? Math.round(currentLocation.speed * 3.6) : 0}
                <span className="text-lg ml-1">km/h</span>
              </p>
              {currentLocation && (
                <p className="text-xs text-slate-500 mt-2">
                  MAJ: {new Date(currentLocation.recorded_at).toLocaleTimeString('fr-FR')}
                </p>
              )}
            </div>

            {/* DISTANCE RESTANTE */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <MapPin className="w-7 h-7 text-amber-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Distance</p>
              <p className="text-4xl font-black text-amber-600">
                {distanceRemaining.toFixed(1)}
                <span className="text-lg ml-1">km</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {locations.length} points GPS
              </p>
            </div>

            {/* ETA */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <Clock className="w-7 h-7 text-green-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">ETA</p>
              <p className="text-4xl font-black text-green-600">
                {formatDuration(eta)}
              </p>
              {eta > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Vers {new Date(Date.now() + eta * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            {/* CHAUFFEUR */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Users className="w-7 h-7 text-purple-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-600 uppercase mb-2">Chauffeur</p>
              {selectedMission.driver ? (
                <>
                  <p className="text-xl font-black text-purple-600">
                    {selectedMission.driver.first_name} {selectedMission.driver.last_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    📱 {selectedMission.driver.phone}
                  </p>
                </>
              ) : (
                <p className="text-xl font-bold text-slate-400">Non assigné</p>
              )}
            </div>
          </div>
        )}

        {/* MISSION CARD */}
        {selectedMission && (
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{selectedMission.reference}</h2>
              <p className="text-slate-600 mt-1">
                {selectedMission.vehicle_brand} {selectedMission.vehicle_model}
                {selectedMission.vehicle_plate && <span className="text-slate-500"> · {selectedMission.vehicle_plate}</span>}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-bold ${
              selectedMission.status === 'in_progress' 
                ? 'bg-blue-500/10 text-blue-600 border-2 border-blue-200' 
                : 'bg-amber-500/10 text-amber-600 border-2 border-amber-200'
            }`}>
              {selectedMission.status === 'in_progress' ? '🚗 En cours' : '⏳ En attente'}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg mt-1">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Départ</p>
                  <p className="text-slate-900 font-medium">{selectedMission.pickup_address}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(selectedMission.pickup_date).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg mt-1">
                  <MapPin className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">Destination</p>
                  <p className="text-slate-900 font-medium">{selectedMission.delivery_address}</p>
                  {selectedMission.delivery_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(selectedMission.delivery_date).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* CARTE GPS */}
        {selectedMission && selectedMission.pickup_lat && selectedMission.delivery_lat && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">Carte GPS {selectedMission.status === 'in_progress' ? 'Temps Réel' : 'Itinéraire'}</h3>
              {selectedMission.status === 'in_progress' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>LIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 text-amber-600 rounded-lg text-sm font-bold">
                  <Clock className="w-4 h-4" />
                  <span>EN ATTENTE</span>
                </div>
              )}
            </div>
            <div className="w-full h-[600px] rounded-xl overflow-hidden border-2 border-slate-200">
              <LeafletTracking
                pickupLat={selectedMission.pickup_lat!}
                pickupLng={selectedMission.pickup_lng!}
                pickupAddress={selectedMission.pickup_address}
                deliveryLat={selectedMission.delivery_lat!}
                deliveryLng={selectedMission.delivery_lng!}
                deliveryAddress={selectedMission.delivery_address}
                driverLat={currentLocation?.latitude}
                driverLng={currentLocation?.longitude}
                driverSpeed={currentLocation?.speed ?? undefined}
                driverHeading={currentLocation?.heading ?? undefined}
                driverName={selectedMission.driver ? `${selectedMission.driver.first_name} ${selectedMission.driver.last_name}` : 'Chauffeur'}
                vehiclePlate={selectedMission.vehicle_plate}
                status={selectedMission.status === 'in_progress' ? 'En cours' : 'En attente'}
                height="600px"
                showControls={true}
                gpsPath={locations.map(loc => [loc.latitude, loc.longitude])}
              />
            </div>
          </div>
        )}

        {/* TIMELINE */}
        {locations.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xl font-black text-slate-900 mb-4">Timeline GPS ({locations.length} points)</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {locations.slice(-10).reverse().map((loc, idx) => (
                <div key={loc.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div className="p-2 bg-teal-500/10 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      Position #{locations.length - idx}
                    </p>
                    <p className="text-xs text-slate-600">
                      {loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}
                      {loc.speed && ` • ${Math.round(loc.speed * 3.6)} km/h`}
                      {loc.accuracy && ` • ±${Math.round(loc.accuracy)}m`}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(loc.recorded_at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
