import { useEffect, useState } from 'react';
import { FileText, Download, Eye, Search, Filter, Calendar, Truck, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateInspectionReportHTML, downloadInspectionPDF, previewInspectionPDF } from '../services/reportPdfGenerator';

interface Inspection {
  id: string;
  mission_id: string;
  inspection_type: string;
  overall_condition: string;
  mileage_km: number;
  fuel_level: number;
  damages: any[];
  notes: string;
  created_at: string;
  completed_at: string;
  missions?: {
    reference: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    pickup_address: string;
    delivery_address: string;
  };
  inspection_photos?: {
    photo_url: string;
    photo_type: string;
    description: string;
  }[];
}

export default function Reports() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    loadInspections();
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  };

  const loadInspections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select(`
          *,
          missions:mission_id (
            reference,
            vehicle_brand,
            vehicle_model,
            vehicle_plate,
            pickup_address,
            delivery_address
          ),
          inspection_photos (
            photo_url,
            photo_type,
            description
          )
        `)
        .eq('inspector_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInspections(data || []);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (inspection: Inspection) => {
    if (!userProfile) return;

    const html = generateInspectionReportHTML({
      id: inspection.id,
      type: inspection.inspection_type as 'pickup' | 'delivery',
      date: inspection.completed_at || inspection.created_at,
      missionRef: inspection.missions?.reference || 'N/A',
      vehicle: {
        brand: inspection.missions?.vehicle_brand || '',
        model: inspection.missions?.vehicle_model || '',
        plate: inspection.missions?.vehicle_plate || '',
      },
      location: {
        pickup: inspection.missions?.pickup_address || '',
        delivery: inspection.missions?.delivery_address || '',
      },
      condition: {
        overall: inspection.overall_condition,
        mileage: inspection.mileage_km,
        fuelLevel: inspection.fuel_level,
        hasDamages: inspection.damages && inspection.damages.length > 0,
        damageDescription: inspection.damages && inspection.damages.length > 0
          ? inspection.damages.map((d: any) => d.description || '').join(', ')
          : '',
      },
      notes: inspection.notes,
      inspector: {
        name: userProfile.full_name || userProfile.email,
        company: userProfile.company_name,
      },
      photos: inspection.inspection_photos || [],
    });

    try {
      await downloadInspectionPDF(html, `inspection-${inspection.missions?.reference || inspection.id}.pdf`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePreviewPDF = async (inspection: Inspection) => {
    if (!userProfile) return;

    const html = generateInspectionReportHTML({
      id: inspection.id,
      type: inspection.inspection_type as 'pickup' | 'delivery',
      date: inspection.completed_at || inspection.created_at,
      missionRef: inspection.missions?.reference || 'N/A',
      vehicle: {
        brand: inspection.missions?.vehicle_brand || '',
        model: inspection.missions?.vehicle_model || '',
        plate: inspection.missions?.vehicle_plate || '',
      },
      location: {
        pickup: inspection.missions?.pickup_address || '',
        delivery: inspection.missions?.delivery_address || '',
      },
      condition: {
        overall: inspection.overall_condition,
        mileage: inspection.mileage_km,
        fuelLevel: inspection.fuel_level,
        hasDamages: inspection.damages && inspection.damages.length > 0,
        damageDescription: inspection.damages && inspection.damages.length > 0
          ? inspection.damages.map((d: any) => d.description || '').join(', ')
          : '',
      },
      notes: inspection.notes,
      inspector: {
        name: userProfile.full_name || userProfile.email,
        company: userProfile.company_name,
      },
      photos: inspection.inspection_photos || [],
    });

    try {
      previewInspectionPDF(html);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.missions?.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.missions?.vehicle_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.missions?.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.missions?.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === 'all' ||
      inspection.inspection_type === typeFilter ||
      (typeFilter === 'departure' && inspection.inspection_type === 'pickup') ||
      (typeFilter === 'arrival' && inspection.inspection_type === 'delivery');

    return matchesSearch && matchesType;
  });

  const stats = {
    total: inspections.length,
    pickup: inspections.filter((i) => i.inspection_type === 'departure' || i.inspection_type === 'pickup').length,
    delivery: inspections.filter((i) => i.inspection_type === 'arrival' || i.inspection_type === 'delivery').length,
    withDamages: inspections.filter((i) => i.damages && i.damages.length > 0).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm mb-2">
            Rapports d'inspection
          </h1>
          <p className="text-slate-600 text-lg">Consultez tous vos rapports de contrôle véhicule</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Total</span>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Enlèvement</span>
            <MapPin className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.pickup}</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Livraison</span>
            <CheckCircle className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.delivery}</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-400/30 shadow-xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">Avec dommages</span>
            <AlertCircle className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.withDamages}</p>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence mission, véhicule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/80 border border-slate-200 rounded-lg pl-10 pr-8 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            >
              <option value="all">Tous les types</option>
              <option value="departure">Enlèvement</option>
              <option value="arrival">Livraison</option>
            </select>
          </div>
        </div>

        {filteredInspections.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">Aucun rapport d'inspection trouvé</p>
            <p className="text-sm text-slate-500">
              Les rapports d'inspection sont générés automatiquement lors de vos missions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInspections.map((inspection) => (
              <div
                key={inspection.id}
                className="backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl p-6 hover:bg-white/80 hover:shadow-xl transition"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          inspection.inspection_type === 'departure' || inspection.inspection_type === 'pickup'
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-blue-500/20 text-blue-600'
                        }`}
                      >
                        {inspection.inspection_type === 'departure' || inspection.inspection_type === 'pickup' ? (
                          <MapPin className="w-6 h-6" />
                        ) : (
                          <CheckCircle className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">
                          {inspection.inspection_type === 'departure' || inspection.inspection_type === 'pickup' ? 'Inspection Enlèvement' : 'Inspection Livraison'}
                        </h3>
                        <p className="text-sm text-slate-600">
                          Mission: {inspection.missions?.reference || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">
                          {inspection.missions?.vehicle_brand} {inspection.missions?.vehicle_model}
                          {inspection.missions?.vehicle_plate && ` • ${inspection.missions.vehicle_plate}`}
                        </span>
                      </div>

                      {inspection.mileage_km && (
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>
                            <strong>Kilométrage:</strong> {inspection.mileage_km.toLocaleString('fr-FR')} km
                          </span>
                          <span>
                            <strong>Carburant:</strong> {inspection.fuel_level}%
                          </span>
                        </div>
                      )}

                      {inspection.damages && inspection.damages.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-orange-800">Dommages constatés</p>
                            {inspection.damages.map((damage: any, idx: number) => (
                              <p key={idx} className="text-sm text-orange-700 mt-1">
                                {damage.description || 'Dommage non décrit'}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {inspection.notes && (
                        <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                          <strong>Notes:</strong> {inspection.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(inspection.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-center lg:items-end gap-3">
                    {inspection.damages && inspection.damages.length > 0 ? (
                      <span className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-semibold border border-orange-300">
                        Avec dommages
                      </span>
                    ) : (
                      <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold border border-green-300">
                        État correct
                      </span>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePreviewPDF(inspection)}
                        className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition text-slate-700"
                        title="Voir le PDF"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(inspection)}
                        className="p-3 bg-teal-100 hover:bg-teal-200 rounded-lg transition text-teal-700"
                        title="Télécharger le PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}
