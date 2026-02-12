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
      
      // Générer et ajouter le PDF
      try {
        toast.info('Génération du PDF...');
        const { generatePremiumInspectionPDF } = await import('../services/inspectionPdfPremiumService');
        
        // Générer le PDF en blob
        const pdfBlob = await generatePremiumInspectionPDF({
          mission: reportData.mission_data,
          departure: reportData.inspection_departure,
          arrival: reportData.inspection_arrival,
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
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white relative overflow-hidden">
            {/* Motif décoratif */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
            </div>

            <div className="relative flex items-start justify-between flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">Rapport d'Inspection Véhicule</h1>
                    <p className="text-blue-100 text-sm mt-1">Document officiel de convoyage</p>
                  </div>
                </div>
                
                <div className="space-y-2 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" />
                    <span className="text-white/80">Référence:</span>
                    <span className="font-mono font-bold">{mission?.reference || 'N/A'}</span>
                  </div>
                  {mission?.created_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span className="text-white/80">Date de création:</span>
                      <span className="font-medium">{new Date(mission.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Car className="w-4 h-4" />
                    <span className="text-white/80">Véhicule:</span>
                    <span className="font-medium">{vehicle?.brand || 'N/A'} {vehicle?.model || ''} - {vehicle?.plate || 'N/A'}</span>
                  </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Véhicule */}
              <InfoCard
                icon={Car}
                title="Véhicule Convoyé"
                items={[
                  { label: 'Marque/Modèle', value: `${vehicle?.brand || 'N/A'} ${vehicle?.model || ''}` },
                  { label: 'Plaque', value: vehicle?.plate || 'N/A' },
                  { label: 'VIN', value: vehicle?.vin || 'N/A' },
                  { label: 'Année', value: vehicle?.year || 'N/A' },
                  { label: 'Type', value: mission?.vehicle_type || 'N/A' },
                  { label: 'Couleur', value: vehicle?.color || 'N/A' },
                ]}
              />

              {/* Départ */}
              <InfoCard
                icon={Navigation}
                title="Point de Départ"
                items={[
                  { label: 'Adresse', value: mission?.pickup_address || 'N/A' },
                  { label: 'Contact', value: mission?.pickup_contact_name || 'N/A' },
                  { label: 'Téléphone', value: mission?.pickup_contact_phone || 'N/A' },
                  { label: 'Date/Heure', value: departure?.created_at ? new Date(departure.created_at).toLocaleString('fr-FR') : 'N/A' },
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
                  { label: 'Date/Heure', value: arrival?.created_at ? new Date(arrival.created_at).toLocaleString('fr-FR') : 'N/A' },
                ]}
              />
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

              {/* Timeline des convoyeurs */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" /> Chronologie du convoyage
                </h4>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  {/* Départ */}
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-xs font-bold text-green-600 uppercase mb-1">🟢 Départ</div>
                    <div className="text-sm font-semibold text-gray-900">{departureDriverName || 'N/A'}</div>
                    <div className="text-xs text-gray-500 mt-1">{departure.created_at ? formatDatetimeFR(departure.created_at) : 'N/A'}</div>
                  </div>
                  {/* Flèche */}
                  <div className="hidden md:flex flex-col items-center text-gray-400">
                    <div className="text-xs font-medium">{tempsLivraisonText}</div>
                    <div className="text-lg">→</div>
                    <div className="text-xs font-medium">{kmParcouru !== null ? `${kmParcouru.toLocaleString()} km` : ''}</div>
                  </div>
                  {/* Arrivée */}
                  <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-xs font-bold text-blue-600 uppercase mb-1">🔵 Arrivée</div>
                    <div className="text-sm font-semibold text-gray-900">{arrivalDriverName || 'N/A'}</div>
                    <div className="text-xs text-gray-500 mt-1">{arrival.created_at ? formatDatetimeFR(arrival.created_at) : 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* INSPECTION DÉPART */}
        {departure && (
          <InspectionCard
            title="Inspection au Départ"
            inspection={departure}
            color="green"
            onOpenPhoto={openPhoto}
          />
        )}

        {/* INSPECTION ARRIVÉE */}
        {arrival && (
          <InspectionCard
            title="Inspection à l'Arrivée"
            inspection={arrival}
            color="blue"
            onOpenPhoto={openPhoto}
          />
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

function InspectionCard({ title, inspection, color, onOpenPhoto }: any) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600 border-green-200',
    blue: 'from-blue-500 to-indigo-600 border-blue-200',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden print:shadow-none print:border print:border-gray-300 print:break-inside-avoid">
      <div className={`bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} p-6 text-white print:bg-${color}-600`}>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-white/80 text-sm mt-1">
          {inspection.created_at ? formatDatetimeFR(inspection.created_at) : 'N/A'}
        </p>
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
        </Section>

        {/* Documents */}
        <Section title="Documents" icon={FileText}>
          <div className="grid grid-cols-3 gap-3">
            <Badge label="Carte Grise" checked={inspection.has_registration} />
            <Badge label="Assurance" checked={inspection.has_insurance} />
            <Badge label="Documents" checked={inspection.has_vehicle_documents} />
          </div>
        </Section>

        {/* Équipements */}
        <Section title="Équipements de Sécurité" icon={Package}>
          <div className="grid grid-cols-3 gap-3">
            <Badge label="Kit sécurité" checked={inspection.has_security_kit} />
            <Badge label="Roue de secours" checked={inspection.has_spare_wheel} />
            <Badge label="Kit gonflage" checked={inspection.has_inflation_kit} />
            <Badge label="Carte carburant" checked={inspection.has_fuel_card} />
            <Badge label="Cric" checked={inspection.has_jack} />
            <Badge label="Triangle" checked={inspection.has_warning_triangle} />
            <Badge label="Trousse secours" checked={inspection.has_first_aid_kit} />
            <Badge label="Extincteur" checked={inspection.has_fire_extinguisher} />
          </div>
        </Section>

        {/* Véhicule chargé et objet confié */}
        <Section title="Chargement & Objet Confié" icon={Package}>
          <div className="space-y-4">
            <Badge label="Véhicule chargé" checked={inspection.is_loaded} />
            <Badge label="Objet confié" checked={inspection.has_confided_object} />
            {inspection.has_confided_object && inspection.confided_object_description && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm font-semibold text-blue-700 mb-1">Description de l'objet confié:</p>
                <p className="text-blue-600">{inspection.confided_object_description}</p>
              </div>
            )}
          </div>
        </Section>

        {/* Photos */}
        {inspection.photos && inspection.photos.length > 0 && (
          <Section title={`Photos (${inspection.photos.length})`} icon={ImageIcon}>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {inspection.photos.map((photo: any, i: number) => (
                <div key={i} onClick={() => onOpenPhoto(inspection.photos, i)}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-4 ring-blue-500 transition print:break-inside-avoid">
                  <img src={photo.url || photo.photo_url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Documents Scannés (Départ seulement) */}
        {inspection.scanned_documents && inspection.scanned_documents.length > 0 && (
          <Section title={`Documents Scannés (${inspection.scanned_documents.length})`} icon={FileText}>
            <div className="space-y-4">
              {inspection.scanned_documents.map((doc: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-900">{doc.title || `Document ${i + 1}`}</p>
                      <p className="text-xs text-gray-500">
                        {doc.created_at ? formatDatetimeFR(doc.created_at) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noreferrer"
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition">
                      Télécharger
                    </a>
                  )}
                </div>
              ))}
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
            />
            <SignatureBox
              title={title.includes('Départ') ? 'Expéditeur' : 'Réceptionnaire'}
              signature={inspection.client_signature}
              name={inspection.client_name || inspection.clientName}
            />
          </div>
        </Section>

        {/* Documents scannés */}
        {inspection.scanned_documents && inspection.scanned_documents.length > 0 && (
          <Section title={`Documents scannés (${inspection.scanned_documents.length})`} icon={FileText}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {inspection.scanned_documents.map((doc: any) => (
                <a
                  key={doc.id}
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-gray-200 rounded-lg p-3 flex flex-col gap-2 hover:border-blue-500 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-700 truncate" title={doc.title || 'Document'}>
                      {doc.title || 'Document'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between">
                    <span>{(doc.mime_type || '').split('/')[1] || 'fichier'}</span>
                    {doc.created_at && (
                      <span>{new Date(doc.created_at).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

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
                      <td className="px-3 py-2 text-gray-500">{exp.expense_type || exp.category || '—'}</td>
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

        {/* Dommages / Dégâts */}
        {inspection.damages && inspection.damages.length > 0 && (
          <Section title={`⚠️ Dommages Constatés (${inspection.damages.length})`} icon={XCircle}>
            <div className="space-y-4">
              {inspection.damages.map((damage: any) => (
                <div key={damage.id} className={`border-l-4 rounded-lg p-4 ${
                  damage.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  damage.severity === 'major' ? 'border-orange-500 bg-orange-50' :
                  'border-yellow-500 bg-yellow-50'
                }`}>
                  <div className="flex items-start gap-4">
                    {damage.photo_url && (
                      <img 
                        src={damage.photo_url} 
                        alt={`Dommage ${damage.damage_type}`}
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:ring-4 ring-blue-500 transition"
                        onClick={() => openPhoto([{ url: damage.photo_url }], 0)}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          damage.severity === 'critical' ? 'bg-red-600 text-white' :
                          damage.severity === 'major' ? 'bg-orange-600 text-white' :
                          'bg-yellow-600 text-white'
                        }`}>
                          {damage.severity === 'critical' ? '🚨 Critique' :
                           damage.severity === 'major' ? '⚠️ Majeur' :
                           '⚡ Mineur'}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          {damage.damage_type === 'scratch' ? '🔹 Rayure' :
                           damage.damage_type === 'dent' ? '🔸 Bosse' :
                           damage.damage_type === 'crack' ? '💥 Fissure' :
                           damage.damage_type === 'paint_damage' ? '🎨 Peinture' :
                           damage.damage_type === 'broken_part' ? '🔧 Pièce cassée' :
                           damage.damage_type}
                        </span>
                        {damage.location && (
                          <span className="text-xs px-2 py-1 bg-white rounded border border-gray-300">
                            📍 {damage.location}
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
              ))}
            </div>
          </Section>
        )}

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

function SignatureBox({ title, signature, name }: any) {
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
