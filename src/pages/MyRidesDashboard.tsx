import { useState, useEffect } from 'react';
import { Car, MapPin, Users, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MyRide {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  price_per_seat: number;
  available_seats: number;
  total_seats: number;
  status: string;
  bookings: {
    id: string;
    seats_booked: number;
    status: string;
    passenger: {
      profiles: {
        full_name: string;
        avatar_url: string;
      };
    };
  }[];
}

interface MyBooking {
  id: string;
  seats_booked: number;
  amount_paid: number;
  status: string;
  payment_method: string;
  ride: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_date: string;
    driver: {
      profiles: {
        full_name: string;
        avatar_url: string;
      };
    };
  };
}

interface CreditStats {
  balance: number;
  total_earned: number;
  total_spent: number;
}

export default function MyRidesDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'driver' | 'passenger'>('driver');
  const [myRides, setMyRides] = useState<MyRide[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [credits, setCredits] = useState<CreditStats>({
    balance: 0,
    total_earned: 0,
    total_spent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch credits
      const { data: creditsData } = await supabase
        .from('user_credits')
        .select('balance, total_earned, total_spent')
        .eq('user_id', user.id)
        .single();

      if (creditsData) {
        setCredits(creditsData);
      }

      if (activeTab === 'driver') {
        // Fetch my rides as driver
        const { data: ridesData } = await supabase
          .from('carpooling_rides')
          .select(`
            *,
            bookings:carpooling_bookings (
              id,
              seats_booked,
              status,
              passenger:passenger_id (
                profiles (full_name, avatar_url)
              )
            )
          `)
          .eq('driver_id', user.id)
          .order('departure_date', { ascending: false });

        setMyRides(ridesData || []);
      } else {
        // Fetch my bookings as passenger
        const { data: bookingsData } = await supabase
          .from('carpooling_bookings')
          .select(`
            *,
            ride:ride_id (
              id,
              departure_city,
              arrival_city,
              departure_date,
              driver:driver_id (
                profiles (full_name, avatar_url)
              )
            )
          `)
          .eq('passenger_id', user.id)
          .order('created_at', { ascending: false });

        setMyBookings(bookingsData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      full: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
    };

    const labels = {
      active: 'Actif',
      full: 'Complet',
      completed: 'Terminé',
      cancelled: 'Annulé',
      pending: 'En attente',
      confirmed: 'Confirmé',
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-6">Mon Covoiturage</h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Solde crédits</p>
                  <p className="text-3xl font-bold">{credits.balance.toFixed(2)}€</p>
                </div>
                <div className="bg-green-500 p-3 rounded-lg">
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Gains totaux</p>
                  <p className="text-3xl font-bold">{credits.total_earned.toFixed(2)}€</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-lg">
                  <Car size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Dépenses totales</p>
                  <p className="text-3xl font-bold">{credits.total_spent.toFixed(2)}€</p>
                </div>
                <div className="bg-purple-500 p-3 rounded-lg">
                  <Users size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'driver'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mes trajets publiés
          </button>
          <button
            onClick={() => setActiveTab('passenger')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              activeTab === 'passenger'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mes réservations
          </button>
          <button
            onClick={() => (window.location.href = '/covoiturage/publier')}
            className="ml-auto px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            + Publier un trajet
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'driver' ? (
              <>
                {myRides.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center">
                    <Car className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Aucun trajet publié
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Commencez à partager vos trajets de convoyage
                    </p>
                    <button
                      onClick={() => (window.location.href = '/covoiturage/publier')}
                      className="bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors font-semibold"
                    >
                      Publier mon premier trajet
                    </button>
                  </div>
                ) : (
                  myRides.map((ride) => (
                    <div key={ride.id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            {getStatusBadge(ride.status)}
                            <span className="text-sm text-gray-600">
                              {new Date(ride.departure_date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <MapPin size={20} className="text-green-500" />
                              <span className="font-semibold">{ride.departure_city}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin size={20} className="text-slate-900" />
                              <span className="font-semibold">{ride.arrival_city}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Users size={16} />
                              <span>
                                {ride.total_seats - ride.available_seats}/{ride.total_seats}{' '}
                                réservées
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">
                                {ride.price_per_seat}€/place
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            +
                            {(
                              (ride.total_seats - ride.available_seats) *
                              ride.price_per_seat *
                              0.95
                            ).toFixed(2)}
                            €
                          </p>
                          <p className="text-xs text-gray-500">gains estimés</p>
                        </div>
                      </div>

                      {/* Bookings */}
                      {ride.bookings && ride.bookings.length > 0 && (
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-semibold mb-3">Réservations ({ride.bookings.length})</h4>
                          <div className="space-y-2">
                            {ride.bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={
                                      booking.passenger?.profiles?.avatar_url ||
                                      'https://via.placeholder.com/40'
                                    }
                                    alt=""
                                    className="w-10 h-10 rounded-full"
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {booking.passenger?.profiles?.full_name || 'Passager'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {booking.seats_booked} place
                                      {booking.seats_booked > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                {getStatusBadge(booking.status)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            ) : (
              <>
                {myBookings.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center">
                    <Users className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Aucune réservation
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Recherchez un trajet pour commencer
                    </p>
                    <button
                      onClick={() => (window.location.href = '/covoiturage')}
                      className="bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors font-semibold"
                    >
                      Rechercher un trajet
                    </button>
                  </div>
                ) : (
                  myBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            {getStatusBadge(booking.status)}
                            <span className="text-sm text-gray-600">
                              {new Date(booking.ride.departure_date).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-3">
                              <MapPin size={20} className="text-green-500" />
                              <span className="font-semibold">{booking.ride.departure_city}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <MapPin size={20} className="text-slate-900" />
                              <span className="font-semibold">{booking.ride.arrival_city}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 inline-flex">
                            <img
                              src={
                                booking.ride.driver?.profiles?.avatar_url ||
                                'https://via.placeholder.com/40'
                              }
                              alt=""
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="text-sm text-gray-600">Conducteur</p>
                              <p className="font-medium">
                                {booking.ride.driver?.profiles?.full_name || 'Convoyeur'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">
                            {booking.amount_paid.toFixed(2)}€
                          </p>
                          <p className="text-xs text-gray-500">
                            {booking.seats_booked} place{booking.seats_booked > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Payé en {booking.payment_method === 'credits' ? 'crédits' : 'espèces'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
