import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ProgressBar from '../components/inspection/ProgressBar';
import SignatureCanvas from '../components/inspection/SignatureCanvas';
import PhotoUpload from '../components/inspection/PhotoUpload';
import AIChoiceModal from '../components/inspection/AIChoiceModal';

interface InspectionData {
  id?: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleRegistration: string;
  vehicleType: 'VL' | 'VU' | 'PL';
  kmStart: number;
  fuelLevelStart: string;
  vehiclePhotos: string[];
  exteriorDefects: string[];
  exteriorPhotos: string[];
  exteriorNotes: string;
  interiorDefects: string[];
  interiorPhotos: string[];
  interiorNotes: string;
  signatureDeparture: string;
  signatureDepartureName: string;
  kmEnd: number;
  fuelLevelEnd: string;
  arrivalPhotos: string[];
  arrivalNotes: string;
  signatureArrival: string;
  signatureArrivalName: string;
  useAI?: boolean; // Nouveau : choix d'utiliser l'IA ou non
}

const STEPS = [
  'Véhicule',
  'Extérieur',
  'Intérieur',
  'Signature',
  'Arrivée',
  'Résumé'
];

const EXTERIOR_DEFECTS = [
  'Rayures',
  'Bosses',
  'Chocs',
  'Peinture écaillée',
  'Pare-brise fissuré',
  'Phares cassés',
  'Rétroviseurs abîmés',
  'Pneus usés',
  'Jantes rayées'
];

const INTERIOR_DEFECTS = [
  'Sièges tachés',
  'Sièges déchirés',
  'Tableau de bord abîmé',
  'Tapis sales',
  'Coffre sale',
  'Odeur désagréable',
  'Équipements manquants',
  'Ceintures défectueuses'
];

export default function InspectionWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  
  // Modal de choix IA
  const [showAIChoice, setShowAIChoice] = useState(true);
  const [aiChoiceMade, setAiChoiceMade] = useState(false);

  const [data, setData] = useState<InspectionData>({
    vehicleBrand: '',
    vehicleModel: '',
    vehicleRegistration: '',
    vehicleType: 'VL',
    kmStart: 0,
    fuelLevelStart: '',
    vehiclePhotos: [],
    exteriorDefects: [],
    exteriorPhotos: [],
    exteriorNotes: '',
    interiorDefects: [],
    interiorPhotos: [],
    interiorNotes: '',
    signatureDeparture: '',
    signatureDepartureName: '',
    kmEnd: 0,
    fuelLevelEnd: '',
    arrivalPhotos: [],
    arrivalNotes: '',
    signatureArrival: '',
    signatureArrivalName: ''
  });

  useEffect(() => {
    const loadDraft = async () => {
      if (!user) return;

      const { data: draft } = await supabase
        .from('inspections')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .maybeSingle();

      if (draft) {
        setData({
          id: draft.id,
          vehicleBrand: draft.vehicle_brand || '',
          vehicleModel: draft.vehicle_model || '',
          vehicleRegistration: draft.vehicle_registration || '',
          vehicleType: draft.vehicle_type || 'VL',
          kmStart: draft.km_start || 0,
          fuelLevelStart: draft.fuel_level_start || '',
          vehiclePhotos: [],
          exteriorDefects: [],
          exteriorPhotos: [],
          exteriorNotes: draft.exterior_notes || '',
          interiorDefects: [],
          interiorPhotos: [],
          interiorNotes: draft.interior_notes || '',
          signatureDeparture: draft.signature_departure || '',
          signatureDepartureName: draft.signature_departure_name || '',
          kmEnd: draft.km_end || 0,
          fuelLevelEnd: draft.fuel_level_end || '',
          arrivalPhotos: [],
          arrivalNotes: draft.arrival_notes || '',
          signatureArrival: draft.signature_arrival || '',
          signatureArrivalName: draft.signature_arrival_name || ''
        });
      }
    };

    loadDraft();
  }, [user]);

  const saveDraft = async () => {
    if (!user) return;

    setSavingDraft(true);

    try {
      const inspectionData = {
        user_id: user.id,
        status: 'draft',
        vehicle_brand: data.vehicleBrand,
        vehicle_model: data.vehicleModel,
        vehicle_registration: data.vehicleRegistration,
        vehicle_type: data.vehicleType,
        km_start: data.kmStart,
        fuel_level_start: data.fuelLevelStart,
        exterior_notes: data.exteriorNotes,
        interior_notes: data.interiorNotes,
        signature_departure: data.signatureDeparture,
        signature_departure_name: data.signatureDepartureName,
        km_end: data.kmEnd,
        fuel_level_end: data.fuelLevelEnd,
        arrival_notes: data.arrivalNotes,
        signature_arrival: data.signatureArrival,
        signature_arrival_name: data.signatureArrivalName,
        updated_at: new Date().toISOString()
      };

      if (data.id) {
        await supabase
          .from('inspections')
          .update(inspectionData)
          .eq('id', data.id);
      } else {
        const { data: newInspection } = await supabase
          .from('inspections')
          .insert(inspectionData)
          .select()
          .single();

        if (newInspection) {
          setData({ ...data, id: newInspection.id });
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSavingDraft(false);
    }
  };

  useEffect(() => {
    const autoSave = setInterval(() => {
      saveDraft();
    }, 30000);

    return () => clearInterval(autoSave);
  }, [data, user]);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return data.vehicleBrand && data.vehicleModel && data.vehicleRegistration;
      case 1:
        return true;
      case 2:
        return true;
      case 3:
        return data.signatureDeparture && data.signatureDepartureName;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && canProceed()) {
      setCurrentStep(currentStep + 1);
      saveDraft();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generatePDF = async () => {
    if (!data.id) return;

    setLoading(true);

    try {
      await supabase
        .from('inspections')
        .update({ status: 'completed' })
        .eq('id', data.id);

      alert('Inspection finalisée avec succès !');
      navigate('/rapports-inspection');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      const errorMessage = error?.message || 'Une erreur est survenue';
      alert(`Erreur: ${errorMessage}\n\nVous allez être redirigé vers les rapports.`);
      setTimeout(() => navigate('/rapports-inspection'), 1000);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
              Informations du véhicule
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Marque <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.vehicleBrand}
                  onChange={(e) => setData({ ...data, vehicleBrand: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                  placeholder="Ex: Renault"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Modèle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.vehicleModel}
                  onChange={(e) => setData({ ...data, vehicleModel: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                  placeholder="Ex: Clio"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Immatriculation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.vehicleRegistration}
                  onChange={(e) => setData({ ...data, vehicleRegistration: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all uppercase"
                  placeholder="Ex: AB-123-CD"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Type de véhicule <span className="text-red-500">*</span>
                </label>
                <select
                  value={data.vehicleType}
                  onChange={(e) => setData({ ...data, vehicleType: e.target.value as 'VL' | 'VU' | 'PL' })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                >
                  <option value="VL">Véhicule Léger (VL)</option>
                  <option value="VU">Véhicule Utilitaire (VU)</option>
                  <option value="PL">Poids Lourd (PL)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Kilométrage initial
                </label>
                <input
                  type="number"
                  value={data.kmStart || ''}
                  onChange={(e) => setData({ ...data, kmStart: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Niveau de carburant
                </label>
                <select
                  value={data.fuelLevelStart}
                  onChange={(e) => setData({ ...data, fuelLevelStart: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                >
                  <option value="">Sélectionner</option>
                  <option value="Vide">Vide</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Plein">Plein</option>
                </select>
              </div>
            </div>

            <PhotoUpload
              category="vehicle"
              label="Photos du véhicule (avant, arrière, côtés)"
              photos={data.vehiclePhotos}
              onPhotosChange={(photos) => setData({ ...data, vehiclePhotos: photos })}
              optional
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
              Inspection extérieure
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Défauts constatés
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXTERIOR_DEFECTS.map((defect) => (
                  <label
                    key={defect}
                    className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-xl bg-white/60 border-2 border-white/40 hover:border-teal-500 cursor-pointer transition-all shadow-lg hover:shadow-xl"
                  >
                    <input
                      type="checkbox"
                      checked={data.exteriorDefects.includes(defect)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setData({ ...data, exteriorDefects: [...data.exteriorDefects, defect] });
                        } else {
                          setData({
                            ...data,
                            exteriorDefects: data.exteriorDefects.filter((d) => d !== defect)
                          });
                        }
                      }}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{defect}</span>
                  </label>
                ))}
              </div>
            </div>

            <PhotoUpload
              category="exterior"
              label="Photos extérieures"
              photos={data.exteriorPhotos}
              onPhotosChange={(photos) => setData({ ...data, exteriorPhotos: photos })}
              optional
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Observations extérieures
              </label>
              <textarea
                value={data.exteriorNotes}
                onChange={(e) => setData({ ...data, exteriorNotes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none shadow-lg"
                placeholder="Décrivez les observations concernant l'extérieur du véhicule..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
              Inspection intérieure
            </h2>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">
                Défauts constatés
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INTERIOR_DEFECTS.map((defect) => (
                  <label
                    key={defect}
                    className="flex items-center gap-3 p-4 rounded-xl backdrop-blur-xl bg-white/60 border-2 border-white/40 hover:border-teal-500 cursor-pointer transition-all shadow-lg hover:shadow-xl"
                  >
                    <input
                      type="checkbox"
                      checked={data.interiorDefects.includes(defect)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setData({ ...data, interiorDefects: [...data.interiorDefects, defect] });
                        } else {
                          setData({
                            ...data,
                            interiorDefects: data.interiorDefects.filter((d) => d !== defect)
                          });
                        }
                      }}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{defect}</span>
                  </label>
                ))}
              </div>
            </div>

            <PhotoUpload
              category="interior"
              label="Photos intérieures"
              photos={data.interiorPhotos}
              onPhotosChange={(photos) => setData({ ...data, interiorPhotos: photos })}
              optional
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Observations intérieures
              </label>
              <textarea
                value={data.interiorNotes}
                onChange={(e) => setData({ ...data, interiorNotes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none shadow-lg"
                placeholder="Décrivez les observations concernant l'intérieur du véhicule..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
              Signature de départ
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Nom complet du client <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={data.signatureDepartureName}
                onChange={(e) => setData({ ...data, signatureDepartureName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all"
                placeholder="Prénom NOM"
              />
            </div>

            {data.signatureDeparture ? (
              <div className="backdrop-blur-xl bg-white/50 border border-white/40 shadow-depth-lg rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Signature enregistrée</h3>
                  <button
                    onClick={() => setData({ ...data, signatureDeparture: '' })}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all"
                  >
                    Modifier
                  </button>
                </div>
                <img
                  src={data.signatureDeparture}
                  alt="Signature"
                  className="w-full border-2 border-slate-200 rounded-xl"
                />
                <p className="text-sm text-slate-600 mt-4">
                  <strong>Signé par:</strong> {data.signatureDepartureName}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Date:</strong> {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            ) : (
              <SignatureCanvas
                onSave={(signature) => setData({ ...data, signatureDeparture: signature })}
              />
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
              Inspection d'arrivée
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                Cette étape est optionnelle. Vous pouvez compléter l'inspection d'arrivée maintenant ou plus tard.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Kilométrage final
                </label>
                <input
                  type="number"
                  value={data.kmEnd || ''}
                  onChange={(e) => setData({ ...data, kmEnd: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Niveau de carburant final
                </label>
                <select
                  value={data.fuelLevelEnd}
                  onChange={(e) => setData({ ...data, fuelLevelEnd: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                >
                  <option value="">Sélectionner</option>
                  <option value="Vide">Vide</option>
                  <option value="1/4">1/4</option>
                  <option value="1/2">1/2</option>
                  <option value="3/4">3/4</option>
                  <option value="Plein">Plein</option>
                </select>
              </div>
            </div>

            <PhotoUpload
              category="arrival"
              label="Photos d'arrivée"
              photos={data.arrivalPhotos}
              onPhotosChange={(photos) => setData({ ...data, arrivalPhotos: photos })}
              optional
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Observations supplémentaires
              </label>
              <textarea
                value={data.arrivalNotes}
                onChange={(e) => setData({ ...data, arrivalNotes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all resize-none shadow-lg"
                placeholder="Observations lors de l'arrivée..."
              />
            </div>

            {data.signatureArrival ? (
              <div className="backdrop-blur-xl bg-white/50 border border-white/40 shadow-depth-lg rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">Signature d'arrivée</h3>
                  <button
                    onClick={() => setData({ ...data, signatureArrival: '' })}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all"
                  >
                    Modifier
                  </button>
                </div>
                <img
                  src={data.signatureArrival}
                  alt="Signature arrivée"
                  className="w-full border-2 border-slate-200 rounded-xl"
                />
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Nom complet du client (arrivée)
                  </label>
                  <input
                    type="text"
                    value={data.signatureArrivalName}
                    onChange={(e) => setData({ ...data, signatureArrivalName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl backdrop-blur-sm bg-white/70 border-2 border-white/40 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-lg"
                    placeholder="Prénom NOM (optionnel)"
                  />
                </div>
                <SignatureCanvas
                  onSave={(signature) => setData({ ...data, signatureArrival: signature })}
                />
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-6">
              Résumé de l'inspection
            </h2>

            <div className="backdrop-blur-xl bg-white/50 border border-white/40 shadow-depth-lg rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Informations du véhicule</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Marque</p>
                  <p className="font-bold text-slate-800">{data.vehicleBrand}</p>
                </div>
                <div>
                  <p className="text-slate-600">Modèle</p>
                  <p className="font-bold text-slate-800">{data.vehicleModel}</p>
                </div>
                <div>
                  <p className="text-slate-600">Immatriculation</p>
                  <p className="font-bold text-slate-800">{data.vehicleRegistration}</p>
                </div>
                <div>
                  <p className="text-slate-600">Type</p>
                  <p className="font-bold text-slate-800">{data.vehicleType}</p>
                </div>
                <div>
                  <p className="text-slate-600">Kilométrage départ</p>
                  <p className="font-bold text-slate-800">{data.kmStart} km</p>
                </div>
                <div>
                  <p className="text-slate-600">Carburant départ</p>
                  <p className="font-bold text-slate-800">{data.fuelLevelStart || 'Non renseigné'}</p>
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/50 border border-white/40 shadow-depth-lg rounded-2xl p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Défauts constatés</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Extérieur</p>
                  {data.exteriorDefects.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {data.exteriorDefects.map((defect, i) => (
                        <li key={i}>{defect}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Aucun défaut extérieur signalé</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Intérieur</p>
                  {data.interiorDefects.length > 0 ? (
                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                      {data.interiorDefects.map((defect, i) => (
                        <li key={i}>{defect}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Aucun défaut intérieur signalé</p>
                  )}
                </div>
              </div>
            </div>

            {data.signatureDeparture && (
              <div className="backdrop-blur-xl bg-white/50 border border-white/40 shadow-depth-lg rounded-2xl p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Signature de départ</h3>
                <img
                  src={data.signatureDeparture}
                  alt="Signature départ"
                  className="w-full max-w-md border-2 border-slate-200 rounded-xl"
                />
                <p className="text-sm text-slate-600 mt-4">
                  <strong>Signé par:</strong> {data.signatureDepartureName}
                </p>
              </div>
            )}

            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-8 h-8 text-teal-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Prêt à générer le rapport</h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Toutes les informations ont été collectées. Cliquez sur le bouton ci-dessous pour générer et télécharger le rapport PDF de l'inspection.
                  </p>
                  <button
                    onClick={generatePDF}
                    disabled={loading}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-5 h-5" />
                    {loading ? 'Génération en cours...' : 'Générer le rapport PDF'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen py-8 relative">
      {/* Modal de choix IA */}
      <AIChoiceModal
        isOpen={showAIChoice && !aiChoiceMade}
        onChoice={(useAI) => {
          setData({ ...data, useAI });
          setAiChoiceMade(true);
          setShowAIChoice(false);
        }}
        onClose={() => {
          setShowAIChoice(false);
          setAiChoiceMade(true);
        }}
      />

      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <button
            onClick={() => navigate('/missions')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour aux missions
          </button>

          <h1 className="text-4xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Wizard d'inspection
          </h1>
          <p className="text-slate-600">
            {savingDraft && (
              <span className="text-sm text-teal-600 font-semibold">Sauvegarde automatique...</span>
            )}
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/40 border border-white/40 shadow-depth-xl rounded-3xl p-8">
          <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} steps={STEPS} />

          {renderStep()}

          <div className="flex gap-4 mt-8">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Précédent
              </button>
            )}

            {currentStep < STEPS.length - 1 && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold transition-all ml-auto disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-teal-500/50"
              >
                Continuer
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
