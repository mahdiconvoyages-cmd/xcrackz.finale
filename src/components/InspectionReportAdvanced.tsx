import { useMemo, useState, useEffect } from 'react';
import { Image as ImageIcon, Columns, SplitSquareVertical } from 'lucide-react';
import PhotoGallery from './PhotoGallery';
import OptimizedImage from './OptimizedImage';

interface Photo {
  id?: string;
  photo_url: string;
  photo_type?: string;
  created_at?: string;
}

interface SimpleInspection {
  id: string;
  inspection_type: 'departure' | 'arrival';
  photos?: Photo[];
}

interface InspectionReportAdvancedProps {
  missionReference?: string;
  departure?: SimpleInspection | null;
  arrival?: SimpleInspection | null;
}

const ORDERED_TYPES = [
  'front',
  'right_front',
  'left_front',
  'back',
  'right_back',
  'left_back',
  'interior',
  'dashboard',
];

export default function InspectionReportAdvanced({ missionReference, departure, arrival }: InspectionReportAdvancedProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPhotos, setGalleryPhotos] = useState<Photo[]>([]);
  const [galleryTitle, setGalleryTitle] = useState('');

  // Debug: Afficher les photos reçues
  useEffect(() => {
    console.log('📸 InspectionReportAdvanced - Données:', {
      missionReference,
      departurePhotos: departure?.photos?.length || 0,
      arrivalPhotos: arrival?.photos?.length || 0,
    });
    if (departure?.photos?.length) {
      console.log('✅ Photos départ:', departure.photos.slice(0, 2));
    } else {
      console.warn('⚠️ Aucune photo de départ!', departure);
    }
  }, [missionReference, departure, arrival]);

  const grouped = useMemo(() => {
    const groupByType = (photos?: Photo[]) => {
      const map = new Map<string, Photo[]>();
      (photos || []).forEach((p) => {
        const key = (p.photo_type || 'autre').toLowerCase();
        map.set(key, [...(map.get(key) || []), p]);
      });
      return map;
    };

    return {
      departure: groupByType(departure?.photos),
      arrival: groupByType(arrival?.photos),
    };
  }, [departure?.photos, arrival?.photos]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    [...(grouped.departure.keys()), ...(grouped.arrival.keys())].forEach((k) => set.add(k));
    return Array.from(set).sort((a, b) => {
      const ia = ORDERED_TYPES.indexOf(a);
      const ib = ORDERED_TYPES.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [grouped]);

  const openGallery = (photos: Photo[], index: number, title: string) => {
    setGalleryPhotos(photos);
    setGalleryIndex(index);
    setGalleryTitle(title);
    setGalleryOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Vue Grille par type */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-700">
          <Columns className="w-5 h-5 text-teal-600" />
          <span className="font-semibold">Vue avancée par type de photo</span>
        </div>
        <div className="p-4 space-y-6">
          {allTypes.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune photo disponible.</p>) :
            allTypes.map((t) => {
              const left = grouped.departure.get(t) || [];
              const right = grouped.arrival.get(t) || [];
              return (
                <div key={t} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Depart */}
                  <div className="bg-green-50/60 border border-green-200 rounded-lg">
                    <div className="px-3 py-2 border-b border-green-200 text-green-800 text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Départ • {t.replace(/_/g, ' ')} ({left.length})
                    </div>
                    <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {left.length === 0 ? (
                        <p className="text-xs text-green-700">Aucune photo</p>
                      ) : left.map((p, idx) => (
                        <button key={p.id || idx} className="relative group overflow-hidden rounded-md border border-green-200 hover:border-green-400 transition"
                          onClick={() => openGallery(left, idx, `Départ • ${missionReference} • ${t}`)}>
                          <OptimizedImage src={p.photo_url} alt={`${t}-${idx+1}`} className="w-full h-24 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Arrivee */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-lg">
                    <div className="px-3 py-2 border-b border-blue-200 text-blue-800 text-sm font-semibold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Arrivée • {t.replace(/_/g, ' ')} ({right.length})
                    </div>
                    <div className="p-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {right.length === 0 ? (
                        <p className="text-xs text-blue-700">Aucune photo</p>
                      ) : right.map((p, idx) => (
                        <button key={p.id || idx} className="relative group overflow-hidden rounded-md border border-blue-200 hover:border-blue-400 transition"
                          onClick={() => openGallery(right, idx, `Arrivée • ${missionReference} • ${t}`)}>
                          <OptimizedImage src={p.photo_url} alt={`${t}-${idx+1}`} className="w-full h-24 object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Comparaison côte-à-côte */}
      {departure?.photos?.length && arrival?.photos?.length ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-slate-700">
            <SplitSquareVertical className="w-5 h-5 text-purple-600" />
            <span className="font-semibold">Comparaison Départ vs Arrivée</span>
          </div>
          <div className="p-4 space-y-4">
            {allTypes.map((t) => {
              const left = (grouped.departure.get(t) || [])[0];
              const right = (grouped.arrival.get(t) || [])[0];
              if (!left && !right) return null;
              return (
                <div key={`cmp-${t}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Départ • {t.replace(/_/g,' ')}</p>
                    {left ? (
                      <button className="block group" onClick={() => openGallery(grouped.departure.get(t)!, 0, `Départ • ${missionReference} • ${t}`)}>
                        <OptimizedImage src={left.photo_url} alt={`depart-${t}`} className="w-full h-48 object-cover rounded-md border hover:shadow-lg transition" />
                      </button>
                    ) : (
                      <div className="h-48 rounded-md border border-dashed flex items-center justify-center text-slate-400 text-sm">Aucune photo</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Arrivée • {t.replace(/_/g,' ')}</p>
                    {right ? (
                      <button className="block group" onClick={() => openGallery(grouped.arrival.get(t)!, 0, `Arrivée • ${missionReference} • ${t}`)}>
                        <OptimizedImage src={right.photo_url} alt={`arrivee-${t}`} className="w-full h-48 object-cover rounded-md border hover:shadow-lg transition" />
                      </button>
                    ) : (
                      <div className="h-48 rounded-md border border-dashed flex items-center justify-center text-slate-400 text-sm">Aucune photo</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Lightbox */}
      <PhotoGallery
        photos={galleryPhotos as any}
        initialIndex={galleryIndex}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={galleryTitle}
      />
    </div>
  );
}
