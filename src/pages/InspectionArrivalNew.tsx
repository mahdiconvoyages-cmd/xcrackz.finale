import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignatureCanvas from '../components/inspection/SignatureCanvas';
import PhotoCard from '../components/inspection/PhotoCard';
import StepNavigation from '../components/inspection/StepNavigation';
import OptionalPhotos from '../components/inspection/OptionalPhotos';
import { showToast } from '../components/Toast';
import { compressImage } from '../utils/imageCompression';

interface Mission {
  id: string;
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
  vehicle_type: 'VL' | 'VU' | 'PL';
  has_restitution?: boolean;
}

interface PhotoData {
  type: 'front' | 'back' | 'left_front' | 'left_back' | 'right_front' | 'right_back' | 'interior' | 'dashboard' | 'delivery_receipt';
  label: string;
  url: string | null;
  file: File | null;
  captured: boolean;
}

export default function InspectionArrivalNew() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isRestitution = searchParams.get('restitution') === 'true';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhotoType, setCurrentPhotoType] = useState<string | null>(null);

  // États principaux
  const [mission, setMission] = useState<Mission | null>(null);
  const [departureInspection, setDepartureInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Photos obligatoires (UNIQUEMENT les 6 extérieures)
  const [photos, setPhotos] = useState<PhotoData[]>([
    { type: 'front', label: 'Face avant générale', url: null, file: null, captured: false },
    { type: 'back', label: 'Face arrière générale', url: null, file: null, captured: false },
    { type: 'left_front', label: 'Latéral gauche avant', url: null, file: null, captured: false },
    { type: 'left_back', label: 'Latéral gauche arrière', url: null, file: null, captured: false },
    { type: 'right_front', label: 'Latéral droit avant', url: null, file: null, captured: false },
    { type: 'right_back', label: 'Latéral droit arrière', url: null, file: null, captured: false },
  ]);

  // Photos optionnelles (intérieur, dashboard, PV - NON BLOQUANTES)
  const [optionalInteriorPhotos, setOptionalInteriorPhotos] = useState<PhotoData[]>([
    { type: 'interior', label: 'Intérieur', url: null, file: null, captured: false },
    { type: 'dashboard', label: 'Tableau de bord', url: null, file: null, captured: false },
    { type: 'delivery_receipt', label: 'PV de livraison/restitution', url: null, file: null, captured: false },
  ]);

  // Photos optionnelles (dommages supplémentaires)
  const [optionalPhotos, setOptionalPhotos] = useState<any[]>([]);

  // Formulaire
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('50');
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverSignature, setDriverSignature] = useState('');

  useEffect(() => {
    loadData();
  }, [missionId]);

  const loadData = async () => {
    if (!missionId || !user) return;

    try {
      const [missionResult, inspectionResult, existingArrivalResult] = await Promise.all([
        supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .single(),
        supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('mission_id', missionId)
          .eq('inspection_type', isRestitution ? 'restitution_departure' : 'departure')
          .maybeSingle(),
        supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('mission_id', missionId)
          .eq('inspection_type', isRestitution ? 'restitution_arrival' : 'arrival')
          .maybeSingle()
      ]);

      if (missionResult.error) throw missionResult.error;
      
      // 🔒 VÉRIFICATION: Bloquer si inspection d'arrivée déjà existe
      if (existingArrivalResult.data) {
        showToast('error', 'Doublon détecté', isRestitution ? 'Une inspection d\'arrivée restitution existe déjà' : 'Une inspection d\'arrivée existe déjà pour cette mission');
        navigate('/team-missions');
        return;
      }
      
      if (!inspectionResult.data) {
        showToast('error', isRestitution ? 'Inspection départ restitution manquante' : 'Inspection de départ manquante', isRestitution ? 'Veuillez d\'abord effectuer l\'inspection de départ restitution' : 'Veuillez d\'abord effectuer l\'inspection de départ');
        navigate('/team-missions');
        return;
      }

      setMission(missionResult.data);
      setDepartureInspection(inspectionResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('error', 'Erreur', 'Erreur lors du chargement des données');
      navigate('/team-missions');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (photoType: string) => {
    setCurrentPhotoType(photoType);
    fileInputRef.current?.click();
  };

  const handlePhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentPhotoType) return;

    // Validation basique
    if (file.size < 50000) {
      showToast('error', 'Photo invalide', 'La photo semble de mauvaise qualité');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      // Vérifier si c'est une photo extérieure ou intérieure
      const isExteriorPhoto = photos.some(p => p.type === currentPhotoType);
      const isInteriorPhoto = optionalInteriorPhotos.some(p => p.type === currentPhotoType);

      if (isExteriorPhoto) {
        setPhotos(prev => prev.map(p => 
          p.type === currentPhotoType 
            ? { ...p, url: reader.result as string, file, captured: true }
            : p
        ));
        const photoLabel = photos.find(p => p.type === currentPhotoType)?.label;
        showToast('success', 'Photo capturée', `${photoLabel} enregistrée`);
      } else if (isInteriorPhoto) {
        setOptionalInteriorPhotos(prev => prev.map(p => 
          p.type === currentPhotoType 
            ? { ...p, url: reader.result as string, file, captured: true }
            : p
        ));
        const photoLabel = optionalInteriorPhotos.find(p => p.type === currentPhotoType)?.label;
        showToast('success', 'Photo capturée', `${photoLabel} enregistrée (optionnelle)`);
      }
    };
    reader.readAsDataURL(file);

    // Reset
    setCurrentPhotoType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleComplete = async () => {
    if (!mission || !user) return;

    // Validation - UNIQUEMENT les 6 photos extérieures obligatoires
    if (currentStep === 1 && !photos.every(p => p.captured)) {
      showToast('error', 'Photos manquantes', 'Veuillez prendre toutes les photos extérieures (6 obligatoires)');
      return;
    }

    // Étape 2 : Photos intérieur/dashboard/PV optionnelles, seul le kilométrage est requis
    if (currentStep === 2 && !mileage) {
      showToast('error', 'Kilométrage requis', 'Veuillez renseigner le kilométrage actuel du véhicule');
      return;
    }

    if (currentStep === 3 && (!clientName || !clientSignature || !driverName || !driverSignature)) {
      showToast('error', 'Signatures requises', 'Veuillez renseigner les noms et signatures du client ET du convoyeur');
      return;
    }

    // Si on n'est pas à la dernière étape, on passe à la suivante
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Soumission finale
    setSaving(true);

    try {
      // 1. Créer l'inspection d'arrivée
      const { data: arrivalInspectionData, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          mission_id: missionId!,
          inspector_id: user.id,
          inspection_type: isRestitution ? 'restitution_arrival' : 'arrival',
          mileage_km: parseInt(mileage) || 0,
          fuel_level: parseInt(fuelLevel) || 0,
          notes: notes,
          client_name: clientName,
          client_signature: clientSignature,
          driver_name: driverName,
          driver_signature: driverSignature,
          status: 'completed',
          completed_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (inspectionError) {
        console.error('Erreur création inspection:', inspectionError);
        throw inspectionError;
      }
      
      const arrivalInspection = arrivalInspectionData as any;
      if (!arrivalInspection?.id) throw new Error('ID inspection non retourné');

      console.log('✅ Inspection arrivée créée:', arrivalInspection.id);

      // Helper: upload avec retry (réduit les erreurs 5xx/edge)
      const uploadWithRetry = async (bucket: string, path: string, file: File, attempts = 3): Promise<void> => {
        let lastErr: any = null;
        for (let i = 0; i < attempts; i++) {
          const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
          if (!error) return;
          lastErr = error;
          // 429/5xx -> attendre et réessayer
          await new Promise(res => setTimeout(res, 300 * (i + 1)));
        }
        throw lastErr;
      };

      // 2. Upload des photos obligatoires
      let uploadedCount = 0;

      for (const photo of photos) {
        if (!photo.file || !photo.captured) continue;

        try {
          // Compress image before upload (70-90% size reduction)
          const compressedFile = await compressImage(photo.file, { maxDimension: 1600, quality: 0.8 });
          const fileExt = compressedFile.name.split('.').pop();
          const fileName = `${arrivalInspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          // Upload vers Storage
          await uploadWithRetry('inspection-photos', filePath, compressedFile);

          // Récupérer URL publique
          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          // Enregistrer dans DB
          const { error: insertError } = await supabase.from('inspection_photos').insert({
            inspection_id: arrivalInspection.id,
            photo_type: photo.type,
            photo_url: urlData.publicUrl,
          } as any);

          if (insertError) throw insertError;
          uploadedCount++;

        } catch (error) {
          console.error(`Erreur upload ${photo.type}:`, error);
        }
      }

      // 3. Upload des photos intérieures optionnelles (intérieur, dashboard, PV)
      for (const photo of optionalInteriorPhotos) {
        if (!photo.file || !photo.captured) continue;

        try {
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${arrivalInspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          await uploadWithRetry('inspection-photos', filePath, photo.file);

          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          const { error: insertError } = await supabase.from('inspection_photos').insert({
            inspection_id: arrivalInspection.id,
            photo_type: photo.type,
            photo_url: urlData.publicUrl,
          } as any);

          if (insertError) throw insertError;
          uploadedCount++;
        } catch (error) {
          console.error(`Erreur upload ${photo.type} (optionnel):`, error);
        }
      }

      // 4. Upload des photos de dommages optionnelles
      for (const optPhoto of optionalPhotos) {
        if (!optPhoto.file) continue;
        try {
          const fileExt = optPhoto.file.name.split('.').pop();
          const fileName = `${arrivalInspection.id}-optional-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          await uploadWithRetry('inspection-photos', filePath, optPhoto.file);

          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          await supabase.from('inspection_photos').insert({
            inspection_id: arrivalInspection.id,
            photo_type: 'optional',
            photo_url: urlData.publicUrl,
            description: optPhoto.description || null
          } as any);

          uploadedCount++;
        } catch (error) {
          console.error('Erreur upload photo optionnelle:', error);
        }
      }

      console.log(`✅ ${uploadedCount} photos uploadées`);

      // 5. Mettre à jour le statut de la mission
      if (isRestitution) {
        // Restitution arrival = mission terminée
        try {
          const { error: updateErr } = await supabase
            .from('missions')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', missionId!);
          if (updateErr) console.warn('Erreur update mission completed:', updateErr);
        } catch (e) {
          console.warn('Exception update mission:', e);
        }
        showToast('success', 'Inspection complétée', `Restitution terminée avec ${uploadedCount} photos. Mission clôturée !`);
      } else {
        // Regular arrival - check if has_restitution
        const missionHasRestitution = mission?.has_restitution;
        if (!missionHasRestitution) {
          // No restitution -> complete mission
          const { data: completeRes, error: completeErr } = await (supabase as any).rpc('complete_mission', { p_mission_id: missionId });
          if (completeErr || ((completeRes as any) && (completeRes as any).ok === false)) {
            console.warn('Erreur complete_mission RPC, tentative fallback update:', completeErr || completeRes);
            try {
              const { error: fallbackErr } = await (supabase as any)
                .from('missions')
                .update({ status: 'completed' })
                .eq('id', missionId!);
              if (fallbackErr) console.warn('Fallback update missions échoué:', fallbackErr);
            } catch (e) {
              console.warn('Exception fallback update missions:', e);
            }
          }
          showToast('success', 'Inspection complétée', `Mission terminée avec ${uploadedCount} photos`);
        } else {
          // Has restitution -> don't complete, inform user
          showToast('success', 'Inspection d\'arrivée complétée', `${uploadedCount} photos enregistrées. La restitution reste à effectuer.`);
        }
      }
      
      // Redirection
      setTimeout(() => {
        navigate('/team-missions');
      }, 1500);

    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      showToast('error', 'Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const getStepPhotos = () => {
    if (currentStep === 1) return photos; // 6 extérieures obligatoires
    if (currentStep === 2) return optionalInteriorPhotos; // Intérieur optionnelles
    return [];
  };

  const getPhotoCount = (step: number) => {
    if (step === 1) return photos.filter(p => p.captured).length;
    if (step === 2) return optionalInteriorPhotos.filter(p => p.captured).length;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  if (!mission || !departureInspection) return null;

  return (
    <div className="min-h-screen bg-[#F0FDFA]">
      {/* Header */}
      <div className="bg-white border-b border-[#CCFBF1] px-4 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/team-missions')}
            className="p-2 hover:bg-[#F0FDFA] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#2D2A3E]" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#2D2A3E]">{isRestitution ? '🔄 Inspection Arrivée Restitution' : 'Inspection d\'arrivée'}</h1>
            <p className="text-sm text-gray-600">{mission.vehicle_brand} {mission.vehicle_model}</p>
          </div>
        </div>
      </div>

      {/* Navigation étapes */}
      <StepNavigation
        currentStep={currentStep}
        steps={[
          { number: 1, label: 'Extérieur', photoCount: getPhotoCount(1) },
          { number: 2, label: 'Intérieur + PV', photoCount: getPhotoCount(2) },
          { number: 3, label: 'Signature', photoCount: 0 }
        ]}
        onStepClick={(step) => setCurrentStep(step)}
      />

      {/* Contenu */}
      <div className="p-4 pb-24">
        {/* ÉTAPE 1: Photos extérieures */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#2D2A3E] mb-2">Photos obligatoires</h2>
              <p className="text-sm text-gray-600">* = obligatoire</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {getStepPhotos().map((photo) => (
                <PhotoCard
                  key={photo.type}
                  type={photo.type}
                  label={photo.label}
                  isRequired={true}
                  isCaptured={photo.captured}
                  vehicleType={mission?.vehicle_type || 'VL'}
                  onClick={() => handlePhotoClick(photo.type)}
                />
              ))}
            </div>

            <OptionalPhotos
              maxPhotos={10}
              onPhotosChange={setOptionalPhotos}
              existingPhotos={optionalPhotos}
            />
          </div>
        )}

        {/* ÉTAPE 2: Intérieur + Documents + État du véhicule */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#2D2A3E] mb-2">Intérieur & État du véhicule</h2>
              <p className="text-sm text-gray-600">Photos optionnelles et relevés obligatoires</p>
            </div>

            {/* Info photos optionnelles */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Photos optionnelles :</strong> Les photos intérieur, tableau de bord et PV ne sont pas obligatoires. Seuls le kilométrage et le carburant sont requis.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {getStepPhotos().map((photo) => (
                <PhotoCard
                  key={photo.type}
                  type={photo.type}
                  label={`${photo.label} (optionnel)`}
                  isRequired={false}
                  isCaptured={photo.captured}
                  vehicleType={mission?.vehicle_type || 'VL'}
                  onClick={() => handlePhotoClick(photo.type)}
                  instruction={photo.type === 'delivery_receipt' ? '📄 Photo du PV signé (optionnelle)' : undefined}
                />
              ))}
            </div>

            {/* Kilométrage et Carburant */}
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border-2 border-[#CCFBF1]">
              <h3 className="text-lg font-bold text-[#2D2A3E] mb-4">📊 État du véhicule à l'arrivée</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kilométrage */}
                <div>
                  <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                    🔢 Kilométrage actuel (km) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="Ex: 45000"
                    className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none text-lg"
                    required
                  />
                  {departureInspection?.mileage_km && (
                    <p className="text-xs text-gray-500 mt-1">
                      Départ: {departureInspection.mileage_km.toLocaleString()} km
                      {mileage && ` | Distance parcourue: ${(parseInt(mileage) - departureInspection.mileage_km).toLocaleString()} km`}
                    </p>
                  )}
                </div>

                {/* Niveau de carburant */}
                <div>
                  <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                    ⛽ Niveau de carburant
                  </label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={fuelLevel}
                      onChange={(e) => setFuelLevel(e.target.value)}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-[#14B8A6]">{fuelLevel}%</span>
                      {departureInspection?.fuel_level && (
                        <span className="text-xs text-gray-500">
                          Départ: {departureInspection.fuel_level}%
                          {` | Variation: ${parseInt(fuelLevel) - parseInt(departureInspection.fuel_level) >= 0 ? '+' : ''}${parseInt(fuelLevel) - parseInt(departureInspection.fuel_level)}%`}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Vide</span>
                      <span>Plein</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3: Signatures */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#2D2A3E] mb-2">Signatures</h2>
              <p className="text-sm text-gray-600">Validation destinataire et convoyeur</p>
            </div>

            {/* Signature Destinataire */}
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E] flex items-center gap-2">
                <span className="text-lg">📦</span> Destinataire
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Nom du destinataire <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom complet du destinataire"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Signature <span className="text-red-500">*</span>
                </label>
                <SignatureCanvas
                  onChange={setClientSignature}
                  value={clientSignature}
                />
              </div>
            </div>

            {/* Signature Convoyeur */}
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E] flex items-center gap-2">
                <span className="text-lg">🚗</span> Convoyeur
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Nom du convoyeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nom complet"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Signature <span className="text-red-500">*</span>
                </label>
                <SignatureCanvas
                  onChange={setDriverSignature}
                  value={driverSignature}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-[#CCFBF1]">
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Notes supplémentaires (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations, dommages constatés à l'arrivée, etc."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Boutons de navigation fixes */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CCFBF1] p-4 shadow-lg z-30">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="flex-1 py-3 px-6 rounded-lg border-2 border-[#14B8A6] text-[#14B8A6] font-semibold hover:bg-[#F0FDFA] transition-colors"
            >
              Étape précédente
            </button>
          )}
          <button
            onClick={handleComplete}
            disabled={saving}
            className="flex-1 py-3 px-6 rounded-lg bg-[#14B8A6] text-white font-semibold hover:bg-[#0D9488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : currentStep === 3 ? (
              'Signer et terminer'
            ) : (
              'Continuer'
            )}
          </button>
        </div>
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />
    </div>
  );
}
