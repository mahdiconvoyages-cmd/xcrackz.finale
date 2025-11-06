import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check,
  X,
  Clock,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  MessageCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface BookingRequest {
  id: string;
  passenger_id: string;
  seats_booked: number;
  total_price: number;
  payment_method: string;
  message_to_driver?: string;
  status: string;
  created_at: string;
  passenger: {
    full_name: string;
    photo_url?: string;
    average_rating: number;
    total_reviews: number;
  };
  ride: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_date: string;
    departure_time: string;
    available_seats: number;
  };
}

export default function BookingRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookingRequests();
    subscribeToRequests();
  }, []);

  const loadBookingRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ride_bookings_pro')
        .select(`
          *,
          passenger:driver_profiles!ride_bookings_pro_passenger_id_fkey (
            full_name,
            photo_url,
            average_rating,
            total_reviews
          ),
          ride:carpooling_rides_pro!ride_bookings_pro_ride_id_fkey (
            id,
            departure_city,
            arrival_city,
            departure_date,
            departure_time,
            available_seats,
            driver_id
          )
        `)
        .eq('ride.driver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filtrer pour ne garder que celles où on est le conducteur
      const filtered = (data || []).filter(
        (booking: any) => booking.ride?.driver_id === user.id
      );
      
      setRequests(filtered);
    } catch (err) {
      console.error('Error loading booking requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRequests = () => {
    const channel = supabase
      .channel('booking-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_bookings_pro'
        },
        () => {
          loadBookingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAccept = async (request: BookingRequest) => {
    setProcessingId(request.id);

    try {
      // Vérifier qu'il y a assez de places
      if (request.ride.available_seats < request.seats_booked) {
        alert('Plus assez de places disponibles');
        return;
      }

      // Accepter la réservation
      const { error: updateError } = await supabase
        .from('ride_bookings_pro')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        } as any)
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Diminuer les places disponibles
      const { error: rideError } = await supabase
        .from('carpooling_rides_pro')
        .update({
          available_seats: request.ride.available_seats - request.seats_booked,
          bookings_count: (await supabase
            .from('ride_bookings_pro')
            .select('id', { count: 'exact' })
            .eq('ride_id', request.ride.id)
            .eq('status', 'confirmed')).count || 0
        } as any)
        .eq('id', request.ride.id);

      if (rideError) throw rideError;

      // Notifier le passager
      await supabase
        .from('user_notifications')
        .insert({
          user_id: request.passenger_id,
          type: 'booking_confirmed',
          title: 'Réservation confirmée !',
          message: `Votre réservation pour ${request.ride.departure_city} → ${request.ride.arrival_city} a été acceptée`,
          related_ride_id: request.ride.id,
          related_booking_id: request.id,
          channels: ['push'],
          action_url: `/covoiturage/trajet/${request.ride.id}`,
          action_label: 'Voir le trajet'
        } as any);

      // Recharger la liste
      loadBookingRequests();
    } catch (err) {
      console.error('Error accepting booking:', err);
      alert('Erreur lors de l\'acceptation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: BookingRequest) => {
    const reason = prompt('Raison du refus (optionnel) :');
    
    setProcessingId(request.id);

    try {
      // Refuser la réservation
      const { error } = await supabase
        .from('ride_bookings_pro')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          driver_response: reason || undefined
        } as any)
        .eq('id', request.id);

      if (error) throw error;

      // Notifier le passager
      await supabase
        .from('user_notifications')
        .insert({
          user_id: request.passenger_id,
          type: 'booking_request',
          title: 'Réservation refusée',
          message: reason || `Votre demande pour ${request.ride.departure_city} → ${request.ride.arrival_city} a été refusée`,
          related_ride_id: request.ride.id,
          related_booking_id: request.id,
          channels: ['push']
        } as any);

      // Recharger la liste
      loadBookingRequests();
    } catch (err) {
      console.error('Error rejecting booking:', err);
      alert('Erreur lors du refus');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Demandes de réservation
          </h1>
          <p className="text-gray-600">
            Gérez les demandes pour vos trajets publiés
          </p>
        </div>

        {/* Statistiques */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {requests.length}
              </div>
              <div className="text-sm text-gray-500">
                demande{requests.length > 1 ? 's' : ''} en attente
              </div>
            </div>
            <Clock className="w-12 h-12 text-gray-300" />
          </div>
        </div>

        {/* Liste des demandes */}
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune demande en attente
            </h3>
            <p className="text-gray-600 mb-6">
              Vous n'avez pas de demandes de réservation pour le moment
            </p>
            <button
              onClick={() => navigate('/covoiturage/publier')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Publier un trajet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-4">
                  {/* Photo du passager */}
                  <img
                    src={request.passenger?.photo_url || `https://ui-avatars.com/api/?name=${request.passenger?.full_name}`}
                    alt={request.passenger?.full_name}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    {/* Infos passager */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {request.passenger?.full_name}
                      </h3>
                      {request.passenger?.average_rating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium">{request.passenger.average_rating.toFixed(1)}</span>
                          <span className="text-gray-500">({request.passenger.total_reviews})</span>
                        </div>
                      )}
                    </div>

                    {/* Détails de la demande */}
                    <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {request.ride.departure_city} → {request.ride.arrival_city}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.ride.departure_date).toLocaleDateString('fr-FR')} à {request.ride.departure_time}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {request.seats_booked} place{request.seats_booked > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        {request.total_price}€ ({request.payment_method === 'cash' ? 'Espèces' : 'Crédits'})
                      </div>
                    </div>

                    {/* Message du passager */}
                    {request.message_to_driver && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1">Message :</div>
                        <p className="text-sm text-gray-700">{request.message_to_driver}</p>
                      </div>
                    )}

                    {/* Date de la demande */}
                    <div className="text-xs text-gray-500">
                      Demandé {new Date(request.created_at).toLocaleDateString('fr-FR')} à {new Date(request.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAccept(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {processingId === request.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accepter
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Refuser
                    </button>
                    <button
                      onClick={() => navigate(`/covoiturage/messages`)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
