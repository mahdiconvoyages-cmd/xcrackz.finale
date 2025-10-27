import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Truck, Clock, Navigation, Share2, Gauge, TrendingUp, Activity, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  delivery_date: string;
  pickup_lat: number;
  pickup_lng: number;
  delivery_lat: number;
  delivery_lng: number;
  assigned_driver?: string;
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

export default function MissionTracking() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const vehicleMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);
  const pickupMarker = useRef<L.Marker | null>(null);
  const deliveryMarker = useRef<L.Marker | null>(null);

  const [mission, setMission] = useState<Mission | null>(null);
  const [positions, setPositions] = useState<TrackingPosition[]>([]);
  const [currentPosition, setCurrentPosition] = useState<TrackingPosition | null>(null);
  const [session, setSession] = useState<TrackingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [eta, setEta] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(0);

  useEffect(() => {
    if (missionId) {
      loadMissionData();
    }
  }, [missionId, user]);

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
    if (!missionId) return;

    const subscription = supabase
      .channel(`tracking:${missionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gps_location_points',
          filter: `session_id=eq.${missionId}`,
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
  }, [missionId]);

  const loadMissionData = async () => {
    if (!user || !missionId) return;

    try {
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (missionError) throw missionError;
      setMission(missionData);

      const { data: sessionData } = await supabase
        .from('gps_tracking_sessions')
        .select('*')
        .eq('mission_id', missionId)
        .eq('status', 'active')
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData);

        const { data: positionsData } = await supabase
          .from('gps_location_points')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('recorded_at', { ascending: true });

        setPositions(positionsData || []);
        if (positionsData && positionsData.length > 0) {
          setCurrentPosition(positionsData[positionsData.length - 1]);
        }
      }
    } catch (error) {
      console.error('Error loading mission data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const initializeMap = () => {
    if (!mapContainer.current || map.current || !mission) return;

    // Créer la carte Leaflet avec OpenStreetMap
    map.current = L.map(mapContainer.current).setView(
      [mission.pickup_lat, mission.pickup_lng],
      12
    );

    // Ajouter les tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Marqueur de départ (vert)
    const pickupIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="background: #10b981; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    pickupMarker.current = L.marker([mission.pickup_lat, mission.pickup_lng], { icon: pickupIcon })
      .addTo(map.current)
      .bindPopup('<h3 class="font-bold">Départ</h3>');

    // Marqueur d'arrivée (rouge)
    const deliveryIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="background: #ef4444; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    deliveryMarker.current = L.marker([mission.delivery_lat, mission.delivery_lng], { icon: deliveryIcon })
      .addTo(map.current)
      .bindPopup('<h3 class="font-bold">Arrivée</h3>');

    // Ajuster la vue pour inclure les deux marqueurs
    const bounds = L.latLngBounds([
      [mission.pickup_lat, mission.pickup_lng],
      [mission.delivery_lat, mission.delivery_lng]
    ]);
    map.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const updateMapPosition = (position: TrackingPosition) => {
    if (!map.current) return;

    // Centrer la carte sur la nouvelle position
    map.current.flyTo([position.latitude, position.longitude], 14, {
      duration: 1.5,
    });

    // Supprimer l'ancien marqueur véhicule
    if (vehicleMarker.current) {
      map.current.removeLayer(vehicleMarker.current);
    }

    // Créer un nouveau marqueur véhicule animé
    const vehicleIcon = L.divIcon({
      className: 'vehicle-marker',
      html: `
        <div style="position: relative; width: 48px; height: 48px;">
          <div style="position: absolute; inset: 0; background: #3b82f6; border-radius: 50%; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>
          <div style="position: relative; width: 48px; height: 48px; background: linear-gradient(to bottom right, #3b82f6, #06b6d4); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            <svg width="24" height="24" fill="white" stroke="white" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
        </div>
        <style>
          @keyframes ping {
            75%, 100% {
              transform: scale(2);
              opacity: 0;
            }
          }
        </style>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    vehicleMarker.current = L.marker([position.latitude, position.longitude], { icon: vehicleIcon })
      .addTo(map.current)
      .bindPopup(`
        <div class="p-2">
          <p class="font-bold">Position actuelle</p>
          <p class="text-sm">Vitesse: ${position.speed_kmh?.toFixed(0) || 0} km/h</p>
          <p class="text-xs text-gray-600">${new Date(position.recorded_at).toLocaleTimeString('fr-FR')}</p>
        </div>
      `);

    // Mettre à jour la ligne de route
    if (positions.length > 1) {
      updateRouteLine();
    }
  };

  const updateRouteLine = () => {
    if (!map.current || positions.length < 2) return;

    // Convertir les positions en coordonnées Leaflet [lat, lng]
    const coordinates: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);

    // Supprimer l'ancienne ligne si elle existe
    if (routeLine.current) {
      map.current.removeLayer(routeLine.current);
    }

    // Créer une nouvelle polyline
    routeLine.current = L.polyline(coordinates, {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.8,
      smoothFactor: 1,
    }).addTo(map.current);
  };

  const copyPublicLink = () => {
    if (!session) return;
    const url = `${window.location.origin}/tracking/public/${session.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Mission introuvable</h2>
          <button
            onClick={() => navigate('/tracking')}
            className="text-blue-600 hover:underline"
          >
            Retour au tracking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-2xl font-bold">{mission.reference}</h1>
            <p className="text-white/90">
              {mission.vehicle_brand} {mission.vehicle_model} - {mission.vehicle_plate}
            </p>
          </div>
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition"
          >
            <Share2 className="w-5 h-5" />
            Partager
          </button>
        </div>
      </div>

      {currentPosition && (
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">ETA</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{eta} min</p>
              <p className="text-xs text-blue-700 mt-1">Temps estimé d'arrivée</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-5 h-5 text-green-600" />
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
      )}

      <div className="flex-1 flex flex-col md:flex-row">
        <div className="flex-1 relative">
          <div ref={mapContainer} className="absolute inset-0" />
        </div>

        <div className="w-full md:w-96 bg-white border-t md:border-l md:border-t-0 border-slate-200 overflow-y-auto">
          <div className="p-6 space-y-6">
            {currentPosition && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  Statut en direct
                </h3>

                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-slate-900">En ligne</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Dernière mise à jour: {new Date(currentPosition.recorded_at).toLocaleTimeString('fr-FR')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
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
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900">Points GPS enregistrés</h4>
                <p className="text-sm text-slate-600">{positions.length} positions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showShareModal && session && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Partager le suivi</h3>
            <p className="text-slate-600 mb-6">
              Partagez ce lien avec votre client pour qu'il puisse suivre la mission en temps réel.
            </p>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4 border-2 border-slate-200">
              <p className="text-sm text-slate-600 mb-2 font-semibold">Lien de suivi public</p>
              <p className="text-xs break-all text-slate-700 font-mono">
                {window.location.origin}/tracking/public/{session.id}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyPublicLink}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3 rounded-xl hover:shadow-lg transition font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier le lien
                  </>
                )}
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
