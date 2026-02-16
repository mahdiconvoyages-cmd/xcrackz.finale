/**
 * 📄 SCANNER DE DOCUMENTS UNIFIÉ - Inspection Web & Mobile
 * 
 * ✨ Fonctionnalités:
 * - Appareil photo natif du téléphone
 * - Détection automatique OpenCV
 * - Recadrage manuel précis avec zoom
 * - Filtre N&B par défaut + Gris et Couleur
 * - Synchronisation Supabase entre web et mobile
 * - Export PDF, partage, téléchargement
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCw,
  Download,
  Palette,
  Contrast,
  Image as ImageIcon,
  Loader,
  Check,
  X,
  Share2,
  FileDown
} from 'lucide-react';
import {
  loadOpenCV,
  detectDocumentCorners,
  cropAndCorrectPerspective,
  Corner
} from '../../utils/optimizedDetection';
import { applyAdvancedFilter, FilterType } from '../../utils/advancedFilters';
import OptimizedCropPage from '../../pages/OptimizedCropPage';

interface UnifiedDocumentScannerProps {
  onCapture: (file: File, imageUrl: string) => void;
  onCancel: () => void;
  inspectionId?: string;
  documentType?: 'registration' | 'insurance' | 'receipt' | 'generic';
  title?: string;
  userId?: string;
}

export default function UnifiedDocumentScanner({
  onCapture,
  onCancel,
  inspectionId: _inspectionId,
  documentType: _documentType = 'generic',
  title = 'Scanner un document',
  userId: _userId
}: UnifiedDocumentScannerProps) {
  // États du workflow
  const [step, setStep] = useState<'intro' | 'crop' | 'edit'>('intro');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('bw');

  // États de détection
  const [corners, setCorners] = useState<Corner[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingOpenCV, setIsLoadingOpenCV] = useState(false);

  // Références
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Précharger OpenCV au montage
  useEffect(() => {
    setIsLoadingOpenCV(true);
    loadOpenCV()
      .then(() => {
        setIsLoadingOpenCV(false);
      })
      .catch((error) => {
        console.error('OpenCV non disponible:', error);
        setIsLoadingOpenCV(false);
      });
  }, []);

  // Configuration des filtres
  const filters = [
    { id: 'bw' as FilterType, name: 'N&B', icon: Contrast, color: '#374151' },
    { id: 'grayscale' as FilterType, name: 'Gris', icon: Palette, color: '#6b7280' },
    { id: 'color' as FilterType, name: 'Couleur', icon: ImageIcon, color: '#3b82f6' },
  ];

  // ===== GESTION CAMERA NATIVE =====

  const openNativeCamera = () => {
    nativeCameraInputRef.current?.click();
  };

  const handleNativeCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      await processNewImage(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  // ===== TRAITEMENT IMAGE =====

  const processNewImage = async (imageUrl: string) => {
    setIsProcessing(true);
    setRawImage(imageUrl);

    try {
      // Détection automatique optimisée
      const detectedCorners = await detectDocumentCorners(imageUrl);
      setCorners(detectedCorners);

      // Passer à l'étape de crop
      setStep('crop');
    } catch (error) {
      console.error('Erreur traitement image:', error);
      alert('Erreur lors du traitement de l\'image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = async (finalCorners: Corner[]) => {
    if (!rawImage) return;

    setIsProcessing(true);

    try {
      // Appliquer la correction de perspective
      const cropped = await cropAndCorrectPerspective(rawImage, finalCorners);
      setCroppedImage(cropped);

      // Appliquer automatiquement le filtre N&B par défaut
      const filtered = await applyAdvancedFilter(cropped, 'bw');
      setProcessedImage(filtered);
      setSelectedFilter('bw');

      // Passer à l'édition
      setStep('edit');
    } catch (error) {
      console.error('Erreur recadrage:', error);
      alert('Erreur lors du recadrage');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelCrop = () => {
    setStep('intro');
    setRawImage(null);
    setCorners([]);
  };

  // ===== ÉDITION FILTRES =====

  const applyFilter = async (filterType: FilterType) => {
    if (!croppedImage) return;

    setSelectedFilter(filterType);
    setIsProcessing(true);

    try {
      const filtered = await applyAdvancedFilter(croppedImage, filterType);
      setProcessedImage(filtered);
    } catch (error) {
      console.error('Erreur application filtre:', error);
      alert('Erreur lors de l\'application du filtre');
      setProcessedImage(croppedImage);
    } finally {
      setIsProcessing(false);
    }
  };

  const rotateImage = async () => {
    if (!processedImage) return;

    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = processedImage;
      await new Promise(resolve => { img.onload = resolve; });

      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotated = canvas.toDataURL('image/jpeg', 0.98);
        setProcessedImage(rotated);
        setCroppedImage(rotated);
      }
    } catch (error) {
      console.error('Erreur rotation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== EXPORT & PARTAGE =====

  const exportToPDF = async () => {
    if (!processedImage) return;

    try {
      setIsProcessing(true);

      const img = new Image();
      img.src = processedImage;
      await new Promise(resolve => { img.onload = resolve; });

      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;

      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgRatio = img.width / img.height;
      const pageRatio = pageWidth / pageHeight;

      let finalWidth = pageWidth;
      let finalHeight = pageHeight;

      if (imgRatio > pageRatio) {
        finalHeight = pageWidth / imgRatio;
      } else {
        finalWidth = pageHeight * imgRatio;
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(processedImage, 'JPEG', x, y, finalWidth, finalHeight, undefined, 'FAST');
      pdf.save(`document_${Date.now()}.pdf`);

      alert('✅ PDF exporté avec succès !');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('❌ Erreur lors de l\'export PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const shareDocument = async () => {
    if (!processedImage) return;

    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const file = new File([blob], `document_${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Document scanné',
          text: 'Partage du document'
        });
      } else {
        downloadImage();
        alert('ℹ️ Le partage n\'est pas disponible. Le fichier a été téléchargé.');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      if ((error as Error).name !== 'AbortError') {
        alert('❌ Erreur lors du partage');
      }
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `document_${Date.now()}.jpg`;
    link.click();
  };

  // ===== VALIDATION & UPLOAD =====

  const handleValidate = async () => {
    if (!processedImage) return;

    try {
      setIsProcessing(true);

      // Convertir base64 en File
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Callback avec le fichier et l'URL
      onCapture(file, processedImage);
    } catch (error) {
      console.error('Erreur validation:', error);
      alert('❌ Erreur lors de la validation');
    } finally {
      setIsProcessing(false);
    }
  };

  // ===== RENDU =====

  if (isLoadingOpenCV) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Initialisation du scanner...</p>
        </div>
      </div>
    );
  }

  // Écran d'introduction
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-6 z-50">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {title}
            </h1>
            <p className="text-blue-200">
              Scan avec détection automatique et recadrage manuel
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={openNativeCamera}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
            >
              <Camera className="w-6 h-6" />
              Prendre une photo
            </button>

            <button
              onClick={onCancel}
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold flex items-center justify-center gap-3 transition-all backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
              Annuler
            </button>
          </div>
        </div>

        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleNativeCameraCapture}
          className="hidden"
        />
      </div>
    );
  }

  // Vue recadrage
  if (step === 'crop' && rawImage && corners.length === 4) {
    return (
      <div className="fixed inset-0 z-50">
        <OptimizedCropPage
          imageUrl={rawImage}
          initialCorners={corners}
          onApply={handleApplyCrop}
          onCancel={handleCancelCrop}
        />
      </div>
    );
  }

  // Vue édition
  if (step === 'edit' && processedImage) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col z-50">
        {/* Header Premium */}
        <div className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 py-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={onCancel}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-400 group-hover:text-white font-medium transition-colors hidden sm:inline">
                Annuler
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h2 className="text-white font-bold text-lg tracking-tight">
                {title}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={shareDocument}
                className="p-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                title="Partager"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                onClick={exportToPDF}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-red-500/25 hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              <button
                onClick={downloadImage}
                className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                title="Télécharger JPG"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handleValidate}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-green-500/25 hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                <Check className="w-4 h-4" />
                Valider
              </button>
            </div>
          </div>
        </div>

        {/* Preview Premium */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <div className="relative max-w-5xl w-full">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <img
                src={processedImage}
                alt="Document scanné"
                className="w-full h-auto transition-transform duration-300 hover:scale-[1.02]"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-md flex items-center justify-center">
                  <div className="text-center">
                    <Loader className="w-16 h-16 text-white animate-spin mx-auto mb-4" />
                    <p className="text-white font-semibold text-lg animate-pulse">
                      Traitement en cours...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Badge filtre actif */}
            <div className="absolute top-4 right-4 px-4 py-2 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl">
              <div className="flex items-center gap-2">
                {filters.find(f => f.id === selectedFilter)?.icon &&
                  React.createElement(filters.find(f => f.id === selectedFilter)!.icon, {
                    className: "w-4 h-4 text-white"
                  })
                }
                <span className="text-white font-semibold text-sm">
                  {filters.find(f => f.id === selectedFilter)?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar Premium */}
        <div className="bg-black/40 backdrop-blur-xl border-t border-white/5 px-4 py-6 shadow-2xl">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Titre section filtres */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                <h3 className="text-white font-bold text-lg">Filtres Professionnels</h3>
              </div>
              <div className="text-gray-400 text-sm font-medium">
                {filters.length} disponibles
              </div>
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-3 gap-3">
              {filters.map((filter) => {
                const Icon = filter.icon;
                const isActive = selectedFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    onClick={() => applyFilter(filter.id)}
                    disabled={isProcessing}
                    className={`group relative p-5 rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 ${isActive
                        ? 'bg-gradient-to-br from-white/20 to-white/5 ring-2 ring-white/30 shadow-2xl scale-105'
                        : 'bg-white/5 hover:bg-white/10 hover:scale-105 hover:shadow-xl'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg'
                            : 'bg-white/10 group-hover:bg-white/20'
                          }`}
                        style={{
                          boxShadow: isActive ? `0 0 30px ${filter.color}60` : 'none'
                        }}
                      >
                        <Icon className={`w-7 h-7 ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'} transition-colors`} />
                      </div>

                      <div className="text-center">
                        <span className={`text-sm font-bold block ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'} transition-colors`}>
                          {filter.name}
                        </span>
                        <span className="text-xs text-gray-500 block mt-1">
                          {filter.id === 'bw' && 'Contraste Max'}
                          {filter.id === 'grayscale' && 'CLAHE Pro'}
                          {filter.id === 'color' && 'Naturel HD'}
                        </span>
                      </div>

                      {isActive && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={rotateImage}
                disabled={isProcessing}
                className="w-full group px-6 py-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-105 hover:shadow-xl border border-white/10"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                  <RotateCw className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                </div>
                <span>Rotation 90°</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
