import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Calendar, MapPin, FileText, Image as ImageIcon, X, Eye } from 'lucide-react';

interface Photo {
  id: string;
  photo_url: string;
  thumbnail_url?: string;
  photo_type: string;
  created_at: string;
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
  photos: Photo[];
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
      alert('Erreur lors du téléchargement: ' + err.message);
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
