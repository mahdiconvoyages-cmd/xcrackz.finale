import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Camera, RotateCw, Download, Maximize2, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SimpleScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

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
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      alert('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageData);
    stopCamera();
  };

  const retake = () => {
    setCapturedImage(null);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    startCamera();
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const applyFilters = () => {
    if (!capturedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply rotation
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      const newImage = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedImage(newImage);
    };
    img.src = capturedImage;
  };

  const downloadImage = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `scan_${Date.now()}.jpg`;
    link.click();
  };

  const enhanceDocument = () => {
    setIsProcessing(true);
    setBrightness(110);
    setContrast(130);
    setTimeout(() => {
      applyFilters();
      setIsProcessing(false);
    }, 100);
  };

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
            <h1 className="text-xl font-bold">Scanner Document</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {!capturedImage ? (
          /* Camera View */
          <div className="space-y-6">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-dashed border-white/30 m-8 rounded-xl pointer-events-none" />
            </div>

            <button
              onClick={captureImage}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-3"
            >
              <Camera size={28} />
              Capturer le document
            </button>
          </div>
        ) : (
          /* Preview & Edit */
          <div className="space-y-6">
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
              <canvas ref={canvasRef} className="hidden" />
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-auto"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`
                }}
              />
            </div>

            {/* Controls */}
            <div className="bg-gray-800 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={rotateImage}
                  className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-xl transition-colors"
                >
                  <RotateCw size={20} />
                  Rotation
                </button>
                <button
                  onClick={enhanceDocument}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Maximize2 size={20} />
                  Auto-améliorer
                </button>
              </div>

              {/* Brightness */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <ZoomIn size={16} />
                  Luminosité: {brightness}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  onMouseUp={applyFilters}
                  onTouchEnd={applyFilters}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <ZoomOut size={16} />
                  Contraste: {contrast}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  onMouseUp={applyFilters}
                  onTouchEnd={applyFilters}
                  className="w-full"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={retake}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-4 rounded-xl font-semibold transition-colors"
              >
                Recommencer
              </button>
              <button
                onClick={downloadImage}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Télécharger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
