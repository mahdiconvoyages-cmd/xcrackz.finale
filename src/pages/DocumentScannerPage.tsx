/**
 * 📱 Page Scanner de Documents Standalone
 * 
 * Fonctionnalités:
 * - Upload fichier ou capture webcam
 * - 4 filtres: Auto (Magic), N&B, Gris, Couleur
 * - Rotation 90° manuelle
 * - Amélioration automatique
 * - Téléchargement du résultat
 * - Identique à l'expérience mobile
 */

import { useState, useRef, useEffect } from 'react';
import { Camera, RotateCw, Download, X, Sparkles, Palette, Contrast, Image as ImageIcon, Loader, FileText, Trash2 } from 'lucide-react';
import { applyDocumentFilter, rotateImage, FilterType, dataURLtoFile } from '../utils/imageProcessing';
import { detectDocumentCorners, cropAndCorrectPerspective, loadOpenCV } from '../utils/documentDetection';
import AdvancedCropPage from './AdvancedCropPage';

interface Corner {
  x: number;
  y: number;
}

interface ScannedDocument {
  id: string;
  name: string;
  imageUrl: string;
  timestamp: number;
  filter: FilterType;
  // Optionnel : URL distante (documents venant du mobile / Supabase)
  remoteUrl?: string;
}

export default function DocumentScannerPage() {
  const [step, setStep] = useState<'intro' | 'camera' | 'crop' | 'edit' | 'gallery'>('intro');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('magic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('document');
  const [isLoadingOpenCV, setIsLoadingOpenCV] = useState(false);
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [openCVReady, setOpenCVReady] = useState(false);
  
  // Manuel crop state
  // Ancien état de compatibilité supprimé (la page gère déjà le step "crop")
  const [corners, setCorners] = useState<Corner[]>([]);
  const [rawImage, setRawImage] = useState<string | null>(null);
  // Mémorisation éventuelle des dimensions, principalement pour debug / évolutions
  // Dimensions de l'image brute (utilisées pour certains calculs internes)
  // NOTE: imageDimensions était utilisé dans une version précédente pour le debug, supprimé pour éviter les warnings.
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Précharger OpenCV en arrière-plan dès le montage
  useEffect(() => {
    setIsLoadingOpenCV(true);
    loadOpenCV()
      .then(() => {
        setOpenCVReady(true);
        setIsLoadingOpenCV(false);
      })
      .catch((error) => {
        console.error('OpenCV non disponible:', error);
        setOpenCVReady(false);
        setIsLoadingOpenCV(false);
      });
  }, []);

  // Cleanup de la caméra
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Charger les documents scannés depuis localStorage
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

  // Sauvegarder les documents dans localStorage
  const saveDocuments = (docs: ScannedDocument[]) => {
    try {
      localStorage.setItem('scannedDocuments', JSON.stringify(docs));
      setScannedDocuments(docs);
    } catch (error) {
      console.error('Erreur sauvegarde documents:', error);
    }
  };

  const filters = [
    { id: 'magic' as FilterType, name: 'Auto', icon: Sparkles, color: '#14b8a6' },
    { id: 'bw' as FilterType, name: 'N&B', icon: Contrast, color: '#475569' },
    { id: 'grayscale' as FilterType, name: 'Gris', icon: Palette, color: '#64748b' },
    { id: 'color' as FilterType, name: 'Couleur', icon: ImageIcon, color: '#3b82f6' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^/.]+$/, ''));
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      
      try {
        // Stocker l'image brute
        setRawImage(imageUrl);
        
        // Détecter les coins automatiquement
        if (openCVReady) {
          const detectedCorners = await detectDocumentCorners(imageUrl);
          setCorners(detectedCorners);
        } else {
          // Coins par défaut (bordures de l'image)
          const img = new Image();
          img.src = imageUrl;
          await new Promise(resolve => { img.onload = resolve; });
          const margin = Math.min(img.width, img.height) * 0.05;
          setCorners([
            { x: margin, y: margin },
            { x: img.width - margin, y: margin },
            { x: img.width - margin, y: img.height - margin },
            { x: margin, y: img.height - margin }
          ]);
          // Ancien stockage des dimensions de l'image, plus nécessaire ici
        }
        
        // Passer en mode crop manuel
        setStep('crop');
      } catch (error) {
        console.error('Erreur traitement:', error);
        setOriginalImage(imageUrl);
        await applyFilter('magic', imageUrl);
        setStep('edit');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startLiveCamera = async () => {
    setStep('camera');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Erreur accès caméra:', error);
      setStep('intro');
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      setFileName(`scan_${Date.now()}`);
      setIsProcessing(true);
      
      try {
        // Stocker l'image brute
        setRawImage(imageUrl);
        
        // Détecter les coins automatiquement
        if (openCVReady) {
          const detectedCorners = await detectDocumentCorners(imageUrl);
          setCorners(detectedCorners);
        } else {
          // Coins par défaut
          const img = new Image();
          img.src = imageUrl;
          await new Promise(resolve => { img.onload = resolve; });
          setCorners([
            { x: 0, y: 0 },
            { x: img.width, y: 0 },
            { x: img.width, y: img.height },
            { x: 0, y: img.height },
          ]);
        }
        
        // Arrêter la caméra
        handleCancelCamera();
        
        // Passer au crop
        setStep('crop');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCancelCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setStep('intro');
  };

  const applyFilter = async (filterType: FilterType, imageSource?: string) => {
    const source = imageSource || originalImage;
    if (!source) return;

    try {
      setIsProcessing(true);
      const filtered = await applyDocumentFilter(source, filterType);
      setProcessedImage(filtered);
      setSelectedFilter(filterType);
    } catch (error) {
      console.error('Erreur filtre:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotate = async () => {
    if (!processedImage) return;
    
    try {
      setIsProcessing(true);
      const rotated = await rotateImage(processedImage, 90);
      setProcessedImage(rotated);
      setOriginalImage(rotated);
    } catch (error) {
      console.error('Erreur rotation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sauvegarder le document (historique + téléchargement local)
  const handleDownload = async () => {
    if (!processedImage) return;

    try {
      // Sauvegarder dans l'historique
      const newDoc: ScannedDocument = {
        id: Date.now().toString(),
        name: fileName,
        imageUrl: processedImage,
        timestamp: Date.now(),
        filter: selectedFilter
      };
      
      const updatedDocs = [newDoc, ...scannedDocuments].slice(0, 50); // Max 50 documents
      saveDocuments(updatedDocs);
      
      // Télécharger le fichier
      const file = await dataURLtoFile(processedImage, `${fileName}_scanned.jpg`);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      
      // Message de confirmation
      alert('✅ Document sauvegardé et téléchargé !');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setRawImage(null);
    setCorners([]);
    setStep('intro');
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
    const url = doc.remoteUrl || doc.imageUrl;
    setOriginalImage(url);
    setProcessedImage(url);
    setFileName(doc.name);
    setSelectedFilter(doc.filter);
    setStep('edit');
    setStep('edit');
  };

  // Manuel crop functions
  const handleApplyCrop = async () => {
    if (!rawImage || corners.length !== 4) return;
    
    setIsProcessing(true);
    try {
      const croppedImage = await cropAndCorrectPerspective(rawImage, corners);
      setOriginalImage(croppedImage);
      await applyFilter('magic', croppedImage);
      setStep('edit');
    } catch (error) {
      console.error('Erreur recadrage:', error);
    } finally {
      setIsProcessing(false);
    }
  };  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Loader OpenCV */}
      {isLoadingOpenCV && (
        <div className="fixed top-4 right-4 bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <Loader className="w-4 h-4 animate-spin" />
          <span className="text-sm">Chargement IA...</span>
        </div>
      )}

      {/* Loader Traitement */}
      {isProcessing && step === 'intro' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <Loader className="w-12 h-12 text-teal-400 mx-auto mb-4 animate-spin" />
            <p className="text-white font-semibold text-lg">Détection du document...</p>
            <p className="text-slate-400 text-sm mt-2">Analyse intelligente en cours</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Scanner de Documents</h1>
                <p className="text-sm text-slate-400">Détection automatique • IA intégrée</p>
              </div>
            </div>
            
            {step === 'edit' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('gallery')}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                  title="Voir les documents scannés"
                >
                  <FileText className="w-5 h-5 text-slate-400" />
                  {scannedDocuments.length > 0 && (
                    <span className="bg-teal-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {scannedDocuments.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            )}
            
            {(step === 'intro' || step === 'gallery') && scannedDocuments.length > 0 && (
              <button
                onClick={() => setStep(step === 'intro' ? 'gallery' : 'intro')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5 text-teal-400" />
                <span className="text-white font-medium">{scannedDocuments.length} document{scannedDocuments.length > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 'intro' && (
          <div className="max-w-2xl mx-auto">
            {/* Icon principale */}
            <div className="flex justify-center mb-8">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/30">
                <Camera className="w-20 h-20 text-white" />
              </div>
            </div>

            {/* Titre */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-3">Scanner un document</h2>
              <p className="text-lg text-slate-400">
                Détection automatique • Recadrage intelligent • Amélioration IA
              </p>
            </div>

            {/* Badge IA */}
            <div className="flex justify-center mb-8">
              {isLoadingOpenCV ? (
                <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-full px-6 py-2 flex items-center gap-2">
                  <Loader className="w-4 h-4 text-orange-400 animate-spin" />
                  <span className="text-sm font-semibold text-white">Chargement IA en cours...</span>
                </div>
              ) : openCVReady ? (
                <div className="bg-gradient-to-r from-teal-500/20 to-blue-500/20 border border-teal-500/30 rounded-full px-6 py-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span className="text-sm font-semibold text-white">Détection automatique activée</span>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-slate-500/20 to-slate-600/20 border border-slate-500/30 rounded-full px-6 py-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-300">Mode manuel (IA non disponible)</span>
                </div>
              )}
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <Sparkles className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Détection auto</h3>
                <p className="text-sm text-slate-400">Bords intelligents</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <Contrast className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Recadrage IA</h3>
                <p className="text-sm text-slate-400">Perspective corrigée</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <RotateCw className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Rotation manuelle</h3>
                <p className="text-sm text-slate-400">Orientation parfaite</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <Palette className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">4 filtres pro</h3>
                <p className="text-sm text-slate-400">Qualité scanner</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-4">
              <button
                onClick={startLiveCamera}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3"
              >
                <Camera className="w-6 h-6" />
                Scanner Live (Recadrage en direct)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-800 text-white px-6 py-4 rounded-xl font-semibold hover:bg-slate-700 transition-all border border-slate-600 flex items-center justify-center gap-3"
              >
                <Camera className="w-6 h-6" />
                Importer une photo
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {step === 'camera' && (
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
            <div className="p-6 bg-gradient-to-t from-black/90 to-transparent">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={handleCancelCamera}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCapture}
                  className="flex-shrink-0 w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100"
                >
                  <Camera className="w-8 h-8 text-gray-900" />
                </button>
                <div className="flex-1" />
              </div>
            </div>
          </div>
        )}

        {/* Crop Mode - Page Avancée */}
        {step === 'crop' && rawImage && corners.length === 4 && (
          <AdvancedCropPage
            imageUrl={rawImage}
            initialCorners={corners}
            onApply={async (newCorners: Corner[]) => {
              setCorners(newCorners);
              await handleApplyCrop();
            }}
            onCancel={handleReset}
          />
        )}

        {/* Gallery View */}
        {step === 'gallery' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Documents scannés</h2>
              <p className="text-slate-400">Historique de vos scans ({scannedDocuments.length} document{scannedDocuments.length > 1 ? 's' : ''})</p>
            </div>

            {scannedDocuments.length === 0 ? (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-12 text-center">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-4">Aucun document scanné</p>
                <button
                  onClick={() => setStep('intro')}
                  className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/30"
                >
                  Scanner un document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scannedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden hover:border-teal-500 transition-all group"
                  >
                    {/* Thumbnail */}
                    <div 
                      className="relative aspect-[3/4] bg-black cursor-pointer"
                      onClick={() => handleViewDocument(doc)}
                    >
                      <img
                        src={doc.imageUrl}
                        alt={doc.name}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold">
                          Ouvrir
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="text-white font-semibold truncate mb-1">{doc.name}</h3>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                        <span>{new Date(doc.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="capitalize">{doc.filter === 'magic' ? 'Auto' : doc.filter}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Voir
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.id);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                          title="Supprimer"
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
        )}

        {step === 'edit' && processedImage && (
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Prévisualisation */}
              <div className="lg:col-span-2">
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
                  <div className="relative bg-black aspect-[3/4] flex items-center justify-center">
                    <img
                      src={processedImage}
                      alt="Document scanné"
                      className="max-w-full max-h-full object-contain"
                    />
                    
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="font-medium">Traitement en cours...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contrôles */}
              <div className="space-y-6">
                {/* Filtres */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-teal-400" />
                    Filtres
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {filters.map((filter) => {
                      const Icon = filter.icon;
                      return (
                        <button
                          key={filter.id}
                          onClick={() => applyFilter(filter.id)}
                          disabled={isProcessing}
                          className={`p-4 rounded-lg border-2 transition-all disabled:opacity-50 ${
                            selectedFilter === filter.id
                              ? 'border-teal-500 bg-teal-500/20'
                              : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                          }`}
                        >
                          <Icon 
                            className={`w-6 h-6 mx-auto mb-2 ${
                              selectedFilter === filter.id ? 'text-teal-400' : 'text-slate-400'
                            }`} 
                          />
                          <p className={`text-sm font-medium ${
                            selectedFilter === filter.id ? 'text-white' : 'text-slate-400'
                          }`}>
                            {filter.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-3">
                  <h3 className="text-white font-semibold mb-4">Actions</h3>
                  
                  <button
                    onClick={handleRotate}
                    disabled={isProcessing}
                    className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <RotateCw className="w-5 h-5" />
                    Rotation 90°
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5" />
                    Nouveau scan
                  </button>

                  <button
                    onClick={handleDownload}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
