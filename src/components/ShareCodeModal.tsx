import { useState } from 'react';
import { X, Copy, CheckCircle, Share2, QrCode } from 'lucide-react';

interface ShareCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareCode: string;
  missionReference?: string;
}

export default function ShareCodeModal({ 
  isOpen, 
  onClose, 
  shareCode,
  missionReference 
}: ShareCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
    }
  };

  const formatCode = (code: string) => {
    // Format: XZ-ABC-123
    if (code.length === 10 && code.includes('-')) {
      return code;
    }
    // Si pas de tirets, les ajouter
    if (code.length >= 8) {
      return `${code.slice(0, 2)}-${code.slice(2, 5)}-${code.slice(5, 8)}`;
    }
    return code;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Code de partage</h2>
              {missionReference && (
                <p className="text-sm text-slate-600">Mission #{missionReference}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Code Display */}
        <div className="mb-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-600 mb-3 font-medium">
              Partagez ce code avec votre équipe
            </p>
            <div className="text-4xl font-black text-slate-900 tracking-wider font-mono mb-4">
              {formatCode(shareCode)}
            </div>
            <button
              onClick={handleCopy}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transform active:scale-95 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-teal-500/30'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Code copié !
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copier le code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Comment l'utiliser ?
          </h3>
          <ol className="text-sm text-blue-800 space-y-2">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Partagez ce code avec la personne de votre choix</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Elle doit cliquer sur "Rejoindre une mission" dans l'app</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Saisir ce code pour accéder à la mission</span>
            </li>
          </ol>
        </div>

        {/* Footer */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
