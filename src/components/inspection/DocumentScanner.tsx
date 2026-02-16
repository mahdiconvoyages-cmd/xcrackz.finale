/**
 * 📄 Document Scanner Component - Powered by Dynamsoft
 * 
 * Fonctionnalités:
 * - Scan de documents en direct via webcam
 * - Détection automatique des bords
 * - Correction de perspective
 * - Amélioration automatique de l'image
 * - Recadrage intelligent
 * 
 * Utilisation: Scan de carte grise, assurance, PV, etc.
 */

import { useEffect, useRef, useState } from 'react';
import { Camera, Loader, X, Check, RotateCcw } from 'lucide-react';
import { LicenseManager } from 'dynamsoft-license';
import { CaptureVisionRouter } from 'dynamsoft-capture-vision-router';

interface DocumentScannerProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  documentType?: 'registration' | 'insurance' | 'receipt' | 'generic';
  title?: string;
}

export default function DocumentScanner({ 
  onCapture, 
  onCancel,
  documentType = 'generic',
  title = 'Scanner un document'
}: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [router, setRouter] = useState<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initScanner();
    return () => cleanup();
  }, []);

  const initScanner = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Configuration Dynamsoft (License publique de test)
      // Pour production, obtiens une license sur: https://www.dynamsoft.com/customer/license/trialLicense
      await LicenseManager.initLicense(
        'DLS2eyJoYW5kc2hha2VDb2RlIjoiMjAwMDAxLTE2NDk4Mjk3OTI2MzUiLCJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInNlc3Npb25QYXNzd29yZCI6IndTcGR6Vm05WDJrcEQ5YUoifQ=='
      );

      // Initialiser le routeur de capture
      const cvRouter = await CaptureVisionRouter.createInstance();
      setRouter(cvRouter);

      // Démarrer la caméra
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
        await videoRef.current.play();
      }

      setIsInitializing(false);
    } catch (err: any) {
      console.error('Erreur initialisation scanner:', err);
      setError(err.message || 'Impossible d\'accéder à la caméra');
      setIsInitializing(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (router) {
      router.dispose();
    }
  };

  const captureDocument = async () => {
    if (!videoRef.current || !canvasRef.current || !router) return;

    try {
      setIsProcessing(true);
      setError(null);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Canvas context non disponible');

      // Capturer l'image de la vidéo
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Détecter et normaliser le document avec Dynamsoft
      const result = await router.capture(canvas, 'DetectDocumentBoundaries_Default');
      
      if (result.items && result.items.length > 0) {
        const normalizedImage = result.items[0].toCanvas();
        
        // Améliorer l'image (contraste, netteté)
        const enhancedCanvas = enhanceImage(normalizedImage);
        
        // Convertir en image prévisualisable
        const dataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
      } else {
        // Si pas de détection automatique, utiliser l'image brute améliorée
        const enhancedCanvas = enhanceImage(canvas);
        const dataUrl = enhancedCanvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
      }

      setIsProcessing(false);
    } catch (err: any) {
      console.error('Erreur capture:', err);
      setError('Erreur lors de la capture du document');
      setIsProcessing(false);
    }
  };

  const enhanceImage = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return sourceCanvas;

    // Dessiner l'image source
    ctx.drawImage(sourceCanvas, 0, 0);

    // Améliorer le contraste et la netteté
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Augmenter le contraste
    const factor = 1.2; // Facteur de contraste
    const intercept = 0.5 * (1 - factor);

    for (let i = 0; i < data.length; i += 4) {
      data[i] = factor * data[i] + intercept * 255;     // R
      data[i + 1] = factor * data[i + 1] + intercept * 255; // G
      data[i + 2] = factor * data[i + 2] + intercept * 255; // B
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const confirmCapture = async () => {
    if (!capturedImage) return;

    try {
      // Convertir dataURL en File
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `document_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      onCapture(file);
      cleanup();
    } catch (err) {
      console.error('Erreur confirmation:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
  };

  const getDocumentTypeLabel = () => {
    switch (documentType) {
      case 'registration': return 'Carte Grise';
      case 'insurance': return 'Attestation d\'Assurance';
      case 'receipt': return 'PV de Livraison';
      default: return 'Document';
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {title || `Scanner ${getDocumentTypeLabel()}`}
        </h2>
        <button
          onClick={() => { cleanup(); onCancel(); }}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 relative overflow-hidden">
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <Loader className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p>Initialisation de la caméra...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-center text-white max-w-md mx-auto p-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Erreur</h3>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={initScanner}
                className="bg-[#14B8A6] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0D9488] transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* Aperçu vidéo */}
        {!capturedImage && !isInitializing && !error && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            
            {/* Overlay guide de cadrage */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Zone sombre semi-transparente */}
                <defs>
                  <mask id="docMask">
                    <rect x="0" y="0" width="100" height="100" fill="white" />
                    <rect x="10" y="20" width="80" height="60" rx="2" fill="black" />
                  </mask>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="black" opacity="0.5" mask="url(#docMask)" />
                
                {/* Cadre de guidage */}
                <rect 
                  x="10" y="20" width="80" height="60" 
                  fill="none" 
                  stroke="#14B8A6" 
                  strokeWidth="0.5" 
                  strokeDasharray="2,2"
                  rx="2"
                />
                
                {/* Coins du cadre */}
                <path d="M 10 22 L 10 20 L 12 20" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                <path d="M 88 20 L 90 20 L 90 22" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                <path d="M 90 78 L 90 80 L 88 80" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                <path d="M 12 80 L 10 80 L 10 78" stroke="#14B8A6" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              </svg>
              
              {/* Instructions */}
              <div className="absolute bottom-32 left-0 right-0 text-center">
                <div className="bg-black/70 text-white px-4 py-3 rounded-lg inline-block mx-auto">
                  <p className="text-sm font-medium">Placez le document dans le cadre</p>
                  <p className="text-xs text-gray-300 mt-1">La détection sera automatique</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Image capturée */}
        {capturedImage && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img 
              src={capturedImage} 
              alt="Document scanné" 
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {/* Canvas caché pour le traitement */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Boutons d'action */}
      <div className="bg-gray-900 p-6">
        {!capturedImage ? (
          <button
            onClick={captureDocument}
            disabled={isInitializing || isProcessing}
            className="w-full bg-[#14B8A6] text-white py-4 rounded-lg font-semibold hover:bg-[#0D9488] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Capturer le document
              </>
            )}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={retakePhoto}
              className="flex-1 bg-gray-700 text-white py-4 rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Reprendre
            </button>
            <button
              onClick={confirmCapture}
              className="flex-1 bg-[#14B8A6] text-white py-4 rounded-lg font-semibold hover:bg-[#0D9488] transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Valider
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
