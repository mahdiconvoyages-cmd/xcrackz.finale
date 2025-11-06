import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Users, Star, Calendar, ArrowRight, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RideDetails {
  id: string;
  user_id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  price: number;
  available_seats: number;
  total_seats: number;
  preferences: {
    smoking: boolean;
    pets: boolean;
    music: boolean;
  };
  payment_methods: string[];
  auto_accept: boolean;
  driver: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  vehicle?: {
    brand: string;
    model: string;
  };
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    reviewer: {
      name: string;
    };
  }>;
}

export default function RideDetailsPage() {
  const { rideId } = useParams<{ rideId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('credits');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRideDetails();
  }, [rideId]);

  const fetchRideDetails = async () => {
    if (!rideId) return;

    try {
      const { data: rideData, error } = await supabase
        .from('carpooling_rides')
        .select(`
          *,
          driver:user_id (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('id', rideId)
        .single();

      if (error) throw error;

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('carpooling_reviews')
        .select(`
          id,
          rating,
          comment,
          reviewer:reviewer_id (
            full_name,
            email
          )
        `)
        .eq('driver_id', rideData.user_id)
        .limit(5);

      setRide({
        ...rideData,
        reviews: reviewsData?.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reviewer: { name: r.reviewer?.full_name || r.reviewer?.email?.split('@')[0] || 'Anonyme' }
        })) || []
      });
    } catch (error) {
      console.error('Error fetching ride:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!user || !ride) return;

    try {
      // Check credits if payment method is credits
      if (paymentMethod === 'credits') {
        const { data: credits } = await supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!credits || credits.balance < ride.price * selectedSeats) {
          alert('Solde insuffisant. Rechargez votre portefeuille.');
          navigate('/covoiturage/portefeuille');
          return;
        }
      }

      // Create booking
      const { data, error } = await supabase
        .from('carpooling_bookings')
        .insert({
          ride_id: ride.id,
          passenger_id: user.id,
          seats: selectedSeats,
          payment_method: paymentMethod,
          message_to_driver: message,
          total_price: ride.price * selectedSeats,
          status: ride.auto_accept ? 'confirmed' : 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // If payment is credits, process payment
      if (paymentMethod === 'credits') {
        await supabase.rpc('process_credit_payment', {
          booking_id: data.id
        });
      }

      // Update available seats
      await supabase
        .from('carpooling_rides')
        .update({
          available_seats: ride.available_seats - selectedSeats
        })
        .eq('id', ride.id);

      alert(ride.auto_accept 
        ? '✅ Réservation confirmée !'
        : '✅ Demande envoyée ! Le conducteur va examiner votre demande.'
      );
      
      navigate('/covoiturage/mes-trajets');
    } catch (error) {
      console.error('Error booking ride:', error);
      alert('Erreur lors de la réservation');
    }
  };

  const calculateAverageRating = () => {
    if (!ride?.reviews || ride.reviews.length === 0) return 0;
    const sum = ride.reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ride.reviews.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Trajet non trouvé</h2>
          <button
            onClick={() => navigate('/covoiturage')}
            className="text-blue-600 hover:underline"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  const avgRating = calculateAverageRating();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <MapPin className="text-green-600" size={24} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{ride.departure_city}</h1>
                  <p className="text-gray-500">Départ</p>
                </div>
              </div>
              
              <ArrowRight className="text-gray-400 my-2" size={24} />
              
              <div className="flex items-center gap-4">
                <MapPin className="text-red-600" size={24} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{ride.arrival_city}</h1>
                  <p className="text-gray-500">Arrivée</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{ride.price}€</div>
              <div className="text-sm text-gray-500">par personne</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{new Date(ride.departure_date).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={18} />
              <span>{ride.available_seats} places disponibles</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Driver Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Conducteur</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                  {ride.driver.full_name?.[0] || ride.driver.email[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {ride.driver.full_name || ride.driver.email.split('@')[0]}
                  </h3>
                  {ride.reviews.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="text-yellow-400 fill-current" size={16} />
                      <span className="font-medium">{avgRating}</span>
                      <span className="text-gray-500 text-sm">({ride.reviews.length} avis)</span>
                    </div>
                  )}
                </div>
              </div>

              {ride.vehicle && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Véhicule:</span> {ride.vehicle.brand} {ride.vehicle.model}
                  </p>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Préférences</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'smoking', label: 'Fumeur', icon: '🚬' },
                  { key: 'pets', label: 'Animaux', icon: '🐕' },
                  { key: 'music', label: 'Musique', icon: '🎵' }
                ].map(({ key, label, icon }) => (
                  <div key={key} className="text-center">
                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl mb-2 ${
                      ride.preferences[key as keyof typeof ride.preferences] 
                        ? 'bg-green-100' 
                        : 'bg-gray-100'
                    }`}>
                      {ride.preferences[key as keyof typeof ride.preferences] ? <Check size={24} className="text-green-600" /> : <X size={24} className="text-gray-400" />}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            {ride.reviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Avis ({ride.reviews.length})
                </h2>
                <div className="space-y-4">
                  {ride.reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={16}
                              className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{review.reviewer.name}</span>
                      </div>
                      <p className="text-gray-600 text-sm">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Booking */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Réserver</h3>
              
              {ride.user_id === user?.id ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">C'est votre trajet</p>
                  <button
                    onClick={() => navigate('/covoiturage/mes-trajets')}
                    className="text-blue-600 hover:underline"
                  >
                    Voir mes trajets
                  </button>
                </div>
              ) : (
                <>
                  {/* Seats Selector */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de places
                    </label>
                    <select
                      value={selectedSeats}
                      onChange={(e) => setSelectedSeats(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {[...Array(Math.min(ride.available_seats, 4))].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'place' : 'places'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mode de paiement
                    </label>
                    <div className="space-y-2">
                      {ride.payment_methods.includes('credits') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="credits"
                            checked={paymentMethod === 'credits'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="text-blue-600"
                          />
                          <span>Crédits</span>
                        </label>
                      )}
                      {ride.payment_methods.includes('cash') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            value="cash"
                            checked={paymentMethod === 'cash'}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="text-blue-600"
                          />
                          <span>Espèces</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message au conducteur (optionnel)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="Présentez-vous..."
                    />
                  </div>

                  {/* Price Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Prix unitaire</span>
                      <span className="font-medium">{ride.price}€</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Nombre de places</span>
                      <span className="font-medium">×{selectedSeats}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900">Total</span>
                        <span className="font-bold text-blue-600 text-xl">
                          {ride.price * selectedSeats}€
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Button */}
                  <button
                    onClick={handleBooking}
                    disabled={ride.available_seats === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {ride.available_seats === 0 ? 'Complet' : 'Réserver maintenant'}
                  </button>

                  {ride.auto_accept && (
                    <p className="text-xs text-green-600 text-center mt-2">
                      ✓ Réservation instantanée
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
