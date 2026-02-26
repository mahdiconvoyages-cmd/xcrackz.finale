/**
 * 📱 SCANNER DE DOCUMENTS PROFESSIONNEL - VERSION OPTIMISÉE
 * 
 * ✨ Fonctionnalités:
 * - Capture photo ou upload fichier
 * - Détection automatique OpenCV optimisée
 * - Recadrage manuel précis avec zoom
 * - 4 filtres professionnels (Magic, N&B, Gris, Couleur)
 * - Correction perspective haute qualité
 * - Rotation et téléchargement
 * - Interface fluide et intuitive
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Camera,
  RotateCw,
  Download,
  Palette,
  Contrast,
  Image as ImageIcon,
  Loader,
  ArrowLeft,
  Check,
  Save,
  FileText,
  Trash2,
  Eye,
  Share2,
  FileDown
} from 'lucide-react';
import { showToast } from '../components/Toast';
import {
  loadOpenCV,
  detectDocumentCorners,
  cropAndCorrectPerspective,
  Corner
} from '../utils/optimizedDetection';
import { applyAdvancedFilter, FilterType } from '../utils/advancedFilters';
import OptimizedCropPage from './OptimizedCropPage';
import { useAuth } from '../contexts/AuthContext';
import { uploadInspectionDocument } from '../services/inspectionDocumentsService';

interface ScannedDocument {
  id: string;
  name: string;
  imageUrl: string;
  timestamp: number;
  filter: FilterType;
}

export default function ProfessionalScannerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // États du workflow
  const [step, setStep] = useState<'intro' | 'crop' | 'edit' | 'documents'>('intro');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('bw');
  const [fileName, setFileName] = useState('document');
  
  // États de détection
  const [corners, setCorners] = useState<Corner[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingOpenCV, setIsLoadingOpenCV] = useState(false);
  
  // Documents sauvegardés
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);

  // Rediriger vers /scanner si pas d'image et pas de state
  useEffect(() => {
    if (step === 'intro' && !rawImage && !location.state) {
      navigate('/scanner', { replace: true });
    }
  }, [step, rawImage, location.state]);

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

  // Traiter l'image si elle vient de la navigation
  useEffect(() => {
    const state = location.state as { imageUrl?: string; fromCamera?: boolean; fromUpload?: boolean };
    if (state?.imageUrl) {
      console.log('🖼️ Image reçue depuis navigation:', state);
      processNewImage(state.imageUrl);
      // Nettoyer le state pour éviter de retraiter
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Charger les documents sauvegardés
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

  // Sauvegarder les documents
  const saveDocuments = (docs: ScannedDocument[]) => {
    try {
      localStorage.setItem('scannedDocuments', JSON.stringify(docs));
      setScannedDocuments(docs);
    } catch (error) {
      console.error('Erreur sauvegarde documents:', error);
    }
  };

  // Configuration des filtres (N&B par défaut, Gris et Couleur en option)
  const filters = [
    { id: 'bw' as FilterType, name: 'N&B', icon: Contrast, color: '#374151' },
    { id: 'grayscale' as FilterType, name: 'Gris', icon: Palette, color: '#6b7280' },
    { id: 'color' as FilterType, name: 'Couleur', icon: ImageIcon, color: '#3b82f6' },
  ];

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
      showToast('error', 'Erreur', 'Erreur lors du traitement de l\'image');
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
      showToast('error', 'Erreur', 'Erreur lors du recadrage');
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
      // Appliquer le filtre de manière asynchrone
      const filtered = await applyAdvancedFilter(croppedImage, filterType);
      setProcessedImage(filtered);
    } catch (error) {
      console.error('Erreur application filtre:', error);
      showToast('error', 'Erreur', 'Erreur lors de l\'application du filtre');
      // Revenir à l'image non filtrée en cas d'erreur
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

  const saveDocument = async () => {
    if (!processedImage || !user) {
      showToast('error', 'Erreur', 'Image ou utilisateur manquant');
      return;
    }

    try {
      setIsProcessing(true);

      // Convertir base64 en File
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const file = new File(
        [blob], 
        `${fileName || 'document'}_${Date.now()}.jpg`, 
        { type: 'image/jpeg' }
      );

      // Upload vers Supabase via inspectionDocumentsService
      const uploaded = await uploadInspectionDocument(file, user.id, {
        inspectionId: undefined, // Document standalone
        documentType: 'generic',
        title: fileName || `Document scanné ${new Date().toLocaleDateString()}`
      });

      if (uploaded) {
        showToast('success', 'Document sauvegardé', 'Le document a été synchronisé sur votre compte');
        
        // Rediriger vers la nouvelle page Mes Documents
        setTimeout(() => {
          navigate('/mes-documents');
        }, 1000);
      } else {
        showToast('error', 'Erreur', 'Impossible d\'enregistrer le document');
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      showToast('error', 'Erreur', 'Erreur lors de la sauvegarde');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `scan_${Date.now()}.jpg`;
    link.click();
  };

  const exportToPDF = async () => {
    if (!processedImage) return;

    try {
      setIsProcessing(true);

      // Créer un canvas avec l'image
      const img = new Image();
      img.src = processedImage;
      await new Promise(resolve => { img.onload = resolve; });

      // Importer jsPDF dynamiquement
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      // Format A4
      const pdf = new jsPDF({
        orientation: img.width > img.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculer les dimensions pour ajuster l'image
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
      pdf.save(`scan_${Date.now()}.pdf`);

      showToast('success', 'PDF exporté', 'Le fichier PDF a été téléchargé');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      showToast('error', 'Erreur', 'Erreur lors de l\'export PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const shareDocument = async () => {
    if (!processedImage) return;

    try {
      // Convertir base64 en blob
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Document scanné',
          text: 'Partage du document scanné'
        });
      } else {
        // Fallback : télécharger le fichier
        downloadImage();
        showToast('info', 'Téléchargé', 'Le partage n\'est pas disponible. Le fichier a été téléchargé.');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      if ((error as Error).name !== 'AbortError') {
        showToast('error', 'Erreur', 'Erreur lors du partage');
      }
    }
  };

  const handleBack = () => {
    if (step === 'edit') {
      setStep('crop');
    } else if (step === 'crop') {
      setStep('intro');
      setRawImage(null);
      setCorners([]);
    }
  };

  const handleNewScan = () => {
    setStep('intro');
    setRawImage(null);
    setCroppedImage(null);
    setProcessedImage(null);
    setCorners([]);
    setSelectedFilter('bw');
    setFileName('document');
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm('Supprimer ce document ?')) {
      const updatedDocs = scannedDocuments.filter(doc => doc.id !== id);
      saveDocuments(updatedDocs);
    }
  };

  const handleViewDocument = (doc: ScannedDocument) => {
    setCroppedImage(doc.imageUrl);
    setProcessedImage(doc.imageUrl);
    setFileName(doc.name);
    setSelectedFilter(doc.filter);
    setStep('edit');
  };

  // ===== RENDU =====

  // Écran de chargement
  if (isLoadingOpenCV) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Initialisation du scanner...</p>
        </div>
      </div>
    );
  }

  // Écran d'introduction - Afficher loading pendant redirection
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Chargement...</p>
        </div>
      </div>
    );
  }



  // Vue recadrage
  if (step === 'crop' && rawImage && corners.length === 4) {
    return (
      <OptimizedCropPage
        imageUrl={rawImage}
        initialCorners={corners}
        onApply={handleApplyCrop}
        onCancel={handleCancelCrop}
      />
    );
  }

  // Vue édition
  if (step === 'edit' && processedImage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex flex-col">
        {/* Header Premium */}
        <div className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 py-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBack}
              className="group flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-gray-400 group-hover:text-white font-medium transition-colors hidden sm:inline">
                Retour
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <h2 className="text-white font-bold text-lg tracking-tight">
                Édition Document
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
                onClick={saveDocument}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-green-500/25 hover:scale-105 disabled:opacity-50 disabled:scale-100"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {/* Preview Premium avec cadre moderne */}
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
                {filters.find(f => f.id === selectedFilter)?.icon && (
                  React.createElement(filters.find(f => f.id === selectedFilter)!.icon, {
                    className: "w-4 h-4 text-white"
                  })
                )}
                <span className="text-white font-semibold text-sm">
                  {filters.find(f => f.id === selectedFilter)?.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar Premium avec effets glassmorphism */}
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

            {/* Filtres avec design cards moderne */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filters.map((filter) => {
                const Icon = filter.icon;
                const isActive = selectedFilter === filter.id;
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => applyFilter(filter.id)}
                    disabled={isProcessing}
                    className={`group relative p-5 rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 ${
                      isActive
                        ? 'bg-gradient-to-br from-white/20 to-white/5 ring-2 ring-white/30 shadow-2xl scale-105'
                        : 'bg-white/5 hover:bg-white/10 hover:scale-105 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isActive
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

                    {/* Barre de progression en bas si actif */}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Actions secondaires avec design moderne */}
            <div className="pt-4 border-t border-white/5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={rotateImage}
                  disabled={isProcessing}
                  className="group px-6 py-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 hover:scale-105 hover:shadow-xl border border-white/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                    <RotateCw className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                  </div>
                  <span>Rotation 90°</span>
                </button>

                <button
                  onClick={handleNewScan}
                  className="group px-6 py-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 text-white rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 hover:shadow-xl border border-white/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all">
                    <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span>Nouveau Scan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Page Mes Documents
  if (step === 'documents') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('intro')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>

            <h2 className="text-white font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Mes documents ({scannedDocuments.length})
            </h2>

            <div className="w-10" />
          </div>
        </div>

        {/* Liste des documents */}
        <div className="flex-1 overflow-y-auto p-4">
          {scannedDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-20 h-20 text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg mb-2">Aucun document</p>
              <p className="text-gray-500 text-sm">
                Vos scans apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {scannedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-800 hover:border-blue-600"
                >
                  {/* Aperçu */}
                  <div className="relative aspect-[3/4] bg-gray-800">
                    <img
                      src={doc.imageUrl}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded-full">
                        {doc.filter === 'magic' ? '✨ Auto' : 
                         doc.filter === 'bw' ? '⚫ N&B' :
                         doc.filter === 'grayscale' ? '🌫️ Gris' : '🌈 Couleur'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-1 truncate">
                      {doc.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-3">
                      {new Date(doc.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
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

        {/* Footer avec bouton nouveau scan */}
        <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-4 py-4">
          <button
            onClick={() => setStep('intro')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            Nouveau scan
          </button>
        </div>
      </div>
    );
  }

  // Écran de traitement
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Traitement en cours...</p>
      </div>
    </div>
  );
}
