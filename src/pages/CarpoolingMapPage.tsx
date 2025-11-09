import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { 
  Navigation, MapPin, Users, Car, Clock, DollarSign, 
  Maximize2, Minimize2, Filter, RefreshCw, Locate
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet avec Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Ride {
  id: string;
  driver_id: string;
  departure_city: string;
  arrival_city: string;
  departure_lat: number;
  departure_lng: number;
  arrival_lat: number;
  arrival_lng: number;
  departure_date: string;
  departure_time: string;
  distance_km: number;
  price_per_seat: number;
  available_seats: number;
  vehicle_brand: string;
  vehicle_model: string;
  status: string;
  current_location?: { latitude: number; longitude: number };
  driver: {
    full_name: string;
    photo_url: string;
    average_rating: number;
  };
}

// Composant pour recentrer la carte
const RecenterMap: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

// Icônes personnalisées
const createCustomIcon = (color: string, isMoving: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        <div class="absolute -inset-2 ${isMoving ? 'animate-ping' : ''} bg-${color}-400 rounded-full opacity-75"></div>
        <div class="relative bg-${color}-600 w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

const CarpoolingMapPage: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [center, setCenter] = useState<[number, number]>([46.603354, 1.888334]); // Centre de la France
  const [zoom, setZoom] = useState(6);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Filtres
  const [filters, setFilters] = useState({
    date: '',
    maxPrice: '',
    minSeats: 1,
    showInProgress: true,
    showPublished: true
  });

  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetchRides();
    getUserLocation();
    
    // Mise à jour en temps réel
    const subscription = supabase
      .channel('rides-map-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'carpooling_rides_pro' },
        (payload) => {
          console.log('Ride updated:', payload);
          fetchRides();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filters]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setCenter(coords);
          setZoom(10);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  };

  const fetchRides = async () => {
    try {
      let query = supabase
        .from('carpooling_rides_pro')
        .select(`
          *,
          driver:driver_id (
            full_name,
            photo_url,
            average_rating
          )
        `)
        .not('departure_lat', 'is', null)
        .not('arrival_lat', 'is', null);

      // Filtres de statut
      const statuses = [];
      if (filters.showPublished) statuses.push('published');
      if (filters.showInProgress) statuses.push('in_progress');
      
      if (statuses.length > 0) {
        query = query.in('status', statuses);
      }

      // Filtre de date
      if (filters.date) {
        query = query.gte('departure_date', filters.date);
      }

      // Filtre de prix
      if (filters.maxPrice) {
        query = query.lte('price_per_seat', parseFloat(filters.maxPrice));
      }

      // Filtre de places
      if (filters.minSeats > 1) {
        query = query.gte('available_seats', filters.minSeats);
      }

      const { data, error } = await query.order('departure_date', { ascending: true });

      if (error) throw error;

      // Fetch driver profiles
      const ridesWithDrivers = await Promise.all(
        (data || []).map(async (ride: any) => {
          const { data: driver } = await supabase
            .from('driver_profiles')
            .select('full_name, photo_url, average_rating')
            .eq('user_id', ride.driver_id)
            .single();

          return {
            ...ride,
            driver: driver || { full_name: 'Inconnu', photo_url: '', average_rating: 0 }
          };
        })
      );

      setRides(ridesWithDrivers);
    } catch (error) {
      console.error('Erreur chargement trajets carte:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoute = async (ride: Ride) => {
    try {
      // OpenRouteService API (nécessite une clé API gratuite)
      const API_KEY = import.meta.env.VITE_OPENROUTESERVICE_API_KEY || '5b3ce3597851110001cf6248YOUR_KEY_HERE';
      
      const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [
            [ride.departure_lng, ride.departure_lat],
            [ride.arrival_lng, ride.arrival_lat]
          ]
        })
      });

      if (!response.ok) {
        // Fallback: ligne droite si l'API échoue
        console.warn('OpenRouteService API error, using straight line');
        setRouteCoordinates([
          [ride.departure_lat, ride.departure_lng],
          [ride.arrival_lat, ride.arrival_lng]
        ]);
        return;
      }

      const data = await response.json();
      const coordinates = data.features[0].geometry.coordinates.map((coord: [number, number]) => 
        [coord[1], coord[0]] as [number, number]
      );
      
      setRouteCoordinates(coordinates);
    } catch (error) {
      console.error('Erreur récupération itinéraire:', error);
      // Fallback: ligne droite
      setRouteCoordinates([
        [ride.departure_lat, ride.departure_lng],
        [ride.arrival_lat, ride.arrival_lng]
      ]);
    }
  };

  const handleRideClick = (ride: Ride) => {
    setSelectedRide(ride);
    setCenter([ride.departure_lat, ride.departure_lng]);
    setZoom(8);
    fetchRoute(ride);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCenterOnUser = () => {
    if (userLocation) {
      setCenter(userLocation);
      setZoom(12);
    } else {
      getUserLocation();
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'min-h-screen bg-gray-50 py-8'}`}>
      <div className={`${isFullscreen ? 'h-full' : 'max-w-7xl mx-auto px-4'}`}>
        {/* Header */}
        {!isFullscreen && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Carte des trajets</h1>
            <p className="text-gray-600">Visualisez et suivez les trajets en temps réel</p>
          </div>
        )}

        {/* Contrôles de la carte */}
        <div className={`${isFullscreen ? 'absolute top-4 left-4 right-4 z-[1000]' : 'mb-4'} flex items-center justify-between`}>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtres</span>
            </button>

            <button
              onClick={fetchRides}
              className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Actualiser</span>
            </button>

            <button
              onClick={handleCenterOnUser}
              className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <Locate className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Ma position</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-white px-4 py-2 rounded-lg shadow-md">
              <span className="text-sm font-medium text-gray-700">{rides.length} trajet{rides.length > 1 ? 's' : ''}</span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-gray-600" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <div className={`${isFullscreen ? 'absolute top-20 left-4 z-[1000]' : 'mb-4'} bg-white rounded-lg shadow-lg p-6 max-w-md`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtres</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de départ</label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prix maximum par siège</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="Ex: 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Places minimum</label>
                <select
                  value={filters.minSeats}
                  onChange={(e) => setFilters({ ...filters, minSeats: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1 place</option>
                  <option value="2">2 places</option>
                  <option value="3">3 places</option>
                  <option value="4">4 places</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showPublished}
                    onChange={(e) => setFilters({ ...filters, showPublished: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Afficher trajets publiés</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showInProgress}
                    onChange={(e) => setFilters({ ...filters, showInProgress: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Afficher trajets en cours</span>
                </label>
              </div>

              <button
                onClick={() => {
                  setFilters({
                    date: '',
                    maxPrice: '',
                    minSeats: 1,
                    showInProgress: true,
                    showPublished: true
                  });
                  fetchRides();
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}

        {/* Carte Leaflet */}
        <div className={`${isFullscreen ? 'h-full' : 'h-[600px]'} rounded-lg overflow-hidden shadow-lg relative`}>
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[1000]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          <MapContainer
            center={center}
            zoom={zoom}
            className="h-full w-full"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <RecenterMap center={center} zoom={zoom} />

            {/* Position de l'utilisateur */}
            {userLocation && (
              <Marker position={userLocation} icon={createCustomIcon('blue', false)}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">Votre position</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Markers des trajets */}
            {rides.map((ride) => (
              <React.Fragment key={ride.id}>
                {/* Marker départ */}
                <Marker
                  position={[ride.departure_lat, ride.departure_lng]}
                  icon={createCustomIcon('green', false)}
                  eventHandlers={{
                    click: () => handleRideClick(ride)
                  }}
                >
                  <Popup>
                    <div className="min-w-[250px]">
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={ride.driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driver.full_name)}`}
                          alt={ride.driver.full_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{ride.driver.full_name}</p>
                          <p className="text-xs text-gray-500">⭐ {ride.driver.average_rating.toFixed(1)}/5</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-green-600">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">Départ: {ride.departure_city}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-red-600">
                          <MapPin className="w-4 h-4" />
                          <span className="font-medium">Arrivée: {ride.arrival_city}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(ride.departure_date).toLocaleDateString('fr-FR')} à {ride.departure_time}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-600">
                          <Car className="w-4 h-4" />
                          <span>{ride.vehicle_brand} {ride.vehicle_model}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center space-x-2 text-blue-600">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-bold">{ride.price_per_seat} €/place</span>
                          </div>

                          <div className="flex items-center space-x-1 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{ride.available_seats} places</span>
                          </div>
                        </div>

                        <button
                          onClick={() => window.location.href = `/covoiturage/trajet/${ride.id}`}
                          className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          Voir les détails
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {/* Marker arrivée */}
                <Marker
                  position={[ride.arrival_lat, ride.arrival_lng]}
                  icon={createCustomIcon('red', false)}
                  eventHandlers={{
                    click: () => handleRideClick(ride)
                  }}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-semibold">{ride.arrival_city}</p>
                      <p className="text-xs text-gray-500">Arrivée estimée</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Marker position actuelle (si en cours) */}
                {ride.status === 'in_progress' && ride.current_location && (
                  <Marker
                    position={[ride.current_location.latitude, ride.current_location.longitude]}
                    icon={createCustomIcon('blue', true)}
                  >
                    <Popup>
                      <div className="text-center">
                        <p className="font-semibold">Position actuelle</p>
                        <p className="text-xs text-gray-500">En déplacement</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            ))}

            {/* Tracé de l'itinéraire sélectionné */}
            {selectedRide && routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color="#3B82F6"
                weight={4}
                opacity={0.7}
              />
            )}
          </MapContainer>
        </div>

        {/* Liste des trajets (sidebar) */}
        {!isFullscreen && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rides.map((ride) => (
              <div
                key={ride.id}
                onClick={() => handleRideClick(ride)}
                className={`bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition ${
                  selectedRide?.id === ride.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <img
                    src={ride.driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driver.full_name)}`}
                    alt={ride.driver.full_name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{ride.driver.full_name}</p>
                    <p className="text-xs text-gray-500">⭐ {ride.driver.average_rating.toFixed(1)}/5</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ride.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {ride.status === 'in_progress' ? 'En cours' : 'Publié'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{ride.departure_city}</span>
                    <Navigation className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{ride.arrival_city}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-bold text-blue-600">{ride.price_per_seat} €</span>
                    <span className="text-gray-600 text-xs">{ride.available_seats} places</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarpoolingMapPage;
