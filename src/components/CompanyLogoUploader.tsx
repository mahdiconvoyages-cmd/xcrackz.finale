import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Check } from 'lucide-react';
import { 
  getCompanyLogo, 
  uploadCompanyLogo, 
  deleteCompanyLogo,
  type CompanyLogo 
} from '../services/companyLogoService';

export default function CompanyLogoUploader() {
  const [logo, setLogo] = useState<CompanyLogo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Charger le logo existant
    const existingLogo = getCompanyLogo();
    if (existingLogo) {
      setLogo(existingLogo);
    }
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess(false);
    setUploading(true);

    try {
      const uploadedLogo = await uploadCompanyLogo(file);
      setLogo(uploadedLogo);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer le logo ?')) {
      deleteCompanyLogo();
      setLogo(null);
      setSuccess(false);
      setError('');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-100">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
          <ImageIcon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">Logo de l'entreprise</h3>
          <p className="text-sm text-gray-500">Apparaîtra sur toutes vos factures et devis</p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">
              Dimensions recommandées : 400x200px (ratio 2:1) | Max 2MB
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Zone de prévisualisation */}
        {logo ? (
          <div className="relative group">
            <div className="border-2 border-gray-200 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white">
              <img 
                src={logo.url} 
                alt="Logo de l'entreprise" 
                className="max-h-32 max-w-full object-contain mx-auto"
              />
            </div>
            <button
              onClick={handleDelete}
              className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
              title="Supprimer le logo"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Uploadé le {new Date(logo.uploadedAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        ) : (
          <div 
            onClick={handleClick}
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-teal-500 hover:bg-teal-50/30 transition-all group"
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4 group-hover:text-teal-500 transition-colors" />
            <p className="text-gray-600 font-semibold mb-2">Cliquez pour uploader un logo</p>
            <p className="text-xs text-gray-400">PNG, JPG, SVG, WebP • Max 2MB</p>
          </div>
        )}

        {/* Input file caché */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Boutons d'action */}
        <div className="flex gap-3">
          <button
            onClick={handleClick}
            disabled={uploading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:from-teal-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {uploading ? 'Upload en cours...' : logo ? 'Changer le logo' : 'Uploader un logo'}
          </button>
          
          {logo && (
            <button
              onClick={handleDelete}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Supprimer
            </button>
          )}
        </div>

        {/* Messages d'erreur et de succès */}
        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-medium animate-fadeIn">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 text-sm font-medium animate-fadeIn flex items-center gap-2">
            <Check className="w-5 h-5" />
            ✅ Logo enregistré avec succès ! Il apparaîtra sur vos prochaines factures.
          </div>
        )}

        {/* Informations supplémentaires */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-900 mb-2 text-sm flex items-center gap-2">
            💡 Conseils
          </h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Utilisez un logo en haute résolution pour un rendu optimal</li>
            <li>• Format recommandé : PNG avec fond transparent</li>
            <li>• Dimensions idéales : 400x200 pixels minimum</li>
            <li>• Le logo est stocké localement dans votre navigateur</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
