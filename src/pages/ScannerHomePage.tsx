/**
 * 🏠 PAGE D'ACCUEIL SCANNER - Design Moderne
 * 
 * Interface épurée et intuitive pour scanner des documents
 * - Capture photo native
 * - Upload de fichiers
 * - Accès rapide aux documents cloud
 */

import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload,
  FolderOpen, 
  Zap,
  Sparkles,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ScannerHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Rediriger vers scanner-pro avec le fichier
    const reader = new FileReader();
    reader.onload = () => {
      navigate('/scanner-pro', { state: { imageUrl: reader.result, fromCamera: true } });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Rediriger vers scanner-pro avec le fichier
    const reader = new FileReader();
    reader.onload = () => {
      navigate('/scanner-pro', { state: { imageUrl: reader.result, fromUpload: true } });
    };
    reader.readAsDataURL(file);
  };

  const features = [
    {
      icon: Zap,
      title: 'Détection Auto',
      description: 'Reconnaissance intelligente des bordures'
    },
    {
      icon: Sparkles,
      title: 'Filtres Pro',
      description: 'N&B, Gris, Couleur haute qualité'
    },
    {
      icon: FileText,
      title: 'Export Multi',
      description: 'JPG, PDF, Partage instantané'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-xl opacity-50 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                <Camera className="w-12 h-12 text-white" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-white">
                Scanner Pro
              </h1>
              <p className="text-blue-200 text-lg">
                Numérisez en haute qualité
              </p>
            </div>
          </div>

          {/* Features Cards */}
          <div className="grid grid-cols-3 gap-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mx-auto group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
                      <Icon className="w-6 h-6 text-blue-300 group-hover:text-blue-200 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-semibold">
                        {feature.title}
                      </h3>
                      <p className="text-blue-300/70 text-xs mt-1">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary: Capture Photo */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="group relative w-full overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 opacity-100 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
              
              <div className="relative px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      Prendre une photo
                    </div>
                    <div className="text-blue-100 text-sm">
                      Appareil photo natif
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Secondary: Upload File */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group w-full px-6 py-5 bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                    <Upload className="w-7 h-7 text-blue-300 group-hover:text-blue-200 transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      Importer un fichier
                    </div>
                    <div className="text-blue-200 text-sm">
                      JPG, PNG ou PDF
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Mes Documents Cloud */}
            <button
              onClick={() => navigate('/mes-documents')}
              className="group w-full px-6 py-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <FolderOpen className="w-7 h-7 text-emerald-300 group-hover:text-emerald-200 transition-colors" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      Mes numérisations
                    </div>
                    <div className="text-emerald-200 text-sm">
                      Documents synchronisés
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-emerald-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Footer Info */}
          <div className="pt-4 text-center">
            <p className="text-blue-300/60 text-sm">
              {user ? `Connecté: ${user.email}` : 'Mode invité'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
