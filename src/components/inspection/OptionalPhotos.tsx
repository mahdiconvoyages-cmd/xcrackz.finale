import { useState, useRef } from 'react';
import { X, Plus } from 'lucide-react';

interface OptionalPhoto {
  id: string;
  url: string;
  file: File;
  description: string;
}

interface OptionalPhotosProps {
  maxPhotos?: number;
  onPhotosChange: (photos: OptionalPhoto[]) => void;
  existingPhotos?: OptionalPhoto[];
}

export default function OptionalPhotos({ 
  maxPhotos = 10, 
  onPhotosChange,
  existingPhotos = []
}: OptionalPhotosProps) {
  const [photos, setPhotos] = useState<OptionalPhoto[]>(existingPhotos);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const newPhoto: OptionalPhoto = {
        id: Date.now().toString(),
        url: reader.result as string,
        file: file,
        description: ''
      };

      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
    };

    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    const updatedPhotos = photos.filter(p => p.id !== photoId);
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  const handleUpdateDescription = (photoId: string, description: string) => {
    const updatedPhotos = photos.map(p => 
      p.id === photoId ? { ...p, description } : p
    );
    setPhotos(updatedPhotos);
    onPhotosChange(updatedPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="mt-6 border-t border-[#CCFBF1] pt-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[#2D2A3E]">
            Photos optionnelles
          </h3>
          <span className="text-sm text-gray-500">
            {photos.length}/{maxPhotos}
          </span>
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Grid de photos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  {/* Image */}
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-[#CCFBF1]">
                    <img
                      src={photo.url}
                      alt="Photo optionnelle"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Bouton supprimer */}
                  <button
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Description */}
                  <input
                    type="text"
                    value={photo.description}
                    onChange={(e) => handleUpdateDescription(photo.id, e.target.value)}
                    placeholder="Description (optionnel)"
                    className="mt-2 w-full text-xs px-2 py-1 border border-[#CCFBF1] rounded focus:outline-none focus:ring-2 focus:ring-[#14B8A6]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Bouton ajouter photo */}
          {canAddMore && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-[#14B8A6] rounded-xl bg-[#F0FDFA] hover:bg-[#CCFBF1] transition-colors flex items-center justify-center gap-2 text-[#14B8A6] font-medium"
            >
              <Plus className="w-5 h-5" />
              Ajouter photo libre
              {photos.length > 0 && (
                <span className="text-sm">
                  ({maxPhotos - photos.length} restantes)
                </span>
              )}
            </button>
          )}

          {!canAddMore && (
            <p className="text-center text-sm text-gray-500">
              Limite de {maxPhotos} photos atteinte
            </p>
          )}

          {/* Input file caché */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleAddPhoto}
            className="hidden"
          />

          {/* Info */}
          <p className="text-xs text-gray-500 text-center">
            💡 Utilisez les photos optionnelles pour documenter des dommages spécifiques ou des détails importants
          </p>
        </div>
      )}
    </div>
  );
}
