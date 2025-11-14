import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Camera, Zap, ZapOff } from 'lucide-react';
import { 
  initializeTensorFlow, 
  detectDocument, 
  correctPerspective,
  cleanup 
} from '../utils/tensorflowScanner';

interface ScannerViewProps {
  onScanComplete: (imageUri: string) => void;
  onCancel: () => void;
}

const ScannerView: React.FC<ScannerViewProps> = ({ onScanComplete, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [status, setStatus] = useState('Chargement...');
  const [isFlashOn, setIsFlashOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const stableDetectionCount = useRef(0);
  const captureTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDetectedCorners = useRef<any>(null);
  const cornerHistoryRef = useRef<any[]>([]);
  const isDetectingRef = useRef(false);
  const [isTensorFlowReady, setIsTensorFlowReady] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);

  const stopCamera = useCallback(() => {
    if (captureTimeout.current) {
      clearTimeout(captureTimeout.current);
      captureTimeout.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);
    setStatus('Capture en cours...');

    try {
      const video = videoRef.current;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context is null');
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const result = await detectDocument(tempCanvas);

      if (result.corners && result.confidence > 0.3) {
        const croppedUri = await correctPerspective(tempCanvas, result.corners);
        onScanComplete(croppedUri);
      } else {
        const imageUri = tempCanvas.toDataURL('image/jpeg', 0.9);
        onScanComplete(imageUri);
      }
    } catch (error) {
      console.error('Erreur de capture:', error);
      setStatus('Erreur de capture. Réessayez.');
      setIsCapturing(false);
    } finally {
      stopCamera();
    }
  }, [isCapturing, onScanComplete, stopCamera]);

  const performDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended || isCapturing || !isTensorFlowReady) {
      return;
    }

    // Éviter les détections simultanées
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Créer un canvas temporaire pour la détection
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      const result = await detectDocument(tempCanvas);
      const corners = result.corners;
      setDetectionConfidence(result.confidence);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Lissage des coins pour éviter les tremblements
      let smoothedCorners = corners;
      if (corners && lastDetectedCorners.current) {
        cornerHistoryRef.current.push(corners);
        if (cornerHistoryRef.current.length > 3) {
          cornerHistoryRef.current.shift();
        }
        
        if (cornerHistoryRef.current.length >= 2) {
          smoothedCorners = corners.map((_corner: any, idx: number) => {
            const avgX = cornerHistoryRef.current.reduce((sum, hist) => sum + hist[idx].x, 0) / cornerHistoryRef.current.length;
            const avgY = cornerHistoryRef.current.reduce((sum, hist) => sum + hist[idx].y, 0) / cornerHistoryRef.current.length;
            return { x: avgX, y: avgY };
          });
        }
      } else {
        cornerHistoryRef.current = [];
      }
      
      lastDetectedCorners.current = corners;
      
      if (smoothedCorners) {
        const confidenceText = `Confiance: ${Math.round(result.confidence * 100)}%`;
        setStatus(`Document détecté ! ${confidenceText}`);
        ctx.strokeStyle = result.confidence > 0.6 ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(smoothedCorners[0].x, smoothedCorners[0].y);
        for (let i = 1; i < smoothedCorners.length; i++) {
          ctx.lineTo(smoothedCorners[i].x, smoothedCorners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        stableDetectionCount.current++;
        if (stableDetectionCount.current > 8 && result.confidence > 0.5) {
          if (!captureTimeout.current && !isCapturing) {
            setStatus('Capture automatique dans 1s...');
            captureTimeout.current = setTimeout(() => {
              handleCapture();
            }, 1000);
          }
        }
      } else {
        setStatus('Recherche de document (GPU)...');
        stableDetectionCount.current = 0;
        if (captureTimeout.current) {
          clearTimeout(captureTimeout.current);
          captureTimeout.current = null;
        }
      }
    } catch (error) {
      console.error('Erreur détection:', error);
    } finally {
      isDetectingRef.current = false;
    }
  }, [handleCapture, isCapturing, isTensorFlowReady]);

  useEffect(() => {
    let detectionInterval: ReturnType<typeof setInterval>;

    const startCamera = async () => {
      try {
        setStatus('Initialisation TensorFlow.js (GPU)...');
        await initializeTensorFlow();
        setIsTensorFlowReady(true);
        setStatus('Détection GPU activée !');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setStatus('Demande d\'accès caméra...');

        // Vérifier d'abord si l'API est disponible
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('API caméra non supportée par ce navigateur');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraReady(true);
          setStatus('Caméra prête ! Positionnez le document.');
          streamRef.current = stream;
          detectionInterval = setInterval(performDetection, 150); // 150ms pour plus de réactivité
        }
      } catch (err: any) {
        console.error('Erreur caméra:', err);
        
        let errorMessage = 'Erreur caméra inconnue';
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Permission caméra refusée. Autorisez l\'accès dans les paramètres du navigateur.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'Aucune caméra trouvée sur cet appareil.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'La caméra est déjà utilisée par une autre application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Impossible d\'utiliser la caméra arrière. Tentative avec caméra avant...';
          
          // Réessayer avec n'importe quelle caméra
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
              audio: false,
            });
            
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
              setIsCameraReady(true);
              setStatus('Caméra prête ! (caméra avant)');
              streamRef.current = fallbackStream;
              detectionInterval = setInterval(performDetection, 150);
              return;
            }
          } catch (fallbackErr) {
            console.error('Fallback camera error:', fallbackErr);
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setStatus(errorMessage);
        alert(errorMessage + '\n\nVeuillez vérifier :\n1. Les permissions caméra\n2. Qu\'aucune autre app n\'utilise la caméra\n3. Que vous utilisez HTTPS ou localhost');
        onCancel();
      }
    };

    startCamera();

    return () => {
      clearInterval(detectionInterval);
      stopCamera();
      cleanup(); // Nettoyer la mémoire GPU
    };
  }, [onCancel, stopCamera, performDetection]);

  const toggleFlash = useCallback(async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      // @ts-ignore
      if (capabilities.torch) {
        try {
          await videoTrack.applyConstraints({
            // @ts-ignore
            advanced: [{ torch: !isFlashOn }],
          });
          setIsFlashOn(!isFlashOn);
        } catch (err) {
          console.error('Erreur flash:', err);
          alert('Impossible de contrôler le flash sur cet appareil.');
        }
      } else {
        alert('Le flash n\'est pas disponible sur cet appareil.');
      }
    }
  }, [isFlashOn]);

  return (
    <div className="absolute inset-0 bg-black text-white flex flex-col">
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      ></video>
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full object-contain"></canvas>

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={toggleFlash}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          {isFlashOn ? <ZapOff size={24} /> : <Zap size={24} />}
        </button>
        <div className="text-center">
          <p className="font-semibold">{status}</p>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <X size={24} />
        </button>
      </header>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 flex justify-center items-center bg-gradient-to-t from-black/50 to-transparent">
        <button
          onClick={handleCapture}
          disabled={!isCameraReady || isCapturing}
          className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-white/30 disabled:opacity-50 transition-transform transform active:scale-90"
          aria-label="Capturer le document"
        >
          <Camera size={40} className="text-black" />
        </button>
      </footer>

      {!isCameraReady && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
          <p className="text-lg">{status}</p>
        </div>
      )}
    </div>
  );
};

export default ScannerView;
