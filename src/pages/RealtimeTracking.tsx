import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { supabase } from '../lib/supabase';
import { Car, Navigation, Clock, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface Position {
  id: string;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  accuracy: number;
  recorded_at: string;
}

export default function RealtimeTracking() {
  const { missionId } = useParams();
  const [positions, setPositions] = useState<Position[]>([]);
  const [latestPosition, setLatestPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(true);

  // Icône de voiture plus visible avec fond
  const carIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="white" stroke="#3b82f6" stroke-width="3"/>
        <g transform="translate(12, 12)">
          <path d="M5 17h-2v-5l2-5h10l2 5v5h-2" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="7" cy="17" r="2.5" fill="#3b82f6"/>
          <circle cx="17" cy="17" r="2.5" fill="#3b82f6"/>
          <path d="M5 9l1.5-3h9l1.5 3" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </svg>
    `),
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });

  useEffect(() => {
    if (!missionId) return;

    // Charger les positions initiales
    loadPositions();

    // S'abonner aux nouvelles positions en temps réel
    const channel = supabase
      .channel(`tracking_${missionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tracking_positions',
          filter: `mission_id=eq.${missionId}`,
        },
        (payload) => {
          const newPosition = payload.new as Position;
          setPositions((prev) => [newPosition, ...prev].slice(0, 100)); // Garder les 100 dernières
          setLatestPosition(newPosition);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [missionId]);

  const loadPositions = async () => {
    if (!missionId) return;

    try {
      const { data, error } = await supabase
        .from('tracking_positions')
        .select('*')
        .eq('mission_id', missionId)
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setPositions(data || []);
      if (data && data.length > 0) {
        setLatestPosition(data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement positions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!latestPosition) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <Car className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Aucune position disponible</h2>
        <p className="text-gray-500">Le partage de position n'a pas encore été activé pour cette mission.</p>
      </div>
    );
  }

  const center: [number, number] = [latestPosition.latitude, latestPosition.longitude];
  
  // Créer la polyline avec toutes les positions
  const route: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header compact avec infos essentielles */}
      <div className="bg-white border-b border-gray-200 shadow-sm p-3 sm:p-4 z-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              Suivi en direct
            </h1>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              En ligne
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Vitesse - Card principale */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5" />
                <span className="text-sm font-medium opacity-90">Vitesse</span>
              </div>
              <p className="text-4xl font-bold">{Math.round(latestPosition.speed_kmh)}</p>
              <p className="text-sm opacity-80 mt-1">km/h</p>
            </div>

            {/* Direction */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600">Direction</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{Math.round(latestPosition.heading)}°</p>
              <p className="text-xs text-gray-500 mt-1">
                {latestPosition.heading >= 337.5 || latestPosition.heading < 22.5 ? 'Nord' :
                 latestPosition.heading >= 22.5 && latestPosition.heading < 67.5 ? 'Nord-Est' :
                 latestPosition.heading >= 67.5 && latestPosition.heading < 112.5 ? 'Est' :
                 latestPosition.heading >= 112.5 && latestPosition.heading < 157.5 ? 'Sud-Est' :
                 latestPosition.heading >= 157.5 && latestPosition.heading < 202.5 ? 'Sud' :
                 latestPosition.heading >= 202.5 && latestPosition.heading < 247.5 ? 'Sud-Ouest' :
                 latestPosition.heading >= 247.5 && latestPosition.heading < 292.5 ? 'Ouest' : 'Nord-Ouest'}
              </p>
            </div>

            {/* Précision */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-gray-600">Précision</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{Math.round(latestPosition.accuracy)}</p>
              <p className="text-xs text-gray-500 mt-1">mètres</p>
            </div>

            {/* Dernière mise à jour */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Mise à jour</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {new Date(latestPosition.recorded_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(latestPosition.recorded_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Carte pleine hauteur avec contrôles optimisés */}
      <div className="flex-1 relative">
        <MapContainer
          center={center}
          zoom={17}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Trajet (polyline) avec couleur plus visible */}
          {route.length > 1 && (
            <Polyline
              positions={route}
              color="#3b82f6"
              weight={5}
              opacity={0.8}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Marqueur voiture avec popup amélioré */}
          <Marker position={center} icon={carIcon}>
            <Popup>
              <div className="text-center p-2">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Car className="w-5 h-5 text-blue-600" />
                  <p className="font-bold text-2xl text-blue-600">{Math.round(latestPosition.speed_kmh)} km/h</p>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Direction: {Math.round(latestPosition.heading)}°
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(latestPosition.recorded_at).toLocaleString('fr-FR')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Précision: ±{Math.round(latestPosition.accuracy)}m
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Badge vitesse flottant optimisé (mobile uniquement) */}
        <div className="absolute top-4 right-4 lg:hidden">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl px-5 py-3 shadow-2xl border-4 border-white">
            <p className="text-4xl font-bold text-white text-center leading-none">{Math.round(latestPosition.speed_kmh)}</p>
            <p className="text-xs text-blue-100 text-center font-medium mt-1">km/h</p>
          </div>
        </div>

        {/* Indicateur de positions enregistrées */}
        <div className="absolute bottom-20 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <p className="text-sm font-medium text-gray-700">
              {positions.length} position{positions.length > 1 ? 's' : ''} enregistrée{positions.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
