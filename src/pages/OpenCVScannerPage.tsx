import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Camera, RotateCw, Download, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    cv: any;
  }
}

export default function OpenCVScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const detectionInterval = useRef<any>(null);

  useEffect(() => {
    loadOpenCV();
    return () => {
      stopCamera();
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }
    };
  }, []);

  const loadOpenCV = () => {
    if (window.cv && window.cv.Mat) {
      console.log('OpenCV déjà chargé');
      setIsOpenCVReady(true);
      return;
    }

    console.log('Chargement d\'OpenCV...');
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    
    script.onload = () => {
      console.log('Script OpenCV chargé');
      const checkOpenCV = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkOpenCV);
          console.log('OpenCV prêt!');
          setIsOpenCVReady(true);
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkOpenCV);
        if (!window.cv || !window.cv.Mat) {
          console.error('Timeout OpenCV');
          alert('Erreur de chargement de la bibliothèque de détection');
        }
      }, 30000);
    };
    
    script.onerror = () => {
      console.error('Erreur de chargement OpenCV');
      alert('Erreur de chargement de la bibliothèque de détection');
    };
    
    document.body.appendChild(script);
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
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            startDetection();
          }
        };
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const stopCamera = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startDetection = () => {
    if (!isOpenCVReady || !videoRef.current || !overlayCanvasRef.current) return;

    setIsDetecting(true);
    detectionInterval.current = setInterval(() => {
      detectDocument();
    }, 300);
  };

  const detectDocument = () => {
    if (!videoRef.current || !overlayCanvasRef.current || !window.cv) {
      console.log('Détection skip: video/canvas/cv manquant');
      return;
    }

    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('Vidéo pas prête');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (canvas.width === 0 || canvas.height === 0) return;

    try {
      // Créer un canvas temporaire pour capturer la frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      
      tempCtx.drawImage(video, 0, 0);
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      const src = window.cv.matFromImageData(imageData);
      const gray = new window.cv.Mat();
      const blur = new window.cv.Mat();
      const edges = new window.cv.Mat();
      const contours = new window.cv.MatVector();
      const hierarchy = new window.cv.Mat();

      window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
      window.cv.GaussianBlur(gray, blur, new window.cv.Size(5, 5), 0);
      window.cv.Canny(blur, edges, 50, 150);

      window.cv.findContours(
        edges,
        contours,
        hierarchy,
        window.cv.RETR_EXTERNAL,
        window.cv.CHAIN_APPROX_SIMPLE
      );

      let maxArea = 0;
      let bestContour = null;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = window.cv.contourArea(contour);
        const peri = window.cv.arcLength(contour, true);
        const approx = new window.cv.Mat();
        window.cv.approxPolyDP(contour, approx, 0.02 * peri, true);

        if (approx.rows === 4 && area > maxArea && area > 10000) {
          maxArea = area;
          if (bestContour) bestContour.delete();
          bestContour = approx;
        } else {
          approx.delete();
        }
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bestContour) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 4;
          ctx.beginPath();

          for (let i = 0; i < 4; i++) {
            const x = bestContour.data32S[i * 2];
            const y = bestContour.data32S[i * 2 + 1];
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();

          // Dessiner les coins
          ctx.fillStyle = '#10b981';
          for (let i = 0; i < 4; i++) {
            const x = bestContour.data32S[i * 2];
            const y = bestContour.data32S[i * 2 + 1];
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, 2 * Math.PI);
            ctx.fill();
          }

          bestContour.delete();
        }
      }

      src.delete();
      gray.delete();
      blur.delete();
      edges.delete();
      contours.delete();
      hierarchy.delete();
    } catch (error) {
      console.error('Erreur détection:', error);
    }
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = tempCanvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageData);
    stopCamera();
    setIsDetecting(false);
  };

  const retake = () => {
    setCapturedImage(null);
    setRotation(0);
    startCamera();
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const downloadImage = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `document_${Date.now()}.jpg`;
    link.click();
  };

  useEffect(() => {
    if (isOpenCVReady && !capturedImage) {
      startCamera();
    }
  }, [isOpenCVReady]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Retour</span>
            </button>
            <h1 className="text-xl font-bold">Scanner OpenCV</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Loading OpenCV */}
      {!isOpenCVReady && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-gray-400">Chargement de la détection...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isOpenCVReady && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {!capturedImage ? (
            /* Camera View */
            <div className="space-y-6">
              <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl aspect-[3/4]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ pointerEvents: 'none' }}
                />
                
                {stream && (
                  <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Détection active
                  </div>
                )}
              </div>

              <button
                onClick={captureImage}
                disabled={!stream}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={28} />
                Capturer
              </button>
            </div>
          ) : (
            /* Preview */
            <div className="space-y-6">
              <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
                <canvas ref={canvasRef} className="hidden" />
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-auto"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={rotateImage}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl transition-colors"
                >
                  <RotateCw size={20} />
                  Rotation
                </button>
                <button
                  onClick={downloadImage}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-xl transition-colors"
                >
                  <Download size={20} />
                  Télécharger
                </button>
              </div>

              <button
                onClick={retake}
                className="w-full bg-gray-700 hover:bg-gray-600 px-6 py-4 rounded-xl font-semibold transition-colors"
              >
                Reprendre
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
