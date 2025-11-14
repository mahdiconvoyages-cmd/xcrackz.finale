/**
 * 📸 Scanner en Temps Réel avec Détection Live
 * 
 * Fonctionnalités:
 * - Détection automatique des bords en temps réel
 * - Overlay de recadrage ajustable pendant la prise de vue
 * - Capture instantanée avec recadrage pré-appliqué
 * - Feedback visuel immédiat
 * - Performance optimisée avec throttling
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Zap, Loader, Check } from 'lucide-react';
import { detectDocumentCorners } from '../utils/documentDetection';

interface Corner {
  x: number;
  y: number;
}

interface LiveCameraScannerProps {
  onCapture: (imageUrl: string, corners: Corner[]) => void;
  onCancel: () => void;
  openCVReady: boolean;
}

export default function LiveCameraScanner({ onCapture, onCancel, openCVReady }: LiveCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  
  const [corners, setCorners] = useState<Corner[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Démarrer la caméra
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
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
        setCameraReady(true);
        
        // Démarrer la détection continue si OpenCV est prêt
        if (openCVReady) {
          startLiveDetection();
        }
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      alert('Impossible d\'accéder à la caméra');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setCameraReady(false);
  };

  // Détection en temps réel (throttled à 500ms)
  const startLiveDetection = () => {
    detectionIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      if (now - lastDetectionTimeRef.current < 500) return; // Throttle à 500ms
      
      lastDetectionTimeRef.current = now;
      performDetection();
    }, 100); // Check toutes les 100ms, mais execute toutes les 500ms
  };

  const performDetection = async () => {
    if (!videoRef.current || !canvasRef.current || isDetecting) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsDetecting(true);

    try {
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.8);

      const detectedCorners = await detectDocumentCorners(imageUrl);
      
      if (detectedCorners && detectedCorners.length === 4) {
        setCorners(detectedCorners);
        setDocumentDetected(true);
      } else {
        setDocumentDetected(false);
      }
    } catch (error) {
      console.error('Erreur détection:', error);
      setDocumentDetected(false);
    } finally {
      setIsDetecting(false);
    }
  };

  // Dessiner l'overlay en temps réel
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current || corners.length !== 4) return;

    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajuster les dimensions du canvas overlay
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.width = `${video.clientWidth}px`;
    canvas.style.height = `${video.clientHeight}px`;

    const scaleX = video.clientWidth / video.videoWidth;
    const scaleY = video.clientHeight / video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Masque sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zone détectée (clear)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Bordure du document
    const color = documentDetected ? '#10b981' : '#f59e0b';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Coins interactifs
    corners.forEach((corner, index) => {
      ctx.fillStyle = index === activeCorner ? '#10b981' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Sauvegarder les scales pour l'interaction
    canvas.setAttribute('data-scale-x', scaleX.toString());
    canvas.setAttribute('data-scale-y', scaleY.toString());
    canvas.setAttribute('data-video-width', video.videoWidth.toString());
    canvas.setAttribute('data-video-height', video.videoHeight.toString());
  }, [corners, documentDetected, activeCorner]);

  // Gestion des interactions tactiles
  const getPointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = parseFloat(canvas.getAttribute('data-scale-x') || '1');
    const scaleY = parseFloat(canvas.getAttribute('data-scale-y') || '1');
    const videoWidth = parseFloat(canvas.getAttribute('data-video-width') || '1');
    const videoHeight = parseFloat(canvas.getAttribute('data-video-height') || '1');

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    const x = canvasX / scaleX;
    const y = canvasY / scaleY;

    return { x, y, videoWidth, videoHeight };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (corners.length !== 4) return;

    const pos = getPointerPosition(event);
    if (!pos) return;

    let nearestCorner = -1;
    let minDistance = Infinity;

    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i].x - pos.x;
      const dy = corners[i].y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCorner = i;
      }
    }

    if (minDistance < 80) {
      setActiveCorner(nearestCorner);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner === null) return;

    const pos = getPointerPosition(event);
    if (!pos) return;

    const x = Math.max(0, Math.min(pos.videoWidth, pos.x));
    const y = Math.max(0, Math.min(pos.videoHeight, pos.y));

    const updated = [...corners];
    updated[activeCorner] = { x, y };
    setCorners(updated);
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner !== null) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveCorner(null);
  };

  // Capturer avec recadrage
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || corners.length !== 4 || isCapturing) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const imageUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Passer l'image et les coins à la fonction callback
      onCapture(imageUrl, corners);
    } catch (error) {
      console.error('Erreur capture:', error);
    } finally {
      setIsCapturing(false);
    }
  }, [corners, onCapture, isCapturing]);

  const cornerLabels = ['Haut gauche', 'Haut droit', 'Bas droit', 'Bas gauche'];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Scanner Live</p>
              <p className="text-xs text-slate-300">Détection automatique en temps réel</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
        {!cameraReady ? (
          <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm">Chargement caméra...</span>
          </div>
        ) : !openCVReady ? (
          <div className="bg-orange-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Mode manuel</span>
          </div>
        ) : documentDetected ? (
          <div className="bg-emerald-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
            <Check className="w-4 h-4" />
            <span className="text-sm font-semibold">Document détecté !</span>
          </div>
        ) : (
          <div className="bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Recherche de document...</span>
          </div>
        )}
      </div>

      {/* Active Corner Label */}
      {activeCorner !== null && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-10 bg-blue-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm">
          {cornerLabels[activeCorner]}
        </div>
      )}

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay Canvas */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Hidden Canvas for Detection */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-32 left-0 right-0 z-10 px-4">
        <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-3 rounded-2xl text-center max-w-md mx-auto">
          <p className="text-sm">
            {activeCorner !== null 
              ? `Ajustez le coin ${cornerLabels[activeCorner].toLowerCase()}`
              : 'Placez le document dans le cadre ou ajustez les coins'
            }
          </p>
        </div>
      </div>

      {/* Capture Button */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={handleCapture}
          disabled={isCapturing || corners.length !== 4}
          className="w-20 h-20 rounded-full bg-white border-4 border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl flex items-center justify-center"
        >
          {isCapturing ? (
            <Loader className="w-8 h-8 text-emerald-600 animate-spin" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>
    </div>
  );
}
