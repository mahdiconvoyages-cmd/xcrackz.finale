import React from 'react';
import { ShoppingCart, X, Coins } from 'lucide-react';

interface BuyCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
  requiredCredits: number;
  action?: string;
}

export default function BuyCreditModal({
  isOpen,
  onClose,
  currentCredits,
  requiredCredits,
  action = "effectuer cette action"
}: BuyCreditModalProps) {
  if (!isOpen) return null;

  const missingCredits = Math.max(0, requiredCredits - currentCredits);

  const handleBuyCredits = () => {
    window.location.href = '/boutique';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Crédits insuffisants</h2>
                <p className="text-white/90 text-sm">Rechargez pour continuer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Solde actuel</p>
                <p className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <Coins className="w-8 h-8 text-orange-500" />
                  {currentCredits}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Requis</p>
                <p className="text-3xl font-bold text-red-600">{requiredCredits}</p>
              </div>
            </div>
            
            {missingCredits > 0 && (
              <div className="bg-red-100 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <Coins className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">
                  <span className="font-bold">Il vous manque {missingCredits} crédit{missingCredits > 1 ? 's' : ''}</span> pour {action}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-slate-900 text-sm">💡 Tarification</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-xs">1</span>
                <span>Créer une mission</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">2</span>
                <span>Publier un trajet de covoiturage</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">2</span>
                <span>Réserver une place en covoiturage</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs">0</span>
                <span>Inspections (incluses avec la mission)</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={handleBuyCredits}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              Acheter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
