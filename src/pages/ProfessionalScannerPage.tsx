/**
 * 📱 SCANNER DE DOCUMENTS PROFESSIONNEL - VERSION OPTIMISÉE
 * 
 * ✨ Fonctionnalités:
 * - Capture photo ou upload fichier
 * - Détection automatique OpenCV optimisée
 * - Recadrage manuel précis avec zoom
 * - 4 filtres professionnels (Magic, N&B, Gris, Couleur)
 * - Correction perspective haute qualité
 * - Rotation et téléchargement
 * - Interface fluide et intuitive
 */

import { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  Download,
  Sparkles,
  Palette,
  Contrast,
  Image as ImageIcon,
  Loader,
  ArrowLeft,
  Check,
  Save,
  FileText,
  Trash2,
  Eye
} from 'lucide-react';
import {
  loadOpenCV,
  detectDocumentCorners,
  cropAndCorrectPerspective,
  Corner
} from '../utils/optimizedDetection';
import { applyAdvancedFilter, FilterType } from '../utils/advancedFilters';
import OptimizedCropPage from './OptimizedCropPage';

interface ScannedDocument {
  id: string;
  name: string;
  imageUrl: string;
  timestamp: number;
  filter: FilterType;
}

export default function ProfessionalScannerPage() {
  // États du workflow
  const [step, setStep] = useState<'intro' | 'camera' | 'crop' | 'edit' | 'documents'>('intro');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('magic');
  const [fileName, setFileName] = useState('document');
  
  // États de détection
  const [corners, setCorners] = useState<Corner[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingOpenCV, setIsLoadingOpenCV] = useState(false);
  
  // Documents sauvegardés
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  
  // Références
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Précharger OpenCV au montage (pour compatibilité)
  useEffect(() => {
    setIsLoadingOpenCV(true);
    loadOpenCV()
      .then(() => {
        setIsLoadingOpenCV(false);
      })
      .catch((error) => {
        console.error('OpenCV non disponible:', error);
        setIsLoadingOpenCV(false);
      });
  }, []);

  // Cleanup caméra
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Charger les documents sauvegardés
  useEffect(() => {
    try {
      const stored = localStorage.getItem('scannedDocuments');
      if (stored) {
        setScannedDocuments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  }, []);

  // Sauvegarder les documents
  const saveDocuments = (docs: ScannedDocument[]) => {
    try {
      localStorage.setItem('scannedDocuments', JSON.stringify(docs));
      setScannedDocuments(docs);
    } catch (error) {
      console.error('Erreur sauvegarde documents:', error);
    }
  };

  // Configuration des filtres
  const filters = [
    { id: 'magic' as FilterType, name: 'Auto', icon: Sparkles, color: '#10b981' },
    { id: 'bw' as FilterType, name: 'N&B', icon: Contrast, color: '#374151' },
    { id: 'grayscale' as FilterType, name: 'Gris', icon: Palette, color: '#6b7280' },
    { id: 'color' as FilterType, name: 'Couleur', icon: ImageIcon, color: '#3b82f6' },
  ];

  // ===== GESTION UPLOAD / CAMERA =====

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      await processNewImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setStep('camera');
      
      // Attendre que videoRef soit disponible
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => console.error('Erreur lecture vidéo:', err));
        }
      }, 100);
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      alert('Impossible d\'accéder à la caméra');
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    // Arrêter la caméra
    stopCamera();
    
    // Traiter l'image
    await processNewImage(imageUrl);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setStep('intro');
  };

  // ===== TRAITEMENT IMAGE =====

  const processNewImage = async (imageUrl: string) => {
    setIsProcessing(true);
    setRawImage(imageUrl);

    try {
      // Détection automatique optimisée
      const detectedCorners = await detectDocumentCorners(imageUrl);
      setCorners(detectedCorners);

      // Passer à l'étape de crop
      setStep('crop');
    } catch (error) {
      console.error('Erreur traitement image:', error);
      alert('Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = async (finalCorners: Corner[]) => {
    if (!rawImage) return;

    setIsProcessing(true);

    try {
      // Appliquer la correction de perspective
      const cropped = await cropAndCorrectPerspective(rawImage, finalCorners);
      setCroppedImage(cropped);

      // Appliquer le filtre par défaut (magic)
      const filtered = await applyAdvancedFilter(cropped, 'magic');
      setProcessedImage(filtered);
      setSelectedFilter('magic');

      // Passer à l'édition
      setStep('edit');
    } catch (error) {
      console.error('Erreur recadrage:', error);
      alert('Erreur lors du recadrage');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelCrop = () => {
    setStep('intro');
    setRawImage(null);
    setCorners([]);
  };

  // ===== ÉDITION FILTRES =====

  const applyFilter = async (filterType: FilterType) => {
    if (!croppedImage) return;

    setIsProcessing(true);
    setSelectedFilter(filterType);

    try {
      const filtered = await applyAdvancedFilter(croppedImage, filterType);
      setProcessedImage(filtered);
    } catch (error) {
      console.error('Erreur application filtre:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const rotateImage = async () => {
    if (!processedImage) return;

    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = processedImage;
      await new Promise(resolve => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotated = canvas.toDataURL('image/jpeg', 0.95);
        setProcessedImage(rotated);
        setCroppedImage(rotated);
      }
    } catch (error) {
      console.error('Erreur rotation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveDocument = async () => {
    if (!processedImage) return;

    try {
      setIsProcessing(true);

      // Créer le document
      const newDoc: ScannedDocument = {
        id: Date.now().toString(),
        name: fileName || `scan_${Date.now()}`,
        imageUrl: processedImage,
        timestamp: Date.now(),
        filter: selectedFilter
      };

      // Sauvegarder dans l'historique
      const updatedDocs = [newDoc, ...scannedDocuments].slice(0, 50);
      saveDocuments(updatedDocs);

      alert('✅ Document sauvegardé !');
      
      // Réinitialiser
      handleNewScan();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `scan_${Date.now()}.jpg`;
    link.click();
  };

  const handleBack = () => {
    if (step === 'edit') {
      setStep('crop');
    } else if (step === 'crop') {
      setStep('intro');
      setRawImage(null);
      setCorners([]);
    }
  };

  const handleNewScan = () => {
    setStep('intro');
    setRawImage(null);
    setCroppedImage(null);
    setProcessedImage(null);
    setCorners([]);
    setSelectedFilter('magic');
    setFileName('document');
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('Supprimer ce document ?')) {
      const updatedDocs = scannedDocuments.filter(doc => doc.id !== id);
      saveDocuments(updatedDocs);
    }
  };

  const handleViewDocument = (doc: ScannedDocument) => {
    setCroppedImage(doc.imageUrl);
    setProcessedImage(doc.imageUrl);
    setFileName(doc.name);
    setSelectedFilter(doc.filter);
    setStep('edit');
  };

  // ===== RENDU =====

  // Écran de chargement
  if (isLoadingOpenCV) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Initialisation du scanner...</p>
        </div>
      </div>
    );
  }

  // Écran d'introduction
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Scanner Professionnel
            </h1>
            <p className="text-blue-200">
              Numérisez vos documents en haute qualité
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={startCamera}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
            >
              <Camera className="w-6 h-6" />
              Prendre une photo
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all backdrop-blur-sm"
            >
              <Upload className="w-6 h-6" />
              Choisir un fichier
            </button>

            {scannedDocuments.length > 0 && (
              <button
                onClick={() => setStep('documents')}
                className="w-full py-4 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all backdrop-blur-sm border border-green-500/30"
              >
                <FileText className="w-6 h-6" />
                Mes documents ({scannedDocuments.length})
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  // Vue caméra
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
            <button
              onClick={stopCamera}
              className="px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl font-medium hover:bg-white/20 transition-all"
            >
              Annuler
            </button>

            <button
              onClick={capturePhoto}
              disabled={isProcessing}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              {isProcessing ? (
                <Loader className="w-8 h-8 text-gray-900 animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-gray-900" />
              )}
            </button>

            <div className="w-24" />
          </div>
        </div>
      </div>
    );
  }

  // Vue recadrage
  if (step === 'crop' && rawImage && corners.length === 4) {
    return (
      <OptimizedCropPage
        imageUrl={rawImage}
        initialCorners={corners}
        onApply={handleApplyCrop}
        onCancel={handleCancelCrop}
      />
    );
  }

  // Vue édition
  if (step === 'edit' && processedImage) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>

            <h2 className="text-white font-semibold">
              Édition
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={saveDocument}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
              
              <button
                onClick={downloadImage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <div className="relative max-w-4xl w-full">
            <img
              src={processedImage}
              alt="Document scanné"
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Loader className="w-12 h-12 text-white animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-4 py-4">
          {/* Filtres */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = selectedFilter === filter.id;
              
              return (
                <button
                  key={filter.id}
                  onClick={() => applyFilter(filter.id)}
                  disabled={isProcessing}
                  className={`relative px-4 py-3 rounded-xl font-medium transition-all disabled:opacity-50 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{
                    boxShadow: isActive ? `0 0 20px ${filter.color}40` : 'none'
                  }}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs">{filter.name}</span>
                  {isActive && (
                    <Check className="w-4 h-4 absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={rotateImage}
              disabled={isProcessing}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              Rotation
            </button>

            <button
              onClick={handleNewScan}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Nouveau scan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Page Mes Documents
  if (step === 'documents') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('intro')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>

            <h2 className="text-white font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mes documents ({scannedDocuments.length})
            </h2>

            <div className="w-10" />
          </div>
        </div>

        {/* Liste des documents */}
        <div className="flex-1 overflow-y-auto p-4">
          {scannedDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-20 h-20 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-2">Aucun document</p>
              <p className="text-gray-500 text-sm">
                Vos scans apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {scannedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-800 hover:border-blue-600"
                >
                  {/* Aperçu */}
                  <div className="relative aspect-[3/4] bg-gray-800">
                    <img
                      src={doc.imageUrl}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded-full">
                        {doc.filter === 'magic' ? '✨ Auto' : 
                         doc.filter === 'bw' ? '⚫ N&B' :
                         doc.filter === 'grayscale' ? '🌫️ Gris' : '🌈 Couleur'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-1 truncate">
                      {doc.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {new Date(doc.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer avec bouton nouveau scan */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-4 py-4">
          <button
            onClick={() => setStep('intro')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Nouveau scan
          </button>
        </div>
      </div>
    );
  }

  // Écran de traitement
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Traitement en cours...</p>
      </div>
    </div>
  );
}
