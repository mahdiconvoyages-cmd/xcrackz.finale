import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Gauge, TrendingUp, Activity, Truck, Clock, Navigation as NavigationIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Mission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
}

interface TrackingPosition {
  id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  accuracy: number;
  recorded_at: string;
}

interface TrackingSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  total_distance_km: number;
  max_speed_kmh: number;
  average_speed_kmh: number;
  status: string;
}

export default function PublicTracking() {
  const { token } = useParams();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const vehicleMarker = useRef<mapboxgl.Marker | null>(null);
  const routeLine = useRef<string | null>(null);

  const [mission, setMission] = useState<Mission | null>(null);
  const [positions, setPositions] = useState<TrackingPosition[]>([]);
  const [currentPosition, setCurrentPosition] = useState<TrackingPosition | null>(null);
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);

  useEffect(() => {
    if (token) {
      loadPublicTrackingData();
    }
  }, [token]);

  useEffect(() => {
    if (mission && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [mission]);

  useEffect(() => {
    if (currentPosition && mission) {
      updateMapPosition(currentPosition);
      calculateETAAndDistance();
    }
  }, [currentPosition, mission]);

  useEffect(() => {
    if (!session) return;

    const subscription = supabase
      .channel(`public:tracking:${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gps_location_points',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const newPosition = payload.new as TrackingPosition;
          setCurrentPosition(newPosition);
          setPositions((prev) => [...prev, newPosition]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  const calculateETAAndDistance = () => {
    if (!currentPosition || !mission) return;

    const dist = calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      mission.delivery_lat,
      mission.delivery_lng
    );

    setDistanceRemaining(dist);

    const speed = currentPosition.speed_kmh || 50;
    const timeInHours = dist / speed;
    setEta(Math.round(timeInHours * 60));
  };

  const loadPublicTrackingData = async () => {
    if (!token) return;

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('gps_tracking_sessions')
        .select(`
          *,
          missions:mission_id (
            id,
            reference,
            status,
            vehicle_brand,
            vehicle_model,
            vehicle_plate,
            pickup_address,
            delivery_address,
            pickup_lat,
            pickup_lng,
            delivery_lat,
            delivery_lng
          )
        `)
        .eq('id', token)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (!sessionData) {
        setError('Session de suivi introuvable');
        setLoading(false);
        return;
      }

      setSession(sessionData);
      setMission(sessionData.missions as Mission);

      const { data: positionsData } = await supabase
        .from('gps_location_points')
        .select('*')
        .eq('session_id', token)
        .order('recorded_at', { ascending: true });

      setPositions(positionsData || []);
      if (positionsData && positionsData.length > 0) {
        setCurrentPosition(positionsData[positionsData.length - 1]);
      }
    } catch (error) {
      console.error('Error loading public tracking data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || map.current || !mission) return;

    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-day-v1',
      center: [mission.pickup_lng, mission.pickup_lat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    new mapboxgl.Marker({ color: '#10b981' })
      .setLngLat([mission.pickup_lng, mission.pickup_lat])
      .setPopup(new mapboxgl.Popup().setHTML('<h3>Départ</h3>'))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([mission.delivery_lng, mission.delivery_lat])
      .setPopup(new mapboxgl.Popup().setHTML('<h3>Arrivée</h3>'))
      .addTo(map.current);
  };

  const updateMapPosition = (position: TrackingPosition) => {
    if (!map.current) return;

    map.current.flyTo({
      center: [position.longitude, position.latitude],
      zoom: 14,
      essential: true,
    });

    if (vehicleMarker.current) {
      vehicleMarker.current.remove();
    }

    const el = document.createElement('div');
    el.className = 'vehicle-marker';
    el.innerHTML = `
      <div class="relative">
        <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        <div class="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
        </div>
      </div>
    `;

    vehicleMarker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([position.longitude, position.latitude])
      .addTo(map.current);

    if (positions.length > 1) {
      updateRouteLine();
    }
  };

  const updateRouteLine = () => {
    if (!map.current || positions.length < 2) return;

    const coordinates = positions.map((p) => [p.longitude, p.latitude]);

    if (routeLine.current && map.current.getSource(routeLine.current)) {
      const source = map.current.getSource(routeLine.current) as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      });
    } else {
      routeLine.current = 'route';

      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3b82f6',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-600 font-medium">Chargement du suivi en temps réel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center max-w-md mx-4">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Accès impossible</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Mission introuvable</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">{mission.reference}</h1>
              <p className="text-white/90">
                {mission.vehicle_brand} {mission.vehicle_model} - {mission.vehicle_plate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {currentPosition && (
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">ETA</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{eta} min</p>
                <p className="text-xs text-blue-700 mt-1">Arrivée estimée</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <NavigationIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-900">Distance</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{distanceRemaining.toFixed(1)} km</p>
                <p className="text-xs text-green-700 mt-1">Distance restante</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-900">Vitesse</span>
                </div>
                <p className="text-3xl font-bold text-orange-600">
                  {currentPosition.speed_kmh?.toFixed(0) || 0} km/h
                </p>
                <p className="text-xs text-orange-700 mt-1">Vitesse actuelle</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">Moy.</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">
                  {session?.average_speed_kmh?.toFixed(0) || 0} km/h
                </p>
                <p className="text-xs text-purple-700 mt-1">Vitesse moyenne</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />
        </div>

        <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {currentPosition && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  Statut en direct
                </h3>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-green-900">En direct</span>
                  </div>
                  <p className="text-sm text-green-800">
                    Dernière mise à jour: {new Date(currentPosition.recorded_at).toLocaleTimeString('fr-FR')}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Précision GPS: {currentPosition.accuracy?.toFixed(0) || 0}m
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Itinéraire</h3>

              <div className="relative">
                <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-green-500 to-red-500"></div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-green-600 uppercase">Départ</p>
                      <p className="text-slate-900 font-medium">{mission.pickup_address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-red-600 uppercase">Arrivée</p>
                      <p className="text-slate-900 font-medium">{mission.delivery_address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!currentPosition && positions.length === 0 && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 text-center">
                <Activity className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                <p className="text-sm text-amber-900 font-semibold mb-2">En attente du début du tracking</p>
                <p className="text-xs text-amber-700">
                  Le suivi GPS commencera lorsque le chauffeur démarrera la mission
                </p>
              </div>
            )}

            {session && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-3">Statistiques de trajet</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Distance parcourue</span>
                    <span className="font-semibold text-slate-900">
                      {session.total_distance_km?.toFixed(1) || 0} km
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Vitesse max</span>
                    <span className="font-semibold text-slate-900">
                      {session.max_speed_kmh?.toFixed(0) || 0} km/h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Début du trajet</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(session.started_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {positions.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  Points GPS enregistrés
                </h3>
                <p className="text-2xl font-bold text-teal-600 mb-2">{positions.length}</p>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>Début: {new Date(positions[0].recorded_at).toLocaleString('fr-FR')}</p>
                  {positions.length > 1 && (
                    <p>Dernière: {new Date(positions[positions.length - 1].recorded_at).toLocaleString('fr-FR')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
