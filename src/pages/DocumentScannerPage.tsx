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
import { Camera, RotateCw, Download, X, Sparkles, Palette, Contrast, Image as ImageIcon, Loader, Move, Check, FileText, Trash2 } from 'lucide-react';
import { applyDocumentFilter, rotateImage, FilterType, dataURLtoFile } from '../utils/imageProcessing';
import { detectDocumentCorners, cropAndCorrectPerspective, loadOpenCV } from '../utils/documentDetection';

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
  const [step, setStep] = useState<'intro' | 'crop' | 'edit' | 'gallery'>('intro');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('magic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('document');
  const [isLoadingOpenCV, setIsLoadingOpenCV] = useState(false);
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ScannedDocument | null>(null);
  const [openCVReady, setOpenCVReady] = useState(false);
  
  // Manuel crop state
  // Ancien état de compatibilité supprimé (la page gère déjà le step "crop")
  const [corners, setCorners] = useState<Corner[]>([]);
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  // Mémorisation éventuelle des dimensions, principalement pour debug / évolutions
  // Dimensions de l'image brute (utilisées pour certains calculs internes)
  // NOTE: imageDimensions était utilisé dans une version précédente pour le debug, supprimé pour éviter les warnings.
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

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

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      
      streamRef.current = stream;
      
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        await webcamVideoRef.current.play();
      }
      
      setIsWebcamActive(true);
    } catch (error) {
      console.error('Erreur webcam:', error);
      alert('Impossible d\'accéder à la webcam');
    }
  };

  const captureFromWebcam = async () => {
    if (!webcamVideoRef.current) return;

    const video = webcamVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    setIsProcessing(true);
    stopWebcam();
    
      try {
      // Stocker l'image brute
      setRawImage(imageUrl);
      
      // Détecter les coins automatiquement
      if (openCVReady) {
        const detectedCorners = await detectDocumentCorners(imageUrl);
        setCorners(detectedCorners);
      } else {
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
      
      setStep('crop');
    } catch (error) {
      console.error('Erreur traitement webcam:', error);
      setOriginalImage(imageUrl);
      await applyFilter('magic', imageUrl);
      setStep('edit');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
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
    setSelectedDoc(null);
    setStep('intro');
    setSelectedFilter('magic');
    setFileName('document');
    stopWebcam();
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('Supprimer ce document ?')) {
      const updatedDocs = scannedDocuments.filter(doc => doc.id !== id);
      saveDocuments(updatedDocs);
    }
  };

  const handleViewDocument = (doc: ScannedDocument) => {
    setSelectedDoc(doc);
    const url = doc.remoteUrl || doc.imageUrl;
    setOriginalImage(url);
    setProcessedImage(url);
    setFileName(doc.name);
    setSelectedFilter(doc.filter);
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
  };

  const handleSkipCrop = async () => {
    if (!rawImage) return;
    
    setIsProcessing(true);
    try {
      setOriginalImage(rawImage);
      await applyFilter('magic', rawImage);
      setStep('edit');
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPointerPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!cropCanvasRef.current) return null;
    
    const canvas = cropCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Récupérer les scales sauvegardés
    const scaleX = parseFloat(canvas.getAttribute('data-scale-x') || '1');
    const scaleY = parseFloat(canvas.getAttribute('data-scale-y') || '1');
    const imgWidth = parseFloat(canvas.getAttribute('data-img-width') || '1');
    const imgHeight = parseFloat(canvas.getAttribute('data-img-height') || '1');
    
    let clientX: number;
    let clientY: number;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
  // Position dans le canvas affiché (pixels CSS)
  const canvasX = clientX - rect.left;
  const canvasY = clientY - rect.top;
    
  if (!scaleX || !scaleY) return null;
    
  // Convertir en coordonnées de l'image originale
  const x = canvasX / scaleX;
  const y = canvasY / scaleY;
    
    return { x, y, scaleX, scaleY, imgWidth, imgHeight };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPointerPosition(e);
    if (!pos) return;
    
    // Rayon de détection en pixels de l'image originale
    const TOUCH_RADIUS = 80 / pos.scaleX; // Rayon plus large pour faciliter le drag
    
    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i].x - pos.x;
      const dy = corners[i].y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < TOUCH_RADIUS) {
        setDraggingCorner(i);
        e.preventDefault();
        return;
      }
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const pos = getPointerPosition(e);
    if (!pos) return;
    
    const TOUCH_RADIUS = 80 / pos.scaleX; // Même rayon pour le tactile
    
    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i].x - pos.x;
      const dy = corners[i].y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < TOUCH_RADIUS) {
        setDraggingCorner(i);
        e.preventDefault();
        return;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingCorner === null) return;
    
    const pos = getPointerPosition(e);
    if (!pos) return;
    
    const x = Math.max(0, Math.min(pos.imgWidth, pos.x));
    const y = Math.max(0, Math.min(pos.imgHeight, pos.y));
    
    const newCorners = [...corners];
    newCorners[draggingCorner] = { x, y };
    setCorners(newCorners);
    e.preventDefault();
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingCorner === null) return;
    
    const pos = getPointerPosition(e);
    if (!pos) return;
    
    const x = Math.max(0, Math.min(pos.imgWidth, pos.x));
    const y = Math.max(0, Math.min(pos.imgHeight, pos.y));
    
    const newCorners = [...corners];
    newCorners[draggingCorner] = { x, y };
    setCorners(newCorners);
    e.preventDefault();
  };

  const handleCanvasMouseUp = () => {
    setDraggingCorner(null);
  };

  const handleCanvasTouchEnd = () => {
    setDraggingCorner(null);
  };

  // Dessiner l'overlay de crop avec redimensionnement adaptatif
  useEffect(() => {
    if (step !== 'crop' || !cropCanvasRef.current || !rawImage || corners.length !== 4) return;
    
    const canvas = cropCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      // Obtenir les dimensions de la zone d'affichage (bloc central)
      const container = canvas.parentElement;
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Calculer le ratio pour que l'image remplisse l'écran au maximum
      const imgRatio = img.width / img.height;
      const containerRatio = containerWidth / containerHeight;
      
      let displayWidth: number;
      let displayHeight: number;
      
      // Toujours remplir au maximum la largeur OU la hauteur
      if (imgRatio > containerRatio) {
        // Image plus large : remplir la largeur
        displayWidth = containerWidth;
        displayHeight = containerWidth / imgRatio;
      } else {
        // Image plus haute : remplir la hauteur
        displayHeight = containerHeight;
        displayWidth = containerHeight * imgRatio;
      }
      
      // Définir les dimensions du canvas
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Calculer le scale pour mapper les coins
      const scaleX = displayWidth / img.width;
      const scaleY = displayHeight / img.height;
      
      // Sauvegarder le scale dans un attribut data pour les handlers
      canvas.setAttribute('data-scale-x', scaleX.toString());
      canvas.setAttribute('data-scale-y', scaleY.toString());
      canvas.setAttribute('data-img-width', img.width.toString());
      canvas.setAttribute('data-img-height', img.height.toString());
      
      // Clear et redessiner
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dessiner l'image en taille réelle du canvas
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      
      // Masque légèrement autour du document (effet beaucoup plus doux)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Zone sélectionnée (clear overlay) - adapter les coordonnées
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(corners[0].x * scaleX, corners[0].y * scaleY);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x * scaleX, corners[i].y * scaleY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      // Bordures du document
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(corners[0].x * scaleX, corners[0].y * scaleY);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x * scaleX, corners[i].y * scaleY);
      }
      ctx.closePath();
      ctx.stroke();
      
      // Coins déplaçables (plus gros pour mobile)
      corners.forEach((corner, index) => {
        const cx = corner.x * scaleX;
        const cy = corner.y * scaleY;
        
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#14b8a6';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Numéro du coin
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), cx, cy);
      });
    };
  }, [step, rawImage, corners]);

  return (
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
        {step === 'intro' && !isWebcamActive && (
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
                onClick={startWebcam}
                className="w-full bg-slate-800 text-white px-6 py-4 rounded-xl font-semibold hover:bg-slate-700 transition-all border border-slate-600 flex items-center justify-center gap-3 hidden md:flex"
              >
                <Camera className="w-6 h-6" />
                Webcam (Desktop)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-3"
              >
                <Camera className="w-6 h-6" />
                Prendre une photo
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

        {isWebcamActive && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl overflow-hidden">
              <div className="relative aspect-video bg-black">
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                
                {/* Overlay guide */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <mask id="docMask">
                        <rect x="0" y="0" width="100" height="100" fill="white" />
                        <rect x="10" y="20" width="80" height="60" rx="2" fill="black" />
                      </mask>
                    </defs>
                    <rect x="0" y="0" width="100" height="100" fill="black" opacity="0.5" mask="url(#docMask)" />
                    <rect x="10" y="20" width="80" height="60" fill="none" stroke="#14B8A6" strokeWidth="0.5" strokeDasharray="2,2" rx="2" />
                    
                    {/* Coins */}
                    <path d="M 10 22 L 10 20 L 12 20" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                    <path d="M 88 20 L 90 20 L 90 22" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                    <path d="M 90 78 L 90 80 L 88 80" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                    <path d="M 12 80 L 10 80 L 10 78" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                  </svg>
                  
                  <div className="absolute bottom-6 left-0 right-0 text-center">
                    <div className="bg-black/70 text-white px-4 py-3 rounded-lg inline-block">
                      <p className="text-sm font-medium">Placez le document dans le cadre</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex gap-3">
                <button
                  onClick={stopWebcam}
                  className="flex-1 bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={captureFromWebcam}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Capturer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Crop Mode - PLEIN ÉCRAN */}
        {step === 'crop' && rawImage && (
          <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
            {/* Header fixe */}
            <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 flex-shrink-0">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Move className="w-5 h-5 text-teal-400" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Recadrage manuel</h2>
                    <p className="text-xs text-slate-400">Déplacez les coins pour ajuster</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Zone canvas - prend tout l'espace disponible */}
            <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
              <canvas
                ref={cropCanvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchStart={handleCanvasTouchStart}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
                className="cursor-move touch-none"
              />
              
              {/* Instructions overlay */}
              <div className="absolute top-4 left-4 right-4 pointer-events-none z-10">
                <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg inline-block">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-medium">
                      {openCVReady ? 'Coins détectés automatiquement' : 'Ajustez les 4 coins du document'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions fixées en bas */}
            <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4 flex-shrink-0">
              <div className="max-w-7xl mx-auto flex gap-3">
                <button
                  onClick={handleSkipCrop}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Sans recadrage
                </button>
                <button
                  onClick={handleApplyCrop}
                  disabled={isProcessing || corners.length !== 4}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Valider le recadrage
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery View */}        {/* Gallery View */}
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
