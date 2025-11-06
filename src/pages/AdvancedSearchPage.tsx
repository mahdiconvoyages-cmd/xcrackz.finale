import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Car,
  Filter,
  X,
  Star,
  TrendingUp,
  Clock,
  Bookmark,
  History
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Ride {
  id: string;
  driver_id: string;
  departure_city: string;
  departure_lat: number;
  departure_lng: number;
  arrival_city: string;
  arrival_lat: number;
  arrival_lng: number;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  distance_km: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_type?: string;
  status: string;
  created_at: string;
  driver?: {
    full_name: string;
    photo_url?: string;
    average_rating: number;
    total_reviews: number;
    is_verified: boolean;
  };
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  created_at: string;
}

interface SearchFilters {
  departureCity: string;
  arrivalCity: string;
  date: string;
  minSeats: number;
  maxPrice: number;
  vehicleType: string;
  onlyVerified: boolean;
  minRating: number;
}

interface CitySuggestion {
  name: string;
  count: number;
}

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [departureSuggestions, setDepartureSuggestions] = useState<CitySuggestion[]>([]);
  const [arrivalSuggestions, setArrivalSuggestions] = useState<CitySuggestion[]>([]);
  const [showDepartureSuggestions, setShowDepartureSuggestions] = useState(false);
  const [showArrivalSuggestions, setShowArrivalSuggestions] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    departureCity: '',
    arrivalCity: '',
    date: '',
    minSeats: 1,
    maxPrice: 200,
    vehicleType: '',
    onlyVerified: false,
    minRating: 0
  });

  useEffect(() => {
    loadRecentSearches();
    loadSavedSearches();
  }, []);

  // Charger suggestions de villes au focus
  useEffect(() => {
    if (showDepartureSuggestions) {
      fetchCitySuggestions('departure');
    }
  }, [showDepartureSuggestions]);

  useEffect(() => {
    if (showArrivalSuggestions) {
      fetchCitySuggestions('arrival');
    }
  }, [showArrivalSuggestions]);

  const fetchCitySuggestions = async (type: 'departure' | 'arrival') => {
    try {
      const column = type === 'departure' ? 'departure_city' : 'arrival_city';
      const searchValue = type === 'departure' ? filters.departureCity : filters.arrivalCity;

      let query = supabase
        .from('carpooling_rides_pro')
        .select(column)
        .neq('status', 'cancelled');

      if (searchValue) {
        query = query.ilike(column, `%${searchValue}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Compter occurrences
        const cityCount: Record<string, number> = {};
        data.forEach((item: any) => {
          const city = item[column];
          if (city) {
            cityCount[city] = (cityCount[city] || 0) + 1;
          }
        });

        // Convertir en array et trier par popularité
        const suggestions = Object.entries(cityCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        if (type === 'departure') {
          setDepartureSuggestions(suggestions);
        } else {
          setArrivalSuggestions(suggestions);
        }
      }
    } catch (err) {
      console.error('Error fetching city suggestions:', err);
    }
  };

  const loadRecentSearches = () => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  };

  const loadSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const stored = localStorage.getItem(`savedSearches_${user.id}`);
      if (stored) {
        setSavedSearches(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Error loading saved searches:', err);
    }
  };

  const saveSearch = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const name = `${filters.departureCity} → ${filters.arrivalCity}`;
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      created_at: new Date().toISOString()
    };

    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem(`savedSearches_${user.id}`, JSON.stringify(updated));
  };

  const loadSavedSearch = (search: SavedSearch) => {
    setFilters(search.filters);
    handleSearch(search.filters);
  };

  const deleteSavedSearch = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem(`savedSearches_${user.id}`, JSON.stringify(updated));
  };

  const addToRecentSearches = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = async (searchFilters: SearchFilters = filters) => {
    setLoading(true);

    try {
      // Ajouter aux recherches récentes
      if (searchFilters.departureCity && searchFilters.arrivalCity) {
        addToRecentSearches(`${searchFilters.departureCity} → ${searchFilters.arrivalCity}`);
      }

      let query = supabase
        .from('carpooling_rides_pro')
        .select(`
          *,
          driver:driver_profiles!carpooling_rides_pro_driver_id_fkey (
            full_name,
            photo_url,
            average_rating,
            total_reviews,
            is_verified
          )
        `)
        .in('status', ['published', 'in_progress'])
        .gte('available_seats', searchFilters.minSeats)
        .lte('price_per_seat', searchFilters.maxPrice);

      // Filtres de base
      if (searchFilters.departureCity) {
        query = query.ilike('departure_city', `%${searchFilters.departureCity}%`);
      }
      if (searchFilters.arrivalCity) {
        query = query.ilike('arrival_city', `%${searchFilters.arrivalCity}%`);
      }
      if (searchFilters.date) {
        query = query.gte('departure_date', searchFilters.date);
      }
      if (searchFilters.vehicleType) {
        query = query.eq('vehicle_type', searchFilters.vehicleType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let results: Ride[] = (data || []) as Ride[];

      // Filtres client-side (car RLS peut bloquer certaines colonnes)
      if (searchFilters.onlyVerified) {
        results = results.filter(r => r.driver?.is_verified);
      }
      if (searchFilters.minRating > 0) {
        results = results.filter(r => (r.driver?.average_rating || 0) >= searchFilters.minRating);
      }

      // Trier par pertinence (date proche, meilleur prix, meilleure note)
      results.sort((a, b) => {
        const aScore = (a.driver?.average_rating || 0) * 10 - a.price_per_seat;
        const bScore = (b.driver?.average_rating || 0) * 10 - b.price_per_seat;
        return bScore - aScore;
      });

      setRides(results);
    } catch (err) {
      console.error('Error searching rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      departureCity: '',
      arrivalCity: '',
      date: '',
      minSeats: 1,
      maxPrice: 200,
      vehicleType: '',
      onlyVerified: false,
      minRating: 0
    });
    setRides([]);
  };

  const quickFilters = [
    { label: 'Aujourd\'hui', action: () => setFilters({ ...filters, date: new Date().toISOString().split('T')[0] }) },
    { label: 'Demain', action: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFilters({ ...filters, date: tomorrow.toISOString().split('T')[0] });
    }},
    { label: '< 50€', action: () => setFilters({ ...filters, maxPrice: 50 }) },
    { label: 'Vérifiés', action: () => setFilters({ ...filters, onlyVerified: !filters.onlyVerified }) },
    { label: '4★+', action: () => setFilters({ ...filters, minRating: 4 }) }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-7 h-7 text-blue-600" />
              Recherche avancée
            </h1>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <Filter className="w-5 h-5" />
              {showFilters ? 'Masquer' : 'Afficher'} filtres
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Panneau de filtres */}
          {showFilters && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Filtres de recherche</h2>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Réinitialiser
                  </button>
                </div>

                {/* Ville de départ */}
                <div className="mb-4 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Ville de départ
                  </label>
                  <input
                    type="text"
                    value={filters.departureCity}
                    onChange={(e) => setFilters({ ...filters, departureCity: e.target.value })}
                    onFocus={() => setShowDepartureSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDepartureSuggestions(false), 200)}
                    placeholder="Paris, Lyon..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {showDepartureSuggestions && departureSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {departureSuggestions.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => {
                            setFilters({ ...filters, departureCity: city.name });
                            setShowDepartureSuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-gray-900">{city.name}</span>
                          <span className="text-sm text-gray-500">{city.count} trajet{city.count > 1 ? 's' : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ville d'arrivée */}
                <div className="mb-4 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Ville d'arrivée
                  </label>
                  <input
                    type="text"
                    value={filters.arrivalCity}
                    onChange={(e) => setFilters({ ...filters, arrivalCity: e.target.value })}
                    onFocus={() => setShowArrivalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowArrivalSuggestions(false), 200)}
                    placeholder="Marseille, Bordeaux..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {showArrivalSuggestions && arrivalSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {arrivalSuggestions.map((city) => (
                        <button
                          key={city.name}
                          onClick={() => {
                            setFilters({ ...filters, arrivalCity: city.name });
                            setShowArrivalSuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className="text-gray-900">{city.name}</span>
                          <span className="text-sm text-gray-500">{city.count} trajet{city.count > 1 ? 's' : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date de départ
                  </label>
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Places disponibles */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 inline mr-1" />
                    Places min : {filters.minSeats}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={filters.minSeats}
                    onChange={(e) => setFilters({ ...filters, minSeats: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Prix maximum */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Prix max : {filters.maxPrice}€
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="10"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Type de véhicule */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Car className="w-4 h-4 inline mr-1" />
                    Type de véhicule
                  </label>
                  <select
                    value={filters.vehicleType}
                    onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous types</option>
                    <option value="berline">Berline</option>
                    <option value="suv">SUV</option>
                    <option value="utilitaire">Utilitaire</option>
                    <option value="van">Van</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </div>

                {/* Convoyeurs vérifiés */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.onlyVerified}
                      onChange={(e) => setFilters({ ...filters, onlyVerified: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Convoyeurs vérifiés uniquement
                    </span>
                  </label>
                </div>

                {/* Note minimum */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Star className="w-4 h-4 inline mr-1 text-yellow-500" />
                    Note minimum
                  </label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setFilters({ ...filters, minRating: rating })}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          filters.minRating === rating
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {rating === 0 ? 'Toutes' : `${rating}★+`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bouton de recherche */}
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Recherche...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Rechercher
                    </>
                  )}
                </button>

                {/* Sauvegarder la recherche */}
                {(filters.departureCity || filters.arrivalCity) && (
                  <button
                    onClick={saveSearch}
                    className="w-full mt-2 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                  >
                    <Bookmark className="w-4 h-4" />
                    Sauvegarder cette recherche
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Résultats */}
          <div className={showFilters ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Filtres rapides */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">Filtres rapides:</span>
                {quickFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={filter.action}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recherches sauvegardées */}
            {savedSearches.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-600" />
                  Recherches sauvegardées
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {savedSearches.map((search) => (
                    <div key={search.id} className="flex items-center gap-1 bg-blue-50 rounded-lg">
                      <button
                        onClick={() => loadSavedSearch(search)}
                        className="px-3 py-1 text-blue-700 text-sm font-medium hover:bg-blue-100 rounded-l-lg transition"
                      >
                        {search.name}
                      </button>
                      <button
                        onClick={() => deleteSavedSearch(search.id)}
                        className="px-2 py-1 text-blue-600 hover:text-red-600 hover:bg-blue-100 rounded-r-lg transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recherches récentes */}
            {recentSearches.length > 0 && rides.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-600" />
                  Recherches récentes
                </h3>
                <div className="flex gap-2 flex-wrap">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        const [dep, arr] = search.split(' → ');
                        setFilters({ ...filters, departureCity: dep, arrivalCity: arr });
                      }}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des résultats */}
            {rides.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-700 font-medium">
                    {rides.length} trajet{rides.length > 1 ? 's' : ''} trouvé{rides.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="w-4 h-4" />
                    Triés par pertinence
                  </div>
                </div>

                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    onClick={() => navigate(`/covoiturage/trajet/${ride.id}`)}
                    className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <img
                            src={ride.driver?.photo_url || `https://ui-avatars.com/api/?name=${ride.driver?.full_name}`}
                            alt={ride.driver?.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {ride.driver?.full_name}
                              {ride.driver?.is_verified && (
                                <span className="text-blue-600 text-xs">✓ Vérifié</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="font-medium">{ride.driver?.average_rating?.toFixed(1) || 'N/A'}</span>
                              <span className="text-gray-400">({ride.driver?.total_reviews || 0} avis)</span>
                            </div>
                          </div>
                        </div>

                        {/* Itinéraire */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-gray-900">{ride.departure_city}</span>
                          </div>
                          <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-600" />
                            <span className="font-medium text-gray-900">{ride.arrival_city}</span>
                          </div>
                        </div>

                        {/* Infos */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(ride.departure_date).toLocaleDateString('fr-FR', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {ride.departure_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {ride.available_seats} place{ride.available_seats > 1 ? 's' : ''}
                          </div>
                          {ride.vehicle_brand && (
                            <div className="flex items-center gap-1">
                              <Car className="w-4 h-4" />
                              {ride.vehicle_brand} {ride.vehicle_model}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prix */}
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{ride.price_per_seat}€</div>
                        <div className="text-sm text-gray-500">par place</div>
                        <div className="text-xs text-gray-400 mt-1">{ride.distance_km} km</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : loading ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Recherche en cours...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun trajet trouvé
                </h3>
                <p className="text-gray-600 mb-4">
                  Essayez de modifier vos critères de recherche
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
