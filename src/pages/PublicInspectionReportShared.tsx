/**
 * 📄 Page Publique de Rapport d'Inspection - VERSION PREMIUM REDESIGNÉE
 * 
 * Fonctionnalités:
 * - Affichage complet des informations de mission
 * - Photos consultables et téléchargeables (ZIP)
 * - Signatures visibles
 * - Impression et export PDF optimisés
 * - Design professionnel et responsive
 */

// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText, Calendar, Car, MapPin, User, Phone, Clock, Gauge,
  Fuel, Download, Printer, Archive, X, ChevronLeft, ChevronRight,
  Navigation, Package, CheckCircle, XCircle, FileSignature, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../utils/toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Helpers d'affichage (carburant % et propreté en texte)
const CLEANLINESS_MAP: Record<number, string> = {
  1: 'très sale',
  2: 'sale',
  3: 'correct',
  4: 'propre',
  5: 'très propre',
};

// ═══════════════════════════════════════════════════
// Traductions FR des zones et types de dommages
// ═══════════════════════════════════════════════════
const ZONE_LABELS_FR: Record<string, string> = {
  front_bumper: 'Pare-chocs avant',
  front_left_corner: 'Coin avant gauche',
  front_right_corner: 'Coin avant droit',
  hood: 'Capot',
  windshield: 'Pare-brise',
  left_headlight: 'Phare gauche',
  right_headlight: 'Phare droit',
  left_front_fender: 'Aile avant gauche',
  left_front_door: 'Portière avant gauche',
  left_rear_door: 'Portière arrière gauche',
  left_rear_fender: 'Aile arrière gauche',
  left_mirror: 'Rétroviseur gauche',
  left_sill: 'Bas de caisse gauche',
  right_front_fender: 'Aile avant droite',
  right_front_door: 'Portière avant droite',
  right_rear_door: 'Portière arrière droite',
  right_rear_fender: 'Aile arrière droite',
  right_mirror: 'Rétroviseur droit',
  right_sill: 'Bas de caisse droit',
  roof: 'Toit',
  rear_bumper: 'Pare-chocs arrière',
  rear_left_corner: 'Coin arrière gauche',
  rear_right_corner: 'Coin arrière droit',
  trunk: 'Coffre / Hayon',
  rear_window: 'Lunette arrière',
  left_taillight: 'Feu arrière gauche',
  right_taillight: 'Feu arrière droit',
  front_left: 'Avant gauche',
  front_center: 'Pare-chocs avant',
  front_right: 'Avant droit',
  left_front: 'Aile avant gauche',
  left_rear: 'Aile arrière gauche',
  right_front: 'Aile avant droite',
  right_rear: 'Aile arrière droite',
  rear_left: 'Arrière gauche',
  rear_center: 'Pare-chocs arrière',
  rear_right: 'Arrière droit',
};

const DAMAGE_TYPE_LABELS_FR: Record<string, { label: string; emoji: string; color: string }> = {
  scratch: { label: 'Rayure', emoji: '🔹', color: '#F97316' },
  dent: { label: 'Bosse', emoji: '🔸', color: '#EF4444' },
  crack: { label: 'Fissure', emoji: '💥', color: '#A855F7' },
  broken: { label: 'Cassé', emoji: '🔧', color: '#DC2626' },
  broken_part: { label: 'Pièce cassée', emoji: '🔧', color: '#DC2626' },
  paint: { label: 'Peinture', emoji: '🎨', color: '#3B82F6' },
  paint_damage: { label: 'Peinture endommagée', emoji: '🎨', color: '#3B82F6' },
  missing: { label: 'Manquant', emoji: '⭕', color: '#92400E' },
  missing_part: { label: 'Pièce manquante', emoji: '⭕', color: '#92400E' },
  stain: { label: 'Tache', emoji: '💧', color: '#6366F1' },
  rust: { label: 'Rouille', emoji: '🟤', color: '#B45309' },
  tear: { label: 'Déchirure', emoji: '✂️', color: '#E11D48' },
  chip: { label: 'Éclat', emoji: '⚡', color: '#F59E0B' },
  other: { label: 'Autre', emoji: '📌', color: '#6B7280' },
};

const SEVERITY_LABELS_FR: Record<string, string> = {
  minor: 'Mineur',
  moderate: 'Modéré',
  major: 'Majeur',
  severe: 'Grave',
  critical: 'Critique',
};

const PHOTO_TYPE_LABELS_FR: Record<string, string> = {
  front: 'Avant',
  front_left: 'Avant gauche',
  front_right: 'Avant droit',
  rear: 'Arrière',
  rear_left: 'Arrière gauche',
  rear_right: 'Arrière droit',
  left_side: 'Côté gauche',
  right_side: 'Côté droit',
  dashboard: 'Tableau de bord',
  interior: 'Intérieur',
  interior_front: 'Intérieur avant',
  interior_rear: 'Intérieur arrière',
  trunk: 'Coffre',
  roof: 'Toit',
  windshield: 'Pare-brise',
  wheel_front_left: 'Roue avant gauche',
  wheel_front_right: 'Roue avant droite',
  wheel_rear_left: 'Roue arrière gauche',
  wheel_rear_right: 'Roue arrière droite',
  mileage: 'Compteur kilométrique',
  fuel_gauge: 'Jauge carburant',
  vin_plate: 'Plaque VIN',
  registration: 'Carte grise',
  insurance: 'Assurance',
  loaded_vehicle: 'Véhicule chargé',
  damage: 'Dommage',
  other: 'Autre',
  optional: 'Photo complémentaire',
};

const OVERALL_CONDITION_FR: Record<string, { label: string; color: string; emoji: string }> = {
  excellent: { label: 'Excellent', color: '#059669', emoji: '🌟' },
  good: { label: 'Bon', color: '#10B981', emoji: '✅' },
  fair: { label: 'Correct', color: '#F59E0B', emoji: '⚠️' },
  poor: { label: 'Mauvais', color: '#EF4444', emoji: '❌' },
  damaged: { label: 'Endommagé', color: '#DC2626', emoji: '🔴' },
};

function translateZone(zone: string): string {
  return ZONE_LABELS_FR[zone] || zone.replace(/_/g, ' ');
}

function translateDamageType(type: string): { label: string; emoji: string; color: string } {
  return DAMAGE_TYPE_LABELS_FR[type] || { label: type.replace(/_/g, ' '), emoji: '📌', color: '#6B7280' };
}

function translateSeverity(severity: string): string {
  return SEVERITY_LABELS_FR[severity] || severity;
}

function translatePhotoType(photoType: string): string {
  // Strip _arrival / _departure / _restitution suffixes for lookup
  const base = photoType.replace(/_(arrival|departure|restitution_departure|restitution_arrival)$/, '');
  const label = PHOTO_TYPE_LABELS_FR[base] || PHOTO_TYPE_LABELS_FR[photoType];
  if (label) return label;
  // Fallback: capitalize and replace underscores
  return photoType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function translateOverallCondition(condition: string): { label: string; color: string; emoji: string } {
  return OVERALL_CONDITION_FR[condition] || { label: condition, color: '#6B7280', emoji: '📋' };
}

const EXPENSE_TYPE_LABELS_FR: Record<string, string> = {
  carburant: 'Carburant',
  peage: 'Péage',
  transport: 'Transport',
  imprevu: 'Imprévu',
  parking: 'Parking',
  repas: 'Repas',
  hebergement: 'Hébergement',
  autre: 'Autre',
};

function translateExpenseType(type: string): string {
  return EXPENSE_TYPE_LABELS_FR[type] || type.replace(/_/g, ' ');
}

// Zone positions on the 300×420 SVG top-down vehicle view
function getZonePosition(zone: string): { x: number; y: number; w: number; h: number } | null {
  const positions: Record<string, { x: number; y: number; w: number; h: number }> = {
    front_bumper: { x: 90, y: 5, w: 120, h: 30 },
    front_left_corner: { x: 40, y: 10, w: 50, h: 35 },
    front_right_corner: { x: 210, y: 10, w: 50, h: 35 },
    left_headlight: { x: 45, y: 35, w: 35, h: 25 },
    right_headlight: { x: 220, y: 35, w: 35, h: 25 },
    windshield: { x: 70, y: 50, w: 160, h: 40 },
    hood: { x: 70, y: 90, w: 160, h: 45 },
    left_mirror: { x: 22, y: 60, w: 20, h: 14 },
    right_mirror: { x: 258, y: 60, w: 20, h: 14 },
    left_front_fender: { x: 30, y: 75, w: 40, h: 50 },
    right_front_fender: { x: 230, y: 75, w: 40, h: 50 },
    left_front_door: { x: 30, y: 130, w: 40, h: 60 },
    right_front_door: { x: 230, y: 130, w: 40, h: 60 },
    roof: { x: 70, y: 140, w: 160, h: 100 },
    left_rear_door: { x: 30, y: 195, w: 40, h: 60 },
    right_rear_door: { x: 230, y: 195, w: 40, h: 60 },
    left_rear_fender: { x: 30, y: 260, w: 40, h: 50 },
    right_rear_fender: { x: 230, y: 260, w: 40, h: 50 },
    trunk: { x: 70, y: 285, w: 160, h: 45 },
    rear_window: { x: 70, y: 330, w: 160, h: 35 },
    rear_left_corner: { x: 40, y: 355, w: 50, h: 35 },
    rear_right_corner: { x: 210, y: 355, w: 50, h: 35 },
    rear_bumper: { x: 90, y: 385, w: 120, h: 30 },
    left_taillight: { x: 45, y: 360, w: 35, h: 25 },
    right_taillight: { x: 220, y: 360, w: 35, h: 25 },
    left_sill: { x: 30, y: 188, w: 40, h: 8 },
    right_sill: { x: 230, y: 188, w: 40, h: 8 },
    front_left: { x: 40, y: 10, w: 50, h: 35 },
    front_center: { x: 90, y: 5, w: 120, h: 30 },
    front_right: { x: 210, y: 10, w: 50, h: 35 },
    left_front: { x: 30, y: 75, w: 40, h: 50 },
    left_rear: { x: 30, y: 260, w: 40, h: 50 },
    right_front: { x: 230, y: 75, w: 40, h: 50 },
    right_rear: { x: 230, y: 260, w: 40, h: 50 },
    rear_left: { x: 40, y: 355, w: 50, h: 35 },
    rear_center: { x: 90, y: 385, w: 120, h: 30 },
    rear_right: { x: 210, y: 355, w: 50, h: 35 },
  };
  return positions[zone] || null;
}

function formatFuelPercent(value: any): string {
  const num = typeof value === 'number' ? value : parseInt(value);
  return isNaN(num) ? 'N/A' : `${num}%`;
}

function formatCleanliness(inspection: any, type: 'internal' | 'external'): string {
  const textValue = type === 'internal' ? inspection?.internal_cleanliness : inspection?.external_cleanliness;
  if (textValue && typeof textValue === 'string') {
    return textValue.charAt(0).toUpperCase() + textValue.slice(1);
  }
  const rating = type === 'internal' ? inspection?.cleanliness_interior : inspection?.cleanliness_exterior;
  if (rating !== null && rating !== undefined) {
    const mapped = CLEANLINESS_MAP[Number(rating) as 1|2|3|4|5];
    return mapped || String(rating);
  }
  return 'N/A';
}

function formatDatetimeFR(dateString: any): string {
  if (!dateString) return 'N/A';
  try {
    // Parse the ISO date string
    const date = new Date(dateString);
    // Format with French locale (this automatically uses the browser's timezone)
    // For consistent UTC+1 (Paris time), use 'Europe/Paris' timezone
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Paris'
    }).format(date);
  } catch (e) {
    return String(dateString);
  }
}

export default function PublicInspectionReportShared() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentPhotos, setCurrentPhotos] = useState<any[]>([]);

  useEffect(() => {
    if (token) loadReport();
  }, [token]);

  const loadReport = async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_inspection_report_by_token', { p_token: token });
      if (rpcError) throw rpcError;
      if (!data || data.error) throw new Error(data?.error || 'Rapport non trouvé');

      // Le RPC déployé (get_inspection_report_by_token) retourne le format:
      // { mission_data, vehicle_data, inspection_departure, inspection_arrival, report_type }
      // Si jamais get_full_inspection_report est déployé plus tard (format timeline),
      // on transforme conditionnellement comme dans la version mobile.
      let transformed = data;
      if (data.mission && !data.mission_data) {
        // Format timeline: { mission, vehicle, timeline, report_type }
        const timeline = data.timeline || [];
        const departureEvent = timeline.find((e: any) => e.event_type === 'departure_inspection');
        const arrivalEvent = timeline.find((e: any) => e.event_type === 'arrival_inspection');
        transformed = {
          mission_data: data.mission,
          vehicle_data: data.vehicle,
          inspection_departure: departureEvent?.data || null,
          inspection_arrival: arrivalEvent?.data || null,
          report_type: data.report_type || 'complete',
          timeline: timeline,
        };
      }

      setReportData(transformed);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPhoto = (photos: any[], index: number) => {
    setCurrentPhotos(photos);
    setPhotoIndex(index);
    setSelectedPhoto(photos[index]?.url || photos[index]?.photo_url);
  };

  const closePhoto = () => setSelectedPhoto(null);

  const nextPhoto = () => {
    if (photoIndex < currentPhotos.length - 1) {
      const newIndex = photoIndex + 1;
      setPhotoIndex(newIndex);
      setSelectedPhoto(currentPhotos[newIndex]?.url || currentPhotos[newIndex]?.photo_url);
    }
  };

  const prevPhoto = () => {
    if (photoIndex > 0) {
      const newIndex = photoIndex - 1;
      setPhotoIndex(newIndex);
      setSelectedPhoto(currentPhotos[newIndex]?.url || currentPhotos[newIndex]?.photo_url);
    }
  };

  const downloadAllPhotos = async () => {
    try {
      toast.info('Préparation du téléchargement complet...');
      const zip = new JSZip();
      
      // Ajouter les photos
      const addPhotosToZip = async (photos: any[], folderName: string) => {
        if (!photos?.length) return;
        const folder = zip.folder(folderName);
        for (let i = 0; i < photos.length; i++) {
          const url = photos[i]?.url || photos[i]?.photo_url;
          if (url) {
            const response = await fetch(url);
            const blob = await response.blob();
            folder?.file(`photo_${i + 1}.jpg`, blob);
          }
        }
      };

      await addPhotosToZip(reportData.inspection_departure?.photos, 'Photos_Depart');
      await addPhotosToZip(reportData.inspection_arrival?.photos, 'Photos_Arrivee');
      await addPhotosToZip(reportData.inspection_restitution_departure?.photos, 'Photos_Restitution_Depart');
      await addPhotosToZip(reportData.inspection_restitution_arrival?.photos, 'Photos_Restitution_Arrivee');
      
      // Générer et ajouter le PDF
      try {
        toast.info('Génération du PDF...');
        const { generatePremiumInspectionPDF } = await import('../services/inspectionPdfPremiumService');
        
        // Générer le PDF en blob
        const pdfBlob = await generatePremiumInspectionPDF({
          mission: reportData.mission_data,
          departure: reportData.inspection_departure,
          arrival: reportData.inspection_arrival,
          restitutionDeparture: reportData.inspection_restitution_departure,
          restitutionArrival: reportData.inspection_restitution_arrival,
          reportType: reportData.report_type
        }, true); // true = retourner le blob au lieu de télécharger
        
        if (pdfBlob) {
          zip.file(`Rapport_Inspection_${reportData.mission_data?.reference || 'rapport'}.pdf`, pdfBlob);
        }
      } catch (pdfError) {
        console.error('Erreur génération PDF:', pdfError);
        // Continuer même si le PDF échoue
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Inspection_Complete_${reportData.mission_data?.reference || 'rapport'}.zip`);
      toast.success('Archive complète téléchargée !');
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const shareReport = async () => {
    const shareText = `Rapport d'Inspection - Mission ${reportData?.mission_data?.reference || 'Rapport'}\n\nConsultez le rapport complet à l'adresse suivante:\n${window.location.href}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rapport d'Inspection ${reportData?.mission_data?.reference || 'Rapport'}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Erreur partage:', error);
        }
      }
    } else {
      // Fallback: copier le lien dans le presse-papiers
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Lien copié dans le presse-papiers !');
      } catch (error) {
        console.error('Erreur copie lien:', error);
        toast.error('Erreur lors du partage du lien');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-gray-600">{error || 'Ce rapport n\'existe pas ou a expiré'}</p>
        </div>
      </div>
    );
  }

  const mission = reportData.mission_data;
  const vehicle = reportData.vehicle_data;
  const departure = reportData.inspection_departure;
  const arrival = reportData.inspection_arrival;
  const restitutionDeparture = reportData.inspection_restitution_departure;
  const restitutionArrival = reportData.inspection_restitution_arrival;
  const hasRestitution = mission?.has_restitution || restitutionDeparture || restitutionArrival;

  // Calculer les métriques
  const kmParcouru = departure?.mileage_km && arrival?.mileage_km 
    ? Math.max(0, arrival.mileage_km - departure.mileage_km) 
    : null;

  // Temps de livraison en heures ET minutes
  let tempsLivraisonText = 'N/A';
  if (departure?.created_at && arrival?.created_at) {
    const diffMs = new Date(arrival.created_at).getTime() - new Date(departure.created_at).getTime();
    if (diffMs > 0) {
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0 && minutes > 0) {
        tempsLivraisonText = `${hours}h ${minutes}min`;
      } else if (hours > 0) {
        tempsLivraisonText = `${hours}h`;
      } else {
        tempsLivraisonText = `${minutes}min`;
      }
    }
  }

  // Noms des convoyeurs (départ vs arrivée)
  const departureDriverName = departure?.driver_name || departure?.driverName || null;
  const arrivalDriverName = arrival?.driver_name || arrival?.driverName || null;
  const hasMultipleDrivers = departureDriverName && arrivalDriverName && departureDriverName !== arrivalDriverName;

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:py-0">
      <div className="max-w-6xl mx-auto px-4 print:px-0">
        
        {/* HEADER PREMIUM */}
        <div className="bg-white rounded-xl shadow-2xl mb-6 overflow-hidden print:shadow-none print:border print:border-gray-300">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-4 sm:p-6 md:p-8 text-white relative overflow-hidden">
            {/* Motif décoratif */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
            </div>

            <div className="relative flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className="bg-white/20 p-2 sm:p-3 rounded-lg backdrop-blur-sm">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Rapport d'Inspection Véhicule</h1>
                    <p className="text-blue-100 text-sm mt-1">Document officiel de convoyage</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-1">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <FileText className="w-4 h-4" />
                      <span className="text-white/80">Référence:</span>
                      <span className="font-mono font-bold">{mission?.reference || 'N/A'}</span>
                    </div>
                    {mission?.created_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span className="text-white/80">Créée le:</span>
                        <span className="font-medium">{new Date(mission.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Car className="w-4 h-4" />
                      <span className="text-white/80">Véhicule {hasRestitution ? 'Aller' : ''}:</span>
                      <span className="font-bold">{vehicle?.brand || 'N/A'} {vehicle?.model || ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white/80">Immat:</span>
                      <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">{vehicle?.plate || 'N/A'}</span>
                    </div>
                  </div>
                  {hasRestitution && (
                    <div className="bg-orange-400/30 backdrop-blur-sm rounded-lg px-4 py-3 flex-1 min-w-[200px] border border-orange-300/30">
                      <div className="flex items-center gap-2 text-sm mb-1">
                        <Car className="w-4 h-4" />
                        <span className="text-white/80">Véhicule Retour:</span>
                        <span className="font-bold">{mission?.restitution_vehicle_brand || vehicle?.brand || 'N/A'} {mission?.restitution_vehicle_model || vehicle?.model || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white/80">Immat:</span>
                        <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">{mission?.restitution_vehicle_plate || vehicle?.plate || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition" title="Imprimer">
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={downloadAllPhotos} className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition" title="Télécharger photos">
                  <Archive className="w-5 h-5" />
                </button>
                <button onClick={shareReport} className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition" title="Partager rapport">
                  <Navigation className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* PHASE 1: TRAJET ALLER */}
            {hasRestitution && (
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">PHASE 1</div>
                <h3 className="text-lg font-bold text-gray-800">Trajet Aller</h3>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            )}

            <div className={`grid grid-cols-1 ${hasRestitution ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-8`}>
              {/* Véhicule Aller */}
              <VehicleCard
                label={hasRestitution ? 'Véhicule Aller' : 'Véhicule Convoyé'}
                brand={vehicle?.brand}
                model={vehicle?.model}
                plate={vehicle?.plate}
                vin={vehicle?.vin}
                year={vehicle?.year}
                color={vehicle?.color}
                type={mission?.vehicle_type}
                accentColor="blue"
              />

              {/* Départ */}
              <InfoCard
                icon={Navigation}
                title="Point de Départ"
                items={[
                  { label: 'Adresse', value: mission?.pickup_address || 'N/A' },
                  { label: 'Contact', value: mission?.pickup_contact_name || 'N/A' },
                  { label: 'Téléphone', value: mission?.pickup_contact_phone || 'N/A' },
                  { label: 'Date/Heure', value: departure?.created_at ? formatDatetimeFR(departure.created_at) : 'N/A' },
                ]}
              />

              {/* Arrivée */}
              <InfoCard
                icon={MapPin}
                title="Point d'Arrivée"
                items={[
                  { label: 'Adresse', value: mission?.delivery_address || 'N/A' },
                  { label: 'Contact', value: mission?.delivery_contact_name || 'N/A' },
                  { label: 'Téléphone', value: mission?.delivery_contact_phone || 'N/A' },
                  { label: 'Date/Heure', value: arrival?.created_at ? formatDatetimeFR(arrival.created_at) : 'N/A' },
                ]}
              />

              {/* Véhicule Retour (visible uniquement si restitution) */}
              {hasRestitution && (
                <VehicleCard
                  label="Véhicule Retour"
                  brand={mission?.restitution_vehicle_brand || vehicle?.brand}
                  model={mission?.restitution_vehicle_model || vehicle?.model}
                  plate={mission?.restitution_vehicle_plate || vehicle?.plate}
                  accentColor="orange"
                />
              )}
            </div>

            {/* Métriques de transport */}
            <div className={`grid grid-cols-2 ${hasMultipleDrivers ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm`}>
              {hasMultipleDrivers ? (
                <>
                  <MetricBox icon={User} label="Convoyeur Départ" value={departureDriverName} color="blue" />
                  <MetricBox icon={User} label="Convoyeur Arrivée" value={arrivalDriverName} color="indigo" />
                </>
              ) : (
                <MetricBox icon={User} label="Convoyeur" value={departureDriverName || arrivalDriverName || mission?.driver_name || 'N/A'} color="blue" />
              )}
              <MetricBox icon={Phone} label="Téléphone" value={mission?.driver_phone || 'N/A'} color="indigo" />
              <MetricBox icon={Gauge} label="KM Parcourus" value={kmParcouru !== null ? `${kmParcouru.toLocaleString()} km` : 'N/A'} color="green" />
              <MetricBox icon={Clock} label="Temps Livraison" value={tempsLivraisonText} color="amber" />
            </div>

            {/* Informations Mission */}
            {mission?.reference && (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div>
                    <div className="text-sm text-gray-500">Référence Mission</div>
                    <div className="font-mono font-bold text-gray-900">{mission.reference}</div>
                  </div>
                  {mission.status && (
                    <div className="ml-auto">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        mission.status === 'completed' ? 'bg-green-100 text-green-700' :
                        mission.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {mission.status === 'completed' ? '✓ Terminée' :
                         mission.status === 'in_progress' ? '⏳ En cours' :
                         mission.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COMPARAISON DÉPART / ARRIVÉE */}
        {departure && arrival && (
          <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden print:shadow-none print:border print:border-gray-300">
            <div className="bg-gradient-to-r from-emerald-500 to-blue-500 p-6 text-white">
              <h2 className="text-2xl font-bold">📊 Résumé Comparatif</h2>
              <p className="text-white/80 text-sm mt-1">Différences constatées entre le départ et l'arrivée</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KM */}
                <ComparisonItem 
                  label="Kilométrage"
                  departValue={departure.mileage_km ? `${departure.mileage_km.toLocaleString()} km` : 'N/A'}
                  arriveValue={arrival.mileage_km ? `${arrival.mileage_km.toLocaleString()} km` : 'N/A'}
                  delta={kmParcouru !== null ? `+${kmParcouru.toLocaleString()} km` : null}
                />
                {/* Carburant */}
                <ComparisonItem 
                  label="Carburant"
                  departValue={formatFuelPercent(departure.fuel_level)}
                  arriveValue={formatFuelPercent(arrival.fuel_level)}
                  delta={departure.fuel_level != null && arrival.fuel_level != null 
                    ? `${arrival.fuel_level - departure.fuel_level > 0 ? '+' : ''}${arrival.fuel_level - departure.fuel_level}%` 
                    : null}
                />
                {/* Propreté Int */}
                <ComparisonItem 
                  label="Propreté Int."
                  departValue={formatCleanliness(departure, 'internal')}
                  arriveValue={formatCleanliness(arrival, 'internal')}
                />
                {/* Propreté Ext */}
                <ComparisonItem 
                  label="Propreté Ext."
                  departValue={formatCleanliness(departure, 'external')}
                  arriveValue={formatCleanliness(arrival, 'external')}
                />
              </div>

              {/* Timeline des convoyeurs — Historique d'activité complet */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Historique d'activité
                </h4>
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                  {/* Mission créée */}
                  {mission?.created_at && (
                    <TimelineEvent 
                      icon="📋" label="Mission créée" 
                      detail={`Référence: ${mission.reference || 'N/A'}`}
                      time={formatDatetimeFR(mission.created_at)} 
                      color="gray" 
                    />
                  )}
                  {/* Inspection départ commencée */}
                  {departure?.created_at && (
                    <TimelineEvent 
                      icon="🟢" label="Inspection départ réalisée" 
                      detail={`Par: ${departureDriverName || 'N/A'} — KM: ${departure.mileage_km?.toLocaleString() || 'N/A'}`}
                      time={formatDatetimeFR(departure.created_at)} 
                      color="green" 
                    />
                  )}
                  {/* Inspection départ terminée */}
                  {departure?.completed_at && (
                    <TimelineEvent 
                      icon="✅" label="Inspection départ validée" 
                      detail={departure.client_name ? `Signé par: ${departure.client_name}` : 'Signature client récupérée'}
                      time={formatDatetimeFR(departure.completed_at)} 
                      color="green" 
                    />
                  )}
                  {/* Livraison en cours */}
                  {departure?.created_at && arrival?.created_at && (
                    <TimelineEvent 
                      icon="🚗" label="Convoyage en cours" 
                      detail={`${tempsLivraisonText} de trajet${kmParcouru !== null ? ` — ${kmParcouru.toLocaleString()} km parcourus` : ''}`}
                      time="" 
                      color="blue" 
                    />
                  )}
                  {/* Inspection arrivée commencée */}
                  {arrival?.created_at && (
                    <TimelineEvent 
                      icon="🔵" label="Inspection arrivée réalisée" 
                      detail={`Par: ${arrivalDriverName || 'N/A'} — KM: ${arrival.mileage_km?.toLocaleString() || 'N/A'}`}
                      time={formatDatetimeFR(arrival.created_at)} 
                      color="blue" 
                    />
                  )}
                  {/* Inspection arrivée terminée */}
                  {arrival?.completed_at && (
                    <TimelineEvent 
                      icon="✅" label="Inspection arrivée validée" 
                      detail={arrival.client_name ? `Réceptionné par: ${arrival.client_name}` : 'Signature réceptionnaire récupérée'}
                      time={formatDatetimeFR(arrival.completed_at)} 
                      color="blue" 
                    />
                  )}
                  {/* Mission terminée */}
                  {mission?.status === 'completed' && !hasRestitution && (
                    <TimelineEvent 
                      icon="🏁" label="Mission terminée" 
                      detail="Véhicule livré avec succès"
                      time="" 
                      color="purple" 
                    />
                  )}
                  {/* Restitution events */}
                  {restitutionDeparture?.created_at && (
                    <TimelineEvent 
                      icon="🔶" label="Inspection départ restitution" 
                      detail={`Par: ${restitutionDeparture.driver_name || 'N/A'} — KM: ${restitutionDeparture.mileage_km?.toLocaleString() || 'N/A'}`}
                      time={formatDatetimeFR(restitutionDeparture.created_at)} 
                      color="orange" 
                    />
                  )}
                  {restitutionArrival?.created_at && (
                    <TimelineEvent 
                      icon="🔷" label="Inspection arrivée restitution" 
                      detail={`Par: ${restitutionArrival.driver_name || 'N/A'} — KM: ${restitutionArrival.mileage_km?.toLocaleString() || 'N/A'}`}
                      time={formatDatetimeFR(restitutionArrival.created_at)} 
                      color="blue" 
                    />
                  )}
                  {mission?.status === 'completed' && hasRestitution && (
                    <TimelineEvent 
                      icon="🏁" label="Mission terminée (restitution incluse)" 
                      detail="Véhicule restitué avec succès"
                      time="" 
                      color="purple" 
                    />
                  )}
                </div>
              </div>

              {/* Comparaison photos côte à côte */}
              {departure?.photos?.length > 0 && arrival?.photos?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-500" /> Comparaison Photos Avant / Après
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {departure.photos.slice(0, Math.min(departure.photos.length, arrival.photos.length, 6)).map((depPhoto: any, i: number) => {
                      const arrPhoto = arrival.photos[i];
                      if (!arrPhoto) return null;
                      return (
                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-2 gap-px bg-gray-200">
                            <div className="relative bg-white">
                              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">DÉPART</div>
                              <img 
                                src={depPhoto.url || depPhoto.photo_url} 
                                alt={`Départ ${i+1}`} 
                                className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition"
                                onClick={() => openPhoto(departure.photos, i)}
                              />
                              {depPhoto.damage_status && depPhoto.damage_status !== 'RAS' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-2 py-1">
                                  ⚠ {depPhoto.damage_status}{depPhoto.damage_comment ? ` — ${depPhoto.damage_comment}` : ''}
                                </div>
                              )}
                            </div>
                            <div className="relative bg-white">
                              <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-bold z-10">ARRIVÉE</div>
                              <img 
                                src={arrPhoto.url || arrPhoto.photo_url} 
                                alt={`Arrivée ${i+1}`} 
                                className="w-full h-40 object-cover cursor-pointer hover:opacity-90 transition"
                                onClick={() => openPhoto(arrival.photos, i)}
                              />
                              {arrPhoto.damage_status && arrPhoto.damage_status !== 'RAS' && (
                                <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-white text-xs px-2 py-1">
                                  ⚠ {arrPhoto.damage_status}{arrPhoto.damage_comment ? ` — ${arrPhoto.damage_comment}` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-center text-xs text-gray-500 py-1 bg-gray-50">Photo {i+1}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Carte GPS — Itinéraire Départ → Arrivée */}
              {departure?.latitude && departure?.longitude && arrival?.latitude && arrival?.longitude && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-green-500" /> Itinéraire GPS
                  </h4>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <iframe
                      title="Itinéraire GPS"
                      width="100%"
                      height="350"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                        Math.min(departure.longitude, arrival.longitude) - 0.05
                      },${
                        Math.min(departure.latitude, arrival.latitude) - 0.05
                      },${
                        Math.max(departure.longitude, arrival.longitude) + 0.05
                      },${
                        Math.max(departure.latitude, arrival.latitude) + 0.05
                      }&layer=mapnik&marker=${departure.latitude},${departure.longitude}`}
                    />
                    <div className="flex items-center justify-between p-3 bg-gray-50 text-xs text-gray-600">
                      <span>🟢 Départ: {departure.latitude.toFixed(5)}, {departure.longitude.toFixed(5)}</span>
                      <a
                        href={`https://www.google.com/maps/dir/${departure.latitude},${departure.longitude}/${arrival.latitude},${arrival.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Voir sur Google Maps →
                      </a>
                      <span>🔵 Arrivée: {arrival.latitude.toFixed(5)}, {arrival.longitude.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INSPECTION DÉPART — avec badge véhicule */}
        {departure && (
          <InspectionCard
            title="Inspection au Départ"
            inspection={departure}
            color="green"
            onOpenPhoto={openPhoto}
            vehicleLabel={hasRestitution ? `${vehicle?.brand || ''} ${vehicle?.model || ''} — ${vehicle?.plate || 'N/A'}` : undefined}
            phaseLabel={hasRestitution ? 'ALLER' : undefined}
          />
        )}

        {/* INSPECTION ARRIVÉE */}
        {arrival && (
          <InspectionCard
            title="Inspection à l'Arrivée"
            inspection={arrival}
            color="blue"
            onOpenPhoto={openPhoto}
            vehicleLabel={hasRestitution ? `${vehicle?.brand || ''} ${vehicle?.model || ''} — ${vehicle?.plate || 'N/A'}` : undefined}
            phaseLabel={hasRestitution ? 'ALLER' : undefined}
          />
        )}

        {/* ============ SECTION RESTITUTION (RETOUR) ============ */}
        {hasRestitution && (
          <>
            {/* Séparateur visuel Phase 2 */}
            <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden print:shadow-none print:border print:border-gray-300">
              <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 p-6 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2"></div>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">PHASE 2</div>
                    <h2 className="text-2xl font-bold">🔄 Trajet Retour (Restitution)</h2>
                  </div>
                  <p className="text-white/80 text-sm">Convoyage retour avec inspections complètes</p>
                </div>
              </div>
              <div className="p-6">
                {/* Véhicule + Trajet + Métriques */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Véhicule Retour — carte détaillée */}
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border-2 border-orange-200 relative">
                    <div className="absolute top-3 right-3">
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">RETOUR</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <Car className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-bold text-orange-900">Véhicule</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-lg font-bold text-gray-900">
                        {mission?.restitution_vehicle_brand || vehicle?.brand || 'N/A'} {mission?.restitution_vehicle_model || vehicle?.model || ''}
                      </p>
                      <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-orange-200">
                        <span className="text-gray-500 text-xs">Immat:</span>
                        <span className="font-mono font-black text-gray-900 text-base tracking-wider">{mission?.restitution_vehicle_plate || vehicle?.plate || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Trajet Retour */}
                  <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-bold text-orange-900">Trajet Retour</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">●</span>
                        <div>
                          <div className="text-xs text-gray-500">Départ retour</div>
                          <div className="font-medium text-gray-900">{mission?.restitution_pickup_address || mission?.delivery_address || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="border-l-2 border-dashed border-orange-300 ml-1.5 h-2"></div>
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">●</span>
                        <div>
                          <div className="text-xs text-gray-500">Arrivée retour</div>
                          <div className="font-medium text-gray-900">{mission?.restitution_delivery_address || mission?.pickup_address || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Métriques Retour */}
                  <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-orange-500 p-2 rounded-lg">
                        <Gauge className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-bold text-orange-900">Métriques Retour</h4>
                    </div>
                    <div className="space-y-2">
                      {restitutionDeparture && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">KM départ:</span>
                          <span className="font-bold text-gray-900">{restitutionDeparture.mileage_km?.toLocaleString() || 'N/A'} km</span>
                        </div>
                      )}
                      {restitutionArrival && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">KM arrivée:</span>
                          <span className="font-bold text-gray-900">{restitutionArrival.mileage_km?.toLocaleString() || 'N/A'} km</span>
                        </div>
                      )}
                      {restitutionDeparture?.mileage_km && restitutionArrival?.mileage_km && (
                        <div className="flex justify-between text-sm pt-2 border-t border-orange-200">
                          <span className="text-gray-500">KM parcourus:</span>
                          <span className="font-black text-orange-700">{Math.max(0, restitutionArrival.mileage_km - restitutionDeparture.mileage_km).toLocaleString()} km</span>
                        </div>
                      )}
                      {restitutionDeparture && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Carburant départ:</span>
                          <span className="font-bold text-gray-900">{formatFuelPercent(restitutionDeparture.fuel_level)}</span>
                        </div>
                      )}
                      {restitutionArrival && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Carburant arrivée:</span>
                          <span className="font-bold text-gray-900">{formatFuelPercent(restitutionArrival.fuel_level)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Comparaison départ/arrivée restitution */}
                {restitutionDeparture && restitutionArrival && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <ComparisonItem 
                      label="Kilométrage"
                      departValue={restitutionDeparture.mileage_km ? `${restitutionDeparture.mileage_km.toLocaleString()} km` : 'N/A'}
                      arriveValue={restitutionArrival.mileage_km ? `${restitutionArrival.mileage_km.toLocaleString()} km` : 'N/A'}
                      delta={restitutionDeparture.mileage_km && restitutionArrival.mileage_km 
                        ? `+${Math.max(0, restitutionArrival.mileage_km - restitutionDeparture.mileage_km).toLocaleString()} km` : null}
                    />
                    <ComparisonItem 
                      label="Carburant"
                      departValue={formatFuelPercent(restitutionDeparture.fuel_level)}
                      arriveValue={formatFuelPercent(restitutionArrival.fuel_level)}
                    />
                    <ComparisonItem 
                      label="Propreté Int."
                      departValue={formatCleanliness(restitutionDeparture, 'internal')}
                      arriveValue={formatCleanliness(restitutionArrival, 'internal')}
                    />
                    <ComparisonItem 
                      label="Propreté Ext."
                      departValue={formatCleanliness(restitutionDeparture, 'external')}
                      arriveValue={formatCleanliness(restitutionArrival, 'external')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* INSPECTION DÉPART RESTITUTION */}
            {restitutionDeparture && (
              <InspectionCard
                title="Inspection Départ Restitution"
                inspection={restitutionDeparture}
                color="green"
                onOpenPhoto={openPhoto}
                vehicleLabel={`${mission?.restitution_vehicle_brand || vehicle?.brand || ''} ${mission?.restitution_vehicle_model || vehicle?.model || ''} — ${mission?.restitution_vehicle_plate || vehicle?.plate || 'N/A'}`}
                phaseLabel="RETOUR"
              />
            )}

            {/* INSPECTION ARRIVÉE RESTITUTION */}
            {restitutionArrival && (
              <InspectionCard
                title="Inspection Arrivée Restitution"
                inspection={restitutionArrival}
                color="blue"
                onOpenPhoto={openPhoto}
                vehicleLabel={`${mission?.restitution_vehicle_brand || vehicle?.brand || ''} ${mission?.restitution_vehicle_model || vehicle?.model || ''} — ${mission?.restitution_vehicle_plate || vehicle?.plate || 'N/A'}`}
                phaseLabel="RETOUR"
              />
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8 print:mt-4">
          <p>Document généré par CHECKSFLEET - Transport & Convoyage Professionnel</p>
          <p className="mt-1">Rapport authentique et sécurisé • {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>

      {/* MODAL PHOTO */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={closePhoto}>
          <button onClick={closePhoto} className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-lg">
            <X className="w-6 h-6" />
          </button>
          
          {photoIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} 
              className="absolute left-4 text-white hover:bg-white/20 p-3 rounded-lg">
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          <img src={selectedPhoto} alt="Photo" className="max-h-[90vh] max-w-[90vw] object-contain" 
            onClick={(e) => e.stopPropagation()} />
          
          {photoIndex < currentPhotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} 
              className="absolute right-4 text-white hover:bg-white/20 p-3 rounded-lg">
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
            {photoIndex + 1} / {currentPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}

// COMPOSANTS UTILITAIRES

function InfoCard({ icon: Icon, title, items }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4 text-gray-700">
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item: any, i: number) => (
          <div key={i} className="text-sm">
            <span className="text-gray-500">{item.label}:</span>{' '}
            <span className="text-gray-900 font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, color = 'blue' }: any) {
  const colorClasses = {
    blue: 'text-blue-600',
    indigo: 'text-indigo-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="text-center">
      <Icon className={`w-6 h-6 mx-auto mb-2 ${colorClasses[color] || colorClasses.blue}`} />
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
    </div>
  );
}

function VehicleCard({ label, brand, model, plate, vin, year, color, type, accentColor = 'blue' }: any) {
  const colors: any = {
    blue: { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-200', badge: 'bg-blue-500', icon: 'bg-blue-500', text: 'text-blue-900' },
    orange: { bg: 'from-orange-50 to-amber-50', border: 'border-orange-200', badge: 'bg-orange-500', icon: 'bg-orange-500', text: 'text-orange-900' },
  };
  const c = colors[accentColor] || colors.blue;
  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-xl p-5 border-2 ${c.border} relative`}>
      <div className="absolute top-3 right-3">
        <span className={`${c.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{label?.includes('Retour') ? 'RETOUR' : 'ALLER'}</span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`${c.icon} p-2 rounded-lg`}>
          <Car className="w-5 h-5 text-white" />
        </div>
        <h4 className={`font-bold ${c.text}`}>{label}</h4>
      </div>
      <div className="space-y-1.5 text-sm">
        <p className="text-lg font-bold text-gray-900">{brand || 'N/A'} {model || ''}</p>
        <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
          <span className="text-gray-500 text-xs">Immat:</span>
          <span className="font-mono font-black text-gray-900 tracking-wider">{plate || 'N/A'}</span>
        </div>
        {vin && <p className="text-xs text-gray-500">VIN: <span className="font-mono">{vin}</span></p>}
        <div className="flex flex-wrap gap-2 mt-1">
          {year && <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200">{year}</span>}
          {type && <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200">{type}</span>}
          {color && <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200">{color}</span>}
        </div>
      </div>
    </div>
  );
}

function InspectionCard({ title, inspection, color, onOpenPhoto, vehicleLabel, phaseLabel }: any) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600 border-green-200',
    blue: 'from-blue-500 to-indigo-600 border-blue-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden print:shadow-none print:border print:border-gray-300 print:break-inside-avoid">
      <div className={`bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} p-6 text-white print:bg-${color}-600`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-white/80 text-sm mt-1">
              {inspection.created_at ? formatDatetimeFR(inspection.created_at) : 'N/A'}
            </p>
          </div>
          {vehicleLabel && (
            <div className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
              {phaseLabel && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${phaseLabel === 'RETOUR' ? 'bg-orange-400' : 'bg-blue-400'} text-white`}>{phaseLabel}</span>
              )}
              <span className="text-sm font-bold">🚗 {vehicleLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* État Véhicule */}
        <Section title="État du Véhicule" icon={Gauge}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatItem 
              label="Kilométrage" 
              value={inspection.mileage_km ? `${inspection.mileage_km.toLocaleString()} km` : 'N/A'} 
            />
            <StatItem 
              label="Carburant" 
              value={formatFuelPercent(inspection.fuel_level)} 
            />
            <StatItem 
              label="Propreté Int." 
              value={formatCleanliness(inspection, 'internal')} 
            />
            <StatItem 
              label="Propreté Ext." 
              value={formatCleanliness(inspection, 'external')} 
            />
          </div>
          {/* État général du véhicule */}
          {inspection.overall_condition && (() => {
            const cond = translateOverallCondition(inspection.overall_condition);
            return (
              <div className="mt-4 flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <span className="text-xl">{cond.emoji}</span>
                <div>
                  <p className="text-xs text-gray-500 font-medium">État général</p>
                  <p className="text-sm font-bold" style={{ color: cond.color }}>{cond.label}</p>
                </div>
              </div>
            );
          })()}
        </Section>

        {/* Équipements & Accessoires — Tableau structuré */}
        {(() => {
          const vi = inspection.vehicle_info || {};
          const hasAnyData = vi.has_security_kit !== undefined || inspection.has_security_kit !== undefined
            || vi.keys_count !== undefined || inspection.keys_count !== undefined;
          if (!hasAnyData) return null;

          const items = [
            { icon: '🔑', label: 'Nombre de clés', value: vi.keys_count ?? inspection.keys_count, type: 'count' as const },
            { icon: '🛡️', label: 'Kit de sécurité', value: vi.has_security_kit ?? inspection.has_security_kit, type: 'bool' as const },
            { icon: '🛞', label: 'Roue de secours', value: vi.has_spare_wheel ?? inspection.has_spare_wheel, type: 'bool' as const },
            { icon: '💨', label: 'Kit de gonflage', value: vi.has_inflation_kit ?? inspection.has_inflation_kit, type: 'bool' as const },
            { icon: '⛽', label: 'Carte carburant', value: vi.has_fuel_card ?? inspection.has_fuel_card, type: 'bool' as const },
            { icon: '📦', label: 'Véhicule chargé', value: vi.is_loaded ?? inspection.is_loaded, type: 'bool' as const },
            { icon: '🎁', label: 'Objet confié', value: vi.has_confided_object ?? inspection.has_confided_object, type: 'bool' as const },
          ];

          // Arrival items
          if (vi.keys_returned !== undefined) {
            items.push(
              { icon: '🔑', label: 'Clés restituées', value: vi.keys_returned, type: 'bool' as const },
              { icon: '📄', label: 'Documents restitués', value: vi.documents_returned, type: 'bool' as const },
            );
          }

          return (
            <Section title="Équipements & Accessoires" icon={Package}>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-600 w-8"></th>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-600">Élément</th>
                      <th className="text-center py-2.5 px-4 font-semibold text-gray-600">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => {
                      if (item.value === undefined || item.value === null) return null;
                      return (
                        <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="py-2.5 px-4 text-center">{item.icon}</td>
                          <td className="py-2.5 px-4 font-medium text-gray-800">{item.label}</td>
                          <td className="py-2.5 px-4 text-center">
                            {item.type === 'count' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-sm">
                                {item.value}
                              </span>
                            ) : item.value ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold text-xs">
                                ✅ Présent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-50 text-red-600 rounded-full font-semibold text-xs">
                                ❌ Absent
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {(vi.has_confided_object || inspection.has_confided_object) && (vi.confided_object_description || inspection.confided_object_description) && (
                <div className="mt-3 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm font-semibold text-blue-700 mb-1">Description de l'objet confié :</p>
                  <p className="text-blue-600">{vi.confided_object_description || inspection.confided_object_description}</p>
                </div>
              )}
            </Section>
          );
        })()}

        {/* Photos */}
        {inspection.photos && inspection.photos.length > 0 && (
          <Section title={`Photos (${inspection.photos.length})`} icon={ImageIcon}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {inspection.photos.map((photo: any, i: number) => {
                const hasDamage = photo.damage_status && photo.damage_status !== 'RAS';
                const isLoadedVehicle = photo.photo_type?.includes('loaded_vehicle');
                return (
                <div key={i} className={`rounded-lg overflow-hidden border-2 ${isLoadedVehicle ? 'border-blue-400' : hasDamage ? 'border-amber-400' : 'border-transparent'} print:break-inside-avoid`}>
                  <div onClick={() => onOpenPhoto(inspection.photos, i)}
                    className="aspect-square cursor-pointer hover:ring-4 ring-blue-500 transition relative">
                    <img src={photo.url || photo.photo_url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    {isLoadedVehicle && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <span>📦</span> Chargement
                      </div>
                    )}
                  </div>
                  {/* Label du type de photo */}
                  <div className={`px-2 py-1 ${isLoadedVehicle ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs truncate ${isLoadedVehicle ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                      {isLoadedVehicle ? '📦 Photo du chargement' : (photo.photo_type ? translatePhotoType(photo.photo_type) : `Photo ${i + 1}`)}
                    </p>
                  </div>
                  {/* Dommage + Commentaire */}
                  {hasDamage && (
                    <div className="bg-amber-50 border-t border-amber-200 px-3 py-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-xs font-bold text-amber-700">{photo.damage_status}</span>
                      </div>
                      {photo.damage_comment && (
                        <p className="text-xs text-amber-600 italic">« {photo.damage_comment} »</p>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Documents Scannés */}
        {inspection.scanned_documents && inspection.scanned_documents.length > 0 && (
          <Section title={`Documents Scannés (${inspection.scanned_documents.length})`} icon={FileText}>
            <div className="space-y-3">
              {inspection.scanned_documents.map((doc: any, i: number) => {
                const docUrl = doc.file_url || doc.document_url || doc.url;
                const docTitle = doc.title || doc.document_title || `Document ${i + 1}`;
                return (
                  <div key={doc.id || i} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{docTitle}</p>
                        <p className="text-xs text-gray-500">
                          {doc.created_at ? formatDatetimeFR(doc.created_at) : ''}
                        </p>
                      </div>
                    </div>
                    {docUrl && (
                      <a href={docUrl} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-1.5">
                        <Download className="w-4 h-4" />
                        Voir
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Signatures */}
        <Section title="Signatures" icon={FileSignature}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SignatureBox
              title={title.includes('Départ') ? 'Convoyeur (Départ)' : 'Convoyeur (Arrivée)'}
              signature={inspection.driver_signature}
              name={inspection.driver_name || inspection.driverName}
              timestamp={inspection.completed_at || inspection.created_at}
              latitude={inspection.latitude}
              longitude={inspection.longitude}
            />
            <SignatureBox
              title={title.includes('Départ') ? 'Expéditeur' : 'Réceptionnaire'}
              signature={inspection.client_signature}
              name={inspection.client_name || inspection.clientName}
              timestamp={inspection.completed_at || inspection.created_at}
              latitude={inspection.latitude}
              longitude={inspection.longitude}
            />
          </div>
        </Section>

        {/* Frais / Dépenses */}
        {inspection.expenses && inspection.expenses.length > 0 && (
          <Section title={`Frais & Dépenses (${inspection.expenses.length})`} icon={Package}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="text-left font-semibold px-3 py-2">Libellé</th>
                    <th className="text-left font-semibold px-3 py-2">Catégorie</th>
                    <th className="text-right font-semibold px-3 py-2">Montant</th>
                    <th className="text-left font-semibold px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inspection.expenses.map((exp: any) => (
                    <tr key={exp.id} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-800">{exp.description || exp.label || 'Frais'}</td>
                      <td className="px-3 py-2 text-gray-500">{translateExpenseType(exp.expense_type || exp.category || '')}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{Number(exp.amount || 0).toFixed(2)} €</td>
                      <td className="px-3 py-2 text-gray-500">
                        {exp.created_at ? new Date(exp.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Dommages / Dégâts — Schéma véhicule + Liste traduite */}
        {inspection.damages && inspection.damages.length > 0 && (() => {
          // Grouper les dommages par zone pour le schéma
          const byZone: Record<string, any[]> = {};
          for (const d of inspection.damages) {
            const zone = d.location || 'unknown';
            if (!byZone[zone]) byZone[zone] = [];
            byZone[zone].push(d);
          }

          return (
          <Section title={`⚠️ Dommages Constatés (${inspection.damages.length})`} icon={XCircle}>

            {/* ── Schéma véhicule vue de dessus avec zones de dommages ── */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                🚗 Carte des dommages
              </h4>
              <div className="flex justify-center mb-4">
                <svg viewBox="0 0 300 420" className="w-full max-w-[280px]" xmlns="http://www.w3.org/2000/svg">
                  {/* Ombre */}
                  <path transform="translate(0, 4)" d="M90,15 Q150,5 210,15 Q250,30 250,90 L255,100 L255,300 L250,310 Q250,380 210,395 Q150,405 90,395 Q50,380 50,310 L45,300 L45,100 L50,90 Q50,30 90,15 Z" fill="rgba(0,0,0,0.05)" filter="blur(4px)" />
                  {/* Carrosserie */}
                  <path d="M90,15 Q150,5 210,15 Q250,30 250,90 L255,100 L255,300 L250,310 Q250,380 210,395 Q150,405 90,395 Q50,380 50,310 L45,300 L45,100 L50,90 Q50,30 90,15 Z" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
                  {/* Pare-brise */}
                  <path d="M80,75 Q150,65 220,75 L230,110 Q150,100 70,110 Z" fill="rgba(224, 242, 254, 0.8)" stroke="#94A3B8" strokeWidth="1.5" />
                  {/* Lunette arrière */}
                  <path d="M75,310 Q150,305 225,310 L215,345 Q150,350 85,345 Z" fill="rgba(224, 242, 254, 0.8)" stroke="#94A3B8" strokeWidth="1.5" />
                  {/* Toit */}
                  <path d="M70,110 L230,110 L225,310 L75,310 Z" fill="rgba(255,255,255,0.3)" />
                  {/* Lignes capot */}
                  <path d="M80,75 Q60,40 90,15" fill="none" stroke="#CBD5E1" strokeWidth="1" />
                  <path d="M220,75 Q240,40 210,15" fill="none" stroke="#CBD5E1" strokeWidth="1" />
                  {/* Lignes coffre */}
                  <line x1="85" y1="345" x2="85" y2="395" stroke="#CBD5E1" strokeWidth="1" />
                  <line x1="215" y1="345" x2="215" y2="395" stroke="#CBD5E1" strokeWidth="1" />
                  {/* Rétroviseurs */}
                  <path d="M50,85 L20,80 Q15,90 20,100 L50,95 Z" fill="#CBD5E1" />
                  <path d="M250,85 L280,80 Q285,90 280,100 L250,95 Z" fill="#CBD5E1" />
                  {/* Roues */}
                  <rect x="25" y="95" width="16" height="42" rx="4" fill="#94A3B8" />
                  <rect x="259" y="95" width="16" height="42" rx="4" fill="#94A3B8" />
                  <rect x="25" y="270" width="16" height="42" rx="4" fill="#94A3B8" />
                  <rect x="259" y="270" width="16" height="42" rx="4" fill="#94A3B8" />
                  {/* Phares */}
                  <ellipse cx="70" cy="27" rx="15" ry="7" fill="rgba(255,255,255,0.6)" />
                  <ellipse cx="230" cy="27" rx="15" ry="7" fill="rgba(255,255,255,0.6)" />
                  {/* Feux arrière */}
                  <ellipse cx="70" cy="390" rx="15" ry="5" fill="rgba(254, 202, 202, 0.7)" />
                  <ellipse cx="230" cy="390" rx="15" ry="5" fill="rgba(254, 202, 202, 0.7)" />
                  {/* Labels orientation */}
                  <text x="150" y="12" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#94A3B8">AVANT</text>
                  <text x="150" y="418" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#94A3B8">ARRIÈRE</text>
                  <text x="12" y="204" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94A3B8">G</text>
                  <text x="288" y="204" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94A3B8">D</text>
                  {/* Zones de dommages */}
                  {Object.entries(byZone).map(([zone, damages]) => {
                    const zonePos = getZonePosition(zone);
                    if (!zonePos) return null;
                    return (
                      <g key={zone}>
                        <rect
                          x={zonePos.x} y={zonePos.y}
                          width={zonePos.w} height={zonePos.h}
                          rx="3"
                          fill="rgba(239,68,68,0.2)"
                          stroke="rgba(239,68,68,0.6)"
                          strokeWidth="2"
                        />
                        <circle
                          cx={zonePos.x + zonePos.w / 2}
                          cy={zonePos.y + zonePos.h / 2}
                          r="10"
                          fill="#EF4444"
                        />
                        <text
                          x={zonePos.x + zonePos.w / 2}
                          y={zonePos.y + zonePos.h / 2 + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="white"
                        >
                          {damages.length}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Légende par zone */}
              <div className="space-y-2">
                {Object.entries(byZone).map(([zone, damages]) => (
                  <div key={zone} className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      📍 {translateZone(zone)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {damages.map((d: any, i: number) => {
                        const typeInfo = translateDamageType(d.damage_type);
                        return (
                          <div key={i} className="flex items-center gap-1.5 bg-white rounded px-2 py-1 border border-red-100">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeInfo.color }} />
                            <span className="text-xs font-medium" style={{ color: typeInfo.color }}>
                              {typeInfo.emoji} {typeInfo.label}
                            </span>
                            {d.severity && d.severity !== 'minor' && (
                              <span className={`text-[10px] px-1 rounded ${
                                d.severity === 'severe' || d.severity === 'critical'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {translateSeverity(d.severity)}
                              </span>
                            )}
                            {d.description && (
                              <span className="text-[10px] text-gray-400 ml-1">{d.description}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Liste détaillée des dommages ── */}
            <div className="space-y-4">
              {inspection.damages.map((damage: any) => {
                const typeInfo = translateDamageType(damage.damage_type);
                return (
                <div key={damage.id} className={`border-l-4 rounded-lg p-4 ${
                  damage.severity === 'critical' || damage.severity === 'severe' ? 'border-red-500 bg-red-50' :
                  damage.severity === 'major' || damage.severity === 'moderate' ? 'border-orange-500 bg-orange-50' :
                  'border-yellow-500 bg-yellow-50'
                }`}>
                  <div className="flex items-start gap-4">
                    {damage.photo_url && (
                      <img 
                        src={damage.photo_url} 
                        alt={`Dommage — ${typeInfo.label}`}
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:ring-4 ring-blue-500 transition"
                        onClick={() => onOpenPhoto([{ url: damage.photo_url }], 0)}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          damage.severity === 'critical' || damage.severity === 'severe' ? 'bg-red-600 text-white' :
                          damage.severity === 'major' || damage.severity === 'moderate' ? 'bg-orange-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {damage.severity === 'critical' ? '🚨 Critique' :
                           damage.severity === 'severe' ? '🚨 Grave' :
                           damage.severity === 'major' ? '⚠️ Majeur' :
                           damage.severity === 'moderate' ? '⚠️ Modéré' :
                           '⚡ Mineur'}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: typeInfo.color }}>
                          {typeInfo.emoji} {typeInfo.label}
                        </span>
                        {damage.location && (
                          <span className="text-xs px-2 py-1 bg-white rounded border border-gray-300">
                            📍 {translateZone(damage.location)}
                          </span>
                        )}
                      </div>
                      {damage.description && (
                        <p className="text-sm text-gray-700 mb-2">{damage.description}</p>
                      )}
                      {damage.created_at && (
                        <p className="text-xs text-gray-500">
                          Constaté le {new Date(damage.created_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </Section>
          );
        })()}

        {/* Observations */}
        {inspection.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 print:break-inside-avoid">
            <h4 className="font-semibold text-amber-900 mb-2">📝 Observations</h4>
            <p className="text-amber-800 whitespace-pre-wrap text-sm">{inspection.notes}</p>
          </div>
        )}

        {/* Position GPS */}
        {(inspection.latitude || inspection.longitude) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:break-inside-avoid">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-5 h-5 text-blue-700" />
              <h4 className="font-semibold text-blue-900">Position GPS</h4>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <p>📍 Latitude: <span className="font-mono font-medium">{inspection.latitude || 'N/A'}</span></p>
              <p>📍 Longitude: <span className="font-mono font-medium">{inspection.longitude || 'N/A'}</span></p>
              {inspection.latitude && inspection.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${inspection.latitude},${inspection.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <MapPin className="w-4 h-4" />
                  Voir sur Google Maps
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-3 text-gray-700">
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StatItem({ label, value }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-bold text-gray-900">{value}</div>
    </div>
  );
}

function Badge({ label, checked }: any) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
      checked ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {checked ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );
}

function SignatureBox({ title, signature, name, timestamp, latitude, longitude }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="bg-gray-50 rounded border border-gray-200 p-2 h-32 flex items-center justify-center">
        {signature ? (
          <img src={signature} alt={title} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-gray-400 text-sm">Non signée</span>
        )}
      </div>
      {name && (
        <div className="mt-2 text-xs text-gray-500">Signé par: <span className="font-medium text-gray-700">{name}</span></div>
      )}
      {timestamp && (
        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDatetimeFR(timestamp)}
        </div>
      )}
      {latitude && longitude && (
        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <a 
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
          </a>
        </div>
      )}
    </div>
  );
}

function ComparisonItem({ label, departValue, arriveValue, delta }: { label: string; departValue: string; arriveValue: string; delta?: string | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-3">{label}</div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-green-600 font-medium">🟢 {departValue}</span>
        <span className="text-gray-400">→</span>
        <span className="text-blue-600 font-medium">🔵 {arriveValue}</span>
      </div>
      {delta && (
        <div className="text-center mt-2">
          <span className="text-xs font-bold bg-white px-2 py-1 rounded-full border border-gray-200 text-gray-700">
            Δ {delta}
          </span>
        </div>
      )}
    </div>
  );
}

function TimelineEvent({ icon, label, detail, time, color }: { icon: string; label: string; detail: string; time: string; color: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 border-gray-300',
    green: 'bg-green-100 border-green-300',
    blue: 'bg-blue-100 border-blue-300',
    purple: 'bg-purple-100 border-purple-300',
    orange: 'bg-orange-100 border-orange-300',
  };

  return (
    <div className="relative flex items-start gap-3">
      {/* Dot on the timeline */}
      <div className={`absolute -left-[1.6rem] w-3 h-3 rounded-full border-2 ${colorClasses[color] || colorClasses.gray} mt-1.5`} />
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
        {time && <p className="text-xs text-gray-400 mt-0.5">{time}</p>}
      </div>
    </div>
  );
}
