import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  MapPin, Calendar, Clock, Users, TrendingUp, DollarSign,
  Plus, Filter, Search, Bell, MessageCircle, Star, Car,
  CheckCircle, XCircle, AlertCircle, Navigation, Fuel
} from 'lucide-react';

interface DashboardStats {
  active_rides: number;
  upcoming_bookings: number;
  completed_rides: number;
  total_earnings: number;
  pending_requests: number;
  unread_messages: number;
  average_rating: number;
  total_km: number;
}

interface Ride {
  id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  distance_km: number;
  price_per_seat: number;
  available_seats: number;
  status: string;
  bookings_count: number;
  vehicle_brand: string;
  vehicle_model: string;
}

interface Booking {
  id: string;
  status: string;
  seats_booked: number;
  total_price: number;
  created_at: string;
  ride: {
    departure_city: string;
    arrival_city: string;
    departure_date: string;
    departure_time: string;
    driver_id: string;
  };
  driver: {
    full_name: string;
    photo_url: string;
    average_rating: number;
  };
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({
    active_rides: 0,
    upcoming_bookings: 0,
    completed_rides: 0,
    total_earnings: 0,
    pending_requests: 0,
    unread_messages: 0,
    average_rating: 0,
    total_km: 0
  });

  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'rides' | 'bookings'>('rides');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchMyRides(),
        fetchMyBookings()
      ]);
    } catch (error) {
      console.error('Erreur chargement tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Profil convoyeur
      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('average_rating, total_km_driven')
        .eq('user_id', user.id)
        .single();

      // Mes trajets actifs
      const { data: rides } = await supabase
        .from('carpooling_rides_pro')
        .select('id, status')
        .eq('driver_id', user.id);

      // Mes réservations
      const { data: bookings } = await supabase
        .from('ride_bookings_pro')
        .select('id, status')
        .eq('passenger_id', user.id);

      // Demandes en attente sur mes trajets
      const { data: pendingRequests } = await supabase
        .from('ride_bookings_pro')
        .select('id')
        .in('ride_id', rides?.map(r => r.id) || [])
        .eq('status', 'pending');

      // Messages non lus
      const { data: conversations } = await supabase
        .from('ride_conversations')
        .select('unread_count')
        .contains('participants', [user.id]);

      const unreadCount = conversations?.reduce((sum, conv) => {
        const userUnread = (conv.unread_count as any)?.[user.id] || 0;
        return sum + userUnread;
      }, 0) || 0;

      // Revenus totaux
      const { data: transactions } = await supabase
        .from('wallet_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'credit');

      const totalEarnings = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

      setStats({
        active_rides: rides?.filter(r => r.status === 'published').length || 0,
        upcoming_bookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
        completed_rides: rides?.filter(r => r.status === 'completed').length || 0,
        total_earnings: totalEarnings,
        pending_requests: pendingRequests?.length || 0,
        unread_messages: unreadCount,
        average_rating: profile?.average_rating || 0,
        total_km: profile?.total_km_driven || 0
      });
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const fetchMyRides = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('carpooling_rides_pro')
        .select('*')
        .eq('driver_id', user.id)
        .order('departure_date', { ascending: true })
        .limit(10);

      if (error) throw error;
      setMyRides(data || []);
    } catch (error) {
      console.error('Erreur chargement trajets:', error);
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ride_bookings_pro')
        .select(`
          *,
          ride:ride_id (
            departure_city,
            arrival_city,
            departure_date,
            departure_time,
            driver_id
          )
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch driver profiles
      const ridesWithDrivers = await Promise.all(
        (data || []).map(async (booking: any) => {
          const { data: driver } = await supabase
            .from('driver_profiles')
            .select('full_name, photo_url, average_rating')
            .eq('user_id', booking.ride.driver_id)
            .single();

          return {
            ...booking,
            driver: driver || { full_name: 'Inconnu', photo_url: '', average_rating: 0 }
          };
        })
      );

      setMyBookings(ridesWithDrivers);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { color: string; icon: JSX.Element; label: string } } = {
      published: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" />, label: 'Publié' },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: <Navigation className="w-4 h-4" />, label: 'En cours' },
      completed: { color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-4 h-4" />, label: 'Terminé' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: 'Annulé' },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" />, label: 'En attente' },
      confirmed: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" />, label: 'Confirmé' },
      rejected: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: 'Refusé' }
    };

    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        <span>{badge.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tableau de bord</h1>
          <p className="text-gray-600">Gérez vos trajets et suivez votre activité</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Car className="w-6 h-6 text-blue-600" />
              </div>
              {stats.pending_requests > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {stats.pending_requests}
                </span>
              )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Trajets actifs</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.active_rides}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.pending_requests} demande{stats.pending_requests !== 1 ? 's' : ''} en attente
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Réservations confirmées</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcoming_bookings}</p>
            <p className="text-sm text-gray-500 mt-1">À venir</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Revenus totaux</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_earnings.toFixed(0)} €</p>
            <p className="text-sm text-gray-500 mt-1">{stats.completed_rides} trajets terminés</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              {stats.unread_messages > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {stats.unread_messages}
                </span>
              )}
            </div>
            <h3 className="text-gray-600 text-sm font-medium">Note moyenne</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.average_rating.toFixed(1)}/5</p>
            <p className="text-sm text-gray-500 mt-1">{stats.total_km.toLocaleString()} km parcourus</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/covoiturage/publier')}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Publier un trajet</span>
            </button>

            <button
              onClick={() => navigate('/covoiturage/demandes')}
              className="flex items-center justify-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition relative"
            >
              <Clock className="w-5 h-5" />
              <span>Demandes</span>
              {stats.pending_requests > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {stats.pending_requests}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate('/covoiturage/recherche')}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition"
            >
              <Search className="w-5 h-5" />
              <span>Rechercher un trajet</span>
            </button>

            <button
              onClick={() => navigate('/covoiturage/messages')}
              className="flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition relative"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Messages</span>
              {stats.unread_messages > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {stats.unread_messages}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('rides')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rides'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mes trajets proposés ({myRides.length})
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bookings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mes réservations ({myBookings.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Mes trajets proposés */}
            {activeTab === 'rides' && (
              <div className="space-y-4">
                {myRides.length === 0 ? (
                  <div className="text-center py-12">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun trajet publié</h3>
                    <p className="text-gray-500 mb-6">Commencez à proposer des trajets aux autres convoyeurs</p>
                    <button
                      onClick={() => navigate('/covoiturage/publier')}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Publier mon premier trajet</span>
                    </button>
                  </div>
                ) : (
                  myRides.map((ride) => (
                    <div
                      key={ride.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition cursor-pointer"
                      onClick={() => navigate(`/covoiturage/trajet/${ride.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {ride.departure_city} → {ride.arrival_city}
                            </h3>
                            {getStatusBadge(ride.status)}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(ride.departure_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{ride.departure_time}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span>{ride.distance_km} km</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Car className="w-4 h-4" />
                              <span>{ride.vehicle_brand} {ride.vehicle_model}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">{ride.price_per_seat} €</p>
                          <p className="text-sm text-gray-500">par siège</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center space-x-1 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{ride.available_seats} place{ride.available_seats > 1 ? 's' : ''} disponible{ride.available_seats > 1 ? 's' : ''}</span>
                          </span>
                          {ride.bookings_count > 0 && (
                            <span className="flex items-center space-x-1 text-blue-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>{ride.bookings_count} réservation{ride.bookings_count > 1 ? 's' : ''}</span>
                            </span>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/covoiturage/trajet/${ride.id}/edit`);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Modifier
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Mes réservations */}
            {activeTab === 'bookings' && (
              <div className="space-y-4">
                {myBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
                    <p className="text-gray-500 mb-6">Recherchez et rejoignez des trajets</p>
                    <button
                      onClick={() => navigate('/covoiturage')}
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Search className="w-5 h-5" />
                      <span>Rechercher un trajet</span>
                    </button>
                  </div>
                ) : (
                  myBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <img
                            src={booking.driver.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.driver.full_name)}`}
                            alt={booking.driver.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.ride.departure_city} → {booking.ride.arrival_city}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-gray-600">{booking.driver.full_name}</span>
                              <div className="flex items-center space-x-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{booking.driver.average_rating.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {getStatusBadge(booking.status)}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.ride.departure_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{booking.ride.departure_time}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{booking.seats_booked} place{booking.seats_booked > 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="text-lg font-bold text-gray-900">{booking.total_price} €</div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => navigate(`/messages/${booking.ride.driver_id}`)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Contacter le conducteur
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
