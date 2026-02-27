import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader, Camera, CheckCircle, AlertCircle, Link, Copy, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SignatureCanvas from '../components/inspection/SignatureCanvas';
import UnifiedDocumentScanner from '../components/inspection/UnifiedDocumentScanner';
import { uploadInspectionDocument } from '../services/inspectionDocumentsService';
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
}

interface PhotoGuide {
  type: string;
  label: string;
  description: string;
  icon: string;
  guideImage: string;
}

interface PhotoData {
  type: string;
  label: string;
  url: string | null;
  file: File | null;
  captured: boolean;
  damageState: 'RAS' | 'Rayures' | 'Cassé' | 'Abimé';
  damageComment: string;
}

// 8 photos obligatoires avec images de guidance dynamiques
const REQUIRED_PHOTOS: PhotoGuide[] = [
  { type: 'front', label: 'Face avant générale', description: 'Vue complète de l\'avant', icon: '🚗', guideImage: '' },
  { type: 'left_front', label: 'Latéral gauche avant', description: 'Côté gauche avant', icon: '↖️', guideImage: '' },
  { type: 'left_back', label: 'Latéral gauche arrière', description: 'Côté gauche arrière', icon: '↙️', guideImage: '' },
  { type: 'back', label: 'Face arrière générale', description: 'Vue complète de l\'arrière', icon: '🚙', guideImage: '' },
  { type: 'right_back', label: 'Latéral droit arrière', description: 'Côté droit arrière', icon: '↘️', guideImage: '' },
  { type: 'right_front', label: 'Latéral droit avant', description: 'Côté droit avant', icon: '↗️', guideImage: '' },
  { type: 'interior_front', label: 'Intérieur avant', description: 'Vue intérieure avant', icon: '🪟', guideImage: '' },
  { type: 'interior_back', label: 'Intérieur arrière', description: 'Vue intérieure arrière', icon: '🪟', guideImage: '' },
];

// Fonction pour obtenir l'image de guidance selon le type de véhicule
const getGuideImage = (photoType: string, vehicleType: 'VL' | 'VU' | 'PL'): string => {
  // Images universelles pour l'intérieur et le dashboard
  if (photoType === 'interior_front') {
    return '/assets/vehicles/interieur_avant.png';
  }
  if (photoType === 'interior_back') {
    return '/assets/vehicles/interieur_arriere.png';
  }
  if (photoType === 'dashboard') {
    return '/assets/vehicles/tableau_de_bord.png';
  }

  // Images spécifiques par type de véhicule
  const imageMap: Record<'VL' | 'VU' | 'PL', Record<string, string>> = {
    VL: {
      front: '/assets/vehicles/avant.png',
      left_front: '/assets/vehicles/lateral gauche avant.png',
      left_back: '/assets/vehicles/laterale gauche arriere.png',
      back: '/assets/vehicles/arriere.png',
      right_back: '/assets/vehicles/lateral droit arriere.png',
      right_front: '/assets/vehicles/lateraldroit avant.png',
    },
    VU: {
      front: '/assets/vehicles/master avant.png',
      left_front: '/assets/vehicles/master avg (1).png',
      left_back: '/assets/vehicles/master laterak gauche arriere.png',
      back: '/assets/vehicles/master avg (2).png',
      right_back: '/assets/vehicles/master lateral droit arriere.png',
      right_front: '/assets/vehicles/master avg (1).png',
    },
    PL: {
      front: '/assets/vehicles/scania-avant.png',
      left_front: '/assets/vehicles/scania-lateral-gauche-avant.png',
      left_back: '/assets/vehicles/scania-lateral-gauche-arriere.png',
      back: '/assets/vehicles/scania-arriere.png',
      right_back: '/assets/vehicles/scania-lateral-droit-arriere.png',
      right_front: '/assets/vehicles/scania-lateral-droit-avant.png',
    },
  };

  return imageMap[vehicleType]?.[photoType] || '';
};

export default function InspectionDeparturePerfect() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isRestitution = searchParams.get('restitution') === 'true';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhotoType, setCurrentPhotoType] = useState<string | null>(null);

  // États principaux
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // ÉTAPE 1: Dashboard photo + Kilométrage + Niveau carburant
  const [dashboardPhoto, setDashboardPhoto] = useState<PhotoData>({
    type: 'dashboard',
    label: 'Tableau de bord',
    url: null,
    file: null,
    captured: false,
    damageState: 'RAS',
    damageComment: ''
  });
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('50');

  // ÉTAPE 2: 8 photos obligatoires avec état de dommage + 10 photos optionnelles progressives
  const [requiredPhotos, setRequiredPhotos] = useState<PhotoData[]>([]);
  const [optionalPhotos, setOptionalPhotos] = useState<PhotoData[]>([]);
  const [visibleOptionalCount, setVisibleOptionalCount] = useState(3);

  // ÉTAPE 3: Checklist (état véhicule, clés, équipements, objet confié)
  const [vehicleCondition, setVehicleCondition] = useState<'good' | 'average' | 'poor'>('good');
  const [keysCount, setKeysCount] = useState(0);
  const [hasSecurityKit, setHasSecurityKit] = useState(false);
  const [hasSpareWheel, setHasSpareWheel] = useState(false);
  const [hasInflationKit, setHasInflationKit] = useState(false);
  const [hasFuelCard, setHasFuelCard] = useState(false);
  const [isVehicleLoaded, setIsVehicleLoaded] = useState(false);
  const [loadedVehiclePhoto, setLoadedVehiclePhoto] = useState<PhotoData>({
    type: 'loaded_vehicle',
    label: 'Photo véhicule chargé',
    url: null,
    file: null,
    captured: false,
    damageState: 'RAS',
    damageComment: ''
  });
  const [hasConfidedObject, setHasConfidedObject] = useState(false);
  const [confidedObjectDescription, setConfidedObjectDescription] = useState('');

  // ÉTAPE 4: Signatures (client + convoyeur auto-chargé)
  const [clientName, setClientName] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverSignature, setDriverSignature] = useState('');
  const [notes, setNotes] = useState('');

  // ÉTAPE 5: Scanner de documents
  const [showDocScanner, setShowDocScanner] = useState(false);
  const [scannerDocType, setScannerDocType] = useState<'registration' | 'insurance' | 'generic'>('registration');
  const [scannedDocs, setScannedDocs] = useState<{ type: string; file: File; preview: string }[]>([]);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareToken, setShareToken] = useState('');

  // Chargement initial
  useEffect(() => {
    loadMission();
  }, [missionId]);

  // Initialiser les photos obligatoires avec images de guidance
  useEffect(() => {
    if (mission?.vehicle_type) {
      const photos = REQUIRED_PHOTOS.map(guide => ({
        type: guide.type,
        label: guide.label,
        url: null,
        file: null,
        captured: false,
        damageState: 'RAS' as const,
        damageComment: '',
      }));
      setRequiredPhotos(photos);

      // Initialiser 10 photos optionnelles
      const optional = Array.from({ length: 10 }, (_, i) => ({
        type: `optional_${i + 1}`,
        label: `Dommage supplémentaire ${i + 1}`,
        url: null,
        file: null,
        captured: false,
        damageState: 'RAS' as const,
        damageComment: '',
      }));
      setOptionalPhotos(optional);
    }
  }, [mission?.vehicle_type]);

  // Charger nom du convoyeur automatiquement
  useEffect(() => {
    if (user?.id) {
      loadDriverName();
    }
  }, [user?.id]);

  const loadMission = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('id, reference, vehicle_brand, vehicle_model, vehicle_plate, pickup_address, delivery_address, vehicle_type')
        .eq('id', missionId)
        .single();

      if (error) throw error;
      setMission(data);
    } catch (error) {
      console.error('Erreur chargement mission:', error);
      showToast('error', 'Erreur', 'Impossible de charger la mission');
    } finally {
      setLoading(false);
    }
  };

  const loadDriverName = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      if (data?.full_name) {
        setDriverName(data.full_name);
      }
    } catch (error) {
      console.error('Erreur chargement nom convoyeur:', error);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPhotoType) return;

    const imageUrl = URL.createObjectURL(file);

    if (currentPhotoType === 'dashboard') {
      setDashboardPhoto(prev => ({ ...prev, file, url: imageUrl, captured: true }));
      showToast('success', 'Photo capturée', 'Photo du tableau de bord enregistrée');
    } else if (currentPhotoType === 'loaded_vehicle') {
      setLoadedVehiclePhoto(prev => ({ ...prev, file, url: imageUrl, captured: true }));
      showToast('success', 'Photo capturée', 'Photo du véhicule chargé enregistrée');
    } else if (currentPhotoType.startsWith('optional_')) {
      setOptionalPhotos(prev =>
        prev.map(p => p.type === currentPhotoType ? { ...p, file, url: imageUrl, captured: true } : p)
      );
      
      // Révéler progressivement les photos optionnelles (max 10)
      const capturedOptional = optionalPhotos.filter(p => p.captured).length + 1;
      if (capturedOptional >= visibleOptionalCount && visibleOptionalCount < 10) {
        setVisibleOptionalCount(prev => Math.min(prev + 1, 10));
      }
      
      showToast('success', 'Photo capturée', 'Photo de dommage ajoutée');
    } else {
      setRequiredPhotos(prev =>
        prev.map(p => p.type === currentPhotoType ? { ...p, file, url: imageUrl, captured: true } : p)
      );
      showToast('success', 'Photo capturée', 'Photo obligatoire enregistrée');
    }

    setCurrentPhotoType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openCamera = (photoType: string) => {
    setCurrentPhotoType(photoType);
    fileInputRef.current?.click();
  };

  const handleDocScan = async (file: File, imageUrl: string) => {
    if (!missionId || !user?.id) return;

    const uploaded = await uploadInspectionDocument(
      file,
      user.id,
      {
        documentType: scannerDocType,
        title: `Document ${scannerDocType} - ${new Date().toLocaleDateString()}`
      }
    );

    if (uploaded) {
      setScannedDocs(prev => [...prev, { type: scannerDocType, file, preview: imageUrl }]);
      showToast('success', 'Document scanné', `Document enregistré avec succès`);
    } else {
      showToast('error', 'Erreur', 'Impossible d\'enregistrer le document');
    }
    setShowDocScanner(false);
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!dashboardPhoto.captured) {
          showToast('error', 'Photo manquante', 'Veuillez prendre la photo du tableau de bord');
          return false;
        }
        if (!mileage || parseInt(mileage) <= 0) {
          showToast('error', 'Kilométrage requis', 'Veuillez saisir un kilométrage valide');
          return false;
        }
        return true;

      case 2:
        const missingPhotos = requiredPhotos.filter(p => !p.captured);
        if (missingPhotos.length > 0) {
          showToast('error', 'Photos manquantes', `Il manque ${missingPhotos.length} photo(s) obligatoire(s)`);
          return false;
        }
        // Vérifier que chaque dommage ≠ RAS a un commentaire obligatoire
        for (const photo of requiredPhotos) {
          if (photo.damageState !== 'RAS' && !photo.damageComment.trim()) {
            showToast('error', 'Commentaire requis', `Veuillez décrire le dommage pour "${photo.label}"`);
            return false;
          }
        }
        // Vérifier les photos optionnelles avec dommage
        for (const photo of optionalPhotos) {
          if (photo.captured && photo.damageState !== 'RAS' && !photo.damageComment.trim()) {
            showToast('error', 'Commentaire requis', `Veuillez décrire le dommage pour "${photo.label}"`);
            return false;
          }
        }
        return true;

      case 3:
        // Si véhicule chargé, photo obligatoire
        if (isVehicleLoaded && !loadedVehiclePhoto.captured) {
          showToast('error', 'Photo requise', 'Veuillez prendre une photo du véhicule chargé');
          return false;
        }
        return true;

      case 4:
        if (!clientName.trim()) {
          showToast('error', 'Nom client requis', 'Veuillez saisir le nom du client');
          return false;
        }
        if (!clientSignature) {
          showToast('error', 'Signature client requise', 'Veuillez faire signer le client');
          return false;
        }
        if (!driverName.trim()) {
          showToast('error', 'Nom convoyeur requis', 'Veuillez saisir le nom du convoyeur');
          return false;
        }
        if (!driverSignature) {
          showToast('error', 'Signature convoyeur requise', 'Veuillez signer');
          return false;
        }
        return true;

      case 5:
        // Documents optionnels
        return true;

      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (!validateStep()) return;

    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplete = async () => {
    if (!validateStep() || !mission || !user) return;

    setSaving(true);

    try {
      // 1. Créer l'inspection
      const { data: inspection, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          mission_id: missionId!,
          inspector_id: user.id,
          inspection_type: isRestitution ? 'restitution_departure' : 'departure',
          overall_condition: vehicleCondition,
          fuel_level: parseInt(fuelLevel),
          mileage_km: parseInt(mileage),
          notes: notes,
          vehicle_info: {
            keys_count: keysCount,
            has_security_kit: hasSecurityKit,
            has_spare_wheel: hasSpareWheel,
            has_inflation_kit: hasInflationKit,
            has_fuel_card: hasFuelCard,
            is_loaded: isVehicleLoaded,
            has_loaded_photo: loadedVehiclePhoto.captured,
            has_confided_object: hasConfidedObject,
            confided_object_description: hasConfidedObject ? confidedObjectDescription : null,
          },
          client_name: clientName,
          client_signature: clientSignature,
          driver_name: driverName,
          driver_signature: driverSignature,
          status: 'completed',
          completed_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (inspectionError) throw inspectionError;

      const createdInspection = inspection as any;
      if (!createdInspection?.id) throw new Error('ID inspection non retourné');

      console.log('✅ Inspection créée:', createdInspection.id);

      // 2. Upload photo dashboard
      if (dashboardPhoto.file && dashboardPhoto.captured) {
        await uploadPhoto(createdInspection.id, dashboardPhoto);
      }

      // 2b. Upload photo véhicule chargé
      if (loadedVehiclePhoto.file && loadedVehiclePhoto.captured) {
        await uploadPhoto(createdInspection.id, loadedVehiclePhoto);
      }

      // 3. Upload photos obligatoires
      for (const photo of requiredPhotos) {
        if (photo.file && photo.captured) {
          await uploadPhoto(createdInspection.id, photo);
        }
      }

      // 4. Upload photos optionnelles
      for (const photo of optionalPhotos) {
        if (photo.file && photo.captured) {
          await uploadPhoto(createdInspection.id, photo);
        }
      }

      // 5. Mettre à jour le statut de la mission (seulement pour départ normal, pas restitution)
      if (!isRestitution) {
        await supabase
          .from('missions')
          .update({ 
            status: 'in_progress',
            departure_inspection_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', missionId);
      }

      // 6. Créer le token de partage dans inspection_report_shares
      const token = `${Date.now().toString(36)}${user.id.substring(0, 8)}`;
      await supabase.from('inspection_report_shares').upsert({
        mission_id: missionId!,
        share_token: token,
        user_id: user.id,
        report_type: isRestitution ? 'restitution_departure' : 'departure',
        is_active: true,
      } as any, { onConflict: 'mission_id,report_type' });

      showToast('success', 'Inspection terminée', isRestitution ? 'L\'inspection de départ restitution a été enregistrée' : 'L\'inspection de départ a été enregistrée avec succès');
      
      // Afficher le dialogue de partage du rapport
      setShareToken(token);
      setShowShareDialog(true);

    } catch (error: any) {
      console.error('Erreur sauvegarde inspection:', error);
      showToast('error', 'Erreur', error.message || 'Impossible de sauvegarder l\'inspection');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (inspectionId: string, photo: PhotoData) => {
    try {
      // Compress image before upload (70-90% size reduction)
      const compressedFile = await compressImage(photo.file!, { maxDimension: 1600, quality: 0.8 });
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${inspectionId}-${photo.type}-${Date.now()}.${fileExt}`;
      const filePath = `inspections/${fileName}`;

      // Upload vers Storage
      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      // Récupérer URL publique
      const { data: urlData } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filePath);

      // Enregistrer dans inspection_photos_v2 (identique au Flutter)
      await supabase.from('inspection_photos_v2').insert({
        inspection_id: inspectionId,
        photo_type: photo.type,
        full_url: urlData.publicUrl,
        damage_status: photo.damageState,
        damage_comment: (photo.damageState !== 'RAS' && photo.damageComment.trim()) ? photo.damageComment : null,
        taken_at: new Date().toISOString(),
      } as any);

    } catch (error) {
      console.error(`Erreur upload ${photo.type}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Mission introuvable</p>
      </div>
    );
  }

  const stepLabels = ['Compteur', 'Photos', 'Checklist', 'Signatures', 'Documents'];
  const stepDescriptions = [
    'Kilométrage, carburant, tableau de bord',
    'Capturez les 8 vues requises du véhicule',
    'Checklist complète de l\'inspection',
    'Signatures convoyeur et client',
    'Scanner les documents nécessaires',
  ];

  return (
    <div className="min-h-screen bg-[#F0FDFA] pb-32">
      {/* Header fixe avec gradient */}
      <div className="fixed top-0 left-0 right-0 z-20">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-[#14B8A6] to-[#0D9488] px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/missions/${missionId}`)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold text-white">{isRestitution ? 'Inspection Départ Restitution' : 'Inspection de départ'}</h1>
            </div>
            <div className="w-9" />
          </div>
        </div>

        {/* Progress indicator card */}
        <div className="bg-white px-6 py-4 shadow-md">
          {/* Segmented progress bars */}
          <div className="flex gap-1.5 mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex-1 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    step <= currentStep
                      ? 'bg-gradient-to-r from-[#14B8A6] to-[#0D9488]'
                      : 'bg-gray-200'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Step badge + label */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#14B8A6] to-[#0D9488] flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">{currentStep}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#2D2A3E] text-[15px]">Étape {currentStep}: {stepLabels[currentStep - 1]}</p>
              <p className="text-xs text-gray-500">{stepDescriptions[currentStep - 1]}</p>
            </div>
            <span className="text-[#14B8A6] font-bold text-sm">{currentStep}/5</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="pt-40 px-4 pb-6">
        {/* ÉTAPE 1: Dashboard + KM + Carburant */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Title card with icon */}
            <div className="bg-gradient-to-br from-[#14B8A6]/10 to-[#14B8A6]/5 rounded-2xl p-4 border border-[#14B8A6]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/15 flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2D2A3E]">État initial du véhicule</h2>
                  <p className="text-xs text-gray-500">Photographiez le tableau de bord et renseignez le kilométrage</p>
                </div>
              </div>
            </div>

            {/* Photo dashboard */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E] mb-4 flex items-center gap-2">
                <span>📸</span> Photo du tableau de bord <span className="text-red-500">*</span>
              </h3>
              
              {/* Image de guidance du dashboard */}
              {mission?.vehicle_type && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">📋 Photo de référence:</p>
                  <img
                    src={getGuideImage('dashboard', mission.vehicle_type)}
                    alt="Guide tableau de bord"
                    className="w-full h-32 object-contain bg-gray-50 rounded-lg border border-gray-200"
                  />
                </div>
              )}
              
              {dashboardPhoto.captured && dashboardPhoto.url ? (
                <div className="relative">
                  <img
                    src={dashboardPhoto.url}
                    alt="Dashboard"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => openCamera('dashboard')}
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg hover:bg-white transition-colors"
                  >
                    <Camera className="w-5 h-5 text-[#14B8A6]" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Capturée
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openCamera('dashboard')}
                  className="w-full h-48 border-2 border-dashed border-[#14B8A6] rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-[#F0FDFA] transition-colors"
                >
                  <Camera className="w-12 h-12 text-[#14B8A6]" />
                  <span className="text-[#14B8A6] font-medium">Prendre la photo</span>
                </button>
              )}
            </div>

            {/* Kilométrage */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                Kilométrage <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="Ex: 45000"
                className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none text-lg"
              />
            </div>

            {/* Niveau de carburant */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <label className="block text-sm font-medium text-[#2D2A3E] mb-4">
                Niveau de carburant: <span className="text-[#14B8A6] font-bold text-lg">{fuelLevel}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                className="w-full h-3 bg-[#CCFBF1] rounded-lg appearance-none cursor-pointer accent-[#14B8A6]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2: 8 Photos obligatoires + 10 optionnelles */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#14B8A6]/10 to-[#14B8A6]/5 rounded-2xl p-4 border border-[#14B8A6]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/15 flex items-center justify-center">
                  <span className="text-xl">📸</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2D2A3E]">Photos du véhicule</h2>
                  <p className="text-xs text-gray-500">8 photos obligatoires + photos de dommages optionnelles</p>
                </div>
              </div>
            </div>

            {/* Photos obligatoires */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E] mb-4 flex items-center gap-2">
                <span>✅</span> Photos obligatoires (8) <span className="text-red-500">*</span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {requiredPhotos.filter(p => p.captured).length} / {requiredPhotos.length} complétées
              </p>

              <div className="grid grid-cols-2 gap-4">
                {REQUIRED_PHOTOS.map((guide, index) => {
                  const photo = requiredPhotos[index];
                  if (!photo) return null;

                  const guideImagePath = getGuideImage(guide.type, mission.vehicle_type);

                  return (
                    <div key={guide.type} className="space-y-2">
                      <div className="text-sm font-medium text-[#2D2A3E] flex items-center gap-1">
                        <span>{guide.icon}</span>
                        <span>{guide.label}</span>
                      </div>

                      {/* Image de guidance */}
                      {guideImagePath && (
                        <img
                          src={guideImagePath}
                          alt={`Guide ${guide.label}`}
                          className="w-full h-24 object-contain bg-gray-50 rounded-lg border border-gray-200"
                        />
                      )}

                      {/* Photo capturée ou bouton */}
                      {photo.captured && photo.url ? (
                        <div className="relative">
                          <img
                            src={photo.url}
                            alt={guide.label}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => openCamera(guide.type)}
                            className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-lg shadow"
                          >
                            <Camera className="w-4 h-4 text-[#14B8A6]" />
                          </button>
                          <div className="absolute bottom-1 left-1 bg-green-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> OK
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openCamera(guide.type)}
                          className="w-full h-32 border-2 border-dashed border-[#14B8A6] rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-[#F0FDFA] transition-colors"
                        >
                          <Camera className="w-6 h-6 text-[#14B8A6]" />
                          <span className="text-xs text-[#14B8A6] font-medium">Prendre</span>
                        </button>
                      )}

                      {/* Sélecteur état de dommage */}
                      <select
                        value={photo.damageState}
                        onChange={(e) => {
                          const newState = e.target.value as 'RAS' | 'Rayures' | 'Cassé' | 'Abimé';
                          setRequiredPhotos(prev =>
                            prev.map(p => p.type === guide.type ? { ...p, damageState: newState } : p)
                          );
                        }}
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border-2 focus:outline-none transition-colors ${
                          photo.damageState !== 'RAS'
                            ? 'border-orange-300 bg-orange-50 text-orange-700'
                            : 'border-[#CCFBF1] text-gray-700'
                        }`}
                      >
                        <option value="RAS">✅ RAS</option>
                        <option value="Rayures">⚠️ Rayures</option>
                        <option value="Cassé">🔴 Cassé</option>
                        <option value="Abimé">🟠 Abimé</option>
                      </select>

                      {/* Commentaire obligatoire si dommage ≠ RAS */}
                      {photo.damageState !== 'RAS' && (
                        <textarea
                          value={photo.damageComment}
                          onChange={(e) => {
                            setRequiredPhotos(prev =>
                              prev.map(p => p.type === guide.type ? { ...p, damageComment: e.target.value } : p)
                            );
                          }}
                          placeholder="Décrivez le dommage... (obligatoire)"
                          rows={2}
                          className={`w-full px-2 py-1.5 text-xs rounded-lg border-2 focus:outline-none resize-none ${
                            !photo.damageComment.trim()
                              ? 'border-red-300 bg-red-50'
                              : 'border-orange-200 bg-orange-50'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Photos optionnelles (progressives) */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <h3 className="font-semibold text-[#2D2A3E] mb-4 flex items-center gap-2">
                <span>📷</span> Photos de dommages supplémentaires (optionnel)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Ajoutez jusqu'à 10 photos de dommages supplémentaires
              </p>

              <div className="grid grid-cols-2 gap-4">
                {optionalPhotos.slice(0, visibleOptionalCount).map((photo, index) => (
                  <div key={photo.type} className="space-y-2">
                    <div className="text-sm font-medium text-[#2D2A3E]">
                      Dommage {index + 1}
                    </div>

                    {photo.captured && photo.url ? (
                      <div className="relative">
                        <img
                          src={photo.url}
                          alt={`Dommage ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => openCamera(photo.type)}
                          className="absolute top-1 right-1 bg-white/90 p-1.5 rounded-lg shadow"
                        >
                          <Camera className="w-4 h-4 text-[#14B8A6]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openCamera(photo.type)}
                        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
                      >
                        <Camera className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-500">Ajouter</span>
                      </button>
                    )}

                    {photo.captured && (
                      <select
                        value={photo.damageState}
                        onChange={(e) => {
                          const newState = e.target.value as 'RAS' | 'Rayures' | 'Cassé' | 'Abimé';
                          setOptionalPhotos(prev =>
                            prev.map(p => p.type === photo.type ? { ...p, damageState: newState } : p)
                          );
                        }}
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border-2 focus:outline-none ${
                          photo.damageState !== 'RAS'
                            ? 'border-orange-300 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-700'
                        }`}
                      >
                        <option value="RAS">✅ RAS</option>
                        <option value="Rayures">⚠️ Rayures</option>
                        <option value="Cassé">🔴 Cassé</option>
                        <option value="Abimé">🟠 Abimé</option>
                      </select>
                    )}

                    {/* Commentaire obligatoire si dommage ≠ RAS */}
                    {photo.captured && photo.damageState !== 'RAS' && (
                      <textarea
                        value={photo.damageComment}
                        onChange={(e) => {
                          setOptionalPhotos(prev =>
                            prev.map(p => p.type === photo.type ? { ...p, damageComment: e.target.value } : p)
                          );
                        }}
                        placeholder="Décrivez le dommage... (obligatoire)"
                        rows={2}
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border-2 focus:outline-none resize-none ${
                          !photo.damageComment.trim()
                            ? 'border-red-300 bg-red-50'
                            : 'border-orange-200 bg-orange-50'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3: Checklist */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#14B8A6]/10 to-[#14B8A6]/5 rounded-2xl p-4 border border-[#14B8A6]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/15 flex items-center justify-center">
                  <span className="text-xl">✅</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2D2A3E]">État du véhicule</h2>
                  <p className="text-xs text-gray-500">Checklist complète et inventaire</p>
                </div>
              </div>
            </div>

            {/* État général */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <label className="block text-sm font-medium text-[#2D2A3E] mb-3">
                État général du véhicule
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['good', 'average', 'poor'] as const).map((state) => (
                  <button
                    key={state}
                    onClick={() => setVehicleCondition(state)}
                    className={`py-3 rounded-lg border-2 font-medium transition-all ${
                      vehicleCondition === state
                        ? 'border-[#14B8A6] bg-[#F0FDFA] text-[#14B8A6]'
                        : 'border-gray-200 text-gray-600 hover:border-[#14B8A6]'
                    }`}
                  >
                    {state === 'good' && '😊 Bon'}
                    {state === 'average' && '😐 Moyen'}
                    {state === 'poor' && '😟 Mauvais'}
                  </button>
                ))}
              </div>
            </div>

            {/* Nombre de clés */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <label className="block text-sm font-medium text-[#2D2A3E] mb-3">
                🔑 Nombre de clés
              </label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setKeysCount(Math.max(0, keysCount - 1))}
                    disabled={keysCount === 0}
                    className="w-10 h-10 rounded-full bg-[#F0FDFA] border-2 border-[#14B8A6] text-[#14B8A6] font-bold text-xl hover:bg-[#14B8A6] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    −
                  </button>
                  <span className="text-3xl font-bold text-[#14B8A6] min-w-[60px] text-center">
                    {keysCount}
                  </span>
                  <button
                    onClick={() => setKeysCount(keysCount + 1)}
                    className="w-10 h-10 rounded-full bg-[#F0FDFA] border-2 border-[#14B8A6] text-[#14B8A6] font-bold text-xl hover:bg-[#14B8A6] hover:text-white transition-all"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-600">clé(s)</span>
              </div>
            </div>

            {/* Équipements */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1] space-y-4">
              <h3 className="font-semibold text-[#2D2A3E]">🛠️ Équipements</h3>
              
              {[
                { label: 'Kit de sécurité', icon: '🚨', state: hasSecurityKit, setter: setHasSecurityKit },
                { label: 'Roue de secours', icon: '⭕', state: hasSpareWheel, setter: setHasSpareWheel },
                { label: 'Kit de gonflage', icon: '💨', state: hasInflationKit, setter: setHasInflationKit },
                { label: 'Carte carburant', icon: '💳', state: hasFuelCard, setter: setHasFuelCard },
                { label: 'Véhicule chargé', icon: '📦', state: isVehicleLoaded, setter: setIsVehicleLoaded },
                { label: 'Objet confié', icon: '📋', state: hasConfidedObject, setter: setHasConfidedObject },
              ].map((item, index) => (
                <label key={index} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.state}
                    onChange={(e) => item.setter(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-300 text-[#14B8A6] focus:ring-[#14B8A6] cursor-pointer"
                  />
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-[#2D2A3E] group-hover:text-[#14B8A6] transition-colors">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Description objet confié */}
            {hasConfidedObject && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
                <h3 className="font-semibold text-[#2D2A3E] mb-3">📦 Précisez l'objet confié</h3>
                <textarea
                  value={confidedObjectDescription}
                  onChange={(e) => setConfidedObjectDescription(e.target.value)}
                  placeholder="Décrivez l'objet confié..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Photo véhicule chargé (obligatoire si "Véhicule chargé" coché) */}
            {isVehicleLoaded && (
              <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-blue-200">
                <h3 className="font-semibold text-[#2D2A3E] mb-3 flex items-center gap-2">
                  <span>📸</span> Photo du véhicule chargé <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Prenez une photo montrant le chargement du véhicule
                </p>
                
                {loadedVehiclePhoto.captured && loadedVehiclePhoto.url ? (
                  <div className="relative">
                    <img
                      src={loadedVehiclePhoto.url}
                      alt="Véhicule chargé"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => openCamera('loaded_vehicle')}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg hover:bg-white transition-colors"
                    >
                      <Camera className="w-5 h-5 text-[#14B8A6]" />
                    </button>
                    <div className="absolute bottom-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Capturée
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openCamera('loaded_vehicle')}
                    className="w-full h-48 border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                  >
                    <Camera className="w-12 h-12 text-blue-400" />
                    <span className="text-blue-500 font-medium">Prendre la photo</span>
                    <span className="text-xs text-blue-400">Obligatoire</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ÉTAPE 4: Signatures */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#14B8A6]/10 to-[#14B8A6]/5 rounded-2xl p-4 border border-[#14B8A6]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/15 flex items-center justify-center">
                  <span className="text-xl">✍️</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2D2A3E]">Signatures</h2>
                  <p className="text-xs text-gray-500">Validation client et convoyeur</p>
                </div>
              </div>
            </div>

            {/* Signature Client */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1] space-y-4">
              <h3 className="font-semibold text-[#2D2A3E] flex items-center gap-2">
                <span>👤</span> Client <span className="text-red-500">*</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Prénom NOM"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Signature
                </label>
                <SignatureCanvas
                  onChange={setClientSignature}
                  value={clientSignature}
                />
              </div>
            </div>

            {/* Signature Convoyeur */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1] space-y-4">
              <h3 className="font-semibold text-[#2D2A3E] flex items-center gap-2">
                <span>🚗</span> Convoyeur <span className="text-red-500">*</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Prénom NOM"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                  Signature
                </label>
                <SignatureCanvas
                  onChange={setDriverSignature}
                  value={driverSignature}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
              <label className="block text-sm font-medium text-[#2D2A3E] mb-2">
                📝 Notes supplémentaires (optionnel)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observations, remarques particulières..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border-2 border-[#CCFBF1] focus:border-[#14B8A6] focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* ÉTAPE 5: Scanner de documents */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#14B8A6]/10 to-[#14B8A6]/5 rounded-2xl p-4 border border-[#14B8A6]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/15 flex items-center justify-center">
                  <span className="text-xl">📄</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#2D2A3E]">Documents</h2>
                  <p className="text-xs text-gray-500">Scanner les documents nécessaires (optionnel)</p>
                </div>
              </div>
            </div>

            {/* Boutons de scan */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setScannerDocType('registration');
                  setShowDocScanner(true);
                }}
                className="p-6 bg-white rounded-xl border-2 border-[#CCFBF1] hover:border-[#14B8A6] hover:bg-[#F0FDFA] transition-all flex flex-col items-center gap-3"
              >
                <span className="text-4xl">📋</span>
                <span className="font-medium text-[#2D2A3E]">Carte grise</span>
              </button>

              <button
                onClick={() => {
                  setScannerDocType('insurance');
                  setShowDocScanner(true);
                }}
                className="p-6 bg-white rounded-xl border-2 border-[#CCFBF1] hover:border-[#14B8A6] hover:bg-[#F0FDFA] transition-all flex flex-col items-center gap-3"
              >
                <span className="text-4xl">🛡️</span>
                <span className="font-medium text-[#2D2A3E]">Assurance</span>
              </button>

              <button
                onClick={() => {
                  setScannerDocType('generic');
                  setShowDocScanner(true);
                }}
                className="p-6 bg-white rounded-xl border-2 border-[#CCFBF1] hover:border-[#14B8A6] hover:bg-[#F0FDFA] transition-all flex flex-col items-center gap-3 col-span-2"
              >
                <span className="text-4xl">📎</span>
                <span className="font-medium text-[#2D2A3E]">Autre document</span>
              </button>
            </div>

            {/* Documents scannés */}
            {scannedDocs.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#CCFBF1]">
                <h3 className="font-semibold text-[#2D2A3E] mb-4">Documents scannés ({scannedDocs.length})</h3>
                <div className="grid grid-cols-2 gap-4">
                  {scannedDocs.map((doc, index) => (
                    <div key={index} className="relative">
                      <img
                        src={doc.preview}
                        alt={`Document ${doc.type}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 left-2 bg-[#14B8A6] text-white px-2 py-1 rounded text-xs">
                        {doc.type === 'registration' && 'Carte grise'}
                        {doc.type === 'insurance' && 'Assurance'}
                        {doc.type === 'generic' && 'Document'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Documents optionnels</p>
                <p>Vous pouvez scanner des documents maintenant ou les ajouter plus tard depuis la mission.</p>
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
              onClick={handlePreviousStep}
              disabled={saving}
              className="flex-1 py-3 px-6 rounded-xl border-2 border-[#14B8A6] text-[#14B8A6] font-semibold hover:bg-[#F0FDFA] transition-colors disabled:opacity-50"
            >
              Précédent
            </button>
          )}
          
          {currentStep < 5 ? (
            <button
              onClick={handleNextStep}
              disabled={saving}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Suivant
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Terminer l'inspection
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading overlay pendant la soumission */}
      {saving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 mx-4 shadow-2xl">
            <Loader className="w-10 h-10 animate-spin text-[#14B8A6]" />
            <p className="text-lg font-semibold text-[#2D2A3E]">Envoi de l'inspection en cours…</p>
            <p className="text-sm text-gray-500">Photos, signatures et documents</p>
          </div>
        </div>
      )}

      {/* Share dialog */}
      {showShareDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-[#2D2A3E]">Inspection enregistrée !</h3>
              <p className="text-sm text-gray-500 mt-2">Partagez le rapport d'inspection avec le client</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">Lien du rapport :</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/inspection-report/${shareToken}`}
                  className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/inspection-report/${shareToken}`);
                    showToast('success', 'Copié !', 'Lien copié dans le presse-papiers');
                  }}
                  className="p-2 bg-[#14B8A6] text-white rounded-lg hover:bg-[#0D9488] transition-colors"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            {navigator.share && (
              <button
                onClick={() => {
                  navigator.share({
                    title: 'Rapport d\'inspection',
                    text: 'Consultez le rapport d\'inspection du véhicule',
                    url: `${window.location.origin}/inspection-report/${shareToken}`,
                  });
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-semibold flex items-center justify-center gap-2 mb-3"
              >
                <Share2 className="w-5 h-5" />
                Partager
              </button>
            )}

            <button
              onClick={() => {
                setShowShareDialog(false);
                navigate('/team-missions');
              }}
              className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

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
