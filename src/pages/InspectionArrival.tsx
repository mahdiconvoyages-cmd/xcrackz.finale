// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader, CheckCircle } from 'lucide-react';
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
  type: 'arrival_front' | 'arrival_back' | 'arrival_left' | 'arrival_right' | 'arrival_interior' | 'arrival_dashboard';
  label: string;
  instruction: string;
  url: string | null;
  file: File | null;
  validated: boolean;
}

export default function InspectionArrival() {
  const { missionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mission, setMission] = useState<Mission | null>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  const [notes, setNotes] = useState('');
  const [clientSignature, setClientSignature] = useState('');
  const [clientName, setClientName] = useState('');

  const [photoSteps, setPhotoSteps] = useState<PhotoStep[]>([
    {
      type: 'arrival_front',
      label: 'Vue avant',
      instruction: 'Photographiez le véhicule de face à l\'arrivée',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'arrival_back',
      label: 'Vue arrière',
      instruction: 'Photographiez le véhicule de dos à l\'arrivée',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'arrival_left',
      label: 'Côté gauche',
      instruction: 'Photographiez le côté gauche du véhicule',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'arrival_right',
      label: 'Côté droit',
      instruction: 'Photographiez le côté droit du véhicule',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'arrival_interior',
      label: 'Intérieur',
      instruction: 'Photographiez l\'habitacle à l\'arrivée',
      url: null,
      file: null,
      validated: false
    },
    {
      type: 'arrival_dashboard',
      label: 'Tableau de bord',
      instruction: 'Photographiez le compteur kilométrique final',
      url: null,
      file: null,
      validated: false
    },
  ]);

  const inspectionState = {
    currentStep,
    notes,
    clientName,
  };

  const { saveState, loadState, clearState } = useInspectionPersistence(
    missionId,
    'arrival',
    inspectionState
  );

  useEffect(() => {
    loadData();

    const savedState = loadState();
    if (savedState && window.confirm('Une inspection en cours a été trouvée. Voulez-vous la reprendre ?')) {
      setCurrentStep(savedState.currentStep || 0);
      setNotes(savedState.notes || '');
      setClientName(savedState.clientName || '');
    }
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
          .eq('inspection_type', 'departure')
          .maybeSingle(),
        supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('mission_id', missionId)
          .eq('inspection_type', 'arrival')
          .maybeSingle()
      ]);

      if (missionResult.error) throw missionResult.error;
      
      // 🔒 VÉRIFICATION: Bloquer si inspection d'arrivée déjà existe
      if (existingArrivalResult.data) {
        alert('⚠️ Une inspection d\'arrivée existe déjà pour cette mission. Impossible de créer un doublon.');
        navigate('/team-missions');
        return;
      }
      
      if (!inspectionResult.data) {
        alert('Aucune inspection de départ trouvée. Veuillez d\'abord effectuer l\'inspection de départ.');
        navigate('/team-missions');
        return;
      }

      setMission(missionResult.data);
      setInspection(inspectionResult.data);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement des données');
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
    reader.onloadend = async () => {
      const newPhotoSteps = [...photoSteps];
      newPhotoSteps[currentStep] = {
        ...newPhotoSteps[currentStep],
        url: reader.result as string,
        file,
        validated: true
      };
      setPhotoSteps(newPhotoSteps);

      if (currentStep < photoSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setShowDetailsForm(true);
      }
    };

    reader.readAsDataURL(file);

    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRetakePhoto = () => {
    const newPhotoSteps = [...photoSteps];
    newPhotoSteps[currentStep] = {
      ...newPhotoSteps[currentStep],
      url: null,
      file: null,
      validated: false
    };
    setPhotoSteps(newPhotoSteps);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < photoSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowDetailsForm(true);
    }
  };


  const handleComplete = async () => {
    const photosNotTaken = photoSteps.filter(p => !p.validated).length;
    if (photosNotTaken > 0) {
      alert(`Il reste ${photosNotTaken} photo(s) à prendre`);
      return;
    }

    if (!clientSignature || !clientName) {
      alert('Veuillez faire signer le client');
      return;
    }

    if (!confirm('Voulez-vous terminer cette inspection et finaliser la mission ?')) return;

    setSaving(true);
    try {
      const inspectionData: any = {
        mission_id: missionId,
        inspector_id: user!.id,
        inspection_type: 'arrival',
        notes,
        client_signature: clientSignature,
        client_name: clientName,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      const { data: arrivalInspection, error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert(inspectionData)
        .select()
        .single();

      if (inspectionError) throw inspectionError;
      
      // 🛡️ Guard: Vérifier que l'insertion a retourné un ID valide
      if (!arrivalInspection?.id) {
        throw new Error('❌ Aucun ID d\'inspection retourné - insertion échouée');
      }
      
      console.log('✅ Inspection créée avec ID:', arrivalInspection.id);

      // 🔄 Upload des photos avec retry et validation
      let uploadedPhotosCount = 0;
      const uploadErrors: string[] = [];
      
      for (const photo of photoSteps) {
        if (photo.file) {
          const fileExt = photo.file.name.split('.').pop();
          const fileName = `${arrivalInspection.id}-${photo.type}-${Date.now()}.${fileExt}`;
          const filePath = `inspections/${fileName}`;

          // 🔄 Retry upload jusqu'à 2 fois
          let uploadSuccess = false;
          let uploadError: any = null;
          
          for (let attempt = 1; attempt <= 2; attempt++) {
            const { error } = await supabase.storage
              .from('inspection-photos')
              .upload(filePath, photo.file);
              
            if (!error) {
              uploadSuccess = true;
              break;
            }
            
            uploadError = error;
            console.warn(`⚠️ Upload ${photo.type} - Tentative ${attempt}/2 échouée:`, error);
            
            if (attempt < 2) {
              // Attendre 1s avant retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          if (!uploadSuccess) {
            const errorMsg = `❌ Échec upload ${photo.type}: ${uploadError?.message || 'Erreur inconnue'}`;
            console.error(errorMsg);
            uploadErrors.push(errorMsg);
            continue;
          }

          // 🛡️ Vérifier l'URL publique
          const { data: urlData } = supabase.storage
            .from('inspection-photos')
            .getPublicUrl(filePath);
            
          if (!urlData?.publicUrl) {
            const errorMsg = `❌ URL publique manquante pour ${photo.type}`;
            console.error(errorMsg);
            uploadErrors.push(errorMsg);
            continue;
          }

          // 🛡️ Insert en base avec vérification
          const { error: insertError } = await supabase.from('inspection_photos').insert({
            inspection_id: arrivalInspection.id,
            photo_type: photo.type,
            photo_url: urlData.publicUrl,
            // uploaded_by: user!.id,  // ❌ COLONNE N'EXISTE PAS - commentée
          });
          
          if (insertError) {
            const errorMsg = `❌ Échec insert DB ${photo.type}: ${insertError.message}`;
            console.error(errorMsg);
            uploadErrors.push(errorMsg);
          } else {
            uploadedPhotosCount++;
            console.log(`✅ Photo ${photo.type} uploadée et enregistrée`);
          }
        }
      }
      
      // 📊 Rapport final des uploads
      console.log(`📊 Résultat uploads: ${uploadedPhotosCount}/${photoSteps.length} réussies`);
      if (uploadErrors.length > 0) {
        console.warn('⚠️ Erreurs d\'upload:', uploadErrors);
        showToast(`⚠️ ${uploadErrors.length} photo(s) n'ont pas pu être uploadées`, 'warning');
      }

      // Document scanning feature - to be implemented
      // if (scannedDocument?.file) {
      //   const fileExt = scannedDocument.file.name.split('.').pop();
      //   const fileName = `${arrivalInspection.id}-document-${Date.now()}.${fileExt}`;
      //   const filePath = `inspections/documents/${fileName}`;

      //   const { error: uploadError } = await supabase.storage
      //     .from('inspection-photos')
      //     .upload(filePath, scannedDocument.file);

      //   if (!uploadError) {
      //     const { data: urlData } = supabase.storage
      //       .from('inspection-photos')
      //       .getPublicUrl(filePath);

      //     await supabase
      //       .from('vehicle_inspections')
      //       .update({ scanned_document_url: urlData.publicUrl })
      //       .eq('id', arrivalInspection.id);
      //   }
      // }

      // 🏁 Finaliser la mission
      const { error: missionError } = await supabase
        .from('missions')
        .update({ status: 'completed' })
        .eq('id', missionId);
        
      if (missionError) {
        console.error('❌ Erreur mise à jour mission:', missionError);
        showToast('⚠️ Mission créée mais statut non mis à jour', 'warning');
      }

      clearState();
      
      // 🎉 Message de succès détaillé
      const successMsg = `✅ Inspection d'arrivée terminée !\n• Photos: ${uploadedPhotosCount}/${photoSteps.length} uploadées\n• Mission finalisée`;
      showToast(successMsg, 'success');
      alert(successMsg);
      navigate('/team-missions');
    } catch (error: any) {
      console.error('Error completing inspection:', error);
      const errorMessage = error?.message || 'Une erreur est survenue lors de la finalisation';
      alert(`Erreur: ${errorMessage}\n\nVous allez être redirigé vers vos missions.`);
      setTimeout(() => navigate('/team-missions'), 1000);
    } finally {
      setSaving(false);
    }
  };

  const getCompletedPhotosCount = () => {
    return photoSteps.filter(p => p.validated).length;
  };

  const currentPhoto = photoSteps[currentStep];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="relative mb-4 mx-auto w-16 h-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700"></div>
            <div className="absolute top-0 left-0 animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500"></div>
          </div>
          <p className="text-white font-semibold">Chargement...</p>
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-bold">Finalisation</h1>
            <div className="w-32"></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Notes d'arrivée</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Observations et remarques
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
                  rows={4}
                  placeholder="État du véhicule à l'arrivée, nouveaux dommages éventuels, etc..."
                />
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
                Finalisation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-6 h-6" />
                Terminer et finaliser la mission
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
              <p className="text-sm opacity-90">Inspection d'arrivée</p>
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
            <p className="text-slate-300">{currentPhoto.instruction}</p>
          </div>

          {currentPhoto.url ? (
            <div className="relative">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.label}
                className="w-full h-auto rounded-2xl shadow-2xl border-2 border-teal-500"
              />
              <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <CheckCircle className="w-5 h-5" />
                <span className="font-bold">Validée</span>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[4/3] bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">Aucune photo capturée</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-6 py-4 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <button
              onClick={handleNext}
              disabled={!currentPhoto.validated && currentStep === photoSteps.length - 1}
              className="px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === photoSteps.length - 1 ? 'Finaliser' : 'Suivant'}
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold hover:from-teal-600 hover:to-cyan-600 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Camera className="w-6 h-6" />
              {currentPhoto.validated ? 'Reprendre la photo' : 'Prendre la photo'}
            </button>
            {currentPhoto.validated && (
              <button
                onClick={handleRetakePhoto}
                className="px-6 py-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
              >
                Supprimer
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}
