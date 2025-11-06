import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, DollarSign, Users, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PublishRidePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    departure_city: '',
    arrival_city: '',
    departure_date: '',
    departure_time: '',
    distance_km: 0,
    price: 0,
    total_seats: 4,
    vehicle_brand: '',
    vehicle_model: '',
    preferences: {
      smoking: false,
      pets: false,
      music: true
    },
    payment_methods: ['credits'],
    auto_accept: false
  });

  const calculateSuggestedPrice = () => {
    if (formData.distance_km > 0) {
      const suggested = formData.distance_km * 0.08;
      setFormData({ ...formData, price: Number(suggested.toFixed(2)) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('carpooling_rides')
        .insert({
          user_id: user.id,
          departure_city: formData.departure_city,
          arrival_city: formData.arrival_city,
          departure_date: formData.departure_date,
          departure_time: formData.departure_time,
          distance_km: formData.distance_km,
          price: formData.price,
          total_seats: formData.total_seats,
          available_seats: formData.total_seats,
          vehicle_brand: formData.vehicle_brand,
          vehicle_model: formData.vehicle_model,
          preferences: formData.preferences,
          payment_methods: formData.payment_methods,
          auto_accept: formData.auto_accept,
          status: 'active'
        });

      if (error) throw error;

      alert('✅ Trajet publié avec succès !');
      navigate('/covoiturage/mes-trajets');
    } catch (error) {
      console.error('Error publishing ride:', error);
      alert('Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Publier un trajet</h1>
          <p className="text-gray-600 mb-8">
            Proposez un trajet et partagez vos frais de route
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Route */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline mr-1" size={16} />
                  Ville de départ *
                </label>
                <input
                  type="text"
                  required
                  value={formData.departure_city}
                  onChange={(e) => setFormData({ ...formData, departure_city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Paris"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline mr-1" size={16} />
                  Ville d'arrivée *
                </label>
                <input
                  type="text"
                  required
                  value={formData.arrival_city}
                  onChange={(e) => setFormData({ ...formData, arrival_city: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Lyon"
                />
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline mr-1" size={16} />
                  Date de départ *
                </label>
                <input
                  type="date"
                  required
                  value={formData.departure_date}
                  onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heure de départ *
                </label>
                <input
                  type="time"
                  required
                  value={formData.departure_time}
                  onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
            </div>

            {/* Distance & Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance (km) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.distance_km || ''}
                  onChange={(e) => setFormData({ ...formData, distance_km: Number(e.target.value) })}
                  onBlur={calculateSuggestedPrice}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="450"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="inline mr-1" size={16} />
                  Prix par passager (€) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.5"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="36"
                />
                {formData.distance_km > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Prix suggéré: {(formData.distance_km * 0.08).toFixed(2)}€ (0.08€/km)
                  </p>
                )}
              </div>
            </div>

            {/* Vehicle & Seats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marque du véhicule
                </label>
                <input
                  type="text"
                  value={formData.vehicle_brand}
                  onChange={(e) => setFormData({ ...formData, vehicle_brand: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Renault"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modèle
                </label>
                <input
                  type="text"
                  value={formData.vehicle_model}
                  onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Clio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="inline mr-1" size={16} />
                  Places *
                </label>
                <select
                  value={formData.total_seats}
                  onChange={(e) => setFormData({ ...formData, total_seats: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'place' : 'places'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Préférences de voyage
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'smoking', label: 'Fumeur autorisé', icon: '🚬' },
                  { key: 'pets', label: 'Animaux acceptés', icon: '🐕' },
                  { key: 'music', label: 'Musique', icon: '🎵' }
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences,
                        [key]: !formData.preferences[key as keyof typeof formData.preferences]
                      }
                    })}
                    className={`p-4 border-2 rounded-lg text-center transition ${
                      formData.preferences[key as keyof typeof formData.preferences]
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{icon}</div>
                    <div className="text-sm font-medium">{label}</div>
                    {formData.preferences[key as keyof typeof formData.preferences] ? (
                      <Check className="text-green-600 mx-auto mt-2" size={20} />
                    ) : (
                      <X className="text-gray-400 mx-auto mt-2" size={20} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Modes de paiement acceptés *
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payment_methods.includes('credits')}
                    onChange={(e) => {
                      const methods = e.target.checked
                        ? [...formData.payment_methods, 'credits']
                        : formData.payment_methods.filter(m => m !== 'credits');
                      setFormData({ ...formData, payment_methods: methods });
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Crédits (paiement sécurisé via l'app)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.payment_methods.includes('cash')}
                    onChange={(e) => {
                      const methods = e.target.checked
                        ? [...formData.payment_methods, 'cash']
                        : formData.payment_methods.filter(m => m !== 'cash');
                      setFormData({ ...formData, payment_methods: methods });
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Espèces (paiement direct)</span>
                </label>
              </div>
            </div>

            {/* Auto Accept */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.auto_accept}
                  onChange={(e) => setFormData({ ...formData, auto_accept: e.target.checked })}
                  className="w-5 h-5 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-900">Acceptation automatique</div>
                  <div className="text-sm text-gray-600">
                    Les réservations seront confirmées automatiquement
                  </div>
                </div>
              </label>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/covoiturage')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || formData.payment_methods.length === 0}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Publication...' : 'Publier le trajet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
