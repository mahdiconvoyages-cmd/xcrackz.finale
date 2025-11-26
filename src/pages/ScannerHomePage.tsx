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
  FileText,
  ScanLine
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20 p-4 md:p-6 space-y-6">
      {/* Header unifié */}
      <PageHeader
        title="Scanner Documents"
        description="Numérisez vos documents en haute qualité"
        icon={ScanLine}
      />

      {/* Content Container */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Hero Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 rounded-3xl p-8 shadow-2xl">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -top-32 -left-32 animate-pulse" />
            <div className="absolute w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -bottom-32 -right-32 animate-pulse" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-xl opacity-50 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Camera className="w-12 h-12 text-white" />
              </div>
            </div>
            
            {/* Text */}
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl font-black text-white mb-2">
                Scanner Pro
              </h2>
              <p className="text-blue-200 text-lg max-w-md">
                Capturez, optimisez et exportez vos documents avec des outils professionnels
              </p>
            </div>
          </div>
        </div>

        {/* Features Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-teal-500/30 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 text-lg font-bold">
                      {feature.title}
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary: Capture Photo */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 p-1 shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-bold text-lg">
                      Prendre une photo
                    </div>
                    <div className="text-teal-100 text-sm">
                      Appareil photo natif
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Secondary: Upload File */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group w-full px-6 py-5 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-teal-400 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center group-hover:from-teal-100 group-hover:to-cyan-100 transition-all">
                  <Upload className="w-7 h-7 text-slate-600 group-hover:text-teal-600 transition-colors" />
                </div>
                <div className="text-left">
                  <div className="text-slate-900 font-bold text-lg">
                    Importer un fichier
                  </div>
                  <div className="text-slate-500 text-sm">
                    JPG, PNG ou PDF
                  </div>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
            </div>
          </button>
        </div>

        {/* Mes Documents Cloud */}
        <button
          onClick={() => navigate('/mes-documents')}
          className="group w-full px-6 py-5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <FolderOpen className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <div className="text-slate-900 font-bold text-lg">
                  Mes numérisations
                </div>
                <div className="text-emerald-600 text-sm">
                  Documents synchronisés dans le cloud
                </div>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-emerald-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

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
      </div>
    </div>
  );
}
