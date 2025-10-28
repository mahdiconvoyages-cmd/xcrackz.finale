import { useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';
import { copyShareCode, shareMission, getShareMessage } from '../lib/shareCode';

interface ShareCodeDisplayProps {
  code: string;
  missionTitle?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function ShareCodeDisplay({ 
  code, 
  missionTitle, 
  onClose,
  showCloseButton = false 
}: ShareCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const handleCopy = async () => {
    const success = await copyShareCode(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const success = await shareMission(code, missionTitle);
    if (success) {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-200 shadow-lg relative">
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          🎉 Mission créée avec succès!
        </h3>
        <p className="text-sm text-gray-600">
          Partagez ce code pour qu'un utilisateur puisse rejoindre la mission
        </p>
      </div>

      {/* Code Display */}
      <div className="bg-white rounded-lg p-4 mb-4 border-2 border-dashed border-cyan-300">
        <div className="text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Code de mission
          </p>
          <p className="text-3xl font-bold text-cyan-600 tracking-widest font-mono">
            {code}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          disabled={copied}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-cyan-600 text-white hover:bg-cyan-700 active:scale-95'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Copié!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copier le code
            </>
          )}
        </button>

        <button
          onClick={handleShare}
          disabled={shared}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            shared
              ? 'bg-green-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }`}
        >
          {shared ? (
            <>
              <Check className="w-5 h-5" />
              Partagé!
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Partager
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800 font-medium mb-2">
          📱 Comment l'utilisateur rejoint la mission:
        </p>
        <ol className="text-xs text-blue-700 space-y-1 ml-4">
          <li>1. Ouvre l'app xCrackz</li>
          <li>2. Va dans "Missions"</li>
          <li>3. Clique "Rejoindre une mission"</li>
          <li>4. Entre le code: <span className="font-mono font-bold">{code}</span></li>
        </ol>
      </div>

      {/* Share Message Preview (collapsible) */}
      <details className="mt-4">
        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 font-medium">
          📄 Aperçu du message de partage
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
            {getShareMessage(code, missionTitle)}
          </pre>
        </div>
      </details>
    </div>
  );
}
