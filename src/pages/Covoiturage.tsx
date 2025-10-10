import { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Calendar, Users, Clock, Star, Car, ArrowRight, PawPrint, Cigarette, Music, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import blablacarImg from '../assets/blablacar.png';
import CarpoolingMessaging from '../components/CarpoolingMessaging';

interface Trip {
  id: string;
  driver_id: string;
  departure_address: string;
  departure_city: string;
  departure_datetime: string;
  arrival_address: string;
  arrival_city: string;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  status: string;
  allows_pets: boolean;
  allows_smoking: boolean;
  allows_music: boolean;
  luggage_size: string;
  description: string;
  driver: {
    full_name: string;
    email: string;
  };
  driver_rating?: number;
  driver_trips_count?: number;
}

interface Booking {
  id: string;
  trip_id: string;
  seats_booked: number;
  total_price: number;
  status: string;
  trip: Trip;
}

export default function Covoiturage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'my-trips' | 'my-bookings'>('search');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchSeats, setSearchSeats] = useState('1');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const [formData, setFormData] = useState({
    departure_address: '',
    departure_city: '',
    arrival_address: '',
    arrival_city: '',
    departure_datetime: '',
    total_seats: '3',
    price_per_seat: '',
    allows_pets: false,
    allows_smoking: false,
    allows_music: true,
    max_two_back: false,
    luggage_size: 'medium',
    description: '',
  });

  const [bookingData, setBookingData] = useState({
    seats_booked: '1',
    message: '',
  });

  const [showMessaging, setShowMessaging] = useState(false);
  const [messagingData, setMessagingData] = useState<{ tripId: string; userId: string; userName: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'search') {
        await searchTrips();
      } else if (activeTab === 'my-trips') {
        await loadMyTrips();
      } else if (activeTab === 'my-bookings') {
        await loadMyBookings();
      }
    } finally {
      setLoading(false);
    }
  };

  const searchTrips = async () => {
    let query = supabase
      .from('carpooling_trips')
      .select(`
        *,
        driver:driver_id(full_name, email)
      `)
      .eq('status', 'active')
      .gte('departure_datetime', new Date().toISOString())
      .order('departure_datetime', { ascending: true });

    if (searchFrom) {
      query = query.ilike('departure_city', `%${searchFrom}%`);
    }
    if (searchTo) {
      query = query.ilike('arrival_city', `%${searchTo}%`);
    }
    if (searchDate) {
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.gte('departure_datetime', startOfDay.toISOString())
                   .lte('departure_datetime', endOfDay.toISOString());
    }
    if (searchSeats) {
      query = query.gte('available_seats', parseInt(searchSeats));
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error searching trips:', error);
      return;
    }

    const tripsWithRatings = await Promise.all((data || []).map(async (trip: any) => {
      const { data: ratingData } = await supabase.rpc('get_user_average_rating', { user_uuid: trip.driver_id });
      const { data: tripsData } = await supabase.rpc('get_driver_trips_count', { user_uuid: trip.driver_id });

      return {
        ...trip,
        driver_rating: ratingData || 0,
        driver_trips_count: tripsData || 0,
      };
    }));

    setTrips(tripsWithRatings);
  };

  const loadMyTrips = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('carpooling_trips')
      .select(`
        *,
        driver:driver_id(full_name, email)
      `)
      .eq('driver_id', user.id)
      .order('departure_datetime', { ascending: false });

    if (error) {
      console.error('Error loading my trips:', error);
      return;
    }

    setMyTrips(data || []);
  };

  const loadMyBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('carpooling_bookings')
      .select(`
        *,
        trip:trip_id(
          *,
          driver:driver_id(full_name, email)
        )
      `)
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bookings:', error);
      return;
    }

    setMyBookings(data || []);
  };

  const createTrip = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('carpooling_trips')
      .insert([{
        driver_id: user.id,
        ...formData,
        available_seats: parseInt(formData.total_seats),
        total_seats: parseInt(formData.total_seats),
        price_per_seat: parseFloat(formData.price_per_seat),
      }]);

    if (error) {
      console.error('Error creating trip:', error);
      alert('Erreur lors de la création du trajet');
      return;
    }

    setShowCreateModal(false);
    setFormData({
      departure_address: '',
      departure_city: '',
      arrival_address: '',
      arrival_city: '',
      departure_datetime: '',
      total_seats: '3',
      price_per_seat: '',
      allows_pets: false,
      allows_smoking: false,
      allows_music: true,
      max_two_back: false,
      luggage_size: 'medium',
      description: '',
    });
    loadData();
  };

  const bookTrip = async () => {
    if (!user || !selectedTrip) return;

    const seatsBooked = parseInt(bookingData.seats_booked);
    const totalPrice = seatsBooked * selectedTrip.price_per_seat;

    const { error } = await supabase
      .from('carpooling_bookings')
      .insert([{
        trip_id: selectedTrip.id,
        passenger_id: user.id,
        seats_booked: seatsBooked,
        total_price: totalPrice,
        status: 'pending',
        message: bookingData.message,
      }]);

    if (error) {
      console.error('Error booking trip:', error);
      alert('Erreur lors de la réservation');
      return;
    }

    setShowBookingModal(false);
    setSelectedTrip(null);
    setBookingData({ seats_booked: '1', message: '' });
    alert('Réservation envoyée ! Le conducteur va la valider.');
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'full': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Actif',
      full: 'Complet',
      completed: 'Terminé',
      cancelled: 'Annulé',
      pending: 'En attente',
      confirmed: 'Confirmé',
      rejected: 'Refusé',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="relative h-80 overflow-hidden rounded-b-3xl shadow-2xl">
        <img
          src={blablacarImg}
          alt="Covoiturage"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/60 via-cyan-900/50 to-slate-900/70"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h1 className="text-6xl font-bold mb-4 drop-shadow-2xl animate-in slide-in-from-top duration-700">
            Covoiturage
          </h1>
          <p className="text-2xl drop-shadow-lg animate-in slide-in-from-bottom duration-700">Partagez vos trajets et économisez !</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10 space-y-6">

        <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Trouvez votre trajet
          </h2>
          <p className="text-slate-600 mt-2">Des milliers de trajets disponibles</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Publier un trajet
        </button>
      </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('search')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'search'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-5 h-5 inline mr-2" />
          Rechercher
        </button>
        <button
          onClick={() => setActiveTab('my-trips')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'my-trips'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-5 h-5 inline mr-2" />
          Mes trajets
        </button>
        <button
          onClick={() => setActiveTab('my-bookings')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'my-bookings'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5 inline mr-2" />
          Mes réservations
        </button>
        </div>

        {activeTab === 'search' && (
          <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Départ
                </label>
                <input
                  type="text"
                  placeholder="Ville de départ"
                  value={searchFrom}
                  onChange={(e) => setSearchFrom(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Arrivée
                </label>
                <input
                  type="text"
                  placeholder="Ville d'arrivée"
                  value={searchTo}
                  onChange={(e) => setSearchTo(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Passagers
                </label>
                <select
                  value={searchSeats}
                  onChange={(e) => setSearchSeats(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={searchTrips}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
                >
                  <Search className="w-5 h-5 inline mr-2" />
                  Rechercher
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                <p className="text-slate-600 mt-4">Recherche en cours...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Aucun trajet trouvé pour ces critères</p>
              </div>
            ) : (
              trips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onBook={() => {
                    setSelectedTrip(trip);
                    setShowBookingModal(true);
                  }}
                />
              ))
            )}
          </div>
          </div>
        )}

        {activeTab === 'my-trips' && (
          <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : myTrips.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">Vous n'avez pas encore publié de trajet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Publier mon premier trajet
              </button>
            </div>
          ) : (
            myTrips.map(trip => (
              <TripCard key={trip.id} trip={trip} isOwner />
            ))
          )}
          </div>
        )}

        {activeTab === 'my-bookings' && (
          <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : myBookings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">Vous n'avez pas encore de réservation</p>
            </div>
          ) : (
            myBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))
          )}
          </div>
        )}

        {showCreateModal && (
          <CreateTripModal
          formData={formData}
          setFormData={setFormData}
          onClose={() => setShowCreateModal(false)}
          onCreate={createTrip}
          />
        )}

        {showBookingModal && selectedTrip && (
          <BookingModal
          trip={selectedTrip}
          bookingData={bookingData}
          setBookingData={setBookingData}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedTrip(null);
          }}
          onBook={bookTrip}
          />
        )}

        {showMessaging && messagingData && (
          <CarpoolingMessaging
            tripId={messagingData.tripId}
            otherUserId={messagingData.userId}
            otherUserName={messagingData.userName}
            onClose={() => {
              setShowMessaging(false);
              setMessagingData(null);
            }}
          />
        )}
      </div>
      </div>
    </div>
  );
}

function TripCard({ trip, isOwner = false, onBook }: { trip: Trip; isOwner?: boolean; onBook?: () => void }) {
  const { user } = useAuth();
  const [showMessaging, setShowMessaging] = useState(false);
  const departureDate = new Date(trip.departure_datetime);

  return (
    <>
    <div className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {trip.driver.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{trip.driver.full_name}</h3>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                {trip.driver_rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {trip.driver_rating.toFixed(1)}
                  </span>
                )}
                {trip.driver_trips_count > 0 && (
                  <span>{trip.driver_trips_count} trajets</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-900">{trip.departure_city}</span>
              </div>
              <p className="text-sm text-slate-600">{trip.departure_address}</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="font-semibold text-slate-900">{trip.arrival_city}</span>
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-sm text-slate-600">{trip.arrival_address}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {departureDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {trip.available_seats} place{trip.available_seats > 1 ? 's' : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {trip.allows_pets && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs flex items-center gap-1">
                <PawPrint className="w-3 h-3" /> Animaux OK
              </span>
            )}
            {trip.allows_music && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs flex items-center gap-1">
                <Music className="w-3 h-3" /> Musique
              </span>
            )}
            {!trip.allows_smoking && (
              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs flex items-center gap-1">
                <Cigarette className="w-3 h-3" /> Non-fumeur
              </span>
            )}
            <span className={`px-2 py-1 rounded-lg text-xs ${getStatusColor(trip.status)}`}>
              {getStatusLabel(trip.status)}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {trip.price_per_seat.toFixed(2)}€
          </div>
          <p className="text-xs text-slate-600 mb-4">par place</p>
          {!isOwner && onBook && trip.status === 'active' && (
            <div className="space-y-2">
              <button
                onClick={onBook}
                className="w-full px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
              >
                Réserver
              </button>
              <button
                onClick={() => setShowMessaging(true)}
                className="w-full px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Contacter
              </button>
            </div>
          )}
          {isOwner && (
            <Link
              to={`/covoiturage/trip/${trip.id}`}
              className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition inline-block"
            >
              Gérer
            </Link>
          )}
        </div>
      </div>

      {trip.description && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">{trip.description}</p>
        </div>
      )}
    </div>

    {showMessaging && user && trip.driver_id !== user.id && (
      <CarpoolingMessaging
        tripId={trip.id}
        otherUserId={trip.driver_id}
        otherUserName={trip.driver.full_name}
        onClose={() => setShowMessaging(false)}
      />
    )}
    </>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const trip = booking.trip as any;
  const departureDate = new Date(trip.departure_datetime);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-900 mb-1">
            {trip.departure_city} → {trip.arrival_city}
          </h3>
          <p className="text-sm text-slate-600">
            {departureDate.toLocaleDateString('fr-FR')} à {departureDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getStatusColor(booking.status)}`}>
          {getStatusLabel(booking.status)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-600">Conducteur</p>
          <p className="font-semibold">{trip.driver.full_name}</p>
        </div>
        <div>
          <p className="text-slate-600">Places réservées</p>
          <p className="font-semibold">{booking.seats_booked}</p>
        </div>
        <div>
          <p className="text-slate-600">Total</p>
          <p className="font-semibold text-blue-600">{booking.total_price.toFixed(2)}€</p>
        </div>
      </div>
    </div>
  );
}

function CreateTripModal({ formData, setFormData, onClose, onCreate }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Publier un trajet</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ville de départ *</label>
              <input
                type="text"
                value={formData.departure_city}
                onChange={(e) => setFormData({ ...formData, departure_city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Paris"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse de départ *</label>
              <input
                type="text"
                value={formData.departure_address}
                onChange={(e) => setFormData({ ...formData, departure_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Gare de Lyon"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ville d'arrivée *</label>
              <input
                type="text"
                value={formData.arrival_city}
                onChange={(e) => setFormData({ ...formData, arrival_city: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Lyon"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse d'arrivée *</label>
              <input
                type="text"
                value={formData.arrival_address}
                onChange={(e) => setFormData({ ...formData, arrival_address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Gare Part-Dieu"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date et heure *</label>
              <input
                type="datetime-local"
                value={formData.departure_datetime}
                onChange={(e) => setFormData({ ...formData, departure_datetime: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Places *</label>
              <select
                value={formData.total_seats}
                onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Prix par place *</label>
              <input
                type="number"
                step="0.50"
                value={formData.price_per_seat}
                onChange={(e) => setFormData({ ...formData, price_per_seat: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="15.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Options</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allows_pets}
                  onChange={(e) => setFormData({ ...formData, allows_pets: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">Animaux acceptés</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allows_smoking}
                  onChange={(e) => setFormData({ ...formData, allows_smoking: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">Fumeur accepté</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allows_music}
                  onChange={(e) => setFormData({ ...formData, allows_music: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">Musique</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.max_two_back}
                  onChange={(e) => setFormData({ ...formData, max_two_back: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">Max 2 à l'arrière</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Informations complémentaires sur le trajet..."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition"
          >
            Annuler
          </button>
          <button
            onClick={onCreate}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
          >
            Publier
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ trip, bookingData, setBookingData, onClose, onBook }: any) {
  const totalPrice = parseInt(bookingData.seats_booked) * trip.price_per_seat;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Réserver ce trajet</h2>

        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">{trip.departure_city} → {trip.arrival_city}</h3>
            <p className="text-sm text-slate-600">
              {new Date(trip.departure_datetime).toLocaleDateString('fr-FR')} à{' '}
              {new Date(trip.departure_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nombre de places (max {trip.available_seats})
            </label>
            <select
              value={bookingData.seats_booked}
              onChange={(e) => setBookingData({ ...bookingData, seats_booked: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: trip.available_seats }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Message au conducteur (optionnel)
            </label>
            <textarea
              value={bookingData.message}
              onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Présentez-vous au conducteur..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-700">Prix par place</span>
              <span className="font-semibold">{trip.price_per_seat.toFixed(2)}€</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-700">Nombre de places</span>
              <span className="font-semibold">×{bookingData.seats_booked}</span>
            </div>
            <div className="border-t border-blue-300 pt-2 mt-2 flex items-center justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="text-2xl font-bold text-blue-600">{totalPrice.toFixed(2)}€</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition"
          >
            Annuler
          </button>
          <button
            onClick={onBook}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:shadow-lg transition"
          >
            Réserver
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'full': return 'bg-orange-100 text-orange-700';
    case 'completed': return 'bg-blue-100 text-blue-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'confirmed': return 'bg-green-100 text-green-700';
    case 'rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'Actif',
    full: 'Complet',
    completed: 'Terminé',
    cancelled: 'Annulé',
    pending: 'En attente',
    confirmed: 'Confirmé',
    rejected: 'Refusé',
  };
  return labels[status] || status;
}
