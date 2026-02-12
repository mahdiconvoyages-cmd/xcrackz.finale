import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { compressImage } from '../utils/imageCompression';

interface VehicleImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function VehicleImageUpload({ value, onChange }: VehicleImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La taille de l\'image ne doit pas dépasser 5 MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      // Compress image before upload
      const compressed = await compressImage(file, { maxDimension: 1200, quality: 0.8 });
      const fileExt = compressed.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-images')
        .upload(fileName, compressed, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-images')
        .getPublicUrl(fileName);

      onChange(publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      setError(error.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      const path = value.split('/vehicle-images/')[1];
      if (path) {
        await supabase.storage
          .from('vehicle-images')
          .remove([path]);
      }
      onChange('');
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  return (
    <div className="space-y-3">
      {!value ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/50 transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-500"></div>
              <p className="text-slate-600">Téléchargement...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-slate-700 font-semibold">Cliquez pour ajouter une image</p>
                <p className="text-sm text-slate-500">PNG, JPG jusqu'à 5MB</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative group">
          <img
            src={value}
            alt="Véhicule"
            className="w-full h-64 object-cover rounded-xl border border-slate-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-xl"></div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
