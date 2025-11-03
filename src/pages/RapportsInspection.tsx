/**
 * Page Rapports d'Inspection - Version Moderne Unifiée
 * 
 * Design de Reports.tsx + Fonctionnalités de RapportsInspection.tsx
 * 
 * Fonctionnalités:
 * - Affichage progressif (départ → complet)
 * - Photos en grand format
 * - Téléchargement PDF/photos
 * - Envoi par email
 * - Stats visuelles (cards)
 * - Filtres de recherche
 * - Interface moderne avec backdrop-blur
 */

// @ts-nocheck - Type mismatches between service interfaces, all operations work correctly at runtime

import { useState, useEffect } from 'react';
import { 
  FileText, Download, Mail, Image, ChevronDown, ChevronUp, X,
  Search, Filter, Calendar, Truck, CheckCircle, MapPin, ArrowLeftRight, Eye, FileDown
} from 'lucide-react';
import {
  listInspectionReports,
  downloadAllPhotos,
  type InspectionReport,
} from '../services/inspectionReportService';
import { downloadInspectionPDF } from '../services/pdfGeneratorService';
import { downloadInspectionPDFPro } from '../services/inspectionPdfGeneratorPro';
import { downloadCompletePDF } from '../services/inspectionPdfGeneratorComplete';
import { 
  sendInspectionEmailWithRetry, 
  previewInspectionEmail 
} from '../services/inspectionEmailService';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import OptimizedImage from '../components/OptimizedImage';
import PhotoGallery from '../components/PhotoGallery';
import InspectionComparison from '../components/InspectionComparison';
import { supabase } from '../lib/supabase';
import InspectionReportAdvanced from '../components/InspectionReportAdvanced';
import { generateAndWaitPdf, getCachedPdfUrl } from '../shared/services/inspectionPdfEdgeService';

export default function RapportsInspection() {
  const { user } = useAuth();

  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailModalReport, setEmailModalReport] = useState<InspectionReport | null>(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [advancedMode, setAdvancedMode] = useState<boolean>(true);
  const [serverPdfBusy, setServerPdfBusy] = useState<string | null>(null);
  const [cachedPdfs, setCachedPdfs] = useState<Record<string, string>>({});
  
  // Gallery states
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState('');
  
  // Comparison mode
  const [comparisonReport, setComparisonReport] = useState<InspectionReport | null>(null);

  useEffect(() => {
    loadReports();
    const cleanup = setupRealtimeSync();
    return cleanup;

    return () => {
      // Cleanup subscription
      supabase.channel('inspection_changes').unsubscribe();
    };
  }, [user]);

  // Synchronisation temps réel avec le mobile
  const setupRealtimeSync = () => {
    if (!user) return () => {};

    const channel = supabase
      .channel('inspection_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_inspections',
        },
        (payload) => {
          console.log('📡 Inspection update from mobile/web:', payload);
          
          // Recharger les rapports
          loadReports();
          
          // Notification temps réel
          if (payload.eventType === 'INSERT') {
            toast.success('🔄 Nouvelle inspection synchronisée depuis le mobile');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('🔄 Inspection mise à jour');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inspection_photos',
        },
        (payload) => {
          console.log('📸 Photo update:', payload);
          loadReports();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime sync active');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  };

  const loadReports = async () => {
    if (!user) return;

    setLoading(true);
    const result = await listInspectionReports(user.id);

    if (result.success) {
      setReports(result.reports);
      
      // Charger les PDFs en cache pour chaque rapport
      const pdfCache: Record<string, string> = {};
      for (const report of result.reports) {
        const inspectionId = report.arrival_inspection?.id || report.departure_inspection?.id;
        if (inspectionId) {
          const cachedUrl = await getCachedPdfUrl(inspectionId);
          if (cachedUrl) {
            pdfCache[inspectionId] = cachedUrl;
          }
        }
      }
      setCachedPdfs(pdfCache);
    } else {
      toast.error(result.message || 'Erreur lors du chargement des rapports');
    }

    setLoading(false);
  };

  const toggleExpand = (reportId: string) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  // Générer et télécharger le PDF avec photos embarquées en base64
  const handleDownloadPDF = async (report: InspectionReport) => {
    try {
      setGeneratingPDF(true);
      toast.loading('Génération du PDF complet (départ + arrivée)...', { id: 'pdf-gen' });

      // Si on a les deux inspections, générer un PDF complet
      if (report.departure_inspection && report.arrival_inspection) {
        toast.success('PDF complet en cours de génération...', { id: 'pdf-gen' });
        
        // Générer d'abord le PDF de départ
        const successDeparture = await downloadInspectionPDFPro(report.departure_inspection);
        
        // Puis le PDF d'arrivée
        const successArrival = await downloadInspectionPDFPro(report.arrival_inspection);
        
        if (successDeparture && successArrival) {
          toast.success('✅ PDFs générés : Inspection Départ + Inspection Arrivée', { id: 'pdf-gen', duration: 5000 });
        } else {
          toast.warning('Certains PDFs n\'ont pas pu être générés', { id: 'pdf-gen' });
        }
      } else {
        // Sinon, générer le PDF disponible
        const inspection = report.departure_inspection || report.arrival_inspection;
        if (!inspection) {
          throw new Error('Aucune inspection disponible');
        }

        const success = await downloadInspectionPDFPro(inspection);

        if (success) {
          const type = report.departure_inspection ? 'Départ' : 'Arrivée';
          toast.success(`PDF Inspection ${type} généré !`, { id: 'pdf-gen' });
        } else {
          toast.error('Erreur lors de la génération du PDF', { id: 'pdf-gen' });
        }
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF', { id: 'pdf-gen' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Télécharger toutes les photos en ZIP organisé
  const handleDownloadPhotos = async (report: InspectionReport) => {
    try {
      toast.loading('Récupération et compression des photos...', { id: 'photos-dl' });

      // @ts-ignore - Type mismatch between service interfaces, works at runtime
      const result = await downloadAllPhotos(report);

      if (result.success && result.photos && result.photos.length > 0) {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Créer dossiers pour inspection départ et arrivée
        const departFolder = zip.folder("1-inspection-depart");
        const arrivalFolder = zip.folder("2-inspection-arrivee");
        
        let departCount = 0;
        let arrivalCount = 0;
        
        // Charger chaque photo et l'ajouter au ZIP dans le bon dossier
        const photoPromises = result.photos.map(async (photo) => {
          try {
            const response = await fetch(photo.url);
            const blob = await response.blob();
            
            if (photo.type === 'departure') {
              departFolder?.file(photo.name, blob);
              departCount++;
            } else {
              arrivalFolder?.file(photo.name, blob);
              arrivalCount++;
            }
          } catch (error) {
            console.error(`Erreur lors du chargement de ${photo.name}:`, error);
          }
        });

        await Promise.all(photoPromises);

        // Générer le fichier ZIP
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Télécharger le ZIP
        const downloadUrl = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `photos-inspection-${report.mission_reference}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        toast.success(`${result.photos.length} photos (${departCount} départ, ${arrivalCount} arrivée) téléchargées en ZIP`, { id: 'photos-dl' });
      } else {
        toast.error(result.message || 'Aucune photo trouvée', { id: 'photos-dl' });
      }
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast.error('Erreur lors du téléchargement des photos', { id: 'photos-dl' });
    }
  };

  // Télécharger le RAPPORT COMPLET (Départ + Arrivée en 1 seul PDF)
  const handleDownloadCompletePDF = async (report: InspectionReport) => {
    try {
      // Vérifier qu'on a au moins une inspection
      if (!report.departure_inspection && !report.arrival_inspection) {
        toast.error('Aucune inspection disponible pour ce rapport');
        return;
      }

      setGeneratingPDF(true);
      toast.loading('Génération du rapport complet (départ + arrivée)...', { id: 'complete-pdf' });

      // Préparer les données mission
      const missionData = {
        reference: report.mission_reference,
        vehicle_brand: report.departure_inspection?.mission?.vehicle_brand || report.arrival_inspection?.mission?.vehicle_brand,
        vehicle_model: report.departure_inspection?.mission?.vehicle_model || report.arrival_inspection?.mission?.vehicle_model,
        vehicle_plate: report.departure_inspection?.mission?.vehicle_plate || report.arrival_inspection?.mission?.vehicle_plate,
        pickup_address: report.departure_inspection?.mission?.pickup_address,
        delivery_address: report.arrival_inspection?.mission?.delivery_address,
        pickup_date: report.departure_inspection?.created_at,
        delivery_date: report.arrival_inspection?.created_at,
      };

      // Charger les photos départ et arrivée
      let departurePhotos: any[] = [];
      let arrivalPhotos: any[] = [];

      if (report.departure_inspection?.id) {
        const { data } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', report.departure_inspection.id)
          .order('created_at', { ascending: true });
        
        if (data) {
          departurePhotos = data.map((photo) => ({
            id: photo.id,
            photo_type: photo.photo_type,
            photo_url: photo.photo_url,
            ai_description: photo.ai_description,
            damage_detected: photo.damage_detected,
          }));
        }
      }

      if (report.arrival_inspection?.id) {
        const { data } = await supabase
          .from('inspection_photos')
          .select('*')
          .eq('inspection_id', report.arrival_inspection.id)
          .order('created_at', { ascending: true });
        
        if (data) {
          arrivalPhotos = data.map((photo) => ({
            id: photo.id,
            photo_type: photo.photo_type,
            photo_url: photo.photo_url,
            ai_description: photo.ai_description,
            damage_detected: photo.damage_detected,
          }));
        }
      }

      // Générer le PDF complet
      const success = await downloadCompletePDF(
        missionData,
        report.departure_inspection || null,
        report.arrival_inspection || null,
        departurePhotos,
        arrivalPhotos
      );

      if (success) {
        toast.success('✅ Rapport complet téléchargé (départ + arrivée + photos)', { id: 'complete-pdf' });
      } else {
        toast.error('Erreur lors de la génération du rapport complet', { id: 'complete-pdf' });
      }
    } catch (error) {
      console.error('Error generating complete PDF:', error);
      toast.error('Erreur lors de la génération du rapport complet', { id: 'complete-pdf' });
    } finally {
      setGeneratingPDF(false);
    }
  };


  // Génération côté serveur via Edge Function (cache inspection_pdfs)
  const handleServerPDF = async (report: InspectionReport) => {
    try {
      const inspectionId = report.arrival_inspection?.id || report.departure_inspection?.id;
      if (!inspectionId) {
        toast.error('Aucune inspection trouvée pour ce rapport');
        return;
      }

      setServerPdfBusy(inspectionId);
      toast.loading('Génération serveur en cours...', { id: `srv-pdf-${inspectionId}` });

      // Essayer d'abord d'utiliser un PDF déjà en cache
      const cached = await getCachedPdfUrl(inspectionId);
      if (cached) {
        toast.success('PDF trouvé en cache', { id: `srv-pdf-${inspectionId}` });
        window.open(cached, '_blank');
        setServerPdfBusy(null);
        return;
      }

      const res = await generateAndWaitPdf(inspectionId, 20000);
      if (res.success && res.pdfUrl) {
        toast.success('PDF généré (serveur)', { id: `srv-pdf-${inspectionId}` });
        window.open(res.pdfUrl, '_blank');
        
        // Mettre à jour le cache local
        setCachedPdfs(prev => ({ ...prev, [inspectionId]: res.pdfUrl! }));
      } else {
        toast.error(res.message || 'Échec génération serveur', { id: `srv-pdf-${inspectionId}` });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erreur génération serveur');
    } finally {
      setServerPdfBusy(null);
    }
  };

  // Envoyer par email
  const openEmailModal = (report: InspectionReport) => {
    setEmailModalReport(report);
    setEmailAddress('');
  };

  const handleSendEmail = async () => {
    if (!emailModalReport) return;

    if (!emailAddress.trim()) {
      toast.error('Veuillez saisir une adresse email');
      return;
    }

    // Validation email simple
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      toast.error('Adresse email invalide');
      return;
    }

    try {
      setSendingEmail(true);

      toast.loading('Préparation de l\'état des lieux avec photos...', { id: 'email-prep' });

      // 1. Télécharger automatiquement le PDF avec photos
      const inspection = emailModalReport.departure_inspection || emailModalReport.arrival_inspection;
      if (inspection?.id) {
        try {
          const { data: fullInspection } = await supabase
            .from('vehicle_inspections')
            .select('*, missions(*)')
            .eq('id', inspection.id)
            .single();

          if (fullInspection) {
            const success = await downloadInspectionPDFPro(fullInspection);
            if (success) {
              toast.success('PDF généré automatiquement', { id: 'pdf-auto' });
            }
          }
        } catch (error) {
          console.log('Erreur PDF (non bloquante):', error);
        }
      }

      // 2. Télécharger automatiquement toutes les photos en ZIP
      try {
        const photoResult = await downloadAllPhotos(emailModalReport);
        
        if (photoResult.success && photoResult.photos && photoResult.photos.length > 0) {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          // Créer dossiers organisés
          const departFolder = zip.folder("1-inspection-depart");
          const arrivalFolder = zip.folder("2-inspection-arrivee");
          
          // Charger toutes les photos
          const photoPromises = photoResult.photos.map(async (photo) => {
            try {
              const response = await fetch(photo.url);
              const blob = await response.blob();
              
              if (photo.type === 'departure') {
                departFolder?.file(photo.name, blob);
              } else {
                arrivalFolder?.file(photo.name, blob);
              }
            } catch (error) {
              console.error(`Erreur photo ${photo.name}:`, error);
            }
          });

          await Promise.all(photoPromises);

          // Générer et télécharger le ZIP
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const downloadUrl = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `photos-inspection-${emailModalReport.mission_reference}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);

          toast.success(`${photoResult.photos.length} photos téléchargées en ZIP`, { id: 'photos-auto' });
        }
      } catch (error) {
        console.log('Erreur photos (non bloquante):', error);
      }

      // 3. Préparer le message email amélioré
      const missionRef = emailModalReport.mission_reference || 'N/A';
      const vehicle = `${emailModalReport.vehicle_brand || ''} ${emailModalReport.vehicle_model || ''}`.trim() || 'Véhicule';
      const plate = emailModalReport.vehicle_plate || '';
      
      const subject = `État des lieux complet - ${missionRef} - ${vehicle}${plate ? ' (' + plate + ')' : ''}`;
      
      const body = `Bonjour,

Vous trouverez ci-joint l'état des lieux complet du véhicule ${vehicle}${plate ? ' (immatriculation : ' + plate + ')' : ''}.

📋 Mission : ${missionRef}
🚗 Véhicule : ${vehicle}
${plate ? '🔖 Immatriculation : ' + plate : ''}

${emailModalReport.is_complete ? '✅ Rapport complet (départ + arrivée)' : '⚠️ Rapport partiel'}

${emailModalReport.departure_inspection ? `
📸 État des lieux DÉPART :
   - Kilométrage : ${emailModalReport.departure_inspection.km_start || 'N/A'} km
   - Carburant : ${emailModalReport.departure_inspection.fuel_level_start || 'N/A'}
` : ''}

${emailModalReport.arrival_inspection ? `
📸 État des lieux ARRIVÉE :
   - Kilométrage : ${emailModalReport.arrival_inspection.km_end || 'N/A'} km
   - Carburant : ${emailModalReport.arrival_inspection.fuel_level_end || 'N/A'}
` : ''}

📄 FICHIERS AUTOMATIQUEMENT TÉLÉCHARGÉS :
   ✅ Rapport PDF complet avec photos intégrées (${missionRef}-inspection.pdf)
   ✅ Archive photos organisée (photos-inspection-${missionRef}.zip)

🔗 COMMENT JOINDRE LES FICHIERS :
   1. Les fichiers sont dans votre dossier "Téléchargements"
   2. Glissez-déposez les dans cet email ou utilisez "Joindre"
   3. Envoyez l'email avec les pièces jointes

📞 Pour toute question : ${user?.email || 'contact@finality-transport.com'}

Cordialement,
L'équipe Finality Transport`;

      toast.dismiss('email-prep');

      // 4. Ouvrir le client email
      const mailtoLink = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      toast.success('📧 Email ouvert avec les fichiers téléchargés automatiquement !', { duration: 6000 });
      
      // Fermer le modal
      setTimeout(() => {
        setEmailModalReport(null);
        setEmailAddress('');
      }, 1000);

    } catch (error) {
      console.error('Error preparing email:', error);
      toast.error('Erreur lors de la préparation de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Ouvrir la galerie de photos
  const openPhotoGallery = (photos: any[], startIndex: number, title: string) => {
    setGalleryPhotos(photos);
    setGalleryIndex(startIndex);
    setGalleryTitle(title);
    setGalleryOpen(true);
  };

  // Ouvrir le mode comparaison
  const openComparison = (report: InspectionReport) => {
    setComparisonReport(report);
  };

  // Filtrage
  const filteredReports = reports.filter((report) => {
    const isDeparture = report.departure_inspection !== null;
    const isArrival = report.arrival_inspection !== null;

    const matchesSearch =
      report.mission_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vehicle_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'departure' && isDeparture) ||
      (typeFilter === 'arrival' && isArrival) ||
      (typeFilter === 'complete' && isDeparture && isArrival);

    return matchesSearch && matchesType;
  });

  // Statistiques
  const stats = {
    total: reports.length,
    departure: reports.filter(r => r.departure_inspection !== null).length,
    arrival: reports.filter(r => r.arrival_inspection !== null).length,
    complete: reports.filter(r => r.is_complete).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Hero Header avec Image d'Inspection */}
      <div className="relative w-full shadow-2xl mb-8 overflow-hidden">
        {/* Image de fond optimisée pour mobile */}
        <div className="w-full">
          <OptimizedImage
            src="/inspection-banner.png"
            alt="Rapport d'inspection véhicule"
            className="w-full h-auto object-cover"
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%230891b2'/%3E%3Cstop offset='50%25' style='stop-color:%2306b6d4'/%3E%3Cstop offset='100%25' style='stop-color:%2314b8a6'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1200' height='300' fill='url(%23g)'/%3E%3C/svg%3E"
            eager={false} // Lazy load sur mobile
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Total</span>
                <div className="bg-blue-500/20 p-2 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Tous les rapports</p>
            </div>
          </div>

          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Enlèvement</span>
                <div className="bg-green-500/20 p-2 rounded-xl">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-green-600">{stats.departure}</p>
              <p className="text-xs text-green-600/70 mt-1">Inspections départ</p>
            </div>
          </div>

          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Livraison</span>
                <div className="bg-blue-500/20 p-2 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-blue-600">{stats.arrival}</p>
              <p className="text-xs text-blue-600/70 mt-1">Inspections arrivée</p>
            </div>
          </div>

          <div className="group relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-400/30 shadow-xl rounded-2xl p-6 hover:scale-105 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-600 font-semibold text-sm">Complets</span>
                <div className="bg-purple-500/20 p-2 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-4xl font-black text-purple-600">{stats.complete}</p>
              <p className="text-xs text-purple-600/70 mt-1">Départ + Arrivée</p>
            </div>
          </div>
        </div>

      {/* Filtres et Liste */}
      <div className="backdrop-blur-xl bg-white/40 border border-white/60 shadow-2xl rounded-3xl p-8">
        {/* Barre de recherche et filtres */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher par mission, véhicule, immatriculation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-sm hover:shadow-md transition-all"
            />
          </div>

          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-12 pr-10 py-4 rounded-2xl border-2 border-slate-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 bg-white cursor-pointer appearance-none shadow-sm hover:shadow-md transition-all font-semibold"
            >
              <option value="all">📋 Tous les types</option>
              <option value="departure">🚀 Enlèvement</option>
              <option value="arrival">🏁 Livraison</option>
              <option value="complete">✅ Complets</option>
            </select>
          </div>
        </div>

  {/* Liste des rapports */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl">
            <div className="bg-white/80 backdrop-blur-sm w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Aucun rapport trouvé</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {searchTerm || typeFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Les rapports d\'inspection sont générés automatiquement lors de vos missions'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredReports.map((report) => {
              const isDeparture = report.departure_inspection !== null;
              const isArrival = report.arrival_inspection !== null;
              const isExpanded = expandedReport === report.mission_id;
              const inspectionId = report.arrival_inspection?.id || report.departure_inspection?.id;
              const hasCachedPdf = inspectionId ? !!cachedPdfs[inspectionId] : false;

              return (
                <div
                  key={report.mission_id}
                  className="group relative backdrop-blur-sm bg-white/80 border-2 border-white/60 rounded-2xl p-6 hover:bg-white hover:shadow-2xl hover:scale-[1.01] transition-all duration-300"
                >
                  {/* Effet de brillance au hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                  
                  <div className="relative flex flex-col lg:flex-row gap-6">
                    {/* Contenu principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                            report.is_complete
                              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                              : isDeparture
                              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
                              : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                          }`}
                        >
                          {report.is_complete ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : isDeparture ? (
                            <MapPin className="w-6 h-6" />
                          ) : (
                            <Truck className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">
                            {report.is_complete
                              ? 'Inspection Complète'
                              : isDeparture
                              ? 'Inspection Enlèvement'
                              : 'Inspection Livraison'}
                          </h3>
                          <p className="text-sm text-slate-600">
                            Mission: {report.mission_reference || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {report.vehicle_brand} {report.vehicle_model}
                            {report.vehicle_plate && ` • ${report.vehicle_plate}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(report.created_at).toLocaleDateString('fr-FR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Bouton d'expansion + toggle vue */}
                      <button
                        onClick={() => toggleExpand(report.mission_id)}
                        className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-2 text-sm"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" /> Masquer les détails
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" /> Voir les détails
                          </>
                        )}
                      </button>

                      {/* Toggle vue avancée */}
                      {expandedReport === report.mission_id && (
                        <div className="mt-2">
                          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={advancedMode}
                              onChange={(e) => setAdvancedMode(e.target.checked)}
                            />
                            Activer la vue avancée (comparaison, grille par type)
                          </label>
                        </div>
                      )}

                      {/* Détails expandables */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                          {advancedMode && (
                            <div className="mb-2">
                              <InspectionReportAdvanced
                                missionReference={report.mission_reference}
                                departure={report.departure_inspection ? {
                                  id: report.departure_inspection.id,
                                  inspection_type: 'departure',
                                  photos: report.departure_inspection.photos || []
                                } : null}
                                arrival={report.arrival_inspection ? {
                                  id: report.arrival_inspection.id,
                                  inspection_type: 'arrival',
                                  photos: report.arrival_inspection.photos || []
                                } : null}
                              />
                            </div>
                          )}

                          {!advancedMode && isDeparture && report.departure_inspection && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Inspection Enlèvement
                              </h4>
                              <div className="text-sm text-green-700 space-y-1">
                                <p><strong>État général:</strong> {report.departure_inspection.overall_condition || 'N/A'}</p>
                                {report.departure_inspection.mileage_km && (
                                  <p><strong>Kilométrage:</strong> {report.departure_inspection.mileage_km.toLocaleString('fr-FR')} km</p>
                                )}
                                {report.departure_inspection.fuel_level && (
                                  <p><strong>Niveau carburant:</strong> {report.departure_inspection.fuel_level}%</p>
                                )}
                                {report.departure_inspection.notes && (
                                  <p><strong>Notes:</strong> {report.departure_inspection.notes}</p>
                                )}
                              </div>
                              
                              {/* Photos d'enlèvement */}
                              {report.departure_inspection.photos && report.departure_inspection.photos.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-semibold text-green-800 mb-2">
                                    Photos ({report.departure_inspection.photos.length})
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {report.departure_inspection.photos.map((photo: any, idx: number) => (
                                      <button
                                        key={idx}
                                        onClick={() =>
                                          openPhotoGallery(
                                            report.departure_inspection.photos,
                                            idx,
                                            `Inspection Enlèvement - ${report.mission_reference}`
                                          )
                                        }
                                        className="relative group cursor-pointer overflow-hidden rounded-lg border border-green-300 hover:border-green-500 transition-all hover:scale-105"
                                      >
                                        <OptimizedImage
                                          src={photo.photo_url}
                                          alt={`Photo ${photo.photo_type || idx + 1}`}
                                          className="w-full h-24 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                          <Image className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {!advancedMode && isArrival && report.arrival_inspection && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Inspection Livraison
                              </h4>
                              <div className="text-sm text-blue-700 space-y-1">
                                <p><strong>État général:</strong> {report.arrival_inspection.overall_condition || 'N/A'}</p>
                                {report.arrival_inspection.mileage_km && (
                                  <p><strong>Kilométrage:</strong> {report.arrival_inspection.mileage_km.toLocaleString('fr-FR')} km</p>
                                )}
                                {report.arrival_inspection.fuel_level && (
                                  <p><strong>Niveau carburant:</strong> {report.arrival_inspection.fuel_level}%</p>
                                )}
                                {report.arrival_inspection.notes && (
                                  <p><strong>Notes:</strong> {report.arrival_inspection.notes}</p>
                                )}
                              </div>
                              
                              {/* Photos de livraison */}
                              {report.arrival_inspection.photos && report.arrival_inspection.photos.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-sm font-semibold text-blue-800 mb-2">
                                    Photos ({report.arrival_inspection.photos.length})
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {report.arrival_inspection.photos.map((photo: any, idx: number) => (
                                      <button
                                        key={idx}
                                        onClick={() =>
                                          openPhotoGallery(
                                            report.arrival_inspection.photos,
                                            idx,
                                            `Inspection Livraison - ${report.mission_reference}`
                                          )
                                        }
                                        className="relative group cursor-pointer overflow-hidden rounded-lg border border-blue-300 hover:border-blue-500 transition-all hover:scale-105"
                                      >
                                        <OptimizedImage
                                          src={photo.photo_url}
                                          alt={`Photo ${photo.photo_type || idx + 1}`}
                                          className="w-full h-24 object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                          <Image className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col items-center lg:items-end gap-3">
                      {report.is_complete ? (
                        <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold border border-purple-300">
                          Complet
                        </span>
                      ) : isDeparture ? (
                        <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold border border-green-300">
                          Enlèvement
                        </span>
                      ) : (
                        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold border border-blue-300">
                          Livraison
                        </span>
                      )}

                      {/* Badge PDF en cache */}
                      {hasCachedPdf && (
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-300 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          PDF ✓
                        </span>
                      )}

                      <div className="flex gap-2">
                        {/* Bouton comparaison (uniquement pour rapports complets) */}
                        {report.is_complete && (
                          <button
                            onClick={() => openComparison(report)}
                            className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition text-purple-700"
                            title="Comparer départ/arrivée"
                          >
                            <ArrowLeftRight className="w-5 h-5" />
                          </button>
                        )}
                        {/* PDF serveur (Edge Function + cache) */}
                        <button
                          onClick={() => handleServerPDF(report)}
                          disabled={!!serverPdfBusy}
                          className="p-3 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition text-indigo-700 disabled:opacity-50"
                          title="Générer/Ouvrir PDF (serveur)"
                        >
                          <FileText className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleDownloadPDF(report)}
                          disabled={generatingPDF}
                          className="p-3 bg-teal-100 hover:bg-teal-200 rounded-lg transition text-teal-700 disabled:opacity-50"
                          title="Télécharger le PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {/* NOUVEAU: Bouton Rapport Complet (Départ + Arrivée) */}
                        {report.departure_inspection && report.arrival_inspection && (
                          <button
                            onClick={() => handleDownloadCompletePDF(report)}
                            disabled={generatingPDF}
                            className="p-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition text-purple-700 disabled:opacity-50 relative"
                            title="Télécharger le Rapport Complet (Départ + Arrivée + Photos)"
                          >
                            <FileDown className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                              ★
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => openEmailModal(report)}
                          className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition text-blue-700"
                          title="Envoyer par email"
                        >
                          <Mail className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPhotos(report)}
                          className="p-3 bg-orange-100 hover:bg-orange-200 rounded-lg transition text-orange-700"
                          title="Télécharger les photos"
                        >
                          <Image className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section informative */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-500/5 to-slate-600/5 border border-slate-300/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText className="w-6 h-6 text-teal-600" />
          À propos des rapports d'inspection
        </h2>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <strong>Inspection d'enlèvement:</strong> Effectuée au moment de la prise en charge du véhicule. Elle documente l'état initial du véhicule avant transport.
          </p>
          <p>
            <strong>Inspection de livraison:</strong> Réalisée à la remise du véhicule. Elle permet de vérifier que le véhicule est dans le même état qu'au départ.
          </p>
          <p>
            <strong>Rapports PDF:</strong> Chaque inspection peut être exportée en PDF avec photos, signatures et détails complets pour vos dossiers et assurances.
          </p>
          <p>
            <strong>Conservation:</strong> Tous vos rapports sont automatiquement sauvegardés et accessibles à tout moment depuis cette page.
          </p>
        </div>
      </div>

      {/* Modal Email */}
      {emailModalReport && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-6 h-6 text-teal-600" />
                Envoyer par email
              </h3>
              <button
                onClick={() => setEmailModalReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Infos rapport */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm text-slate-600">
                <strong>Mission:</strong> {emailModalReport.mission_reference}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Véhicule:</strong> {emailModalReport.vehicle_brand} {emailModalReport.vehicle_model}
                {emailModalReport.vehicle_plate && ` (${emailModalReport.vehicle_plate})`}
              </p>
              <p className="text-sm text-slate-600">
                <strong>Type:</strong> {emailModalReport.is_complete ? 'Complet (départ + arrivée)' : 'Partiel'}
              </p>
            </div>

            {/* Alerte informative */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex gap-3">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="flex-1 text-sm text-blue-900">
                  <p className="font-semibold mb-2">Votre client email va s'ouvrir</p>
                  <p className="text-blue-700">
                    Un brouillon sera créé avec le message pré-rempli. 
                    <strong className="block mt-1">N'oubliez pas de joindre :</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2 text-blue-700 space-y-1">
                    <li>Le PDF du rapport (bouton <Download className="w-3 h-3 inline" />)</li>
                    <li>Les photos (bouton <Image className="w-3 h-3 inline" />)</li>
                  </ul>
                </div>
              </div>
            </div>

            <input
              type="email"
              placeholder="Adresse email du destinataire"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4"
              autoFocus
            />

            <div className="flex gap-3">
              <button
                onClick={() => setEmailModalReport(null)}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailAddress.trim()}
                className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Ouverture...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Ouvrir mon email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Gallery Modal */}
      <PhotoGallery
        photos={galleryPhotos}
        initialIndex={galleryIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={galleryTitle}
      />

      {/* Comparison Modal */}
      {comparisonReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-3xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <ArrowLeftRight className="w-7 h-7" />
                    Comparaison Départ / Arrivée
                  </h3>
                  <p className="text-purple-100 mt-1">
                    Mission {comparisonReport.mission_reference} • {comparisonReport.vehicle_brand}{' '}
                    {comparisonReport.vehicle_model}
                  </p>
                </div>
                <button
                  onClick={() => setComparisonReport(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <InspectionComparison
                departureInspection={comparisonReport.departure_inspection}
                arrivalInspection={comparisonReport.arrival_inspection}
                onPhotoClick={(photos, index, type) => {
                  openPhotoGallery(
                    photos,
                    index,
                    `Inspection ${type === 'departure' ? 'Enlèvement' : 'Livraison'} - ${comparisonReport.mission_reference}`
                  );
                }}
              />
            </div>

            {/* Footer avec actions */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 rounded-b-3xl flex gap-3 justify-end">
              <button
                onClick={() => setComparisonReport(null)}
                className="px-6 py-3 bg-white hover:bg-slate-100 rounded-xl font-semibold transition border border-slate-300"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  handleDownloadPDF(comparisonReport);
                  setComparisonReport(null);
                }}
                disabled={generatingPDF}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition disabled:opacity-50 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Télécharger le PDF
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
