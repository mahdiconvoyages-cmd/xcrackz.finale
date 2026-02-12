// @ts-nocheck
// Création de mission - VERSION IDENTIQUE À FLUTTER
// 4 étapes : Mandataire+Véhicule, Enlèvement, Livraison, Détails
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Truck, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import BuyCreditModal from '../components/BuyCreditModal';

export default function MissionCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { credits, deductCredits, hasEnoughCredits } = useCredits();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4; // Identique à Flutter : 0-3

  const [formData, setFormData] = useState({
    reference: `MISSION-${Date.now()}`,
    // Étape 0 - Mandataire + Véhicule
    mandataire_name: '',
    mandataire_company: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_type: 'VL' as 'VL' | 'VU' | 'PL',
    vehicle_plate: '',
    vehicle_vin: '',
    vehicle_year: '',
    // Étape 1 - Enlèvement
    pickup_contact_name: '',
    pickup_address: '',
    pickup_postcode: '',
    pickup_city: '',
    pickup_date: '',
    pickup_time: '',
    pickup_contact_phone: '',
    // Étape 2 - Livraison
    delivery_contact_name: '',
    delivery_address: '',
    delivery_postcode: '',
    delivery_city: '',
    delivery_date: '',
    delivery_time: '',
    delivery_contact_phone: '',
    // Étape 3 - Détails supplémentaires
    client_name: '',
    client_phone: '',
    client_email: '',
    agent_name: '',
    price: '',
    notes: '',
    special_instructions: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNext = () => currentStep < totalSteps - 1 && setCurrentStep(currentStep + 1);
  const handlePrevious = () => currentStep > 0 && setCurrentStep(currentStep - 1);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return formData.mandataire_name && formData.vehicle_brand && formData.vehicle_model;
      case 1: return formData.pickup_contact_name && formData.pickup_address && formData.pickup_postcode && formData.pickup_city && formData.pickup_date;
      case 2: return formData.delivery_contact_name && formData.delivery_address && formData.delivery_postcode && formData.delivery_city && formData.delivery_date;
      case 3: return true; // Optionnel
      default: return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hasEnoughCredits(1)) {
      setShowBuyCreditModal(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const deductResult = await deductCredits(1, `Mission ${formData.reference}`);
      if (!deductResult.success) throw new Error(deductResult.error);

      const pickupDateTime = formData.pickup_time ? `${formData.pickup_date}T${formData.pickup_time}` : formData.pickup_date;
      const deliveryDateTime = formData.delivery_time ? `${formData.delivery_date}T${formData.delivery_time}` : formData.delivery_date;

      const { error: insertError } = await supabase
        .from('missions')
        .insert({
          user_id: user.id,
          reference: formData.reference,
          mandataire_name: formData.mandataire_name || null,
          mandataire_company: formData.mandataire_company || null,
          vehicle_brand: formData.vehicle_brand,
          vehicle_model: formData.vehicle_model,
          vehicle_type: formData.vehicle_type,
          vehicle_plate: formData.vehicle_plate || null,
          vehicle_vin: formData.vehicle_vin || null,
          vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
          pickup_contact_name: formData.pickup_contact_name,
          pickup_address: `${formData.pickup_address}, ${formData.pickup_postcode} ${formData.pickup_city}`,
          pickup_postal_code: formData.pickup_postcode,
          pickup_city: formData.pickup_city,
          pickup_date: pickupDateTime || null,
          pickup_contact_phone: formData.pickup_contact_phone || null,
          delivery_contact_name: formData.delivery_contact_name,
          delivery_address: `${formData.delivery_address}, ${formData.delivery_postcode} ${formData.delivery_city}`,
          delivery_postal_code: formData.delivery_postcode,
          delivery_city: formData.delivery_city,
          delivery_date: deliveryDateTime || null,
          delivery_contact_phone: formData.delivery_contact_phone || null,
          client_name: formData.client_name || null,
          client_phone: formData.client_phone || null,
          client_email: formData.client_email || null,
          agent_name: formData.agent_name || null,
          price: formData.price ? parseFloat(formData.price) : null,
          notes: formData.notes || null,
          special_instructions: formData.special_instructions || null,
          status: 'pending',
        });

      if (insertError) throw insertError;

      alert('✅ Mission créée ! 1 crédit déduit.');
      navigate('/team-missions');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => ['Mandataire & Véhicule', 'Point d\'enlèvement', 'Point de livraison', 'Détails'][currentStep];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Mandataire */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center gap-3">
                <span className="text-3xl">👤</span>
                Informations Mandataire
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-900 mb-2">Nom du mandataire *</label>
                  <input type="text" name="mandataire_name" value={formData.mandataire_name} onChange={handleChange} placeholder="Jean Dupont" required
                    className="w-full bg-white border-2 border-purple-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-purple-900 mb-2">Société mandante</label>
                  <input type="text" name="mandataire_company" value={formData.mandataire_company} onChange={handleChange} placeholder="Transport Express SARL"
                    className="w-full bg-white border-2 border-purple-200 rounded-lg px-4 py-3" />
                </div>
              </div>
            </div>

            {/* Véhicule */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-teal-200">
              <h3 className="text-xl font-bold text-teal-900 mb-4 flex items-center gap-3">
                <span className="text-3xl">🚗</span>
                Informations du véhicule
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-teal-900 mb-2">Type de véhicule *</label>
                  <div className="flex gap-3">
                    {['VL', 'VU', 'PL'].map((type) => (
                      <button key={type} type="button" onClick={() => setFormData(prev => ({ ...prev, vehicle_type: type as any }))}
                        className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${formData.vehicle_type === type ? 'bg-teal-600 text-white shadow-lg' : 'bg-white border-2 border-teal-200'}`}>
                        {type === 'VL' ? 'Voiture' : type === 'VU' ? 'Utilitaire' : 'Poids lourd'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-teal-900 mb-2">Marque *</label>
                  <input type="text" name="vehicle_brand" value={formData.vehicle_brand} onChange={handleChange} placeholder="Renault, Peugeot..." required
                    className="w-full bg-white border-2 border-teal-200 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-teal-900 mb-2">Modèle *</label>
                  <input type="text" name="vehicle_model" value={formData.vehicle_model} onChange={handleChange} placeholder="Clio, 308..." required
                    className="w-full bg-white border-2 border-teal-200 rounded-lg px-4 py-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-teal-900 mb-2">Immatriculation</label>
                  <input type="text" name="vehicle_plate" value={formData.vehicle_plate} onChange={handleChange} placeholder="AB-123-CD"
                    className="w-full bg-white border-2 border-teal-200 rounded-lg px-4 py-3 uppercase" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-teal-900 mb-2">Numéro VIN</label>
                  <input type="text" name="vehicle_vin" value={formData.vehicle_vin} onChange={handleChange} placeholder="Numéro de série"
                    className="w-full bg-white border-2 border-teal-200 rounded-lg px-4 py-3 uppercase" />
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3"><span className="text-3xl">📍</span>Lieu de départ</h3>
            <div><label className="block text-sm font-semibold mb-2">Nom du client *</label>
              <input type="text" name="pickup_contact_name" value={formData.pickup_contact_name} onChange={handleChange} placeholder="Jean Dupont" required
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            <div><label className="block text-sm font-semibold mb-2">Adresse de départ *</label>
              <input type="text" name="pickup_address" value={formData.pickup_address} onChange={handleChange} placeholder="123 Rue de la Paix" required
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2"><label className="block text-sm font-semibold mb-2">Code postal *</label>
                <input type="text" name="pickup_postcode" value={formData.pickup_postcode} onChange={handleChange} placeholder="75001" maxLength={5} required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
              <div className="col-span-3"><label className="block text-sm font-semibold mb-2">Ville *</label>
                <input type="text" name="pickup_city" value={formData.pickup_city} onChange={handleChange} placeholder="Paris" required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold mb-2">Date *</label>
                <input type="date" name="pickup_date" value={formData.pickup_date} onChange={handleChange} required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
              <div><label className="block text-sm font-semibold mb-2">Heure</label>
                <input type="time" name="pickup_time" value={formData.pickup_time} onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            </div>
            <div className="bg-slate-100 rounded-xl p-4 border">
              <h4 className="text-sm font-bold mb-3">Téléphone au départ</h4>
              <div className="space-y-3">
                <input type="tel" name="pickup_contact_phone" value={formData.pickup_contact_phone} onChange={handleChange} placeholder="06 XX XX XX XX"
                  className="w-full bg-white border rounded-lg px-4 py-2.5" />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-3"><span className="text-3xl">🎯</span>Lieu d'arrivée</h3>
            <div><label className="block text-sm font-semibold mb-2">Nom du client *</label>
              <input type="text" name="delivery_contact_name" value={formData.delivery_contact_name} onChange={handleChange} placeholder="Marie Martin" required
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            <div><label className="block text-sm font-semibold mb-2">Adresse d'arrivée *</label>
              <input type="text" name="delivery_address" value={formData.delivery_address} onChange={handleChange} placeholder="456 Avenue des Champs" required
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2"><label className="block text-sm font-semibold mb-2">Code postal *</label>
                <input type="text" name="delivery_postcode" value={formData.delivery_postcode} onChange={handleChange} placeholder="75008" maxLength={5} required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
              <div className="col-span-3"><label className="block text-sm font-semibold mb-2">Ville *</label>
                <input type="text" name="delivery_city" value={formData.delivery_city} onChange={handleChange} placeholder="Paris" required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold mb-2">Date *</label>
                <input type="date" name="delivery_date" value={formData.delivery_date} onChange={handleChange} required
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
              <div><label className="block text-sm font-semibold mb-2">Heure</label>
                <input type="time" name="delivery_time" value={formData.delivery_time} onChange={handleChange}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg px-4 py-3" /></div>
            </div>
            <div className="bg-slate-100 rounded-xl p-4 border">
              <h4 className="text-sm font-bold mb-3">Téléphone à l'arrivée</h4>
              <div className="space-y-3">
                <input type="tel" name="delivery_contact_phone" value={formData.delivery_contact_phone} onChange={handleChange} placeholder="06 XX XX XX XX"
                  className="w-full bg-white border rounded-lg px-4 py-2.5" />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div><h3 className="text-2xl font-bold flex items-center gap-3 mb-2"><span className="text-3xl">📋</span>Détails supplémentaires</h3>
              <p className="text-slate-500 text-sm">Ces informations sont optionnelles</p></div>
            <div className="bg-slate-50 rounded-xl p-5 border">
              <h4 className="text-sm font-bold mb-3">Informations client</h4>
              <div className="space-y-3">
                <input type="text" name="client_name" value={formData.client_name} onChange={handleChange} placeholder="Nom du client"
                  className="w-full bg-white border rounded-lg px-4 py-2.5" />
                <input type="tel" name="client_phone" value={formData.client_phone} onChange={handleChange} placeholder="Téléphone"
                  className="w-full bg-white border rounded-lg px-4 py-2.5" />
                <input type="email" name="client_email" value={formData.client_email} onChange={handleChange} placeholder="Email"
                  className="w-full bg-white border rounded-lg px-4 py-2.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-semibold mb-2">Agent</label>
                <input type="text" name="agent_name" value={formData.agent_name} onChange={handleChange} placeholder="Nom de l'agent"
                  className="w-full bg-slate-50 border rounded-lg px-4 py-2.5" /></div>
              <div><label className="block text-sm font-semibold mb-2">Prix (€)</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" step="0.01"
                  className="w-full bg-slate-50 border rounded-lg px-4 py-2.5" /></div>
            </div>
            <div><label className="block text-sm font-semibold mb-2">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} placeholder="Informations complémentaires..."
                className="w-full bg-slate-50 border rounded-lg px-4 py-3 resize-none" /></div>
            <div><label className="block text-sm font-semibold mb-2">Instructions spéciales</label>
              <textarea name="special_instructions" value={formData.special_instructions} onChange={handleChange} rows={3} placeholder="Consignes particulières..."
                className="w-full bg-slate-50 border rounded-lg px-4 py-3 resize-none" /></div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/team-missions" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-6 h-6" /></Link>
        <div><h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Nouvelle mission</h1>
          <p className="text-slate-600 text-lg">{getStepTitle()}</p></div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">{credits}</div>
            <div><p className="font-semibold text-amber-900">Crédits disponibles</p>
              <p className="text-sm text-amber-700">1 crédit sera déduit pour cette mission</p></div>
          </div>
          {credits === 0 && <button type="button" onClick={() => setShowBuyCreditModal(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold">Recharger</button>}
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/70 border rounded-2xl p-8 shadow-xl">
        <div className="mb-8">
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 relative"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 animate-bounce">
                <Truck className="w-8 h-8 text-teal-600 drop-shadow-lg" />
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            {['Mandataire', 'Enlèvement', 'Livraison', 'Détails'].map((label, i) => (
              <div key={i} className={`text-sm font-semibold ${i <= currentStep ? 'text-teal-600' : 'text-slate-400'}`}>{label}</div>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-start gap-3">
          <X className="w-5 h-5 flex-shrink-0 mt-0.5" /><div>{error}</div></div>}

        <form onSubmit={handleSubmit}>
          <div className="min-h-[500px]">{renderStep()}</div>
          <div className="flex gap-4 mt-8 pt-6 border-t">
            {currentStep > 0 && <button type="button" onClick={handlePrevious}
              className="flex-1 px-6 py-4 border-2 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold flex items-center justify-center gap-2">
              <ChevronLeft className="w-5 h-5" />Précédent</button>}
            {currentStep < totalSteps - 1 ? (
              <button type="button" onClick={handleNext} disabled={!canProceed()}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 shadow-lg">
                Suivant<ChevronRight className="w-5 h-5" /></button>
            ) : (
              <button type="submit" disabled={loading || !hasEnoughCredits(1)}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-semibold flex items-center justify-center gap-2 shadow-lg">
                {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Création...</> : <><Save className="w-5 h-5" />Créer la mission</>}
              </button>
            )}
          </div>
        </form>
      </div>

      {showBuyCreditModal && <BuyCreditModal isOpen={showBuyCreditModal} onClose={() => setShowBuyCreditModal(false)} />}
    </div>
  );
}
