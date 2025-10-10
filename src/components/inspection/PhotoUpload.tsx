import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PhotoUploadProps {
  category: string;
  label: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  optional?: boolean;
}

export default function PhotoUpload({
  category,
  label,
  photos,
  onPhotosChange,
  optional = false
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${category}_${Date.now()}_${i}.${fileExt}`;
        const filePath = `inspections/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      onPhotosChange([...photos, ...uploadedUrls]);
    } catch (err) {
      console.error('Error uploading photos:', err);
      setError('Erreur lors du téléchargement des photos');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700">
        {label}
        {optional && <span className="text-slate-400 font-normal ml-2">(optionnel)</span>}
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <img
              src={photo}
              alt={`${label} ${index + 1}`}
              className="w-full h-32 object-cover rounded-xl border-2 border-white/60 shadow-lg"
            />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <label className="relative cursor-pointer group">
          <div className="w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-teal-500 hover:bg-teal-50/50 transition-all">
            {uploading ? (
              <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-500 mb-2 transition-colors" />
                <span className="text-xs text-slate-500 group-hover:text-teal-600 font-semibold">
                  Ajouter photo
                </span>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <X className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {photos.length === 0 && !optional && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-500" />
          <p className="text-sm text-blue-700">Ajoutez au moins une photo pour continuer</p>
        </div>
      )}
    </div>
  );
}
