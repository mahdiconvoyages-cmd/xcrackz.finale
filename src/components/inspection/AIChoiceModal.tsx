/**
 * 🤖 Modal de Choix IA pour Inspection
 * 
 * Affiche avant de commencer l'inspection pour proposer l'assistant IA
 * Permet au convoyeur de choisir d'utiliser ou non l'IA (utile pour zones sans réseau)
 */

import { useState } from 'react';
import { X, Sparkles, WifiOff, CheckCircle } from 'lucide-react';

interface AIChoiceModalProps {
  isOpen: boolean;
  onChoice: (useAI: boolean) => void;
  onClose: () => void;
}

export default function AIChoiceModal({ isOpen, onChoice, onClose }: AIChoiceModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedChoice !== null) {
      onChoice(selectedChoice);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 max-w-lg w-full mx-4 overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Assistant IA Gemini
              </h2>
              <p className="text-white/80 text-sm mt-1">
                Optimisez votre inspection avec l'intelligence artificielle
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Question principale */}
          <div className="text-center">
            <p className="text-lg text-slate-200 font-medium">
              Souhaitez-vous activer l'assistant IA pour cette inspection ?
            </p>
            <p className="text-sm text-slate-400 mt-2">
              L'IA vous aidera à détecter les dommages et générer des descriptions automatiques
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Option OUI - Avec IA */}
            <button
              onClick={() => setSelectedChoice(true)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-300 
                ${selectedChoice === true
                  ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                  : 'border-slate-600 bg-slate-800/50 hover:border-green-500/50'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`
                  p-3 rounded-full transition-colors
                  ${selectedChoice === true ? 'bg-green-500' : 'bg-slate-700'}
                `}>
                  <CheckCircle className={`
                    w-6 h-6 
                    ${selectedChoice === true ? 'text-white' : 'text-slate-400'}
                  `} />
                </div>
                
                <div className="text-center">
                  <p className="font-bold text-lg text-white">OUI</p>
                  <p className="text-xs text-slate-400 mt-1">Avec assistance IA</p>
                </div>

                {selectedChoice === true && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-left">
                  <Sparkles className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">Détection automatique des dommages</p>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <Sparkles className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">Descriptions détaillées générées</p>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <Sparkles className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">Recommandations intelligentes</p>
                </div>
              </div>
            </button>

            {/* Option NON - Sans IA */}
            <button
              onClick={() => setSelectedChoice(false)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-300
                ${selectedChoice === false
                  ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
                  : 'border-slate-600 bg-slate-800/50 hover:border-orange-500/50'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`
                  p-3 rounded-full transition-colors
                  ${selectedChoice === false ? 'bg-orange-500' : 'bg-slate-700'}
                `}>
                  <WifiOff className={`
                    w-6 h-6 
                    ${selectedChoice === false ? 'text-white' : 'text-slate-400'}
                  `} />
                </div>
                
                <div className="text-center">
                  <p className="font-bold text-lg text-white">NON</p>
                  <p className="text-xs text-slate-400 mt-1">Mode hors ligne</p>
                </div>

                {selectedChoice === false && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-orange-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-left">
                  <WifiOff className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">Fonctionne sans connexion internet</p>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <WifiOff className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">Inspection manuelle uniquement</p>
                </div>
                <div className="flex items-start gap-2 text-left">
                  <WifiOff className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-300">Idéal pour zones sans réseau</p>
                </div>
              </div>
            </button>

          </div>

          {/* Note importante */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-200 font-medium">
                  💡 Conseil
                </p>
                <p className="text-xs text-blue-300 mt-1">
                  Activez l'IA si vous avez une connexion internet stable. 
                  Sinon, choisissez le mode hors ligne pour éviter les interruptions.
                </p>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedChoice === null}
              className={`
                flex-1 px-6 py-3 rounded-xl font-medium transition-all
                ${selectedChoice !== null
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              Confirmer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
