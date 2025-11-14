/**
 * 📸 Scanner de Documents Professionnel
 * 
 * Fonctionnalités avancées comme sur mobile:
 * - Détection automatique en temps réel
 * - Capture automatique quand document stable
 * - Correction de perspective automatique
 * - Filtres professionnels
 * - Interface intuitive et rapide
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Download, 
  X, 
  Sparkles, 
  RotateCw,
  Zap,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  FileText,
  Trash2
} from 'lucide-react';
import { detectDocumentCorners, cropAndCorrectPerspective, loadOpenCV } from '../utils/documentDetection';
import { applyDocumentFilter, rotateImage, FilterType, dataURLtoFile } from '../utils/imageProcessing';

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
}

interface DetectionQuality {
  score: number;
  isGood: boolean;
  reason: string;
}

export default function ProfessionalDocumentScanner() {
  // États principaux
  const [mode, setMode] = useState<'scan' | 'edit' | 'gallery'>('scan');
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('magic');
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  
  // États de détection
  const [isScanning, setIsScanning] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState<Corner[]>([]);
  const [detectionQuality, setDetectionQuality] = useState<DetectionQuality>({ score: 0, isGood: false, reason: 'Recherche...' });
  const [stableFrames, setStableFrames] = useState(0);
  const [openCVReady, setOpenCVReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastCornersRef = useRef<Corner[]>([]);
  const autoCaptureTimeoutRef = useRef<number | null>(null);

  // Charger OpenCV au démarrage
  useEffect(() => {
    loadOpenCV()
      .then(() => setOpenCVReady(true))
      .catch(() => setOpenCVReady(false));
    
    loadDocuments();
    
    return () => {
      stopScanning();
    };
  }, []);

  // Charger les documents depuis localStorage
  const loadDocuments = () => {
    try {
      const stored = localStorage.getItem('scannedDocuments');
      if (stored) {
        setDocuments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  // Sauvegarder les documents
  const saveDocument = (doc: ScannedDocument) => {
    const updated = [doc, ...documents].slice(0, 50);
    localStorage.setItem('scannedDocuments', JSON.stringify(updated));
    setDocuments(updated);
  };

  // Démarrer le scan
  const startScanning = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Votre navigateur ne supporte pas l\'accès à la caméra. Utilisez Chrome, Firefox ou Safari récent.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsScanning(true);
              
              if (openCVReady) {
                startContinuousDetection();
              }
            })
            .catch(err => {
              console.error('Erreur play():', err);
              alert('Erreur lors du démarrage de la vidéo: ' + err.message);
            });
        };
      }
    } catch (error: any) {
      console.error('Erreur caméra:', error);
      
      let message = 'Impossible d\'accéder à la caméra. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message += 'Vous devez autoriser l\'accès à la caméra.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        message += 'Aucune caméra détectée.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        message += 'La caméra est déjà utilisée.';
      } else {
        message += error.message || 'Erreur inconnue.';
      }
      
      alert(message);
    }
  };

  // Arrêter le scan
  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    if (autoCaptureTimeoutRef.current) {
      clearTimeout(autoCaptureTimeoutRef.current);
    }
    setIsScanning(false);
    setDetectedCorners([]);
    setStableFrames(0);
  };

  // Détection continue
  const startContinuousDetection = () => {
    let lastDetectionTime = 0;
    
    detectionIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      if (now - lastDetectionTime < 500) return; // Throttle à 500ms (plus stable)
      
      lastDetectionTime = now;
      performDetection();
    }, 100);
  };

  // Effectuer la détection
  const performDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !openCVReady) return;

    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    try {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.7);

      const corners = await detectDocumentCorners(imageUrl);
      
      if (corners && corners.length === 4) {
        setDetectedCorners(corners);
        
        const quality = evaluateDetectionQuality(corners, video.videoWidth, video.videoHeight);
        setDetectionQuality(quality);
        
        // Vérifier la stabilité pour auto-capture
        if (quality.isGood) {
          const isStable = areCornersStable(corners, lastCornersRef.current);
          lastCornersRef.current = corners;
          
          if (isStable) {
            setStableFrames(prev => {
              const newCount = prev + 1;
              
              // Auto-capture après 3 frames stables (plus rapide)
              if (newCount >= 3 && !autoCaptureTimeoutRef.current) {
                autoCaptureTimeoutRef.current = window.setTimeout(() => {
                  autoCapture(imageUrl, corners);
                }, 100);
              }
              
              return newCount;
            });
          } else {
            setStableFrames(0);
            if (autoCaptureTimeoutRef.current) {
              clearTimeout(autoCaptureTimeoutRef.current);
              autoCaptureTimeoutRef.current = null;
            }
          }
        } else {
          setStableFrames(0);
          lastCornersRef.current = corners;
        }
      } else {
        setDetectedCorners([]);
        setDetectionQuality({ score: 0, isGood: false, reason: 'Document non détecté' });
        setStableFrames(0);
      }
    } catch (error) {
      console.error('Erreur détection:', error);
    }
  };

  // Évaluer la qualité de la détection
  const evaluateDetectionQuality = (corners: Corner[], width: number, height: number): DetectionQuality => {
    // Calculer l'aire du document détecté
    const area = calculatePolygonArea(corners);
    const imageArea = width * height;
    const areaRatio = area / imageArea;

    // Vérifier que le document occupe entre 20% et 85% de l'image
    if (areaRatio < 0.20) {
      return { score: 30, isGood: false, reason: 'Rapprochez-vous du document' };
    }
    if (areaRatio > 0.85) {
      return { score: 40, isGood: false, reason: 'Éloignez-vous un peu' };
    }

    // Vérifier que c'est bien un quadrilatère
    const angles = calculateCornerAngles(corners);
    const hasGoodAngles = angles.every(angle => angle > 45 && angle < 135);
    
    if (!hasGoodAngles) {
      return { score: 50, isGood: false, reason: 'Alignez le document' };
    }

    // Vérifier l'aspect ratio (doit être raisonnable)
    const aspectRatio = calculateAspectRatio(corners);
    if (aspectRatio < 0.5 || aspectRatio > 2.5) {
      return { score: 60, isGood: false, reason: 'Cadrez mieux le document' };
    }

    // Tout est bon !
    const score = Math.min(100, Math.round(areaRatio * 100 + (hasGoodAngles ? 20 : 0)));
    return { score, isGood: true, reason: 'Document bien cadré !' };
  };

  // Calculer l'aire d'un polygone
  const calculatePolygonArea = (corners: Corner[]): number => {
    let area = 0;
    for (let i = 0; i < corners.length; i++) {
      const j = (i + 1) % corners.length;
      area += corners[i].x * corners[j].y;
      area -= corners[j].x * corners[i].y;
    }
    return Math.abs(area / 2);
  };

  // Calculer les angles aux coins
  const calculateCornerAngles = (corners: Corner[]): number[] => {
    const angles: number[] = [];
    for (let i = 0; i < corners.length; i++) {
      const prev = corners[(i - 1 + corners.length) % corners.length];
      const curr = corners[i];
      const next = corners[(i + 1) % corners.length];
      
      const angle1 = Math.atan2(prev.y - curr.y, prev.x - curr.x);
      const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      let angle = Math.abs(angle2 - angle1) * (180 / Math.PI);
      
      if (angle > 180) angle = 360 - angle;
      angles.push(angle);
    }
    return angles;
  };

  // Calculer l'aspect ratio
  const calculateAspectRatio = (corners: Corner[]): number => {
    const width1 = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
    const width2 = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
    const height1 = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
    const height2 = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
    
    const avgWidth = (width1 + width2) / 2;
    const avgHeight = (height1 + height2) / 2;
    
    return Math.min(avgWidth, avgHeight) / Math.max(avgWidth, avgHeight);
  };

  // Vérifier si les coins sont stables
  const areCornersStable = (current: Corner[], previous: Corner[]): boolean => {
    if (!previous || previous.length !== 4) return false;
    
    const THRESHOLD = 15; // pixels
    
    for (let i = 0; i < 4; i++) {
      const distance = Math.hypot(
        current[i].x - previous[i].x,
        current[i].y - previous[i].y
      );
      if (distance > THRESHOLD) return false;
    }
    
    return true;
  };

  // Capture automatique
  const autoCapture = async (imageUrl: string, corners: Corner[]) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Recadrer et corriger la perspective
      const cropped = await cropAndCorrectPerspective(imageUrl, corners);
      
      // Appliquer le filtre automatique
      const filtered = await applyDocumentFilter(cropped, 'magic');
      
      setCurrentImage(cropped);
      setProcessedImage(filtered);
      stopScanning();
      setMode('edit');
    } catch (error) {
      console.error('Erreur capture auto:', error);
    } finally {
      setIsProcessing(false);
      autoCaptureTimeoutRef.current = null;
    }
  };

  // Capture manuelle
  const manualCapture = async () => {
    if (!videoRef.current || !canvasRef.current || detectedCorners.length !== 4) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.95);

    await autoCapture(imageUrl, detectedCorners);
  };

  // Dessiner l'overlay
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current || detectedCorners.length !== 4) return;

    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.width = `${video.clientWidth}px`;
    canvas.style.height = `${video.clientHeight}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Masque sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zone détectée
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(detectedCorners[0].x, detectedCorners[0].y);
    for (let i = 1; i < detectedCorners.length; i++) {
      ctx.lineTo(detectedCorners[i].x, detectedCorners[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Bordure
    const color = detectionQuality.isGood ? '#10b981' : '#f59e0b';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(detectedCorners[0].x, detectedCorners[0].y);
    for (let i = 1; i < detectedCorners.length; i++) {
      ctx.lineTo(detectedCorners[i].x, detectedCorners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Coins
    detectedCorners.forEach((corner) => {
      ctx.fillStyle = detectionQuality.isGood ? '#10b981' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [detectedCorners, detectionQuality]);

  // Appliquer un filtre
  const applyFilter = async (filter: FilterType) => {
    if (!currentImage) return;
    
    setIsProcessing(true);
    try {
      const filtered = await applyDocumentFilter(currentImage, filter);
      setProcessedImage(filtered);
      setSelectedFilter(filter);
    } catch (error) {
      console.error('Erreur filtre:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotation
  const handleRotate = async () => {
    if (!processedImage) return;
    
    setIsProcessing(true);
    try {
      const rotated = await rotateImage(processedImage, 90);
      setProcessedImage(rotated);
      setCurrentImage(rotated);
    } catch (error) {
      console.error('Erreur rotation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!processedImage) return;

    try {
      const doc: ScannedDocument = {
        id: Date.now().toString(),
        name: `Document ${new Date().toLocaleDateString('fr-FR')}`,
        imageUrl: processedImage,
        timestamp: Date.now(),
        filter: selectedFilter
      };
      
      saveDocument(doc);
      
      const file = await dataURLtoFile(processedImage, `${doc.name}.jpg`);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('✅ Document sauvegardé !');
      setMode('gallery');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  // Filtres disponibles
  const filters = [
    { id: 'magic' as FilterType, name: 'Auto', icon: Sparkles },
    { id: 'bw' as FilterType, name: 'N&B', icon: Zap },
    { id: 'grayscale' as FilterType, name: 'Gris', icon: ImageIcon },
    { id: 'color' as FilterType, name: 'Couleur', icon: Camera },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hidden video element - always rendered for ref */}
      <video ref={videoRef} className="hidden" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Scanner Pro</h1>
                <p className="text-xs text-slate-400">Détection auto • Capture intelligente</p>
              </div>
            </div>

            {mode === 'edit' && (
              <button onClick={() => { setMode('scan'); setCurrentImage(null); }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mode Scan */}
      {mode === 'scan' && !isScanning && (
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl">
              <Camera className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Scanner Professionnel</h2>
            <p className="text-lg text-slate-400">
              Détection automatique • Capture intelligente • Qualité scanner
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={startScanning}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-5 rounded-2xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              Démarrer le scan
            </button>

            {documents.length > 0 && (
              <button
                onClick={() => setMode('gallery')}
                className="w-full bg-slate-800 text-white px-8 py-5 rounded-2xl font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-3"
              >
                <FileText className="w-6 h-6" />
                Voir mes documents ({documents.length})
              </button>
            )}
          </div>

          {!openCVReady && (
            <div className="mt-8 bg-orange-500/20 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-orange-300 text-sm">IA de détection en cours de chargement...</p>
            </div>
          )}
        </div>
      )}

      {/* Mode Scan Actif */}
      {mode === 'scan' && isScanning && (
        <div className="fixed inset-0 bg-black z-50">
          {/* Video visible */}
          <div className="absolute inset-0 w-full h-full">
            <video
              className="w-full h-full object-cover"
              ref={(el) => {
                if (el && videoRef.current) {
                  // Clone the stream to the visible video
                  el.srcObject = videoRef.current.srcObject;
                  el.play().catch(console.error);
                }
              }}
              autoPlay
              playsInline
              muted
            />
          </div>
          
          {/* Overlay */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Hidden canvas - removed, already at top level */}

          {/* Status */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
            {!openCVReady ? (
              <div className="bg-orange-500/90 backdrop-blur-sm px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Chargement IA...
              </div>
            ) : detectionQuality.isGood ? (
              <div className="bg-emerald-500/90 backdrop-blur-sm px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="w-5 h-5" />
                {detectionQuality.reason}
                {stableFrames > 0 && ` (${stableFrames}/3)`}
              </div>
            ) : detectedCorners.length === 4 ? (
              <div className="bg-amber-500/90 backdrop-blur-sm px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5" />
                {detectionQuality.reason}
              </div>
            ) : (
              <div className="bg-blue-500/90 backdrop-blur-sm px-6 py-3 rounded-full text-white font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 animate-pulse" />
                Recherche de document...
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
            <button
              onClick={stopScanning}
              className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-700 transition-all flex items-center justify-center text-white border-2 border-slate-600"
            >
              <X className="w-7 h-7" />
            </button>

            <button
              onClick={manualCapture}
              disabled={detectedCorners.length !== 4 || isProcessing}
              className="w-20 h-20 rounded-full bg-white hover:bg-emerald-50 transition-all disabled:opacity-30 shadow-2xl flex items-center justify-center border-4 border-emerald-500"
            >
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode Edit */}
      {mode === 'edit' && processedImage && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Image */}
            <div className="lg:col-span-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="relative bg-black aspect-[3/4] flex items-center justify-center">
                  <img
                    src={processedImage}
                    alt="Document"
                    className="max-w-full max-h-full object-contain"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* Filtres */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
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
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedFilter === filter.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${
                          selectedFilter === filter.id ? 'text-emerald-400' : 'text-slate-400'
                        }`} />
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
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                <button
                  onClick={handleRotate}
                  disabled={isProcessing}
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-5 h-5" />
                  Rotation 90°
                </button>

                <button
                  onClick={() => { setMode('scan'); setCurrentImage(null); }}
                  className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Nouveau scan
                </button>

                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery */}
      {mode === 'gallery' && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Mes documents</h2>
            <button
              onClick={() => setMode('scan')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Nouveau scan
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Aucun document</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-emerald-500 transition-all group"
                >
                  <div className="relative aspect-[3/4] bg-black">
                    <img
                      src={doc.imageUrl}
                      alt={doc.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-white font-medium truncate mb-2">{doc.name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCurrentImage(doc.imageUrl);
                          setProcessedImage(doc.imageUrl);
                          setSelectedFilter(doc.filter);
                          setMode('edit');
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                      >
                        Ouvrir
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Supprimer ce document ?')) {
                            const updated = documents.filter(d => d.id !== doc.id);
                            localStorage.setItem('scannedDocuments', JSON.stringify(updated));
                            setDocuments(updated);
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg"
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
    </div>
  );
}
