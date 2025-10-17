import VehicleSchematic, { SchematicType } from './VehicleSchematic';
import { Camera, CheckCircle } from 'lucide-react';

interface PhotoCardProps {
  type: SchematicType;
  label: string;
  instruction?: string;
  isRequired?: boolean;
  isCaptured?: boolean;
  photoCount?: number;
  onClick?: () => void;
  disabled?: boolean;
  useRealPhoto?: boolean; // Nouvelle option pour utiliser vraies photos
  vehicleType?: 'VL' | 'VU' | 'PL'; // Type de véhicule pour choisir la bonne image
}

// Mapping des photos réelles pour chaque vue selon le type de véhicule
const VEHICLE_PHOTOS: Record<string, Record<string, string>> = {
  'VL': {
    'front': '/assets/vehicles/avant.png',
    'back': '/assets/vehicles/arriere.png',
    'left_front': '/assets/vehicles/lateral gauche avant.png',
    'left_back': '/assets/vehicles/laterale gauche arriere.png',
    'right_front': '/assets/vehicles/lateraldroit avant.png',
    'right_back': '/assets/vehicles/lateral droit arriere.png',
  },
  'VU': {
    'front': '/assets/vehicles/master avant.png',
    'back': '/assets/vehicles/master avg (2).png',
    'left_front': '/assets/vehicles/master lateral droit avant.png',
    'left_back': '/assets/vehicles/master laterak gauche arriere.png',
    'right_front': '/assets/vehicles/master lateral droit avant.png',
    'right_back': '/assets/vehicles/master lateral droit arriere.png',
  },
  'PL': {
    'front': '/assets/vehicles/scania-avant.png',
    'back': '/assets/vehicles/scania-arriere.png',
    'left_front': '/assets/vehicles/scania-lateral-gauche-avant.png',
    'left_back': '/assets/vehicles/scania-lateral-gauche-arriere.png',
    'right_front': '/assets/vehicles/scania-lateral-droit-avant.png',
    'right_back': '/assets/vehicles/scania-lateral-droit-arriere.png',
  }
};

export default function PhotoCard({
  type,
  label,
  instruction,
  isRequired = false,
  isCaptured = false,
  photoCount = 0,
  onClick,
  disabled = false,
  useRealPhoto = true, // Par défaut, on utilise les vraies photos
  vehicleType = 'VL' // Par défaut VL (Véhicule Léger)
}: PhotoCardProps) {
  
  // Vérifier si on a une vraie photo pour ce type de véhicule
  const realPhotoUrl = VEHICLE_PHOTOS[vehicleType]?.[type];
  const hasRealPhoto = useRealPhoto && realPhotoUrl;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-4 rounded-xl border-2 transition-all overflow-hidden
        ${isCaptured 
          ? 'border-green-500 bg-green-50' 
          : isRequired 
            ? 'border-red-300 bg-white hover:border-[#14B8A6] hover:shadow-md'
            : 'border-[#CCFBF1] bg-white hover:border-[#14B8A6] hover:shadow-md'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        active:scale-95
      `}
    >
      {/* Badge compteur de photos (si plusieurs photos pour cette zone) */}
      {photoCount > 0 && (
        <div className="absolute -top-2 -right-2 bg-[#FF4D6D] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center z-10">
          {photoCount}
        </div>
      )}

      {/* Icône validation */}
      {isCaptured && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle className="w-6 h-6 text-green-500 fill-current" />
        </div>
      )}

      {/* Schéma du véhicule - Photo réelle OU SVG */}
      <div className="mb-3 relative">
        {hasRealPhoto ? (
          <div className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100">
            <img 
              src={realPhotoUrl} 
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Si l'image ne charge pas, afficher le SVG à la place
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden">
              <VehicleSchematic type={type} className="w-full h-24" />
            </div>
            {/* Overlay semi-transparent pour l'effet hover */}
            <div className={`absolute inset-0 transition-opacity ${
              disabled ? 'bg-black/30' : 'hover:bg-[#14B8A6]/10'
            }`} />
          </div>
        ) : (
          <VehicleSchematic type={type} className="w-full h-24" />
        )}
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="font-semibold text-[#2D2A3E] text-sm">
          {label}
          {isRequired && <span className="text-[#FF4D6D] ml-1">*</span>}
        </p>
        {instruction && (
          <p className="text-xs text-gray-500 mt-1">{instruction}</p>
        )}
      </div>

      {/* Icône caméra si pas encore capturé */}
      {!isCaptured && (
        <div className="mt-2 flex justify-center">
          <Camera className="w-5 h-5 text-[#14B8A6]" />
        </div>
      )}
    </button>
  );
}
