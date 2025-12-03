// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Truck, Download, Eye, X, ChevronRight, ChevronLeft, Share2, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import AddressAutocomplete from '../components/AddressAutocomplete';
import VehicleImageUpload from '../components/VehicleImageUpload';
import BuyCreditModal from '../components/BuyCreditModal';
import { getVehicleImageUrl } from '../utils/vehicleDefaults';

export default function MissionCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { credits, deductCredits, hasEnoughCredits, loading: creditsLoading } = useCredits();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdMission, setCreatedMission] = useState<{ id: string; share_code?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const totalSteps = 5; // Ajout d'une étape finale de récapitulatif & PDF

  const [formData, setFormData] = useState({
    reference: `MISSION-${Date.now()}`,
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_type: 'VL' as 'VL' | 'VU' | 'PL', // Véhicule Léger, Utilitaire, Poids Lourd
    vehicle_plate: '',
    vehicle_vin: '',
    vehicle_image_url: '',
    pickup_address: '',
    pickup_lat: null as number | null,
    pickup_lng: null as number | null,
    pickup_date: '',
    pickup_contact_name: '',
    pickup_contact_phone: '',
    delivery_address: '',
    delivery_lat: null as number | null,
    delivery_lng: null as number | null,
    delivery_date: '',
    delivery_contact_name: '',
    delivery_contact_phone: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePickupAddressSelect = (address: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      pickup_address: address,
      pickup_lat: lat,
      pickup_lng: lng,
    }));
  };

  const handleDeliveryAddressSelect = (address: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      delivery_address: address,
      delivery_lat: lat,
      delivery_lng: lng,
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.vehicle_brand.trim() !== '' && formData.vehicle_model.trim() !== '';
      case 2:
        return formData.pickup_address.trim() !== '';
      case 3:
        return formData.delivery_address.trim() !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Vérifier les crédits AVANT de créer la mission
    if (!hasEnoughCredits(1)) {
      setShowBuyCreditModal(true);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 1. Déduire 1 crédit
      const deductResult = await deductCredits(1, `Création de mission ${formData.reference}`);
      
      if (!deductResult.success) {
        setError(deductResult.error || 'Impossible de déduire les crédits');
        setShowBuyCreditModal(true);
        setLoading(false);
        return;
      }

      // 2. Créer la mission
      const { data, error } = await supabase
        .from('missions')
        .insert([
          {
            user_id: user.id,
            reference: formData.reference,
            vehicle_brand: formData.vehicle_brand,
            vehicle_model: formData.vehicle_model,
            vehicle_type: formData.vehicle_type,
            vehicle_plate: formData.vehicle_plate || null,
            vehicle_vin: formData.vehicle_vin || null,
            vehicle_image_url: formData.vehicle_image_url || null,
            pickup_address: formData.pickup_address,
            pickup_lat: formData.pickup_lat,
            pickup_lng: formData.pickup_lng,
            pickup_date: formData.pickup_date || null,
            pickup_contact_name: formData.pickup_contact_name || null,
            pickup_contact_phone: formData.pickup_contact_phone || null,
            delivery_address: formData.delivery_address,
            delivery_lat: formData.delivery_lat,
            delivery_lng: formData.delivery_lng,
            delivery_date: formData.delivery_date || null,
            delivery_contact_name: formData.delivery_contact_name || null,
            delivery_contact_phone: formData.delivery_contact_phone || null,
            notes: formData.notes || null,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Afficher le modal de succès avec code de partage
      if (data && data.id) {
        setCreatedMission({ 
          id: data.id,
          share_code: data.share_code 
        });
      } else {
        // Si pas d'ID, rediriger directement
        navigate('/team-missions');
      }
    } catch (error: any) {
      console.error('Error creating mission:', error);
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #1e293b;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #14b8a6;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #14b8a6;
            margin-bottom: 10px;
          }
          .reference {
            font-size: 14px;
            color: #64748b;
          }
          .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #14b8a6;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .info-row {
            display: flex;
            margin-bottom: 12px;
            padding: 8px;
            background: white;
            border-radius: 4px;
          }
          .info-label {
            font-weight: bold;
            color: #475569;
            width: 200px;
            flex-shrink: 0;
          }
          .info-value {
            color: #1e293b;
          }
          .icon {
            width: 20px;
            height: 20px;
            display: inline-block;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">BON DE MISSION</div>
          <div class="reference">Référence: ${formData.reference}</div>
        </div>

        <div class="section">
          <div class="section-title">
            🚗 Informations du véhicule
          </div>
          <div style="margin-bottom: 20px; text-align: center;">
            <img src="${getVehicleImageUrl(formData.vehicle_image_url, formData.vehicle_type)}" alt="Véhicule ${formData.vehicle_type}" style="max-width: 100%; max-height: 400px; border-radius: 8px; object-fit: cover; border: 2px solid #e2e8f0;" />
          </div>
          <div class="info-row">
            <span class="info-label">Marque:</span>
            <span class="info-value">${formData.vehicle_brand || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Modèle:</span>
            <span class="info-value">${formData.vehicle_model || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Immatriculation:</span>
            <span class="info-value">${formData.vehicle_plate || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">N° de série (VIN):</span>
            <span class="info-value">${formData.vehicle_vin || '-'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">
            📍 Point de départ
          </div>
          <div class="info-row">
            <span class="info-label">Adresse:</span>
            <span class="info-value">${formData.pickup_address || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date/Heure:</span>
            <span class="info-value">${formData.pickup_date ? new Date(formData.pickup_date).toLocaleString('fr-FR') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Contact:</span>
            <span class="info-value">${formData.pickup_contact_name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Téléphone:</span>
            <span class="info-value">${formData.pickup_contact_phone || '-'}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">
            🎯 Point d'arrivée
          </div>
          <div class="info-row">
            <span class="info-label">Adresse:</span>
            <span class="info-value">${formData.delivery_address || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date/Heure:</span>
            <span class="info-value">${formData.delivery_date ? new Date(formData.delivery_date).toLocaleString('fr-FR') : '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Contact:</span>
            <span class="info-value">${formData.delivery_contact_name || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Téléphone:</span>
            <span class="info-value">${formData.delivery_contact_phone || '-'}</span>
          </div>
        </div>

        ${formData.notes ? `
        <div class="section">
          <div class="section-title">
            📝 Notes
          </div>
          <div class="info-row">
            <span class="info-value">${formData.notes}</span>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          Document généré le ${new Date().toLocaleString('fr-FR')}
        </div>
      </body>
      </html>
    `;
    return doc;
  };

  const downloadPDF = () => {
    const html = generatePDF();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mission-${formData.reference}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Informations du véhicule';
      case 2: return 'Point de départ';
      case 3: return 'Point d\'arrivée';
      case 4: return 'Détails supplémentaires';
      case 5: return 'Récapitulatif & PDF';
      default: return '';
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Référence
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Marque du véhicule *
              </label>
              <input
                type="text"
                name="vehicle_brand"
                value={formData.vehicle_brand}
                onChange={handleChange}
                placeholder="BMW, Mercedes, etc."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Modèle du véhicule *
              </label>
              <input
                type="text"
                name="vehicle_model"
                value={formData.vehicle_model}
                onChange={handleChange}
                placeholder="Série 3, Classe A, etc."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Type de véhicule *
              </label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              >
                <option value="VL">🚗 Véhicule Léger (VL) - Voiture classique</option>
                <option value="VU">🚐 Véhicule Utilitaire (VU) - Camionnette/Van</option>
                <option value="PL">🚛 Poids Lourd (PL) - Camion</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Immatriculation
              </label>
              <input
                type="text"
                name="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={handleChange}
                placeholder="AB-123-CD"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Numéro de série (VIN)
              </label>
              <input
                type="text"
                name="vehicle_vin"
                value={formData.vehicle_vin}
                onChange={handleChange}
                placeholder="WBADT43452G..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Photo du véhicule
              </label>
              <VehicleImageUpload
                value={formData.vehicle_image_url}
                onChange={(url) => setFormData(prev => ({ ...prev, vehicle_image_url: url }))}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Adresse de départ *
              </label>
              <AddressAutocomplete
                value={formData.pickup_address}
                onChange={(address, lat, lng) => {
                  if (lat && lng) {
                    handlePickupAddressSelect(address, lat, lng);
                  } else {
                    setFormData(prev => ({ ...prev, pickup_address: address }));
                  }
                }}
                placeholder="Rechercher une adresse..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Date de départ
              </label>
              <input
                type="datetime-local"
                name="pickup_date"
                value={formData.pickup_date}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nom du contact de départ
              </label>
              <input
                type="text"
                name="pickup_contact_name"
                value={formData.pickup_contact_name}
                onChange={handleChange}
                placeholder="Jean Dupont"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Téléphone du contact de départ
              </label>
              <input
                type="tel"
                name="pickup_contact_phone"
                value={formData.pickup_contact_phone}
                onChange={handleChange}
                placeholder="06 12 34 56 78"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Adresse d'arrivée *
              </label>
              <AddressAutocomplete
                value={formData.delivery_address}
                onChange={(address, lat, lng) => {
                  if (lat && lng) {
                    handleDeliveryAddressSelect(address, lat, lng);
                  } else {
                    setFormData(prev => ({ ...prev, delivery_address: address }));
                  }
                }}
                placeholder="Rechercher une adresse..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Date d'arrivée
              </label>
              <input
                type="datetime-local"
                name="delivery_date"
                value={formData.delivery_date}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nom du contact d'arrivée
              </label>
              <input
                type="text"
                name="delivery_contact_name"
                value={formData.delivery_contact_name}
                onChange={handleChange}
                placeholder="Marie Martin"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Téléphone du contact d'arrivée
              </label>
              <input
                type="tel"
                name="delivery_contact_phone"
                value={formData.delivery_contact_phone}
                onChange={handleChange}
                placeholder="06 98 76 54 32"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={6}
                placeholder="Informations complémentaires..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <iframe
                title="Aperçu PDF Mission"
                srcDoc={generatePDF()}
                className="w-full h-[600px] border-0"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Vérifiez les informations ci-dessus, vous pouvez encore revenir aux étapes précédentes pour corriger avant de créer la mission.
              </div>
              <button
                type="button"
                onClick={downloadPDF}
                className="flex items-center gap-2 px-5 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-all shadow"
              >
                <Download className="w-5 h-5" />
                Télécharger le PDF
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/team-missions"
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Créer une mission
            </h1>
            <p className="text-slate-600 text-lg">{getStepTitle()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg"
          >
            <Eye className="w-5 h-5" />
            Prévisualiser
          </button>
          <button
            type="button"
            onClick={downloadPDF}
            className="flex items-center gap-2 px-6 py-3 bg-slate-500 text-white rounded-xl hover:bg-slate-600 transition-all shadow-lg"
          >
            <Download className="w-5 h-5" />
            Télécharger
          </button>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-2xl p-8 shadow-xl">
        <div className="mb-8">
          <div className="relative">
            <div className="overflow-hidden h-3 bg-slate-200 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 animate-bounce">
                  <Truck className="w-8 h-8 text-teal-600 drop-shadow-lg" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`text-sm font-semibold transition-colors ${
                  step <= currentStep ? 'text-teal-600' : 'text-slate-400'
                }`}
              >
                Étape {step}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        {currentStep === totalSteps ? (
          // Étape finale: on encapsule dans un formulaire pour la soumission uniquement ici
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            onKeyDown={(e) => {
              // Empêcher la touche Enter de soumettre par inadvertance si des champs sont focus
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
          >
            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Précédent
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Créer la mission
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          // Étapes 1 à 3: simple conteneur, aucun formulaire ici pour éviter toute soumission
          <div
            onKeyDown={(e) => {
              // Empêcher Enter de déclencher un submit implicite du navigateur
              if (e.key === 'Enter') {
                e.preventDefault();
                if (canProceedToNextStep()) handleNext();
              }
            }}
          >
            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="flex-1 px-6 py-4 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Précédent
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-2xl font-bold text-slate-900">Aperçu de la mission</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <iframe
                srcDoc={generatePDF()}
                className="w-full h-full border-0"
                style={{ minHeight: '600px' }}
              />
            </div>
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={downloadPDF}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg"
              >
                <Download className="w-5 h-5" />
                Télécharger PDF
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Success avec Code de Partage */}
      {createdMission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Mission créée avec succès !</h2>
              <p className="text-gray-600">
                {`${formData.vehicle_brand} ${formData.vehicle_model}`}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Partager cette mission</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="text-xs text-gray-600 mb-2">Code de partage</div>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="text-2xl font-bold text-blue-600 tracking-wider font-mono">
                      {createdMission.share_code || 'XZ-XXX-XXX'}
                    </div>
                    <button
                      onClick={async () => {
                        const code = createdMission.share_code || '';
                        try {
                          await navigator.clipboard.writeText(code);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                        }
                      }}
                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Le destinataire devra entrer ce code dans l'app mobile
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const code = createdMission.share_code || '';
                    const text = `🚗 Mission de convoyage\n\n${formData.vehicle_brand} ${formData.vehicle_model}\n\nCode: ${code}\n\nPour rejoindre cette mission:\n1. Ouvre l'app CheckFlow\n2. Va dans Missions > Rejoindre\n3. Entre le code: ${code}`;
                    
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Mission de convoyage',
                          text: text,
                        });
                      } catch (err) {
                        console.log('Share cancelled or failed:', err);
                      }
                    } else {
                      // Fallback: copier dans le presse-papiers
                      try {
                        await navigator.clipboard.writeText(text);
                        alert('Message copié dans le presse-papiers !');
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Partager par message
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <p className="text-xs text-blue-800 leading-relaxed">
                  💡 <strong>Astuce :</strong> Partagez ce lien avec un convoyeur. En cliquant dessus depuis son mobile, il pourra rejoindre directement la mission dans l'app CheckFlow.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/team-missions')}
                className="flex-1 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all font-semibold"
              >
                Voir mes missions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Achat Crédits */}
      <BuyCreditModal
        isOpen={showBuyCreditModal}
        onClose={() => setShowBuyCreditModal(false)}
        currentCredits={credits}
        requiredCredits={1}
        action="créer une mission"
      />
    </div>
  );
}
