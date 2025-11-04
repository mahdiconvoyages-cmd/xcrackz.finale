/**
 * 📄 Page Publique de Rapport d'Inspection Partagé
 * 
 * Accessible sans authentification via lien unique
 * Design professionnel pour clients
 */

// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FileText, Calendar, Car, MapPin, CheckCircle, AlertTriangle,
  Download, ZoomIn, Shield, Wrench, Package, FileSignature, Camera, ChevronUp, ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../utils/toast';
import OptimizedImage from '../components/OptimizedImage';
import PhotoGallery from '../components/PhotoGallery';

export default function PublicInspectionReportShared() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState('');
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    if (token) {
      loadReport();
    }
  }, [token]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Chargement rapport avec token:', token);
      
      const { data, error: rpcError } = await supabase.rpc('get_inspection_report_by_token', {
        p_token: token
      });

      console.log('📥 Réponse RPC:', { data, error: rpcError });

      if (rpcError) {
        console.error('❌ Erreur RPC:', rpcError);
        throw rpcError;
      }

      if (!data) {
        throw new Error('Rapport non trouvé');
      }

      // La fonction RPC retourne directement un JSON, pas un tableau
      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ Données rapport:', data);
      setReportData(data);
    } catch (err: any) {
      console.error('❌ Erreur chargement rapport:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const openPhotoGallery = (photos: any[], index: number = 0) => {
    setGalleryPhotos(photos.map(p => p.url));
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
  const showBoth = reportData.report_type === 'complete' && departure && arrival;
  const showDeparture = reportData.report_type === 'departure' || reportData.report_type === 'complete';
  const showArrival = reportData.report_type === 'arrival' || reportData.report_type === 'complete';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('Génération du PDF en cours...');
      // Importer le service PDF
      const { generatePremiumInspectionPDF } = await import('../services/inspectionPdfPremiumService');
      
      await generatePremiumInspectionPDF({
        mission: mission,
        departure: departure,
        arrival: arrival,
        reportType: reportData.report_type
      });
      
      toast.success('PDF téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* En-tête premium */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 mb-8 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-10 h-10" />
                <div>
                  <h1 className="text-3xl font-bold">Rapport d'Inspection</h1>
                  <p className="text-white/80">Mission {mission?.reference || 'N/A'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <Car className="w-5 h-5 mb-2" />
                  <p className="text-sm text-white/80">Véhicule</p>
                  <p className="font-semibold">{vehicle?.brand || 'N/A'} {vehicle?.model || ''}</p>
                  <p className="text-sm">{vehicle?.plate || 'N/A'}</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <Calendar className="w-5 h-5 mb-2" />
                  <p className="text-sm text-white/80">Date</p>
                  <p className="font-semibold">{mission?.created_at ? new Date(mission.created_at).toLocaleDateString('fr-FR') : 'N/A'}</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <Shield className="w-5 h-5 mb-2" />
                  <p className="text-sm text-white/80">Type</p>
                  <p className="font-semibold">
                    {reportData.report_type === 'complete' ? 'Complet' :
                     reportData.report_type === 'departure' ? 'Départ' : 'Arrivée'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex gap-3 ml-4 print:hidden">
              <button
                onClick={handlePrint}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                <span className="hidden md:inline">Imprimer</span>
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span className="hidden md:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inspection Départ */}
        {showDeparture && departure && (
          <div className="mb-8">
            <InspectionSection
              title="Inspection Départ"
              inspection={departure}
              color="from-green-500 to-emerald-600"
              onOpenGallery={openPhotoGallery}
            />
          </div>
        )}

        {/* Inspection Arrivée */}
        {showArrival && arrival && (
          <div>
            <InspectionSection
              title="Inspection Arrivée"
              inspection={arrival}
              color="from-blue-500 to-indigo-600"
              onOpenGallery={openPhotoGallery}
            />
          </div>
        )}

        {/* Pied de page */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Rapport généré par xCrackz - Transport & Convoyage</p>
          <p className="mt-1">Ce document est authentique et sécurisé</p>
        </div>
      </div>

      {/* Galerie photos */}
      {galleryOpen && (
        <PhotoGallery
          photos={galleryPhotos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}

// Composant section d'inspection
function InspectionSection({ title, inspection, color, onOpenGallery }: any) {
  const [expanded, setExpanded] = useState({
    vehicle: true,
    documents: false,
    equipment: false,
    damages: false,
    photos: true,
    signatures: false
  });

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* En-tête */}
      <div className={`bg-gradient-to-r ${color} p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(inspection.created_at).toLocaleDateString('fr-FR')}
              </div>
              {inspection.gps_location_name && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {inspection.gps_location_name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* État véhicule */}
        <CollapsibleSection
          title="État du Véhicule"
          icon={Car}
          color="text-blue-500"
          expanded={expanded.vehicle}
          onToggle={() => toggleSection('vehicle')}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {inspection.mileage && (
              <StatBox label="Kilométrage" value={`${inspection.mileage.toLocaleString()} km`} icon={Car} />
            )}
            {inspection.fuel_level !== undefined && (
              <StatBox label="Carburant" value={`${inspection.fuel_level}/8`} icon={Package} />
            )}
            {inspection.cleanliness_interior !== undefined && (
              <StatBox label="Propreté Int." value={`${inspection.cleanliness_interior}/5`} icon={CheckCircle} />
            )}
            {inspection.cleanliness_exterior !== undefined && (
              <StatBox label="Propreté Ext." value={`${inspection.cleanliness_exterior}/5`} icon={CheckCircle} />
            )}
          </div>
        </CollapsibleSection>

        {/* Documents */}
        <CollapsibleSection
          title="Documents"
          icon={FileText}
          color="text-purple-500"
          expanded={expanded.documents}
          onToggle={() => toggleSection('documents')}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <DocumentBadge label="Carte Grise" present={inspection.has_registration} />
            <DocumentBadge label="Assurance" present={inspection.has_insurance} />
            <DocumentBadge label="Tous documents" present={inspection.has_vehicle_documents} />
          </div>
        </CollapsibleSection>

        {/* Équipements */}
        <CollapsibleSection
          title="Équipements de Sécurité"
          icon={Wrench}
          color="text-orange-500"
          expanded={expanded.equipment}
          onToggle={() => toggleSection('equipment')}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <EquipmentBadge label="Roue de secours" present={inspection.has_spare_wheel} />
            <EquipmentBadge label="Cric" present={inspection.has_jack} />
            <EquipmentBadge label="Triangle" present={inspection.has_warning_triangle} />
            <EquipmentBadge label="Trousse de secours" present={inspection.has_first_aid_kit} />
            <EquipmentBadge label="Extincteur" present={inspection.has_fire_extinguisher} />
          </div>
        </CollapsibleSection>

        {/* Dommages */}
        {inspection.damages && inspection.damages.length > 0 && (
          <CollapsibleSection
            title={`Dommages Constatés (${inspection.damages.length})`}
            icon={AlertTriangle}
            color="text-red-500"
            expanded={expanded.damages}
            onToggle={() => toggleSection('damages')}
          >
            <div className="space-y-3">
              {inspection.damages.map((damage: any, idx: number) => (
                <div key={idx} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded">
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
          </CollapsibleSection>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-900 mb-2">📝 Observations</h4>
            <p className="text-amber-800 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}

        {/* Photos */}
        {inspection.photos && inspection.photos.length > 0 && (
          <CollapsibleSection
            title={`Photographies (${inspection.photos.length})`}
            icon={Camera}
            color="text-green-500"
            expanded={expanded.photos}
            onToggle={() => toggleSection('photos')}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {inspection.photos.map((photo: any, idx: number) => (
                <div
                  key={idx}
                  className="relative group cursor-pointer"
                  onClick={() => onOpenGallery(inspection.photos, idx)}
                >
                  <OptimizedImage
                    src={photo.url}
                    alt={photo.category}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">{photo.category}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Signatures */}
        <CollapsibleSection
          title="Signatures"
          icon={FileSignature}
          color="text-indigo-500"
          expanded={expanded.signatures}
          onToggle={() => toggleSection('signatures')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SignatureBox label="Convoyeur" signature={inspection.driver_signature} />
            <SignatureBox label="Client" signature={inspection.client_signature} />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// Composants helpers
function CollapsibleSection({ title, icon: Icon, color, expanded, onToggle, children }: any) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${color}`} />
          <span className="font-semibold">{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: any) {
  return (
    <div className="bg-blue-50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-blue-600" />
        <p className="text-xs text-blue-600 font-medium">{label}</p>
      </div>
      <p className="font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DocumentBadge({ label, present }: any) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
      present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
    }`}>
      {present ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );
}

function EquipmentBadge({ label, present }: any) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
      present ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
    }`}>
      {present ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>{label}</span>
    </div>
  );
}

function SignatureBox({ label, signature }: any) {
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
