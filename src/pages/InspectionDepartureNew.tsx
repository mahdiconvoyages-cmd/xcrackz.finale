import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignatureCanvas from '../components/inspection/SignatureCanvas';
import PhotoCard from '../components/inspection/PhotoCard';
import StepNavigation from '../components/inspection/StepNavigation';
import OptionalPhotos from '../components/inspection/OptionalPhotos';
import UnifiedDocumentScanner from '../components/inspection/UnifiedDocumentScanner';
import { showToast } from '../components/Toast';

interface Mission {
  id: string;
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
  vehicle_type: 'VL' | 'VU' | 'PL';
}

interface PhotoData {
  type: 'front' | 'back' | 'left_front' | 'left_back' | 'right_front' | 'right_back' | 'interior' | 'dashboard';
  label: string;
  url: string | null;
  file: File | null;
  captured: boolean;
}

export default function InspectionDepartureNew() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhotoType, setCurrentPhotoType] = useState<string | null>(null);

  // États principaux
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Photos obligatoires (8 photos: 6 extérieures + tableau de bord + intérieur)
  const [photos, setPhotos] = useState<PhotoData[]>([
    { type: 'front', label: 'Face avant générale', url: null, file: null, captured: false },
    { type: 'back', label: 'Face arrière générale', url: null, file: null, captured: false },
    { type: 'left_front', label: 'Latéral gauche avant', url: null, file: null, captured: false },
    { type: 'left_back', label: 'Latéral gauche arrière', url: null, file: null, captured: false },
    { type: 'right_front', label: 'Latéral droit avant', url: null, file: null, captured: false },
    { type: 'right_back', label: 'Latéral droit arrière', url: null, file: null, captured: false },
    { type: 'interior', label: 'Intérieur véhicule', url: null, file: null, captured: false },
    { type: 'dashboard', label: 'Tableau de bord', url: null, file: null, captured: false },
  ]);

  // Photos optionnelles (dommages supplémentaires - NON BLOQUANTES)
  const [optionalInteriorPhotos, setOptionalInteriorPhotos] = useState<PhotoData[]>([
    // Déplacé vers photos obligatoires (voir ci-dessus)
  ]);

  // Photos optionnelles (dommages supplémentaires)
  const [optionalPhotos, setOptionalPhotos] = useState<any[]>([]);

  // Formulaire étape 2
  const [fuelLevel, setFuelLevel] = useState('50');
  const [mileage, setMileage] = useState('');
  const [condition, setCondition] = useState('good');
  const [keysCount, setKeysCount] = useState(1);
  const [hasVehicleDocuments, setHasVehicleDocuments] = useState(false);
  const [hasRegistrationCard, setHasRegistrationCard] = useState(false);
  const [vehicleIsFull, setVehicleIsFull] = useState(false);
  const [windshieldCondition, setWindshieldCondition] = useState('bon');
  
  // Nouveaux champs
  const [externalCleanliness, setExternalCleanliness] = useState('propre');
  const [internalCleanliness, setInternalCleanliness] = useState('propre');
  const [hasSpareWheel, setHasSpareWheel] = useState(false);
  const [hasRepairKit, setHasRepairKit] = useState(false);
  
  // Conditions photos (séparées comme mobile)
  const [photoTime, setPhotoTime] = useState('jour');
  const [photoLocation, setPhotoLocation] = useState('parking');
  const [photoWeather, setPhotoWeather] = useState('beau-temps');

  // Formulaire étape 3 - Signatures
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverSignature, setDriverSignature] = useState('');

  // Scanner de documents
  const [showDocScanner, setShowDocScanner] = useState(false);
  const [scannerDocType, setScannerDocType] = useState<'registration' | 'insurance' | 'generic'>('registration');
  const [scannedDocs, setScannedDocs] = useState<{ type: string; file: File; preview: string }[]>([]);

  useEffect(() => {
    loadMission();
  }, [missionId]);

  const loadMission = async () => {
    if (!missionId || !user) return;

    try {
      const [missionResult, existingDepartureResult] = await Promise.all([
        supabase
          .from('missions')
          .select('*')
          .eq('id', missionId)
          .single(),
        supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('mission_id', missionId)
          .eq('inspection_type', 'departure')
          .maybeSingle()
      ]);

      if (missionResult.error) throw missionResult.error;
      
      // 🔒 VÉRIFICATION: Bloquer si inspection de départ déjà existe
      if (existingDepartureResult.data) {
        showToast('error', 'Doublon détecté', 'Une inspection de départ existe déjà pour cette mission');
        navigate('/team-missions');
        return;
      }
      
      setMission(missionResult.data);
    } catch (error) {
      console.error('Error loading mission:', error);
      showToast('error', 'Erreur', 'Erreur lors du chargement de la mission');
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

  const openDocScanner = (docType: 'registration' | 'insurance' | 'generic') => {
    setScannerDocType(docType);
    setShowDocScanner(true);
  };

  const handleDocScan = async (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setScannedDocs(prev => [
        ...prev,
        { 
          type: scannerDocType, 
          file, 
          preview: reader.result as string 
        }
      ]);
      showToast('success', 'Document scanné', `Document ${scannerDocType === 'registration' ? 'carte grise' : scannerDocType === 'insurance' ? 'd\'assurance' : ''} enregistré`);
    };
    reader.readAsDataURL(file);
    setShowDocScanner(false);
  };

  const removeScannedDoc = (index: number) => {
    setScannedDocs(prev => prev.filter((_, i) => i !== index));
    showToast('info', 'Document supprimé', 'Le document a été retiré');
  };

  const handleComplete = async () => {
    if (!mission || !user) return;

    // Validation - 8 photos obligatoires (6 extérieures + tableau de bord + intérieur)
    if (currentStep === 1 && !photos.every(p => p.captured)) {
      showToast('error', 'Photos manquantes', 'Veuillez prendre toutes les photos obligatoires (8 photos: 6 extérieures + tableau de bord + intérieur)');
      return;
    }

    // Étape 2 : Validation kilométrage
    if (currentStep === 2 && !mileage) {
      showToast('error', 'Champ requis', 'Veuillez saisir le kilométrage');
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
      // 1. Créer l'inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          mission_id: missionId!,
          inspector_id: user.id,
          inspection_type: 'departure',
          overall_condition: condition,
          fuel_level: parseInt(fuelLevel),
          mileage_km: parseInt(mileage),
          notes: notes,
          keys_count: keysCount,
          has_vehicle_documents: hasVehicleDocuments,
          has_registration_card: hasRegistrationCard,
          vehicle_is_full: vehicleIsFull,
          windshield_condition: windshieldCondition,
          external_cleanliness: externalCleanliness,
          internal_cleanliness: internalCleanliness,
          has_spare_wheel: hasSpareWheel,
          has_repair_kit: hasRepairKit,
          photo_time: photoTime,
          photo_location: photoLocation,
          photo_weather: photoWeather,
          client_name: clientName,
          client_signature: clientSignature,
          driver_name: driverName,
          driver_signature: driverSignature,
          status: 'completed',
          completed_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (inspectionError) throw inspectionError;
      
      const createdInspection = inspection as any;
      if (!createdInspection?.id) throw new Error('ID inspection non retourné');

      console.log('✅ Inspection créée:', createdInspection.id);

      // 2. Upload des photos obligatoires
      let uploadedCount = 0;

      for (const photo of photos) {
        if (!photo.file || !photo.captured) continue;

        try {
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${createdInspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          // Upload vers Storage
          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(filePath, photo.file);

          if (uploadError) throw uploadError;

          // Récupérer URL publique
          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          // Enregistrer dans DB
          const { error: insertError } = await supabase.from('inspection_photos').insert({
            inspection_id: createdInspection.id,
            photo_type: photo.type,
            photo_url: urlData.publicUrl,
          } as any);

          if (insertError) throw insertError;
          uploadedCount++;

        } catch (error) {
          console.error(`Erreur upload ${photo.type}:`, error);
        }
      }

      // 3. Upload des photos intérieures optionnelles
      for (const photo of optionalInteriorPhotos) {
        if (!photo.file || !photo.captured) continue;

        try {
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${createdInspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(filePath, photo.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          const { error: insertError } = await supabase.from('inspection_photos').insert({
            inspection_id: createdInspection.id,
            photo_type: photo.type,
            photo_url: urlData.publicUrl,
            description: null
          } as any);

          if (insertError) throw insertError;
          uploadedCount++;
        } catch (error) {
          console.error(`Erreur upload ${photo.type} (optionnel):`, error);
        }
      }

      // 4. Upload des photos de dommages optionnelles
      for (const optPhoto of optionalPhotos) {
        try {
          const fileExt = optPhoto.file.name.split('.').pop();
          const fileName = `${createdInspection.id}-optional-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(filePath, optPhoto.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);

          await supabase.from('inspection_photos').insert({
            inspection_id: createdInspection.id,
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
      await supabase
        .from('missions')
        .update({ status: 'in_progress' } as any)
        .eq('id', missionId!);

      showToast('success', 'Inspection complétée', `${uploadedCount} photos enregistrées avec succès`);
      
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
    if (currentStep === 1) return photos; // 8 photos obligatoires (6 ext + intérieur + dashboard)
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

  if (!mission) return null;

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
            <h1 className="text-lg font-bold text-[#2D2A3E]">Inspection de départ</h1>
            <p className="text-sm text-gray-600">{mission.vehicle_brand} {mission.vehicle_model}</p>
          </div>
        </div>
      </div>

      {/* Navigation étapes */}
      <StepNavigation
        currentStep={currentStep}
        steps={[
          { number: 1, label: 'Extérieur', photoCount: getPhotoCount(1) },
          { number: 2, label: 'Intérieur', photoCount: getPhotoCount(2) },
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
              <h2 className="text-xl font-bold text-[#2D2A3E] mb-2">Photos obligatoires (8)</h2>
              <p className="text-sm text-gray-600">6 vues extérieures + tableau de bord + intérieur</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
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

        {/* ÉTAPE 2: Détails & dommages */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#2D2A3E] mb-2">Détails du véhicule & dommages</h2>
              <p className="text-sm text-gray-600">Informations complémentaires et photos de dommages (optionnelles)</p>
            </div>

            {/* Photos dommages OPTIONNELLES */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Photos de dommages :</strong> Ajoutez des photos supplémentaires si le véhicule présente des dommages particuliers.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {getStepPhotos().map((photo) => (
                <PhotoCard
                  key={photo.type}
                  type={photo.type}
                  label={`${photo.label} (optionnel)`}
                  isRequired={false}
                  isCaptured={photo.captured}
                  vehicleType={mission?.vehicle_type || 'VL'}
                  onClick={() => handlePhotoClick(photo.type)}
                />
              ))}
            </div>

            {/* Formulaire état véhicule */}
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E]">État du véhicule</h3>

              {/* Kilométrage */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Kilométrage <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="Ex: 125000"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Niveau carburant */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Niveau de carburant: {fuelLevel}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* État général */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  État général
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                >
                  <option value="good">Bon</option>
                  <option value="average">Moyen</option>
                  <option value="poor">Mauvais</option>
                </select>
              </div>

              {/* Nombre de clés */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Nombre de clés
                </label>
                <input
                  type="number"
                  min="0"
                  value={keysCount}
                  onChange={(e) => setKeysCount(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasVehicleDocuments}
                    onChange={(e) => setHasVehicleDocuments(e.target.checked)}
                    className="w-5 h-5 text-[#14B8A6] rounded"
                  />
                  <span className="text-sm text-[#2D2A3E]">Documents de bord présents</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasRegistrationCard}
                    onChange={(e) => setHasRegistrationCard(e.target.checked)}
                    className="w-5 h-5 text-[#14B8A6] rounded"
                  />
                  <span className="text-sm text-[#2D2A3E]">Carte grise présente</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={vehicleIsFull}
                    onChange={(e) => setVehicleIsFull(e.target.checked)}
                    className="w-5 h-5 text-[#14B8A6] rounded"
                  />
                  <span className="text-sm text-[#2D2A3E]">Véhicule chargé</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasSpareWheel}
                    onChange={(e) => setHasSpareWheel(e.target.checked)}
                    className="w-5 h-5 text-[#14B8A6] rounded"
                  />
                  <span className="text-sm text-[#2D2A3E]">Roue de secours présente</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={hasRepairKit}
                    onChange={(e) => setHasRepairKit(e.target.checked)}
                    className="w-5 h-5 text-[#14B8A6] rounded"
                  />
                  <span className="text-sm text-[#2D2A3E]">Kit de réparation présent</span>
                </label>
              </div>

              {/* Scanner de documents */}
              <div className="bg-gradient-to-r from-[#F0FDFA] to-[#ECFDF5] rounded-lg p-4 border-2 border-[#CCFBF1]">
                <h4 className="font-semibold text-[#2D2A3E] mb-3 flex items-center gap-2">
                  📸 Scanner les documents
                  <span className="text-xs font-normal text-gray-500">(optionnel)</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => openDocScanner('registration')}
                    className="bg-white hover:bg-[#F0FDFA] border-2 border-[#14B8A6] text-[#2D2A3E] px-4 py-3 rounded-lg font-medium transition-colors text-sm"
                  >
                    📄 Carte Grise
                  </button>
                  <button
                    type="button"
                    onClick={() => openDocScanner('insurance')}
                    className="bg-white hover:bg-[#F0FDFA] border-2 border-[#14B8A6] text-[#2D2A3E] px-4 py-3 rounded-lg font-medium transition-colors text-sm"
                  >
                    🛡️ Assurance
                  </button>
                </div>

                {/* Documents scannés */}
                {scannedDocs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-medium text-gray-600">Documents scannés:</p>
                    {scannedDocs.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-[#CCFBF1]">
                        <img src={doc.preview} alt="Document" className="w-12 h-12 object-cover rounded" />
                        <span className="text-xs flex-1">
                          {doc.type === 'registration' ? '📄 Carte Grise' : 
                           doc.type === 'insurance' ? '🛡️ Assurance' : '📝 Document'}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeScannedDoc(index)}
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Propreté externe */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Propreté externe
                </label>
                <select
                  value={externalCleanliness}
                  onChange={(e) => setExternalCleanliness(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                >
                  <option value="tres-propre">Très propre</option>
                  <option value="propre">Propre</option>
                  <option value="moyen">Moyen</option>
                  <option value="sale">Sale</option>
                  <option value="tres-sale">Très sale</option>
                </select>
              </div>

              {/* Propreté interne */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Propreté interne
                </label>
                <select
                  value={internalCleanliness}
                  onChange={(e) => setInternalCleanliness(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                >
                  <option value="tres-propre">Très propre</option>
                  <option value="propre">Propre</option>
                  <option value="moyen">Moyen</option>
                  <option value="sale">Sale</option>
                  <option value="tres-sale">Très sale</option>
                </select>
              </div>

              {/* Conditions de prise de photo */}
              <div className="bg-[#F0FDFA] rounded-lg p-4 border-2 border-[#CCFBF1]">
                <h4 className="font-semibold text-[#2D2A3E] mb-3">📸 Conditions de prise de photos</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[#2D2A3E] mb-1">
                      Moment
                    </label>
                    <select
                      value={photoTime}
                      onChange={(e) => setPhotoTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none text-sm"
                    >
                      <option value="jour">Jour</option>
                      <option value="nuit">Nuit</option>
                      <option value="aube-crepuscule">Aube/Crépuscule</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2D2A3E] mb-1">
                      Lieu
                    </label>
                    <select
                      value={photoLocation}
                      onChange={(e) => setPhotoLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none text-sm"
                    >
                      <option value="parking">Parking</option>
                      <option value="interieur">Intérieur/Garage</option>
                      <option value="exterieur">Extérieur/Rue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2D2A3E] mb-1">
                      Météo
                    </label>
                    <select
                      value={photoWeather}
                      onChange={(e) => setPhotoWeather(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none text-sm"
                    >
                      <option value="beau-temps">Beau temps</option>
                      <option value="nuageux">Nuageux</option>
                      <option value="pluie">Pluie</option>
                      <option value="neige">Neige</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* État pare-brise */}
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  État du pare-brise
                </label>
                <select
                  value={windshieldCondition}
                  onChange={(e) => setWindshieldCondition(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                >
                  <option value="bon">Bon</option>
                  <option value="fissuré">Fissuré</option>
                  <option value="cassé">Cassé</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3: Signatures */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-[#2D2A3E] mb-2">Signatures</h2>
              <p className="text-sm text-gray-600">Validation client et convoyeur</p>
            </div>

            {/* Signature Client */}
            <div className="bg-white rounded-xl p-6 space-y-4 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E] flex items-center gap-2">
                <span className="text-lg">👤</span> Client
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Nom du client <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nom complet"
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
                  placeholder="Observations, dommages constatés, etc."
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
      {/* Scanner de documents modal */}
      {showDocScanner && (
        <UnifiedDocumentScanner
          onCapture={handleDocScan}
          onCancel={() => setShowDocScanner(false)}
          documentType={scannerDocType}
          title={`Scanner ${scannerDocType === 'registration' ? 'la Carte Grise' : scannerDocType === 'insurance' ? 'l\'Assurance' : 'le Document'}`}
          userId={user?.id}
        />
      )}
    </div>
  );
}
