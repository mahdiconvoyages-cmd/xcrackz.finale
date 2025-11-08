import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Car,
  Cigarette,
  Dog,
  Music,
  Luggage,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Vehicle {
  brand: string;
  model: string;
  plate: string;
  year: number;
  seats: number;
  type: string;
}

export default function PublishRideSimplePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    // Départ
    departureCity: '',
    departureAddress: '',
    departureLat: 0,
    departureLng: 0,
    
    // Arrivée
    arrivalCity: '',
    arrivalAddress: '',
    arrivalLat: 0,
    arrivalLng: 0,
    
    // Date et heure
    departureDate: '',
    departureTime: '',
    flexibleTime: false,
    
    // Distance
    distanceKm: 0,
    
    // Places et prix
    availableSeats: 1,
    pricePerSeat: 10,
    
    // Options
    smokingAllowed: false,
    petsAllowed: false,
    musicAllowed: true,
    luggageSpace: 'medium' as 'small' | 'medium' | 'large',
    
    // Notes
    notes: ''
  });

  useEffect(() => {
    loadUserVehicles();
  }, []);

  const loadUserVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('vehicles')
        .eq('user_id', user.id)
        .single();

      if ((profile as any)?.vehicles) {
        const vehiclesList = (profile as any).vehicles as Vehicle[];
        setVehicles(vehiclesList);
        if (vehiclesList.length > 0) {
          setSelectedVehicle(vehiclesList[0]);
        }
      }
    } catch (err) {
      console.error('Error loading vehicles:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez être connecté');
        return;
      }

      if (!selectedVehicle) {
        setError('Veuillez sélectionner un véhicule');
        return;
      }

      // Validation basique
      if (!formData.departureCity || !formData.arrivalCity) {
        setError('Veuillez renseigner les villes de départ et d\'arrivée');
        return;
      }

      if (!formData.departureDate || !formData.departureTime) {
        setError('Veuillez renseigner la date et l\'heure de départ');
        return;
      }

      // Calculer distance si non renseignée
      let distance = formData.distanceKm;
      if (distance === 0) {
        // Estimation simple : 100km par défaut
        distance = 100;
      }

      // Créer le trajet
      const { data: ride, error: rideError } = await supabase
        .from('carpooling_rides_pro')
        .insert({
          driver_id: user.id,
          
          departure_city: formData.departureCity,
          departure_address: formData.departureAddress,
          departure_lat: formData.departureLat,
          departure_lng: formData.departureLng,
          
          arrival_city: formData.arrivalCity,
          arrival_address: formData.arrivalAddress,
          arrival_lat: formData.arrivalLat,
          arrival_lng: formData.arrivalLng,
          
          departure_date: formData.departureDate,
          departure_time: formData.departureTime,
          flexible_time: formData.flexibleTime,
          
          distance_km: distance,
          
          vehicle_brand: selectedVehicle.brand,
          vehicle_model: selectedVehicle.model,
          vehicle_plate: selectedVehicle.plate,
          vehicle_year: selectedVehicle.year,
          total_seats: selectedVehicle.seats,
          available_seats: formData.availableSeats,
          
          price_per_seat: formData.pricePerSeat,
          total_price: formData.pricePerSeat * formData.availableSeats,
          
          smoking_allowed: formData.smokingAllowed,
          pets_allowed: formData.petsAllowed,
          music_allowed: formData.musicAllowed,
          luggage_space: formData.luggageSpace,
          
          notes: formData.notes,
          
          status: 'published',
          visibility: 'public'
        })
        .select()
        .single();

      if (rideError) throw rideError;

      setSuccess(true);
      
      // Rediriger vers le dashboard après 2 secondes
      setTimeout(() => {
        navigate('/covoiturage/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Error publishing ride:', err);
      setError(err.message || 'Erreur lors de la publication du trajet');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Trajet publié !
          </h2>
          <p className="text-gray-600 mb-4">
            Votre trajet est maintenant visible par tous les convoyeurs
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirection vers le dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Publier un trajet
          </h1>
          <p className="text-gray-600">
            Partagez votre trajet avec d'autres convoyeurs
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Itinéraire */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-blue-600" />
              Itinéraire
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville de départ *
                </label>
                <input
                  type="text"
                  value={formData.departureCity}
                  onChange={(e) => setFormData({ ...formData, departureCity: e.target.value })}
                  placeholder="Paris"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville d'arrivée *
                </label>
                <input
                  type="text"
                  value={formData.arrivalCity}
                  onChange={(e) => setFormData({ ...formData, arrivalCity: e.target.value })}
                  placeholder="Marseille"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse de départ (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.departureAddress}
                  onChange={(e) => setFormData({ ...formData, departureAddress: e.target.value })}
                  placeholder="10 Rue de la Paix"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse d'arrivée (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.arrivalAddress}
                  onChange={(e) => setFormData({ ...formData, arrivalAddress: e.target.value })}
                  placeholder="25 Avenue du Prado"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance approximative (km)
              </label>
              <input
                type="number"
                value={formData.distanceKm || ''}
                onChange={(e) => setFormData({ ...formData, distanceKm: parseInt(e.target.value) || 0 })}
                placeholder="450"
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Laissez vide pour une estimation automatique
              </p>
            </div>
          </div>

          {/* Date et heure */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Date et heure
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de départ *
                </label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de départ *
                </label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.flexibleTime}
                  onChange={(e) => setFormData({ ...formData, flexibleTime: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Horaire flexible (±30 minutes)
                </span>
              </label>
            </div>
          </div>

          {/* Véhicule */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              Véhicule
            </h2>
            
            {vehicles.length > 0 ? (
              <div className="space-y-3">
                {vehicles.map((vehicle, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition ${
                      selectedVehicle === vehicle
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="vehicle"
                      checked={selectedVehicle === vehicle}
                      onChange={() => setSelectedVehicle(vehicle)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {vehicle.brand} {vehicle.model}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vehicle.plate} • {vehicle.year} • {vehicle.seats} places
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Car className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">
                  Aucun véhicule enregistré
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ajouter un véhicule →
                </button>
              </div>
            )}
          </div>

          {/* Places et prix */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Places et tarif
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Places disponibles *
                </label>
                <input
                  type="number"
                  value={formData.availableSeats}
                  onChange={(e) => setFormData({ ...formData, availableSeats: parseInt(e.target.value) || 1 })}
                  min="1"
                  max={selectedVehicle?.seats || 8}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix par place (€) *
                </label>
                <input
                  type="number"
                  value={formData.pricePerSeat}
                  onChange={(e) => setFormData({ ...formData, pricePerSeat: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.50"
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Total: {(formData.pricePerSeat * formData.availableSeats).toFixed(2)}€
                </p>
              </div>
            </div>
          </div>

          {/* Options de confort */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Options de confort
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.smokingAllowed}
                  onChange={(e) => setFormData({ ...formData, smokingAllowed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <Cigarette className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Fumeur accepté
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.petsAllowed}
                  onChange={(e) => setFormData({ ...formData, petsAllowed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <Dog className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Animaux acceptés
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.musicAllowed}
                  onChange={(e) => setFormData({ ...formData, musicAllowed: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <Music className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Musique autorisée
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Luggage className="w-4 h-4 inline mr-1" />
                  Espace bagages
                </label>
                <select
                  value={formData.luggageSpace}
                  onChange={(e) => setFormData({ ...formData, luggageSpace: e.target.value as any })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="small">Petit</option>
                  <option value="medium">Moyen</option>
                  <option value="large">Grand</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Informations complémentaires
            </h2>
            
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Points de rendez-vous, consignes particulières, etc."
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Boutons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Publication...' : 'Publier le trajet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
