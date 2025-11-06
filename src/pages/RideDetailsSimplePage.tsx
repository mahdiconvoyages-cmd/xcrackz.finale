import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  Car,
  Cigarette,
  Dog,
  Music,
  Luggage,
  ArrowLeft,
  MessageCircle,
  Star,
  CheckCircle,
  X,
  Send,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Ride {
  id: string;
  driver_id: string;
  departure_city: string;
  departure_address?: string;
  arrival_city: string;
  arrival_address?: string;
  departure_date: string;
  departure_time: string;
  flexible_time: boolean;
  distance_km: number;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_year?: number;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  smoking_allowed: boolean;
  pets_allowed: boolean;
  music_allowed: boolean;
  luggage_space: string;
  notes?: string;
  status: string;
  driver?: {
    full_name: string;
    photo_url?: string;
    average_rating: number;
    total_reviews: number;
    is_verified: boolean;
  };
}

export default function RideDetailsSimplePage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [booking, setBooking] = useState({
    seatsBooked: 1,
    message: '',
    paymentMethod: 'cash' as 'cash' | 'credits'
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadRideDetails();
  }, [rideId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadRideDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
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
        .eq('id', rideId)
        .single();

      if (error) throw error;
      setRide(data);

      // Incrémenter le compteur de vues
      await supabase
        .from('carpooling_rides_pro')
        .update({ views_count: (data.views_count || 0) + 1 })
        .eq('id', rideId);

    } catch (err) {
      console.error('Error loading ride:', err);
      setError('Impossible de charger le trajet');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    if (!ride) return;

    if (ride.driver_id === currentUserId) {
      setError('Vous ne pouvez pas réserver votre propre trajet');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const totalPrice = ride.price_per_seat * booking.seatsBooked;

      // Créer la réservation
      const { data: newBooking, error: bookingError } = await supabase
        .from('ride_bookings_pro')
        .insert({
          ride_id: ride.id,
          passenger_id: currentUserId,
          seats_booked: booking.seatsBooked,
          total_price: totalPrice,
          payment_method: booking.paymentMethod,
          message_to_driver: booking.message,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Créer une notification pour le conducteur
      await supabase
        .from('user_notifications')
        .insert({
          user_id: ride.driver_id,
          type: 'booking_request',
          title: 'Nouvelle demande de réservation',
          message: `${booking.seatsBooked} place(s) pour ${ride.departure_city} → ${ride.arrival_city}`,
          related_ride_id: ride.id,
          related_booking_id: newBooking.id,
          related_user_id: currentUserId,
          channels: ['push'],
          action_url: `/covoiturage/dashboard`,
          action_label: 'Voir la demande'
        });

      setBookingSuccess(true);
      
      // Rediriger après 2 secondes
      setTimeout(() => {
        navigate('/covoiturage/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Erreur lors de la réservation');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Trajet introuvable</h2>
          <p className="text-gray-600 mb-4">{error || 'Ce trajet n\'existe pas ou a été supprimé'}</p>
          <button
            onClick={() => navigate('/covoiturage/recherche')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const isOwnRide = ride.driver_id === currentUserId;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <img
                src={ride.driver?.photo_url || `https://ui-avatars.com/api/?name=${ride.driver?.full_name}`}
                alt={ride.driver?.full_name}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">
                    {ride.driver?.full_name}
                  </h2>
                  {ride.driver?.is_verified && (
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium text-gray-700">
                    {ride.driver?.average_rating?.toFixed(1) || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({ride.driver?.total_reviews || 0} avis)
                  </span>
                </div>
              </div>
            </div>

            {!isOwnRide && (
              <button
                onClick={() => navigate(`/covoiturage/profil/${ride.driver_id}`)}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition"
              >
                Voir le profil
              </button>
            )}
          </div>

          {/* Itinéraire */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="w-6 h-6 text-green-600" />
                <div>
                  <div className="font-semibold text-gray-900">{ride.departure_city}</div>
                  {ride.departure_address && (
                    <div className="text-sm text-gray-500">{ride.departure_address}</div>
                  )}
                </div>
              </div>
              <div className="text-2xl text-gray-300">→</div>
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="w-6 h-6 text-red-600" />
                <div>
                  <div className="font-semibold text-gray-900">{ride.arrival_city}</div>
                  {ride.arrival_address && (
                    <div className="text-sm text-gray-500">{ride.arrival_address}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(ride.departure_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {ride.departure_time}
                {ride.flexible_time && <span className="text-xs text-gray-500">(±30min)</span>}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {ride.distance_km} km
              </div>
            </div>
          </div>
        </div>

        {/* Détails */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Véhicule */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Véhicule
            </h3>
            <div className="text-gray-700">
              <div className="font-medium">{ride.vehicle_brand} {ride.vehicle_model}</div>
              {ride.vehicle_year && (
                <div className="text-sm text-gray-500">{ride.vehicle_year}</div>
              )}
            </div>
          </div>

          {/* Places */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Places
            </h3>
            <div className="text-2xl font-bold text-blue-600">
              {ride.available_seats} <span className="text-sm text-gray-500">/ {ride.total_seats}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">disponible(s)</div>
          </div>

          {/* Prix */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Prix
            </h3>
            <div className="text-3xl font-bold text-green-600">
              {ride.price_per_seat}€
            </div>
            <div className="text-sm text-gray-500 mt-1">par place</div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Options et préférences</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${ride.smoking_allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <Cigarette className={`w-5 h-5 ${ride.smoking_allowed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={ride.smoking_allowed ? 'text-green-900' : 'text-gray-500'}>
                {ride.smoking_allowed ? 'Fumeur accepté' : 'Non-fumeur'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${ride.pets_allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <Dog className={`w-5 h-5 ${ride.pets_allowed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={ride.pets_allowed ? 'text-green-900' : 'text-gray-500'}>
                {ride.pets_allowed ? 'Animaux acceptés' : 'Pas d\'animaux'}
              </span>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-lg border ${ride.music_allowed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <Music className={`w-5 h-5 ${ride.music_allowed ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={ride.music_allowed ? 'text-green-900' : 'text-gray-500'}>
                {ride.music_allowed ? 'Musique autorisée' : 'Silence'}
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 border-gray-200">
              <Luggage className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">
                Bagages: {ride.luggage_space === 'small' ? 'Petit' : ride.luggage_space === 'medium' ? 'Moyen' : 'Grand'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {ride.notes && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Informations complémentaires</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{ride.notes}</p>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {isOwnRide ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">C'est votre trajet</p>
              <button
                onClick={() => navigate('/covoiturage/dashboard')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Voir mes trajets
              </button>
            </div>
          ) : ride.available_seats === 0 ? (
            <div className="text-center py-4">
              <p className="text-red-600 font-semibold">Complet - Plus de places disponibles</p>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/covoiturage/messages`)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Contacter
              </button>
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Réserver
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de réservation */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {bookingSuccess ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Demande envoyée !
                </h3>
                <p className="text-gray-600 mb-4">
                  Le conducteur recevra votre demande et vous répondra bientôt
                </p>
                <div className="animate-pulse text-sm text-gray-500">
                  Redirection...
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">Réserver des places</h3>
                    <button
                      onClick={() => setShowBookingModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-800">{error}</div>
                    </div>
                  )}

                  {/* Nombre de places */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de places
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={ride.available_seats}
                      value={booking.seatsBooked}
                      onChange={(e) => setBooking({ ...booking, seatsBooked: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum: {ride.available_seats} place(s)
                    </p>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message au conducteur (optionnel)
                    </label>
                    <textarea
                      value={booking.message}
                      onChange={(e) => setBooking({ ...booking, message: e.target.value })}
                      placeholder="Présentez-vous, expliquez votre trajet..."
                      rows={3}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Mode de paiement */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode de paiement
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="payment"
                          value="cash"
                          checked={booking.paymentMethod === 'cash'}
                          onChange={() => setBooking({ ...booking, paymentMethod: 'cash' })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-700">Espèces</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="payment"
                          value="credits"
                          checked={booking.paymentMethod === 'credits'}
                          onChange={() => setBooking({ ...booking, paymentMethod: 'credits' })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-gray-700">Crédits</span>
                      </label>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-blue-600">
                        {(ride.price_per_seat * booking.seatsBooked).toFixed(2)}€
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.seatsBooked} place(s) × {ride.price_per_seat}€
                    </p>
                  </div>
                </div>

                <div className="p-6 border-t">
                  <button
                    onClick={handleBooking}
                    disabled={bookingLoading}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer la demande
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
