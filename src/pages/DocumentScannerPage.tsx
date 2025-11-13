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

import { useState, useRef } from 'react';
import { Camera, RotateCw, Download, X, Sparkles, Palette, Contrast, Image as ImageIcon } from 'lucide-react';
import { applyDocumentFilter, rotateImage, FilterType, dataURLtoFile } from '../utils/imageProcessing';

export default function DocumentScannerPage() {
  const [step, setStep] = useState<'intro' | 'edit'>('intro');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('magic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('document');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

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
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      setOriginalImage(imageUrl);
      setStep('edit');
      
      // Appliquer le filtre magic automatiquement
      await applyFilter('magic', imageUrl);
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

  const captureFromWebcam = () => {
    if (!webcamVideoRef.current) return;

    const video = webcamVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    setOriginalImage(imageUrl);
    stopWebcam();
    setStep('edit');
    
    applyFilter('magic', imageUrl);
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

  const handleDownload = async () => {
    if (!processedImage) return;

    try {
      const file = await dataURLtoFile(processedImage, `${fileName}_scanned.jpg`);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setStep('intro');
    setSelectedFilter('magic');
    setFileName('document');
    stopWebcam();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
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
                <p className="text-sm text-slate-400">Numérisez et améliorez vos documents</p>
              </div>
            </div>
            
            {step === 'edit' && (
              <button
                onClick={handleReset}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
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
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">Scanner un document</h2>
              <p className="text-lg text-slate-400">
                Prenez une photo ou sélectionnez un fichier à améliorer
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <Sparkles className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Recadrage auto</h3>
                <p className="text-sm text-slate-400">Détection intelligente</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <Contrast className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Amélioration auto</h3>
                <p className="text-sm text-slate-400">Contraste optimisé</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <RotateCw className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Rotation manuelle</h3>
                <p className="text-sm text-slate-400">Orientation parfaite</p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 text-center">
                <Palette className="w-8 h-8 text-teal-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Filtres intelligents</h3>
                <p className="text-sm text-slate-400">4 modes disponibles</p>
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
                    Télécharger
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
