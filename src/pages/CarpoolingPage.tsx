import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users, Car, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CarpoolingRide {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  price_per_seat: number;
  available_seats: number;
  distance_km: number;
  auto_accept: boolean;
  driver: {
    profiles: {
      full_name: string;
      avatar_url: string;
    };
  };
  reviews: { rating: number }[];
}

export default function CarpoolingPage() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<CarpoolingRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    departure: '',
    arrival: '',
    date: new Date().toISOString().split('T')[0],
    passengers: 1,
  });

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const { data, error } = await supabase
        .from('carpooling_rides')
        .select(`
          *,
          driver:driver_id (
            profiles (full_name, avatar_url)
          ),
          reviews:carpooling_reviews!carpooling_reviews_reviewed_id_fkey (rating)
        `)
        .eq('status', 'active')
        .gte('departure_date', new Date().toISOString())
        .order('departure_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error fetching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const searchDate = new Date(searchParams.date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));

      let query = supabase
        .from('carpooling_rides')
        .select(`
          *,
          driver:driver_id (
            profiles (full_name, avatar_url)
          ),
          reviews:carpooling_reviews!carpooling_reviews_reviewed_id_fkey (rating)
        `)
        .eq('status', 'active')
        .gte('departure_date', startOfDay.toISOString())
        .lte('departure_date', endOfDay.toISOString())
        .gte('available_seats', searchParams.passengers);

      if (searchParams.departure) {
        query = query.ilike('departure_city', `%${searchParams.departure}%`);
      }

      if (searchParams.arrival) {
        query = query.ilike('arrival_city', `%${searchParams.arrival}%`);
      }

      const { data, error } = await query.order('departure_date', { ascending: true });

      if (error) throw error;
      setRides(data || []);
    } catch (error) {
      console.error('Error searching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageRating = (reviews: { rating: number }[]) => {
    if (!reviews || reviews.length === 0) return null;
    return (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Voyagez moins cher, ensemble
            </h1>
            <p className="text-xl text-gray-300">
              Partagez vos trajets de convoyage et économisez sur vos frais
            </p>
          </div>

          {/* Search Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Ville de départ"
                  value={searchParams.departure}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, departure: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-900" size={20} />
                <input
                  type="text"
                  placeholder="Ville d'arrivée"
                  value={searchParams.arrival}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, arrival: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) =>
                    setSearchParams({ ...searchParams, date: e.target.value })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSearch}
                className="bg-slate-900 text-white py-3 px-6 rounded-lg hover:bg-slate-800 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Search size={20} />
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <TrendingUp className="mx-auto text-green-500 mb-3" size={32} />
            <h3 className="text-3xl font-bold text-gray-900 mb-1">-60%</h3>
            <p className="text-gray-600">d'économies en moyenne</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Users className="mx-auto text-blue-500 mb-3" size={32} />
            <h3 className="text-3xl font-bold text-gray-900 mb-1">1000+</h3>
            <p className="text-gray-600">convoyeurs actifs</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <Car className="mx-auto text-purple-500 mb-3" size={32} />
            <h3 className="text-3xl font-bold text-gray-900 mb-1">500+</h3>
            <p className="text-gray-600">trajets par mois</p>
          </div>
        </div>
      </div>

      {/* Rides List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {searchParams.departure || searchParams.arrival
              ? 'Résultats de recherche'
              : 'Trajets disponibles'}
          </h2>
          <button
            onClick={() => navigate('/covoiturage/publier')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Publier un trajet
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            <p className="text-gray-600 mt-4">Recherche en cours...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <Car className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun trajet trouvé
            </h3>
            <p className="text-gray-600">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {rides.map((ride) => {
              const avgRating = calculateAverageRating(ride.reviews);
              return (
                <div
                  key={ride.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer"
                  onClick={() => navigate(`/covoiturage/trajet/${ride.id}`)}
                >
                  <div className="flex items-start justify-between">
                    {/* Left: Route & Driver */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <img
                          src={
                            ride.driver?.profiles?.avatar_url ||
                            'https://via.placeholder.com/50'
                          }
                          alt="Driver"
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {ride.driver?.profiles?.full_name || 'Convoyeur'}
                          </p>
                          {avgRating && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Star size={14} className="fill-yellow-400 text-yellow-400" />
                              <span>{avgRating}</span>
                              <span className="text-gray-400">
                                ({ride.reviews.length})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(ride.departure_date).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <p className="text-sm text-gray-600">{ride.departure_city}</p>
                          </div>
                        </div>

                        <div className="ml-1.5 w-0.5 h-8 bg-gray-300"></div>

                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-slate-900"></div>
                          <div>
                            <p className="text-sm text-gray-600">{ride.arrival_city}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          <span>
                            {ride.available_seats} place{ride.available_seats > 1 ? 's' : ''}
                          </span>
                        </div>
                        {ride.distance_km && (
                          <div className="flex items-center gap-1">
                            <MapPin size={16} />
                            <span>{ride.distance_km} km</span>
                          </div>
                        )}
                        {ride.auto_accept && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            Instantané
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Price */}
                    <div className="text-right">
                      <p className="text-3xl font-bold text-slate-900">
                        {ride.price_per_seat}€
                      </p>
                      <p className="text-sm text-gray-600">par place</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
