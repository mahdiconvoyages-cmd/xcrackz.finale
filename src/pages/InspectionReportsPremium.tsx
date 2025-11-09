/**
 * 🎯 Page Premium Rapports d'Inspection
 * 
 * Interface ultra-moderne avec :
 * - Liste des rapports avec filtres
 * - Visualisation départ/arrivée/complète
 * - Téléchargement PDF premium
 * - Téléchargement ZIP photos
 * - Partage via lien sécurisé
 * - Affichage complet des détails
 */

// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  FileText, Download, Share2, Image, ChevronDown, ChevronUp,
  Calendar, Car, MapPin, User, CheckCircle, AlertTriangle,
  Package, Shield, Wrench, FileSignature, Camera, ZoomIn
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';
import {
  getCompleteInspectionReport,
  listInspectionReports,
  downloadInspectionPhotosZip,
  type InspectionReportComplete,
  type InspectionDetails
} from '../services/inspectionReportAdvancedService';
import { generatePremiumInspectionPDF } from '../services/inspectionPdfPremiumService';
import OptimizedImage from '../components/OptimizedImage';
import PhotoGallery from '../components/PhotoGallery';
import ShareInspectionModal from '../components/ShareInspectionModal';

export default function InspectionReportsPremium() {
  const { user } = useAuth();
  const [reports, setReports] = useState<InspectionReportComplete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<InspectionReportComplete | null>(null);
  const [viewType, setViewType] = useState<'departure' | 'arrival' | 'complete'>('complete');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    general: true,
    vehicle: true,
    documents: false,
    equipment: false,
    damages: false,
    photos: true,
    signatures: false
  });
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return `il y a ${diffSec}s`;
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffHour < 24) return `il y a ${diffHour}h`;
    if (diffDay < 30) return `il y a ${diffDay}j`;
    if (diffMonth < 12) return `il y a ${diffMonth}mois`;
    return `il y a ${diffYear}an${diffYear > 1 ? 's' : ''}`;
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    const sorted = [...reports].sort((a, b) => {
      const dateA = new Date(a.mission.pickup_date || a.mission.created_at).getTime();
      const dateB = new Date(b.mission.pickup_date || b.mission.created_at).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setReports(sorted);
  };

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;
    
    setLoading(true);
    const result = await listInspectionReports(user.id);
    
    if (result.success) {
      setReports(result.reports);
      if (result.reports.length > 0) {
        setSelectedReport(result.reports[0]);
      }
    } else {
      toast.error(result.message);
    }
    
    setLoading(false);
  };

  const handleDownloadPDF = async (type: 'departure' | 'arrival' | 'complete') => {
    if (!selectedReport) return;
    
    toast.info('Génération du PDF en cours...');
    const result = await generatePremiumInspectionPDF(selectedReport, type);
    
    if (result.success) {
      toast.success('PDF téléchargé avec succès !');
    } else {
      toast.error(result.message);
    }
  };

  const handleDownloadPhotos = async (inspection: InspectionDetails, type: 'departure' | 'arrival') => {
    toast.info('Préparation du ZIP...');
    const result = await downloadInspectionPhotosZip(inspection, type);
    
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openPhotoGallery = (photos: string[], index: number = 0) => {
    setGalleryPhotos(photos);
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  const renderInspectionView = (inspection: InspectionDetails | undefined, type: 'departure' | 'arrival') => {
    if (!inspection) {
      return (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Inspection {type === 'departure' ? 'départ' : 'arrivée'} non disponible</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* En-tête inspection */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Inspection {type === 'departure' ? 'Départ' : 'Arrivée'}
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fait {getTimeAgo(inspection.created_at)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {inspection.gps_location_name || 'Localisation inconnue'}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownloadPhotos(inspection, type)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Photos ZIP
            </button>
          </div>
        </div>

        {/* État véhicule */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => toggleSection('vehicle')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-blue-500" />
              <span className="font-semibold text-gray-900">État du Véhicule</span>
            </div>
            {expandedSections.vehicle ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.vehicle && (
            <div className="px-6 pb-6 grid grid-cols-2 gap-4">
              {inspection.mileage && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kilométrage</p>
                    <p className="font-semibold">{inspection.mileage.toLocaleString()} km</p>
                  </div>
                </div>
              )}
              
              {inspection.fuel_level !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Carburant</p>
                    <p className="font-semibold">{inspection.fuel_level}/8</p>
                  </div>
                </div>
              )}
              
              {inspection.cleanliness_interior !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Propreté Int.</p>
                    <p className="font-semibold">{inspection.cleanliness_interior}/5</p>
                  </div>
                </div>
              )}
              
              {inspection.cleanliness_exterior !== undefined && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Propreté Ext.</p>
                    <p className="font-semibold">{inspection.cleanliness_exterior}/5</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => toggleSection('documents')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-purple-500" />
              <span className="font-semibold text-gray-900">Documents</span>
            </div>
            {expandedSections.documents ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.documents && (
            <div className="px-6 pb-6 grid grid-cols-3 gap-4">
              <DocumentBadge label="Carte Grise" present={inspection.has_registration} />
              <DocumentBadge label="Assurance" present={inspection.has_insurance} />
              <DocumentBadge label="Tous docs" present={inspection.has_vehicle_documents} />
            </div>
          )}
        </div>

        {/* Équipements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => toggleSection('equipment')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-gray-900">Équipements de Sécurité</span>
            </div>
            {expandedSections.equipment ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.equipment && (
            <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <EquipmentBadge label="Roue de secours" present={inspection.has_spare_wheel} />
              <EquipmentBadge label="Cric" present={inspection.has_jack} />
              <EquipmentBadge label="Triangle" present={inspection.has_warning_triangle} />
              <EquipmentBadge label="Trousse de secours" present={inspection.has_first_aid_kit} />
              <EquipmentBadge label="Extincteur" present={inspection.has_fire_extinguisher} />
            </div>
          )}
        </div>

        {/* Dommages */}
        {inspection.damages && inspection.damages.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => toggleSection('damages')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-gray-900">
                  Dommages Constatés ({inspection.damages.length})
                </span>
              </div>
              {expandedSections.damages ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {expandedSections.damages && (
              <div className="px-6 pb-6 space-y-4">
                {inspection.damages.map((damage, idx) => (
                  <div key={damage.id} className="border-l-4 border-red-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{damage.location}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        damage.severity === 'minor' ? 'bg-yellow-100 text-yellow-800' :
                        damage.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {damage.severity === 'minor' ? 'Mineur' : damage.severity === 'moderate' ? 'Modéré' : 'Sévère'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{damage.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {(inspection.notes || inspection.damages_notes) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h4 className="font-semibold text-amber-900 mb-2">📝 Observations</h4>
            <p className="text-amber-800 whitespace-pre-wrap">
              {inspection.notes || inspection.damages_notes}
            </p>
          </div>
        )}

        {/* Photos */}
        {inspection.photos && inspection.photos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => toggleSection('photos')}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-gray-900">
                  Photographies ({inspection.photos.length})
                </span>
              </div>
              {expandedSections.photos ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {expandedSections.photos && (
              <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {inspection.photos.map((photo, idx) => (
                  <div key={photo.id} className="relative group cursor-pointer" onClick={() => openPhotoGallery(inspection.photos.map(p => p.url), idx)}>
                    <OptimizedImage
                      src={photo.url}
                      alt={`Photo ${photo.category}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">{photo.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Signatures */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <button
            onClick={() => toggleSection('signatures')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileSignature className="w-5 h-5 text-indigo-500" />
              <span className="font-semibold text-gray-900">Signatures</span>
            </div>
            {expandedSections.signatures ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {expandedSections.signatures && (
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <SignatureBox label="Convoyeur" signature={inspection.driver_signature} />
              <SignatureBox label="Client" signature={inspection.client_signature} />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Rapports d'Inspection</h1>
          <p className="text-gray-600">Consultez, téléchargez et partagez vos rapports d'inspection</p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Aucun rapport disponible</h2>
            <p className="text-gray-600">Les rapports d'inspection apparaîtront ici une fois créés</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Liste des rapports */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Mes Rapports ({reports.length})</h3>
                <button
                  onClick={toggleSortOrder}
                  className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                >
                  {sortOrder === 'desc' ? (
                    <ChevronDown className="w-4 h-4 text-teal-600" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-teal-600" />
                  )}
                  <span className="text-xs font-medium text-teal-700">
                    {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
                  </span>
                </button>
              </div>
              {reports.map(report => (
                <button
                  key={report.mission.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedReport?.mission.id === report.mission.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-sm">{report.mission.reference}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    {report.vehicle.brand} {report.vehicle.model}
                  </p>
                  <p className="text-xs text-gray-500">{report.vehicle.plate}</p>
                  <div className="flex gap-1 mt-2">
                    {report.inspection_departure && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Départ</span>
                    )}
                    {report.inspection_arrival && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Arrivée</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Détails du rapport */}
            <div className="lg:col-span-3">
              {selectedReport && (
                <div className="space-y-6">
                  {/* En-tête rapport */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                          {selectedReport.vehicle.brand} {selectedReport.vehicle.model}
                        </h2>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4" />
                            {selectedReport.vehicle.plate}
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {selectedReport.mission.reference}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Fait {getTimeAgo(selectedReport.mission.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownloadPDF(viewType)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </button>
                        <button 
                          onClick={() => setShareModalOpen(true)}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all flex items-center gap-2 shadow-md"
                        >
                          <Share2 className="w-4 h-4" />
                          Partager
                        </button>
                      </div>
                    </div>

                    {/* Sélection vue */}
                    <div className="flex gap-2 border-b border-gray-200">
                      {selectedReport.inspection_departure && (
                        <button
                          onClick={() => setViewType('departure')}
                          className={`px-4 py-2 font-medium transition-colors ${
                            viewType === 'departure'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Départ
                        </button>
                      )}
                      {selectedReport.inspection_arrival && (
                        <button
                          onClick={() => setViewType('arrival')}
                          className={`px-4 py-2 font-medium transition-colors ${
                            viewType === 'arrival'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Arrivée
                        </button>
                      )}
                      {selectedReport.has_complete_report && (
                        <button
                          onClick={() => setViewType('complete')}
                          className={`px-4 py-2 font-medium transition-colors ${
                            viewType === 'complete'
                              ? 'text-blue-600 border-b-2 border-blue-600'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Vue Complète
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contenu inspection */}
                  {viewType === 'complete' ? (
                    <>
                      {selectedReport.inspection_departure && renderInspectionView(selectedReport.inspection_departure, 'departure')}
                      {selectedReport.inspection_arrival && (
                        <div className="mt-6">
                          {renderInspectionView(selectedReport.inspection_arrival, 'arrival')}
                        </div>
                      )}
                    </>
                  ) : viewType === 'departure' ? (
                    renderInspectionView(selectedReport.inspection_departure, 'departure')
                  ) : (
                    renderInspectionView(selectedReport.inspection_arrival, 'arrival')
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Galerie photos */}
      {galleryOpen && (
        <PhotoGallery
          photos={galleryPhotos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {/* Modal de partage */}
      {selectedReport && (
        <ShareInspectionModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          missionId={selectedReport.mission.id}
          missionReference={selectedReport.mission.reference}
          reportType={viewType}
        />
      )}
    </div>
  );
}

// Composants helpers
function DocumentBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${
      present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    }`}>
      {present ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function EquipmentBadge({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${
      present ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
    }`}>
      {present ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span className="text-sm">{label}</span>
    </div>
  );
}

function SignatureBox({ label, signature }: { label: string; signature?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="border-2 border-gray-200 rounded-lg p-4 h-32 flex items-center justify-center bg-gray-50">
        {signature ? (
          <img src={signature} alt={`Signature ${label}`} className="max-h-full" />
        ) : (
          <p className="text-gray-400 italic">Non signée</p>
        )}
      </div>
    </div>
  );
}
