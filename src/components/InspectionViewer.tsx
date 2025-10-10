import { useState, useEffect } from 'react';
import { X, Download, Camera, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateInspectionPDF } from '../services/inspectionPdfGenerator';

interface InspectionPhoto {
  id: string;
  photo_type: string;
  photo_url: string;
  created_at: string;
}

interface VehicleInspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  overall_condition: string;
  fuel_level: number;
  mileage_km: number;
  notes: string;
  signature_url?: string | null | undefined;
  signature_client_departure: string | null;
  signature_client_departure_name: string | null;
  signature_client_arrival: string | null;
  signature_client_arrival_name: string | null;
  keys_count?: number;
  has_vehicle_documents?: boolean;
  has_registration_card?: boolean;
  vehicle_is_full?: boolean;
  windshield_condition?: string;
  completed_at: string;
  created_at: string;
}

interface InspectionViewerProps {
  missionId: string;
  onClose: () => void;
}

interface Mission {
  reference: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_vin: string;
  pickup_address: string;
  delivery_address: string;
}

export default function InspectionViewer({ missionId, onClose }: InspectionViewerProps) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [departureInspection, setDepartureInspection] = useState<VehicleInspection | null>(null);
  const [arrivalInspection, setArrivalInspection] = useState<VehicleInspection | null>(null);
  const [departurePhotos, setDeparturePhotos] = useState<InspectionPhoto[]>([]);
  const [arrivalPhotos, setArrivalPhotos] = useState<InspectionPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState<'departure' | 'arrival'>('departure');

  useEffect(() => {
    loadInspections();
  }, [missionId]);

  const loadInspections = async () => {
    try {
      const { data: missionData, error: missionError } = await supabase
        .from('missions')
        .select('reference, vehicle_brand, vehicle_model, vehicle_plate, vehicle_vin, pickup_address, delivery_address')
        .eq('id', missionId)
        .single();

      if (missionError) throw missionError;
      setMission(missionData);

      const { data: inspections, error: inspError } = await supabase
        .from('vehicle_inspections')
        .select('*')
        .eq('mission_id', missionId)
        .order('created_at', { ascending: true });

      if (inspError) throw inspError;

      if (inspections) {
        const departure = inspections.find(i => i.inspection_type === 'departure');
        const arrival = inspections.find(i => i.inspection_type === 'arrival');

        setDepartureInspection(departure || null);
        setArrivalInspection(arrival || null);

        if (departure) {
          const { data: photos } = await supabase
            .from('inspection_photos')
            .select('*')
            .eq('inspection_id', departure.id)
            .order('created_at', { ascending: true });

          setDeparturePhotos(photos || []);
        }

        if (arrival) {
          const { data: photos } = await supabase
            .from('inspection_photos')
            .select('*')
            .eq('inspection_id', arrival.id)
            .order('created_at', { ascending: true });

          setArrivalPhotos(photos || []);
        }
      }
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Bon';
      case 'fair': return 'Moyen';
      case 'poor': return 'Mauvais';
      default: return condition;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-teal-600 bg-teal-50 border-teal-200';
      case 'fair': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getPhotoTypeLabel = (type: string) => {
    switch (type) {
      case 'front': return 'Vue avant';
      case 'back': return 'Vue arrière';
      case 'left_side': return 'Côté gauche';
      case 'right_side': return 'Côté droit';
      case 'interior': return 'Intérieur';
      case 'dashboard': return 'Tableau de bord';
      default: return type;
    }
  };

  const handleDownloadPDF = async () => {
    if (!mission) {
      alert('Données de mission non chargées');
      return;
    }

    setGeneratingPDF(true);
    try {
      await generateInspectionPDF(
        mission,
        departureInspection,
        arrivalInspection,
        departurePhotos,
        arrivalPhotos
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const currentInspection = activeTab === 'departure' ? departureInspection : arrivalInspection;
  const currentPhotos = activeTab === 'departure' ? departurePhotos : arrivalPhotos;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-teal-500"></div>
            <p className="text-slate-700">Chargement des inspections...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col my-8">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">États des lieux</h2>
              <p className="text-slate-600 mt-1">Inspection départ et arrivée</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Génération...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Télécharger PDF
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('departure')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'departure'
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Départ
                {departureInspection && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('arrival')}
              className={`flex-1 px-6 py-4 font-semibold transition-all ${
                activeTab === 'arrival'
                  ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" />
                Arrivée
                {arrivalInspection && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!currentInspection ? (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">
                  Aucune inspection {activeTab === 'departure' ? 'de départ' : "d'arrivée"} disponible
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-600 mb-1">État général</p>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border ${getConditionColor(currentInspection.overall_condition)}`}>
                      {getConditionLabel(currentInspection.overall_condition)}
                    </span>
                  </div>

                  <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-600 mb-1">Niveau de carburant</p>
                    <p className="text-2xl font-bold text-slate-900">{currentInspection.fuel_level}%</p>
                  </div>

                  <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-600 mb-1">Kilométrage</p>
                    <p className="text-2xl font-bold text-slate-900">{currentInspection.mileage_km?.toLocaleString() || '0'} km</p>
                  </div>
                </div>

                {activeTab === 'departure' && currentInspection.keys_count !== undefined && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-1">Nombre de clés</p>
                      <p className="text-2xl font-bold text-slate-900">{currentInspection.keys_count}</p>
                    </div>

                    <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-2">Documents de bord</p>
                      <div className="flex items-center gap-2">
                        {currentInspection.has_vehicle_documents ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-semibold text-green-700">Présents</span>
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-semibold text-red-700">Absents</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-2">Carte grise</p>
                      <div className="flex items-center gap-2">
                        {currentInspection.has_registration_card ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-semibold text-green-700">Présente</span>
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5 text-red-500" />
                            <span className="text-sm font-semibold text-red-700">Absente</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <p className="text-sm text-slate-600 mb-2">Véhicule plein</p>
                      <div className="flex items-center gap-2">
                        {currentInspection.vehicle_is_full ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-semibold text-green-700">Oui</span>
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5 text-amber-500" />
                            <span className="text-sm font-semibold text-amber-700">Non</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'departure' && currentInspection.windshield_condition && (
                  <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">État du pare-brise</p>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold border ${
                      currentInspection.windshield_condition === 'bon' ? 'text-green-600 bg-green-50 border-green-200' :
                      currentInspection.windshield_condition === 'impact' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                      'text-red-600 bg-red-50 border-red-200'
                    }`}>
                      {currentInspection.windshield_condition === 'bon' ? 'Bon' :
                       currentInspection.windshield_condition === 'impact' ? 'Impact' : 'Fissuré'}
                    </span>
                  </div>
                )}

                {currentInspection.notes && (
                  <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-2">Notes et observations</p>
                    <p className="text-slate-600 whitespace-pre-wrap">{currentInspection.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Photos ({currentPhotos.length})
                  </h3>

                  {currentPhotos.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-slate-500">Aucune photo disponible</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {currentPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          onClick={() => setSelectedPhoto(photo.photo_url)}
                          className="relative group cursor-pointer"
                        >
                          <div className="aspect-video rounded-xl overflow-hidden border-2 border-slate-200 hover:border-teal-500 transition-all">
                            <img
                              src={photo.photo_url}
                              alt={getPhotoTypeLabel(photo.photo_type)}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end p-3">
                            <p className="text-white text-sm font-semibold">
                              {getPhotoTypeLabel(photo.photo_type)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {((activeTab === 'departure' && currentInspection.signature_client_departure) ||
                  (activeTab === 'arrival' && currentInspection.signature_client_arrival)) && (
                  <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">
                      Signature du client
                      {activeTab === 'departure' && currentInspection.signature_client_departure_name &&
                        ` - ${currentInspection.signature_client_departure_name}`}
                      {activeTab === 'arrival' && currentInspection.signature_client_arrival_name &&
                        ` - ${currentInspection.signature_client_arrival_name}`}
                    </p>
                    <div className="bg-white border-2 border-slate-300 rounded-lg p-4 inline-block">
                      <img
                        src={activeTab === 'departure' ?
                          currentInspection.signature_client_departure! :
                          currentInspection.signature_client_arrival!}
                        alt="Signature"
                        className="h-24"
                      />
                    </div>
                  </div>
                )}

                <div className="backdrop-blur-xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-600">
                    Complétée le {new Date(currentInspection.completed_at || currentInspection.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={selectedPhoto}
            alt="Photo agrandie"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
