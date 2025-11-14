import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Camera, Zap, ZapOff } from 'lucide-react';
import { useOpenCVWorker } from '../hooks/useOpenCVWorker';

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
  const { isReady: isWorkerReady, detectDocument, cropDocument, terminateWorker } = useOpenCVWorker();
  const isDetectingRef = useRef(false);

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
    terminateWorker();
    setIsCameraReady(false);
  }, [terminateWorker]);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || isCapturing || !isWorkerReady) return;
    setIsCapturing(true);
    setStatus('Capture en cours...');

    try {
      const video = videoRef.current;
      
      // Utiliser OffscreenCanvas pour de meilleures performances
      let imageData: ImageData;
      
      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight);
        const ctx = offscreen.getContext('2d');
        if (!ctx) throw new Error('OffscreenCanvas context is null');
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        imageData = ctx.getImageData(0, 0, video.videoWidth, video.videoHeight);
      } else {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas context is null');
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      }

      const corners = await detectDocument(imageData);

      if (corners) {
        const croppedImageData = await cropDocument(imageData, corners);
        if (croppedImageData) {
          const resultCanvas = document.createElement('canvas');
          resultCanvas.width = croppedImageData.width;
          resultCanvas.height = croppedImageData.height;
          const resultCtx = resultCanvas.getContext('2d');
          if (resultCtx) {
            resultCtx.putImageData(croppedImageData, 0, 0);
            const croppedUri = resultCanvas.toDataURL('image/jpeg', 0.9);
            onScanComplete(croppedUri);
          }
        } else {
          // Convertir imageData en dataURL
          const fallbackCanvas = document.createElement('canvas');
          fallbackCanvas.width = imageData.width;
          fallbackCanvas.height = imageData.height;
          const fallbackCtx = fallbackCanvas.getContext('2d');
          if (fallbackCtx) {
            fallbackCtx.putImageData(imageData, 0, 0);
            const imageUri = fallbackCanvas.toDataURL('image/jpeg', 0.9);
            onScanComplete(imageUri);
          }
        }
      } else {
        // Convertir imageData en dataURL
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = imageData.width;
        fallbackCanvas.height = imageData.height;
        const fallbackCtx = fallbackCanvas.getContext('2d');
        if (fallbackCtx) {
          fallbackCtx.putImageData(imageData, 0, 0);
          const imageUri = fallbackCanvas.toDataURL('image/jpeg', 0.9);
          onScanComplete(imageUri);
        }
      }
    } catch (error) {
      console.error('Erreur de capture:', error);
      setStatus('Erreur de capture. Réessayez.');
      setIsCapturing(false);
    } finally {
      stopCamera();
    }
  }, [isCapturing, isWorkerReady, onScanComplete, stopCamera, detectDocument, cropDocument]);

  const performDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended || isCapturing || !isWorkerReady) {
      return;
    }

    // Éviter les détections simultanées
    if (isDetectingRef.current) return;
    isDetectingRef.current = true;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Utiliser OffscreenCanvas si disponible pour de meilleures performances
      let imageData: ImageData;
      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight);
        const offscreenCtx = offscreen.getContext('2d');
        if (offscreenCtx) {
          offscreenCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          imageData = offscreenCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);
        } else {
          return;
        }
      } else {
        // Fallback pour navigateurs qui ne supportent pas OffscreenCanvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = video.videoWidth;
        tempCanvas.height = video.videoHeight;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!tempCtx) return;
        tempCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      }

      const corners = await detectDocument(imageData);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Lissage des coins pour éviter les tremblements
      let smoothedCorners = corners;
      if (corners && lastDetectedCorners.current) {
        // Moyenne mobile sur les coins pour stabilité
        cornerHistoryRef.current.push(corners);
        if (cornerHistoryRef.current.length > 3) {
          cornerHistoryRef.current.shift();
        }
        
        // Calculer la moyenne des positions
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
        setStatus('Document détecté ! Maintenez stable.');
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(smoothedCorners[0].x, smoothedCorners[0].y);
        for (let i = 1; i < smoothedCorners.length; i++) {
          ctx.lineTo(smoothedCorners[i].x, smoothedCorners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Logique de capture automatique
        stableDetectionCount.current++;
        if (stableDetectionCount.current > 8) {
          if (!captureTimeout.current && !isCapturing) {
            setStatus('Capture automatique dans 1s...');
            captureTimeout.current = setTimeout(() => {
              handleCapture();
            }, 1000);
          }
        }
      } else {
        setStatus('Recherche de document...');
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
  }, [handleCapture, isCapturing, isWorkerReady, detectDocument]);

  useEffect(() => {
    let detectionInterval: ReturnType<typeof setInterval>;

    const startCamera = async () => {
      try {
        setStatus('Chargement d\'OpenCV.js (8MB)...');
        
        // Attendre que le worker soit prêt avec feedback visuel
        if (!isWorkerReady) {
          let dots = 0;
          const loadingInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            setStatus('Chargement d\'OpenCV.js' + '.'.repeat(dots) + ' (peut prendre 10-30s)');
          }, 500);

          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              if (isWorkerReady) {
                clearInterval(checkInterval);
                clearInterval(loadingInterval);
                resolve();
              }
            }, 100);
          });
        }
        
        setStatus('Initialisation de la caméra...');

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
          streamRef.current = stream;
          detectionInterval = setInterval(performDetection, 200); // Détection toutes les 200ms
        }
      } catch (err) {
        console.error('Erreur caméra:', err);
        setStatus('Erreur caméra. Vérifiez les permissions.');
        alert('Impossible d\'accéder à la caméra. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
        onCancel();
      }
    };

    startCamera();

    return () => {
      clearInterval(detectionInterval);
      stopCamera();
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
