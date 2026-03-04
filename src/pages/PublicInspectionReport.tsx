import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Calendar, MapPin, FileText, Image as ImageIcon, X, Eye, Car, AlertTriangle } from 'lucide-react';

interface Photo {
  id: string;
  photo_url: string;
  thumbnail_url?: string;
  photo_type: string;
  created_at: string;
}

interface Damage {
  id: string;
  damage_type: string;
  severity: string;
  location: string | null;
  description: string | null;
  photo_url: string | null;
}

interface Inspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  datetime: string;
  location: string | null;
  notes: string | null;
  driver_signature: string | null;
  client_signature: string | null;
  status: string;
  vehicle_condition: string | null;
  internal_cleanliness: string | null;
  external_cleanliness: string | null;
  photos: Photo[];
  damages: Damage[];
}

interface ReportData {
  share_token: string;
  created_at: string;
  view_count: number;
  mission: {
    id: string;
    reference: string;
    pickup_location: string;
    delivery_location: string;
    status: string;
    mandataire_name: string | null;
    mandataire_company: string | null;
    vehicle: {
      id: string;
      brand: string;
      model: string;
      plate: string;
      vehicle_type: string;
    };
  };
  departure: Inspection | null;
  arrival: Inspection | null;
}

export default function PublicInspectionReport() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token manquant');
      setLoading(false);
      return;
    }

    fetch(`/api/public-report?token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Rapport introuvable');
        return res.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setData(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/download-report?token=${token}`);
      if (!response.ok) throw new Error('Échec du téléchargement');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_inspection_${data?.mission.reference || token}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const openLightbox = (photoUrl: string) => {
    setLightboxPhoto(photoUrl);
    setLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-sky-500 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Rapport introuvable</h1>
          <p className="text-slate-600 mb-6">{error || 'Ce rapport n\'existe pas ou a expiré.'}</p>
          <a href="/" className="inline-block px-6 py-3 bg-sky-500 text-white rounded-lg font-semibold hover:bg-sky-600 transition">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  const { mission, departure, arrival, view_count } = data;

  // Extract city name from address string
  const extractCity = (address: string): string => {
    if (!address) return '';
    // Try to extract city from common French address formats
    // Format: "123 rue ..., 75001 Paris" or "Paris, France" or just "Paris"
    const parts = address.split(',').map(s => s.trim());
    // Look for a part with a postal code pattern (5 digits + city)
    for (const part of parts) {
      const match = part.match(/\d{5}\s+(.+)/);
      if (match) return match[1].trim();
    }
    // If no postal code, return the last meaningful part (often the city)
    if (parts.length >= 2) return parts[parts.length - 2] || parts[0];
    return parts[0];
  };

  const pickupCity = mission.pickup_location ? extractCity(mission.pickup_location) : null;
  const deliveryCity = mission.delivery_location ? extractCity(mission.delivery_location) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">CHECKSFLEET</h1>
                <p className="text-sm text-slate-500">Rapport d'inspection</p>
              </div>
            </div>
            
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
            >
              <Download className="w-5 h-5" />
              <span className="hidden sm:inline">{downloading ? 'Téléchargement...' : 'Télécharger ZIP'}</span>
              <span className="sm:hidden">ZIP</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-8 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-2">Mission #{mission.reference}</h2>
                {(pickupCity || deliveryCity) && (
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-sky-200" />
                    <span className="text-base font-semibold text-white">
                      {pickupCity || '—'} → {deliveryCity || '—'}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-6 text-sky-100">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{view_count} {view_count > 1 ? 'vues' : 'vue'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-2 py-1 bg-white/20 rounded-md">
                      {mission.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {(mission.mandataire_name || mission.mandataire_company) && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4">
                    <p className="text-sm text-sky-100 mb-1">Donneur d'ordre</p>
                    {mission.mandataire_name && <p className="text-xl font-bold">{mission.mandataire_name}</p>}
                    {mission.mandataire_company && <p className="text-base text-sky-100">{mission.mandataire_company}</p>}
                  </div>
                )}
                {mission.vehicle && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4">
                    <p className="text-sm text-sky-100 mb-1">Véhicule</p>
                    <p className="text-xl font-bold">{mission.vehicle.brand} {mission.vehicle.model}</p>
                    <p className="text-lg font-mono">{mission.vehicle.plate}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {departure && (
            <InspectionCard
              inspection={departure}
              type="departure"
              onPhotoClick={openLightbox}
            />
          )}

          {arrival ? (
            <InspectionCard
              inspection={arrival}
              type="arrival"
              onPhotoClick={openLightbox}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center justify-center border-2 border-dashed border-slate-300">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Inspection d'arrivée</p>
                <p className="text-sm text-slate-400 mt-1">Pas encore effectuée</p>
              </div>
            </div>
          )}
        </div>

        {/* Damage comparison section */}
        {(departure?.damages?.length || arrival?.damages?.length) ? (
          <DamageMapSection
            departureDamages={departure?.damages || []}
            arrivalDamages={arrival?.damages || []}
          />
        ) : null}

        {departure && arrival && (
          <PhotoComparison
            departurePhotos={departure.photos}
            arrivalPhotos={arrival.photos}
            onPhotoClick={openLightbox}
          />
        )}
      </div>

      {lightboxOpen && lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Photo"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

interface InspectionCardProps {
  inspection: Inspection;
  type: 'departure' | 'arrival';
  onPhotoClick: (url: string) => void;
}

function InspectionCard({ inspection, type, onPhotoClick }: InspectionCardProps) {
  const isDepart = type === 'departure';
  const bgColor = isDepart ? 'from-emerald-500 to-emerald-600' : 'from-sky-500 to-sky-600';
  const borderColor = isDepart ? 'border-emerald-200' : 'border-sky-200';
  
  return (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${borderColor}`}>
      <div className={`bg-gradient-to-r ${bgColor} px-6 py-4 text-white`}>
        <h3 className="text-xl font-bold flex items-center gap-2">
          {isDepart ? '🟢' : '🔴'}
          {isDepart ? 'INSPECTION DE DÉPART' : 'INSPECTION D\'ARRIVÉE'}
        </h3>
      </div>

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Date et heure</p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(inspection.datetime).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {inspection.location && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Lieu</p>
                <p className="text-sm font-semibold text-slate-900">{inspection.location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Vehicle Condition & Cleanliness - only for departure */}
        {isDepart && inspection.vehicle_condition && (
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-2">🚗 État général du véhicule</p>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold">
              {inspection.vehicle_condition}
            </span>
          </div>
        )}

        {(inspection.internal_cleanliness || inspection.external_cleanliness) && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-2">✨ Propreté</p>
            <div className="flex gap-4">
              {inspection.internal_cleanliness && (
                <div>
                  <p className="text-xs text-slate-500">Intérieure</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{inspection.internal_cleanliness.replace(/_/g, ' ')}</p>
                </div>
              )}
              {inspection.external_cleanliness && (
                <div>
                  <p className="text-xs text-slate-500">Extérieure</p>
                  <p className="text-sm font-semibold text-slate-800 capitalize">{inspection.external_cleanliness.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Damages list */}
        {inspection.damages && inspection.damages.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              Dommages relevés ({inspection.damages.length})
            </p>
            <div className="space-y-2">
              {inspection.damages.map((d) => (
                <div key={d.id} className="flex items-start gap-2 bg-white rounded-md p-2 border border-red-100">
                  <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded capitalize">
                    {d.damage_type?.replace(/_/g, ' ') || 'Inconnu'}
                  </span>
                  {d.location && (
                    <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                      {d.location.replace(/_/g, ' ')}
                    </span>
                  )}
                  {d.severity && d.severity !== 'minor' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${d.severity === 'severe' ? 'bg-red-200 text-red-800' : 'bg-orange-100 text-orange-700'}`}>
                      {d.severity === 'severe' ? 'Grave' : 'Modéré'}
                    </span>
                  )}
                  {d.description && (
                    <span className="text-xs text-slate-500">{d.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {inspection.notes && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-500 font-semibold uppercase mb-2">📝 Notes du chauffeur</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase mb-3">✍️ Signatures</p>
          <div className="grid grid-cols-2 gap-4">
            <SignatureBox
              label="Chauffeur"
              signatureUrl={inspection.driver_signature}
            />
            <SignatureBox
              label="Client"
              signatureUrl={inspection.client_signature}
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 font-semibold uppercase mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Photos ({inspection.photos.length})
          </p>
          {inspection.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {inspection.photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => onPhotoClick(photo.photo_url)}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:ring-2 hover:ring-sky-400 transition"
                >
                  <img
                    src={photo.thumbnail_url || photo.photo_url}
                    alt={photo.photo_type}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucune photo</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SignatureBox({ label, signatureUrl }: { label: string; signatureUrl: string | null }) {
  return (
    <div className="border-2 border-slate-200 rounded-lg p-3 bg-slate-50">
      <p className="text-xs text-slate-500 font-semibold mb-2">{label}</p>
      {signatureUrl ? (
        <img src={signatureUrl} alt={`Signature ${label}`} className="w-full h-16 object-contain" />
      ) : (
        <div className="h-16 flex items-center justify-center text-slate-400">
          <X className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Vehicle Damage Map for Public Report (SVG-based)
// ═══════════════════════════════════════════════════

const ZONE_LABELS: Record<string, string> = {
  front_bumper: 'Pare-chocs avant',
  front_left_corner: 'Coin AV gauche',
  front_right_corner: 'Coin AV droit',
  hood: 'Capot',
  windshield: 'Pare-brise',
  left_headlight: 'Phare gauche',
  right_headlight: 'Phare droit',
  left_front_fender: 'Aile AV gauche',
  left_front_door: 'Portière AV gauche',
  left_rear_door: 'Portière AR gauche',
  left_rear_fender: 'Aile AR gauche',
  left_mirror: 'Rétro gauche',
  left_sill: 'Bas de caisse G',
  right_front_fender: 'Aile AV droite',
  right_front_door: 'Portière AV droite',
  right_rear_door: 'Portière AR droite',
  right_rear_fender: 'Aile AR droite',
  right_mirror: 'Rétro droit',
  right_sill: 'Bas de caisse D',
  roof: 'Toit',
  rear_bumper: 'Pare-chocs arrière',
  rear_left_corner: 'Coin AR gauche',
  rear_right_corner: 'Coin AR droit',
  trunk: 'Coffre / Hayon',
  rear_window: 'Lunette arrière',
  left_taillight: 'Feu AR gauche',
  right_taillight: 'Feu AR droit',
  // Legacy zone keys
  front_left: 'Avant gauche',
  front_center: 'Pare-chocs avant',
  front_right: 'Avant droit',
  left_front: 'Aile AV gauche',
  left_rear: 'Aile AR gauche',
  right_front: 'Aile AV droite',
  right_rear: 'Aile AR droite',
  rear_left: 'Arrière gauche',
  rear_center: 'Pare-chocs arrière',
  rear_right: 'Arrière droit',
};

const DAMAGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  scratch: { label: 'Rayure', color: '#F97316' },
  dent: { label: 'Bosse', color: '#EF4444' },
  crack: { label: 'Fissure', color: '#A855F7' },
  broken: { label: 'Cassé', color: '#DC2626' },
  paint: { label: 'Peinture', color: '#3B82F6' },
  missing: { label: 'Manquant', color: '#92400E' },
  other: { label: 'Autre', color: '#6B7280' },
};

function DamageMapSection({ departureDamages, arrivalDamages }: { departureDamages: Damage[], arrivalDamages: Damage[] }) {
  const allDamages = [
    ...departureDamages.map(d => ({ ...d, source: 'departure' as const })),
    ...arrivalDamages.map(d => ({ ...d, source: 'arrival' as const })),
  ];

  if (allDamages.length === 0) return null;

  // Group damages by zone
  const byZone: Record<string, typeof allDamages> = {};
  for (const d of allDamages) {
    const zone = d.location || 'unknown';
    if (!byZone[zone]) byZone[zone] = [];
    byZone[zone].push(d);
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Car className="w-6 h-6 text-red-500" />
        Carte des dommages
        <span className="text-sm font-normal text-slate-500 ml-2">
          ({allDamages.length} dommage{allDamages.length > 1 ? 's' : ''})
        </span>
      </h3>

      {/* SVG top-down vehicle view with damage zones */}
      <div className="flex justify-center mb-6">
        <svg viewBox="0 0 300 420" className="w-full max-w-[280px]" xmlns="http://www.w3.org/2000/svg">
          {/* Shadow */}
          <path transform="translate(0, 4)" d="M90,15 Q150,5 210,15 Q250,30 250,90 L255,100 L255,300 L250,310 Q250,380 210,395 Q150,405 90,395 Q50,380 50,310 L45,300 L45,100 L50,90 Q50,30 90,15 Z" fill="rgba(0,0,0,0.05)" filter="blur(4px)" />

          {/* Body Body (Realistic Sedan) */}
          <path d="M90,15 Q150,5 210,15 Q250,30 250,90 L255,100 L255,300 L250,310 Q250,380 210,395 Q150,405 90,395 Q50,380 50,310 L45,300 L45,100 L50,90 Q50,30 90,15 Z" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.5" />
          
          {/* Windshield */}
          <path d="M80,75 Q150,65 220,75 L230,110 Q150,100 70,110 Z" fill="rgba(224, 242, 254, 0.8)" stroke="#94A3B8" strokeWidth="1.5" />
          
          {/* Rear Window */}
          <path d="M75,310 Q150,305 225,310 L215,345 Q150,350 85,345 Z" fill="rgba(224, 242, 254, 0.8)" stroke="#94A3B8" strokeWidth="1.5" />

          {/* Roof Definition */}
          <path d="M70,110 L230,110 L225,310 L75,310 Z" fill="rgba(255,255,255,0.3)" />

          {/* Hood Lines */}
          <path d="M80,75 Q60,40 90,15" fill="none" stroke="#CBD5E1" strokeWidth="1" />
          <path d="M220,75 Q240,40 210,15" fill="none" stroke="#CBD5E1" strokeWidth="1" />

          {/* Trunk Lines */}
          <line x1="85" y1="345" x2="85" y2="395" stroke="#CBD5E1" strokeWidth="1" />
          <line x1="215" y1="345" x2="215" y2="395" stroke="#CBD5E1" strokeWidth="1" />

          {/* Side Mirrors (Aerodynamic) */}
          <path d="M50,85 L20,80 Q15,90 20,100 L50,95 Z" fill="#CBD5E1" />
          <path d="M250,85 L280,80 Q285,90 280,100 L250,95 Z" fill="#CBD5E1" />

          {/* Wheels */}
          <rect x="25" y="95" width="16" height="42" rx="4" fill="#94A3B8" />
          <rect x="259" y="95" width="16" height="42" rx="4" fill="#94A3B8" />
          <rect x="25" y="270" width="16" height="42" rx="4" fill="#94A3B8" />
          <rect x="259" y="270" width="16" height="42" rx="4" fill="#94A3B8" />

          {/* Headlights */}
          <ellipse cx="70" cy="27" rx="15" ry="7" fill="rgba(255,255,255,0.6)" />
          <ellipse cx="230" cy="27" rx="15" ry="7" fill="rgba(255,255,255,0.6)" />

          {/* Taillights */}
          <ellipse cx="70" cy="390" rx="15" ry="5" fill="rgba(254, 202, 202, 0.7)" />
          <ellipse cx="230" cy="390" rx="15" ry="5" fill="rgba(254, 202, 202, 0.7)" />

          {/* Labels */}
          <text x="150" y="12" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#94A3B8">AVANT</text>
          <text x="150" y="418" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#94A3B8">ARRIÈRE</text>
          <text x="12" y="204" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94A3B8">G</text>
          <text x="288" y="204" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94A3B8">D</text>

          {/* Damage zone highlights */}
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

      {/* Damage list by zone */}
      <div className="space-y-3">
        {Object.entries(byZone).map(([zone, damages]) => (
          <div key={zone} className="bg-red-50 rounded-lg p-3 border border-red-100">
            <p className="text-sm font-semibold text-slate-800 mb-2">
              📍 {ZONE_LABELS[zone] || zone.replace(/_/g, ' ')}
            </p>
            <div className="flex flex-wrap gap-2">
              {damages.map((d, i) => {
                const typeInfo = DAMAGE_TYPE_LABELS[d.damage_type] || { label: d.damage_type, color: '#6B7280' };
                return (
                  <div key={i} className="flex items-center gap-1.5 bg-white rounded px-2 py-1 border border-red-100">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: typeInfo.color }}
                    />
                    <span className="text-xs font-medium" style={{ color: typeInfo.color }}>
                      {typeInfo.label}
                    </span>
                    {d.source === 'departure' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded">Départ</span>
                    )}
                    {d.source === 'arrival' && (
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-1 rounded">Arrivée</span>
                    )}
                    {d.description && (
                      <span className="text-[10px] text-slate-400 ml-1">{d.description}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Zone positions on the 300x420 SVG top-down view
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
    // Legacy zone keys mapping
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

interface PhotoComparisonProps {
  departurePhotos: Photo[];
  arrivalPhotos: Photo[];
  onPhotoClick: (url: string) => void;
}

function PhotoComparison({ departurePhotos, arrivalPhotos, onPhotoClick }: PhotoComparisonProps) {
  const photoTypes = Array.from(
    new Set([
      ...departurePhotos.map(p => p.photo_type),
      ...arrivalPhotos.map(p => p.photo_type)
    ])
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <ImageIcon className="w-6 h-6 text-sky-500" />
        Comparaison visuelle
      </h3>

      <div className="space-y-6">
        {photoTypes.map(type => {
          const depPhotos = departurePhotos.filter(p => p.photo_type === type);
          const arrPhotos = arrivalPhotos.filter(p => p.photo_type === type);
          
          return (
            <div key={type} className="border-b border-slate-200 last:border-0 pb-6 last:pb-0">
              <p className="text-sm font-semibold text-slate-600 uppercase mb-3">
                {type.replace(/_/g, ' ')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-emerald-600 font-semibold mb-2">🟢 Départ ({depPhotos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {depPhotos.length > 0 ? (
                      depPhotos.map(p => (
                        <button
                          key={p.id}
                          onClick={() => onPhotoClick(p.photo_url)}
                          className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:ring-2 hover:ring-emerald-400 transition"
                        >
                          <img src={p.thumbnail_url || p.photo_url} alt={type} className="w-full h-full object-cover" />
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 col-span-2 text-center py-4">Aucune photo</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-sky-600 font-semibold mb-2">🔴 Arrivée ({arrPhotos.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {arrPhotos.length > 0 ? (
                      arrPhotos.map(p => (
                        <button
                          key={p.id}
                          onClick={() => onPhotoClick(p.photo_url)}
                          className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:ring-2 hover:ring-sky-400 transition"
                        >
                          <img src={p.thumbnail_url || p.photo_url} alt={type} className="w-full h-full object-cover" />
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 col-span-2 text-center py-4">Aucune photo</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
