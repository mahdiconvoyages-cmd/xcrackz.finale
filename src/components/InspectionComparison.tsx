/**
 * Composant Comparaison Inspection - Vue côte-à-côte départ/arrivée
 */

import { ArrowRight, MapPin, CheckCircle, Gauge, Droplet, Image as ImageIcon } from 'lucide-react';

interface InspectionData {
  overall_condition?: string;
  mileage_km?: number;
  fuel_level?: number;
  notes?: string;
  photos?: Array<{ photo_url: string; photo_type: string }>;
}

interface InspectionComparisonProps {
  departureInspection?: InspectionData | null;
  arrivalInspection?: InspectionData | null;
  onPhotoClick?: (photos: any[], index: number, type: 'departure' | 'arrival') => void;
}

export default function InspectionComparison({
  departureInspection,
  arrivalInspection,
  onPhotoClick
}: InspectionComparisonProps) {
  if (!departureInspection && !arrivalInspection) {
    return null;
  }

  const hasPhotos = (inspection?: InspectionData | null) =>
    inspection?.photos && inspection.photos.length > 0;

  const getConditionColor = (condition?: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent':
      case 'bon':
      case 'good':
        return 'text-green-700 bg-green-100';
      case 'moyen':
      case 'fair':
        return 'text-orange-700 bg-orange-100';
      case 'mauvais':
      case 'poor':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-slate-700 bg-slate-100';
    }
  };

  const getDifference = (start?: number, end?: number) => {
    if (!start || !end) return null;
    const diff = end - start;
    return diff;
  };

  const mileageDiff = getDifference(
    departureInspection?.mileage_km,
    arrivalInspection?.mileage_km
  );

  const fuelDiff = getDifference(
    departureInspection?.fuel_level,
    arrivalInspection?.fuel_level
  );

  return (
    <div className="space-y-4">
      {/* Titre comparaison */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
          <MapPin className="w-4 h-4" />
          Enlèvement
        </div>
        <ArrowRight className="w-6 h-6 text-slate-400" />
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold">
          <CheckCircle className="w-4 h-4" />
          Livraison
        </div>
      </div>

      {/* Grille comparative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colonne Départ */}
        <div className="space-y-3">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
            <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              État d'Enlèvement
            </h4>

            {departureInspection ? (
              <div className="space-y-3">
                {/* État général */}
                {departureInspection.overall_condition && (
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-1">État Général</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getConditionColor(
                        departureInspection.overall_condition
                      )}`}
                    >
                      {departureInspection.overall_condition}
                    </span>
                  </div>
                )}

                {/* Kilométrage */}
                {departureInspection.mileage_km !== undefined && (
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-green-700" />
                    <div>
                      <p className="text-xs text-green-700">Kilométrage</p>
                      <p className="font-bold text-green-900">
                        {departureInspection.mileage_km.toLocaleString('fr-FR')} km
                      </p>
                    </div>
                  </div>
                )}

                {/* Carburant */}
                {departureInspection.fuel_level !== undefined && (
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-green-700" />
                    <div>
                      <p className="text-xs text-green-700">Niveau de carburant</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-green-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-green-600 h-full transition-all"
                            style={{ width: `${departureInspection.fuel_level}%` }}
                          />
                        </div>
                        <span className="font-bold text-green-900 text-sm">
                          {departureInspection.fuel_level}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {departureInspection.notes && (
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Notes</p>
                    <p className="text-sm text-green-700">{departureInspection.notes}</p>
                  </div>
                )}

                {/* Photos */}
                {hasPhotos(departureInspection) && (
                  <div>
                    <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Photos ({departureInspection.photos!.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {departureInspection.photos!.slice(0, 6).map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={() =>
                            onPhotoClick?.(departureInspection.photos!, idx, 'departure')
                          }
                          className="aspect-square rounded-lg overflow-hidden border-2 border-green-300 hover:border-green-500 transition cursor-pointer group"
                        >
                          <img
                            src={photo.photo_url}
                            alt={photo.photo_type}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        </button>
                      ))}
                    </div>
                    {departureInspection.photos!.length > 6 && (
                      <p className="text-xs text-green-600 mt-1">
                        +{departureInspection.photos!.length - 6} autres photos
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-green-600 italic">Inspection non disponible</p>
            )}
          </div>
        </div>

        {/* Colonne Arrivée */}
        <div className="space-y-3">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              État de Livraison
            </h4>

            {arrivalInspection ? (
              <div className="space-y-3">
                {/* État général */}
                {arrivalInspection.overall_condition && (
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-1">État Général</p>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getConditionColor(
                        arrivalInspection.overall_condition
                      )}`}
                    >
                      {arrivalInspection.overall_condition}
                    </span>
                  </div>
                )}

                {/* Kilométrage */}
                {arrivalInspection.mileage_km !== undefined && (
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-700" />
                    <div>
                      <p className="text-xs text-blue-700">Kilométrage</p>
                      <p className="font-bold text-blue-900">
                        {arrivalInspection.mileage_km.toLocaleString('fr-FR')} km
                      </p>
                      {mileageDiff !== null && mileageDiff > 0 && (
                        <p className="text-xs text-blue-600">
                          +{mileageDiff.toLocaleString('fr-FR')} km parcourus
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Carburant */}
                {arrivalInspection.fuel_level !== undefined && (
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-blue-700" />
                    <div>
                      <p className="text-xs text-blue-700">Niveau de carburant</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-blue-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full transition-all"
                            style={{ width: `${arrivalInspection.fuel_level}%` }}
                          />
                        </div>
                        <span className="font-bold text-blue-900 text-sm">
                          {arrivalInspection.fuel_level}%
                        </span>
                      </div>
                      {fuelDiff !== null && (
                        <p className="text-xs text-blue-600">
                          {fuelDiff > 0 ? '+' : ''}
                          {fuelDiff}% {fuelDiff > 0 ? 'ajouté' : 'consommé'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {arrivalInspection.notes && (
                  <div className="bg-white/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Notes</p>
                    <p className="text-sm text-blue-700">{arrivalInspection.notes}</p>
                  </div>
                )}

                {/* Photos */}
                {hasPhotos(arrivalInspection) && (
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      Photos ({arrivalInspection.photos!.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {arrivalInspection.photos!.slice(0, 6).map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={() => onPhotoClick?.(arrivalInspection.photos!, idx, 'arrival')}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-blue-300 hover:border-blue-500 transition cursor-pointer group"
                        >
                          <img
                            src={photo.photo_url}
                            alt={photo.photo_type}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        </button>
                      ))}
                    </div>
                    {arrivalInspection.photos!.length > 6 && (
                      <p className="text-xs text-blue-600 mt-1">
                        +{arrivalInspection.photos!.length - 6} autres photos
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-blue-600 italic">Inspection non disponible</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
