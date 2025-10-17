import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FileText, Calendar, MapPin, Car, User, CheckCircle, XCircle, Download } from 'lucide-react';

interface InspectionReport {
  id: string;
  inspection_type: 'departure' | 'arrival';
  overall_condition: string;
  fuel_level: number;
  mileage_km: number;
  notes: string;
  client_name: string;
  keys_count: number;
  has_vehicle_documents: boolean;
  has_registration_card: boolean;
  vehicle_is_full: boolean;
  windshield_condition: string;
  external_cleanliness: string;
  internal_cleanliness: string;
  has_spare_wheel: boolean;
  has_repair_kit: boolean;
  photo_time: string;
  photo_location: string;
  photo_weather: string;
  completed_at: string;
  mission: {
    reference: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    pickup_address: string;
    delivery_address: string;
  };
  photos: Array<{
    id: string;
    photo_type: string;
    photo_url: string;
    description: string;
    created_at: string;
  }>;
}

export default function PublicInspectionReport() {
  const { inspectionId } = useParams();
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [inspectionId]);

  const loadReport = async () => {
    if (!inspectionId) return;

    try {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select(`
          *,
          mission:missions(
            reference,
            vehicle_brand,
            vehicle_model,
            vehicle_plate,
            pickup_address,
            delivery_address
          ),
          photos:inspection_photos(*)
        `)
        .eq('id', inspectionId)
        .single();

      if (error) throw error;
      setReport(data as any);
    } catch (error) {
      console.error('Erreur chargement rapport:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPhotoLabel = (type: string) => {
    const labels: Record<string, string> = {
      front: '🚗 Vue Avant',
      back: '🚗 Vue Arrière',
      left_front: '◀️ Avant Gauche',
      left_back: '◀️ Arrière Gauche',
      right_front: '▶️ Avant Droit',
      right_back: '▶️ Arrière Droit',
      interior: '🪑 Intérieur',
      dashboard: '📊 Tableau de bord',
      delivery_receipt: '📄 PV de livraison',
    };
    return labels[type] || type;
  };

  const getCleanlinessLabel = (value: string) => {
    const labels: Record<string, string> = {
      'tres-propre': '⭐⭐⭐ Très propre',
      'propre': '⭐⭐ Propre',
      'moyen': '⭐ Moyen',
      'sale': '⚠️ Sale',
      'tres-sale': '❌ Très sale',
    };
    return labels[value] || value;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Rapport introuvable</h2>
          <p className="text-gray-600">Ce rapport d'inspection n'existe pas ou n'est plus accessible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-teal-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-teal-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-gray-900 mb-2">
                📋 Rapport d'Inspection {report.inspection_type === 'departure' ? 'de Départ' : 'd\'Arrivée'}
              </h1>
              <p className="text-gray-600">
                Mission: <span className="font-semibold text-teal-600">{report.mission.reference}</span>
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-all shadow-lg"
            >
              <Download className="w-5 h-5" />
              Télécharger PDF
            </button>
          </div>

          {/* Infos véhicule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Véhicule</p>
                <p className="font-semibold">{report.mission.vehicle_brand} {report.mission.vehicle_model}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Immatriculation</p>
                <p className="font-semibold">{report.mission.vehicle_plate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Départ</p>
                <p className="font-semibold text-sm">{report.mission.pickup_address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Arrivée</p>
                <p className="font-semibold text-sm">{report.mission.delivery_address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Date inspection</p>
                <p className="font-semibold">{new Date(report.completed_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-teal-500" />
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-semibold">{report.client_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* État du véhicule */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-teal-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 État du véhicule</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-teal-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Kilométrage</p>
              <p className="text-2xl font-bold text-teal-600">{report.mileage_km.toLocaleString()} km</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Carburant</p>
              <p className="text-2xl font-bold text-teal-600">{report.fuel_level}%</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Clés</p>
              <p className="text-2xl font-bold text-teal-600">{report.keys_count}</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Pare-brise</p>
              <p className="text-lg font-bold text-teal-600">{report.windshield_condition}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Propreté externe</p>
              <p className="font-semibold text-gray-900">{getCleanlinessLabel(report.external_cleanliness)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Propreté interne</p>
              <p className="font-semibold text-gray-900">{getCleanlinessLabel(report.internal_cleanliness)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className={`p-4 rounded-xl ${report.has_vehicle_documents ? 'bg-green-50' : 'bg-red-50'}`}>
              {report.has_vehicle_documents ? (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              )}
              <p className="text-sm text-center">Documents</p>
            </div>
            <div className={`p-4 rounded-xl ${report.has_registration_card ? 'bg-green-50' : 'bg-red-50'}`}>
              {report.has_registration_card ? (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              )}
              <p className="text-sm text-center">Carte grise</p>
            </div>
            <div className={`p-4 rounded-xl ${report.has_spare_wheel ? 'bg-green-50' : 'bg-red-50'}`}>
              {report.has_spare_wheel ? (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              )}
              <p className="text-sm text-center">Roue secours</p>
            </div>
            <div className={`p-4 rounded-xl ${report.has_repair_kit ? 'bg-green-50' : 'bg-red-50'}`}>
              {report.has_repair_kit ? (
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              )}
              <p className="text-sm text-center">Kit réparation</p>
            </div>
          </div>

          {/* Conditions de photo */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-3">📸 Conditions de prise des photos</h3>
            <div className="flex gap-6 flex-wrap">
              <div>
                <span className="text-sm text-gray-600">Moment:</span>
                <span className="ml-2 font-semibold">{report.photo_time}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Lieu:</span>
                <span className="ml-2 font-semibold">{report.photo_location}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Météo:</span>
                <span className="ml-2 font-semibold">{report.photo_weather}</span>
              </div>
            </div>
          </div>

          {report.notes && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
              <h3 className="font-semibold text-gray-900 mb-2">📝 Notes</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{report.notes}</p>
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-teal-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📸 Photos d'inspection</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {report.photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => setSelectedPhoto(photo.photo_url)}
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-teal-400 transition-all">
                  <img
                    src={photo.photo_url}
                    alt={getPhotoLabel(photo.photo_type)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="mt-2">
                  <p className="text-sm font-semibold text-gray-900">{getPhotoLabel(photo.photo_type)}</p>
                  <p className="text-xs text-gray-500">{new Date(photo.created_at).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal photo agrandie */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-6xl max-h-[90vh]">
              <img
                src={selectedPhoto}
                alt="Photo agrandie"
                className="max-w-full max-h-[90vh] object-contain"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl hover:bg-gray-100 transition-all"
              >
                ×
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
