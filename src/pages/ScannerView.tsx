import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Camera, Zap, ZapOff } from 'lucide-react';
import { loadOpenCV, detectDocumentCorners, cropAndCorrectPerspective } from '../utils/opencv';

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
  const captureTimeout = useRef<NodeJS.Timeout | null>(null);

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

      const corners = detectDocumentCorners(tempCanvas);

      if (corners) {
        const croppedUri = cropAndCorrectPerspective(tempCanvas, corners);
        onScanComplete(croppedUri);
      } else {
        const imageUri = tempCanvas.toDataURL('image/jpeg', 0.9);
        onScanComplete(imageUri);
      }
    } catch (error) {
      console.error('Erreur de capture:', error);
      setStatus('Erreur de capture. Réessayez.');
      setIsCapturing(false); // Permettre une nouvelle tentative
    } finally {
      stopCamera(); // Arrêter la caméra après la capture
    }
  }, [isCapturing, onScanComplete, stopCamera]);

  const performDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended || isCapturing) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const corners = detectDocumentCorners(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (corners) {
      setStatus('Document détecté ! Maintenez stable.');
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Logique de capture automatique
      stableDetectionCount.current++;
      if (stableDetectionCount.current > 5) { // 5 frames stables
        if (!captureTimeout.current && !isCapturing) {
          setStatus('Capture automatique...');
          captureTimeout.current = setTimeout(() => {
            handleCapture();
          }, 300); // Délai de 300ms pour la stabilité
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
  }, [handleCapture, isCapturing]);

  useEffect(() => {
    let detectionInterval: NodeJS.Timeout;

    const startCamera = async () => {
      try {
        setStatus('Initialisation de la caméra...');
        await loadOpenCV();
        setStatus('Caméra prête. Positionnez le document.');

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
          detectionInterval = setInterval(performDetection, 100); // Détection plus rapide
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
