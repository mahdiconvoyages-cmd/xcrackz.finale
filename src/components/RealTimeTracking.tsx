import { useState, useEffect, useRef } from 'react';
import { X, Navigation, Clock, MapPin, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RealTimeTrackingProps {
  missionId: string;
  onClose: () => void;
}

interface TrackingSession {
  id: string;
  driver_id: string;
  status: string;
  started_at: string;
  total_distance_km: number;
  total_duration_minutes: number;
  average_speed_kmh: number;
  max_speed_kmh: number;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  speed_kmh: number;
  recorded_at: string;
}

export default function RealTimeTracking({ missionId, onClose }: RealTimeTrackingProps) {
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [latestLocation, setLatestLocation] = useState<LocationPoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSession();
    const interval = setInterval(loadLatestLocation, 5000);

    return () => clearInterval(interval);
  }, [missionId]);

  useEffect(() => {
    if (latestLocation && mapRef.current && markerRef.current) {
      const position = { lat: latestLocation.latitude, lng: latestLocation.longitude };
      markerRef.current.setPosition(position);
      mapRef.current.panTo(position);
    }
  }, [latestLocation]);

  const loadSession = async () => {
    try {
      const { data, error } = await supabase
        .from('gps_tracking_sessions')
        .select('*')
        .eq('mission_id', missionId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSession(data);
        await loadLatestLocation();
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestLocation = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('gps_location_points')
        .select('latitude, longitude, speed_kmh, recorded_at')
        .eq('session_id', session.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setLatestLocation(data);

        if (!mapLoaded && mapContainerRef.current) {
          initializeMap(data.latitude, data.longitude);
        }
      }
    } catch (error) {
      console.error('Error loading location:', error);
    }
  };

  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || mapLoaded || typeof window === 'undefined' || !(window as any).google) return;

    const google = (window as any).google;
    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat, lng },
      zoom: 15,
      mapTypeId: 'roadmap',
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });

    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: map,
      title: 'Position actuelle',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#14b8a6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
    });

    mapRef.current = map;
    markerRef.current = marker;
    setMapLoaded(true);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto"></div>
          <p className="text-center mt-4 text-slate-600">Chargement du suivi GPS...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Aucun suivi actif</h3>
          <p className="text-slate-600 mb-6">
            Le chauffeur n'a pas encore démarré le suivi GPS pour cette mission.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-3 rounded-lg transition font-semibold"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Suivi GPS en temps réel</h2>
            <p className="text-slate-600 text-sm mt-1">Mise à jour toutes les 5 secondes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 relative">
            <div ref={mapContainerRef} className="absolute inset-0" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500 mx-auto mb-4"></div>
                  <p className="text-slate-600">Chargement de la carte...</p>
                </div>
              </div>
            )}
          </div>

          <div className="w-80 bg-slate-50 p-6 overflow-y-auto border-l border-slate-200">
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Statut</p>
                    <p className="text-sm text-teal-600">En cours de livraison</p>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="ml-2 text-sm text-slate-600">Signal actif</span>
                </div>
              </div>

              {latestLocation && (
                <div className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <p className="font-semibold text-slate-900">Position actuelle</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Latitude:</span>
                      <span className="font-mono text-slate-900">
                        {latestLocation.latitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Longitude:</span>
                      <span className="font-mono text-slate-900">
                        {latestLocation.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Vitesse:</span>
                      <span className="font-semibold text-slate-900">
                        {latestLocation.speed_kmh?.toFixed(0) || 0} km/h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dernière MAJ:</span>
                      <span className="text-slate-900">
                        {formatTime(latestLocation.recorded_at)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Navigation className="w-5 h-5 text-teal-600" />
                  <p className="font-semibold text-slate-900">Statistiques du trajet</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Distance parcourue</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {session.total_distance_km?.toFixed(1) || 0}
                      <span className="text-sm font-normal text-slate-600 ml-1">km</span>
                    </p>
                  </div>
                  <div className="h-px bg-slate-200"></div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Durée du trajet</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatDuration(session.total_duration_minutes || 0)}
                    </p>
                  </div>
                  <div className="h-px bg-slate-200"></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Vitesse moy.</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {session.average_speed_kmh?.toFixed(0) || 0} km/h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Vitesse max</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {session.max_speed_kmh?.toFixed(0) || 0} km/h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-teal-600" />
                  <p className="font-semibold text-slate-900">Heure de départ</p>
                </div>
                <p className="text-slate-900">
                  {new Date(session.started_at).toLocaleString('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
