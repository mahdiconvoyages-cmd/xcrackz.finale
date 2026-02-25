// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, X, MapPin, Calendar, User, Phone, Truck, 
  FileText, DollarSign, Package, ArrowLeft, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from '../components/Toast';
import { vehicleTypes } from '../utils/vehicleDefaults';

export default function MissionEdit() {
  const { missionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    reference: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_plate: '',
    vehicle_type: 'VL' as 'VL' | 'VU' | 'PL',
    pickup_address: '',
    delivery_address: '',
    pickup_date: '',
    delivery_date: '',
    pickup_contact_name: '',
    pickup_contact_phone: '',
    delivery_contact_name: '',
    delivery_contact_phone: '',
    distance: 0,
    price: 0,
    notes: '',
  });

  useEffect(() => {
    loadMission();
  }, [missionId]);

  const loadMission = async () => {
    if (!missionId || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (error) throw error;
      
      // Vérifier que l'utilisateur est le propriétaire de la mission
      if (data.user_id !== user.id) {
        showToast('error', 'Non autorisé', 'Vous n\'êtes pas autorisé à modifier cette mission');
        navigate('/team-missions');
        return;
      }

      setFormData({
        reference: data.reference || '',
        vehicle_brand: data.vehicle_brand || '',
        vehicle_model: data.vehicle_model || '',
        vehicle_plate: data.vehicle_plate || '',
        vehicle_type: data.vehicle_type || 'VL',
        pickup_address: data.pickup_address || '',
        delivery_address: data.delivery_address || '',
        pickup_date: data.pickup_date?.substring(0, 16) || '',
        delivery_date: data.delivery_date?.substring(0, 16) || '',
        pickup_contact_name: data.pickup_contact_name || '',
        pickup_contact_phone: data.pickup_contact_phone || '',
        delivery_contact_name: data.delivery_contact_name || '',
        delivery_contact_phone: data.delivery_contact_phone || '',
        distance: data.distance || 0,
        price: data.price || 0,
        notes: data.notes || '',
      });
    } catch (error) {
      console.error('Error loading mission:', error);
      showToast('error', 'Erreur', 'Erreur lors du chargement de la mission');
      navigate('/team-missions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pickup_address || !formData.delivery_address) {
      showToast('warning', 'Champs requis', 'Veuillez remplir les adresses de départ et d\'arrivée');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('missions')
        .update({
          reference: formData.reference,
          vehicle_brand: formData.vehicle_brand,
          vehicle_model: formData.vehicle_model,
          vehicle_plate: formData.vehicle_plate,
          vehicle_type: formData.vehicle_type,
          pickup_address: formData.pickup_address,
          delivery_address: formData.delivery_address,
          pickup_date: formData.pickup_date,
          delivery_date: formData.delivery_date,
          pickup_contact_name: formData.pickup_contact_name,
          pickup_contact_phone: formData.pickup_contact_phone,
          delivery_contact_name: formData.delivery_contact_name,
          delivery_contact_phone: formData.delivery_contact_phone,
          distance: formData.distance,
          price: formData.price,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', missionId);

      if (error) throw error;

      showToast('success', 'Mission mise à jour', 'La mission a été mise à jour avec succès');
      navigate('/team-missions');
    } catch (error) {
      console.error('Error updating mission:', error);
      showToast('error', 'Erreur', 'Erreur lors de la mise à jour de la mission');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'distance' || name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/team-missions')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux missions
          </button>
        </div>

        <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8" />
              Modifier la mission
            </h1>
            <p className="text-white/90 mt-2">Modifiez les informations de votre mission</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Référence */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" />
                Référence
              </h2>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="Référence de la mission"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Informations Véhicule */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-teal-500" />
                Informations du véhicule
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type de véhicule *
                  </label>
                  <select
                    name="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plaque d'immatriculation
                  </label>
                  <input
                    type="text"
                    name="vehicle_plate"
                    value={formData.vehicle_plate}
                    onChange={handleChange}
                    placeholder="AA-123-BB"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marque
                  </label>
                  <input
                    type="text"
                    name="vehicle_brand"
                    value={formData.vehicle_brand}
                    onChange={handleChange}
                    placeholder="Renault"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modèle
                  </label>
                  <input
                    type="text"
                    name="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={handleChange}
                    placeholder="Clio"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Adresses */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-500" />
                Trajet
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse de départ *
                  </label>
                  <input
                    type="text"
                    name="pickup_address"
                    value={formData.pickup_address}
                    onChange={handleChange}
                    placeholder="123 Rue de la République, 75001 Paris"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresse d'arrivée *
                  </label>
                  <input
                    type="text"
                    name="delivery_address"
                    value={formData.delivery_address}
                    onChange={handleChange}
                    placeholder="456 Avenue des Champs-Élysées, 75008 Paris"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-500" />
                Dates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date de départ
                  </label>
                  <input
                    type="datetime-local"
                    name="pickup_date"
                    value={formData.pickup_date}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date d'arrivée
                  </label>
                  <input
                    type="datetime-local"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleChange}
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-teal-500" />
                Contacts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">Contact de départ</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      name="pickup_contact_name"
                      value={formData.pickup_contact_name}
                      onChange={handleChange}
                      placeholder="Jean Dupont"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="pickup_contact_phone"
                      value={formData.pickup_contact_phone}
                      onChange={handleChange}
                      placeholder="06 12 34 56 78"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-700">Contact d'arrivée</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      name="delivery_contact_name"
                      value={formData.delivery_contact_name}
                      onChange={handleChange}
                      placeholder="Marie Martin"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="delivery_contact_phone"
                      value={formData.delivery_contact_phone}
                      onChange={handleChange}
                      placeholder="06 98 76 54 32"
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-500" />
                Informations supplémentaires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    name="distance"
                    value={formData.distance}
                    onChange={handleChange}
                    placeholder="100"
                    step="0.1"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prix (€)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="150"
                    step="0.01"
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Notes supplémentaires..."
                  rows={4}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/team-missions')}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-200 text-slate-700 px-6 py-4 rounded-xl font-bold hover:bg-slate-300 transition-all duration-300"
              >
                <X className="w-5 h-5" />
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer les modifications
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Code de partage préservé
              </h3>
              <p className="text-sm text-blue-700">
                Le code de partage de cette mission reste inchangé. 
                Les utilisateurs qui ont déjà rejoint la mission continueront d'y avoir accès.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
