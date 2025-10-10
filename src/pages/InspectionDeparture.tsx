import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check, AlertTriangle, Loader, CheckCircle, X, ArrowRight, Key, FileText, CreditCard, Fuel, Droplet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignatureCanvas from '../components/inspection/SignatureCanvas';
import { useInspectionPersistence } from '../hooks/useInspectionPersistence';
import AutoSaveIndicator from '../components/AutoSaveIndicator';
import InspectionSkeleton from '../components/InspectionSkeleton';
import { showToast } from '../components/Toast';

interface Mission {
  id: string;
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
}

interface PhotoStep {
  type: 'front' | 'back' | 'left_side' | 'right_side' | 'interior' | 'dashboard';
  label: string;
  instruction: string;
  url: string | null;
  file: File | null;
  validated: boolean;
}

export default function InspectionDeparture() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  const [fuelLevel, setFuelLevel] = useState('50');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState('good');
  const [notes, setNotes] = useState('');

  const [keysCount, setKeysCount] = useState(1);
  const [hasVehicleDocuments, setHasVehicleDocuments] = useState(false);
  const [hasRegistrationCard, setHasRegistrationCard] = useState(false);
  const [vehicleIsFull, setVehicleIsFull] = useState(false);
  const [windshieldCondition, setWindshieldCondition] = useState('bon');
  const [clientSignature, setClientSignature] = useState('');
  const [clientName, setClientName] = useState('');

  const [photoSteps, setPhotoSteps] = useState<PhotoStep[]>([
    {
      type: 'front',
      label: 'Vue avant',
      instruction: 'Positionnez le véhicule de face, centré dans le cadre',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'back',
      label: 'Vue arrière',
      instruction: 'Positionnez le véhicule de dos, centré dans le cadre',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'left_side',
      label: 'Côté gauche',
      instruction: 'Photographiez le côté gauche du véhicule en entier',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'right_side',
      label: 'Côté droit',
      instruction: 'Photographiez le côté droit du véhicule en entier',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'interior',
      label: 'Intérieur',
      instruction: 'Photographiez l\'habitacle et les sièges',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'dashboard',
      label: 'Tableau de bord',
      instruction: 'Photographiez le compteur et le kilométrage clairement visible',
      url: null,
      file: null,
      validated: false
    },
  ]);

  const inspectionState = {
    currentStep,
    fuelLevel,
    mileage,
    condition,
    notes,
    keysCount,
    hasVehicleDocuments,
    hasRegistrationCard,
    vehicleIsFull,
    windshieldCondition,
    clientName,
  };

  const { saveState, loadState, clearState, lastSaved, isSaving, saveError } = useInspectionPersistence(
    missionId,
    'departure',
    inspectionState,
    {
      onSave: () => showToast('success', 'Progression sauvegardée', 'Vos données sont en sécurité', 2000),
      onError: () => showToast('error', 'Erreur de sauvegarde', 'Veuillez réessayer'),
    }
  );

  useEffect(() => {
    loadMission();

    const savedState = loadState();
    if (savedState && window.confirm('Une inspection en cours a été trouvée. Voulez-vous la reprendre ?')) {
      setCurrentStep(savedState.currentStep || 0);
      setFuelLevel(savedState.fuelLevel || '50');
      setMileage(savedState.mileage || '');
      setCondition(savedState.condition || 'good');
      setNotes(savedState.notes || '');
      setKeysCount(savedState.keysCount || 1);
      setHasVehicleDocuments(savedState.hasVehicleDocuments || false);
      setHasRegistrationCard(savedState.hasRegistrationCard || false);
      setVehicleIsFull(savedState.vehicleIsFull || false);
      setWindshieldCondition(savedState.windshieldCondition || 'bon');
      setClientName(savedState.clientName || '');
    }
  }, [missionId]);

  const loadMission = async () => {
    if (!missionId || !user) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setMission(data);
    } catch (error) {
      console.error('Error loading mission:', error);
      alert('Erreur lors du chargement de la mission');
      navigate('/team-missions');
    } finally {
      setLoading(false);
    }
  };

  const validatePhoto = (file: File): Promise<{ valid: boolean; message?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onloadend = () => {
        img.src = reader.result as string;
      };

      img.onload = () => {
        if (img.width < 800 || img.height < 600) {
          resolve({ valid: false, message: 'Photo trop petite. Résolution minimale: 800x600' });
          return;
        }

        if (file.size < 50000) {
          resolve({ valid: false, message: 'Qualité insuffisante. La photo semble floue ou de mauvaise qualité.' });
          return;
        }

        resolve({ valid: true });
      };

      reader.readAsDataURL(file);
    });
  };

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = await validatePhoto(file);

    if (!validation.valid) {
      alert(validation.message);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const newSteps = [...photoSteps];
      newSteps[currentStep] = {
        ...newSteps[currentStep],
        url: reader.result as string,
        file,
        validated: true,
      };
      setPhotoSteps(newSteps);
    };
    reader.readAsDataURL(file);
  };

  const handleNextStep = () => {
    if (currentStep < photoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowDetailsForm(true);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRetakePhoto = () => {
    const newSteps = [...photoSteps];
    newSteps[currentStep] = {
      ...newSteps[currentStep],
      url: null,
      file: null,
      validated: false,
    };
    setPhotoSteps(newSteps);
  };

  const handleComplete = async () => {
    const photosNotTaken = photoSteps.filter(p => !p.validated).length;
    if (photosNotTaken > 0) {
      alert(`Il reste ${photosNotTaken} photo(s) à prendre`);
      return;
    }

    if (!confirm('Voulez-vous terminer cette inspection ?')) return;

    setSaving(true);
    try {
      const { data: inspection, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          mission_id: missionId,
          inspector_id: user!.id,
          inspection_type: 'departure',
          overall_condition: condition,
          fuel_level: parseInt(fuelLevel) || 50,
          mileage_km: parseInt(mileage) || 0,
          notes,
          keys_count: keysCount,
          has_vehicle_documents: hasVehicleDocuments,
          has_registration_card: hasRegistrationCard,
          vehicle_is_full: vehicleIsFull,
          windshield_condition: windshieldCondition,
          client_signature: clientSignature,
          client_name: clientName,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      for (const photo of photoSteps) {
        if (photo.file) {
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${inspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(filePath, photo.file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          await supabase.from('inspection_photos').insert({
            inspection_id: inspection.id,
            photo_type: photo.type,
            photo_url: urlData.publicUrl,
            uploaded_by: user!.id,
          });
        }
      }

      await supabase
        .from('missions')
        .update({ status: 'in_progress' })
        .eq('id', missionId);

      clearState();
      showToast('success', 'Inspection terminée !', 'L\'état des lieux a été finalisé avec succès');
      setTimeout(() => navigate('/team-missions'), 1500);
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      const errorMessage = error?.message || 'Une erreur est survenue lors de la finalisation';
      showToast('error', 'Erreur lors de la finalisation', errorMessage);
      setTimeout(() => navigate('/team-missions'), 2000);
    } finally {
      setSaving(false);
    }
  };

  const getCompletedPhotosCount = () => {
    return photoSteps.filter(p => p.validated).length;
  };

  const currentPhoto = photoSteps[currentStep];

  if (loading) {
    return <InspectionSkeleton />;
  }

  if (!mission) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-white">Mission introuvable</p>
      </div>
    );
  }

  if (showDetailsForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-6 shadow-xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setShowDetailsForm(false)}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux photos
            </button>
            <h1 className="text-2xl font-bold">Détails du véhicule</h1>
            <div className="w-32"></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Informations complémentaires</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Niveau de carburant (%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="text-center mt-2 text-2xl font-bold text-teal-400">{fuelLevel}%</div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Kilométrage
                </label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">
                  État général du véhicule
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'excellent', label: 'Excellent', color: 'green' },
                    { value: 'good', label: 'Bon', color: 'teal' },
                    { value: 'fair', label: 'Moyen', color: 'amber' },
                    { value: 'poor', label: 'Mauvais', color: 'red' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setCondition(item.value)}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                        condition === item.value
                          ? 'bg-teal-500 border-teal-400 text-white scale-105'
                          : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Notes et observations
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                  rows={4}
                  placeholder="Observations particulières, dommages visibles, etc..."
                />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Vérifications au départ</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Nombre de clés reçues
                </label>
                <input
                  type="number"
                  min="0"
                  value={keysCount}
                  onChange={(e) => setKeysCount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                  placeholder="1"
                />
              </div>

              <div className="space-y-3">
                <label
                  onClick={() => setHasVehicleDocuments(!hasVehicleDocuments)}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-600 rounded-xl cursor-pointer hover:bg-slate-700/50 transition"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${hasVehicleDocuments ? 'bg-teal-500 border-teal-500' : 'border-slate-500'}`}>
                    {hasVehicleDocuments && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <FileText className="w-5 h-5 text-teal-400" />
                  <span className="font-semibold">Documents de bord présents</span>
                </label>

                <label
                  onClick={() => setHasRegistrationCard(!hasRegistrationCard)}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-600 rounded-xl cursor-pointer hover:bg-slate-700/50 transition"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${hasRegistrationCard ? 'bg-teal-500 border-teal-500' : 'border-slate-500'}`}>
                    {hasRegistrationCard && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <CreditCard className="w-5 h-5 text-teal-400" />
                  <span className="font-semibold">Carte grise présente</span>
                </label>

                <label
                  onClick={() => setVehicleIsFull(!vehicleIsFull)}
                  className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-600 rounded-xl cursor-pointer hover:bg-slate-700/50 transition"
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${vehicleIsFull ? 'bg-teal-500 border-teal-500' : 'border-slate-500'}`}>
                    {vehicleIsFull && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <Fuel className="w-5 h-5 text-teal-400" />
                  <span className="font-semibold">Véhicule plein</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                  <Droplet className="w-4 h-4" />
                  État du pare-brise
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'bon', label: 'Bon' },
                    { value: 'impact', label: 'Impact' },
                    { value: 'fissure', label: 'Fissuré' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setWindshieldCondition(item.value)}
                      className={`px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
                        windshieldCondition === item.value
                          ? 'bg-teal-500 border-teal-400 text-white scale-105'
                          : 'bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Signature du client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nom complet du client
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Signature
                </label>
                <SignatureCanvas
                  value={clientSignature}
                  onChange={setClientSignature}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition shadow-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Enregistrement en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Terminer l'inspection
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 shadow-xl">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/team-missions')}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Annuler
            </button>
            <div className="text-center">
              <p className="text-sm opacity-90">Mission {mission.reference}</p>
              <p className="font-bold">{mission.vehicle_brand} {mission.vehicle_model}</p>
            </div>
            <div className="w-20"></div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span>Photo {currentStep + 1} sur {photoSteps.length}</span>
            <span className="font-bold">{getCompletedPhotosCount()}/{photoSteps.length} terminées</span>
          </div>

          <div className="w-full bg-slate-700/50 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-teal-400 to-cyan-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(getCompletedPhotosCount() / photoSteps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">{currentPhoto.label}</h1>
            <p className="text-slate-300 text-lg">{currentPhoto.instruction}</p>
          </div>

          <div className="relative">
            {!currentPhoto.validated ? (
              <div className="aspect-[4/3] bg-slate-800/50 border-4 border-dashed border-teal-500/50 rounded-2xl flex flex-col items-center justify-center gap-6 backdrop-blur">
                <div className="relative">
                  <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-3xl"></div>
                  <Camera className="w-24 h-24 text-teal-400 relative z-10" />
                </div>

                <div className="text-center space-y-4">
                  <p className="text-xl font-semibold">Positionnez le véhicule dans le cadre</p>
                  <p className="text-slate-400">Assurez-vous que l'éclairage est suffisant</p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl font-bold text-lg hover:from-teal-600 hover:to-cyan-600 transition shadow-xl flex items-center gap-3"
                >
                  <Camera className="w-6 h-6" />
                  Prendre la photo
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={currentPhoto.url!}
                    alt={currentPhoto.label}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-green-500 rounded-full p-2">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleRetakePhoto}
                    className="flex-1 px-6 py-3 bg-slate-700 border border-slate-600 rounded-xl font-semibold hover:bg-slate-600 transition"
                  >
                    Reprendre
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition flex items-center justify-center gap-2"
                  >
                    {currentStep === photoSteps.length - 1 ? 'Continuer' : 'Photo suivante'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {currentStep > 0 && !currentPhoto.validated && (
            <button
              onClick={handlePreviousStep}
              className="w-full px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Photo précédente
            </button>
          )}

          <div className="grid grid-cols-6 gap-2">
            {photoSteps.map((step, index) => (
              <button
                key={step.type}
                onClick={() => setCurrentStep(index)}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-all ${
                  index === currentStep
                    ? 'border-teal-500 bg-teal-500/20'
                    : step.validated
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-slate-600 bg-slate-800/50'
                }`}
              >
                {step.validated ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AutoSaveIndicator lastSaved={lastSaved} saving={isSaving} error={saveError} />
    </div>
  );
}
