// @ts-nocheck
import { useState } from 'react';
import { X, LogIn, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { validateShareCodeInput } from '../lib/shareCode';

interface JoinMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (missionId: string) => void;
}

export default function JoinMissionModal({ isOpen, onClose, onSuccess }: JoinMissionModalProps) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Aucun utilisateur connecté!');
      setError('Vous devez être connecté pour rejoindre une mission');
      return;
    }

    console.log('👤 Utilisateur connecté:', {
      id: user.id,
      email: user.email
    });

    setError('');
    setLoading(true);

    try {
      // Valider le format du code
      const validation = validateShareCodeInput(code);
      
      if (!validation.valid) {
        setError(validation.error || 'Code invalide');
        setLoading(false);
        return;
      }

      const cleanedCode = validation.code!;

      console.log('🔍 Tentative de rejoindre mission:', {
        code: cleanedCode,
        userId: user.id,
        userIdType: typeof user.id
      });

      // Appeler la fonction SQL pour rejoindre la mission
      const bare = cleanedCode.replace(/[^A-Z0-9]/g, '');
      const { data, error: rpcError } = await supabase
        .rpc('claim_mission', {
          p_code: bare,
          p_user_id: user.id
        });

      console.log('📡 Réponse RPC:', { data, error: rpcError });

      if (rpcError) {
        console.error('❌ Erreur RPC:', rpcError);
        throw rpcError;
      }

      // Vérifier le résultat
      if (!data.success) {
        console.warn('⚠️ Échec fonctionnel:', data);
        setError(data.error || data.message || 'Impossible de rejoindre la mission');
        setLoading(false);
        return;
      }

      console.log('✅ Mission rejointe avec succès!', data);

      // Succès!
      setAlreadyJoined(!!data.alreadyJoined);
      setSuccess(true);
      
      // Attendre un peu avant de fermer
      setTimeout(() => {
        if (onSuccess && data.mission) {
          onSuccess(data.mission.id);
        }
        handleClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error joining mission:', error);
      
      // Afficher le message d'erreur détaillé
      let errorMessage = 'Une erreur est survenue';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.details) {
        errorMessage += ': ' + error.details;
      }
      
      if (error.hint) {
        errorMessage += ' (' + error.hint + ')';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    setSuccess(false);
    setAlreadyJoined(false);
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    
    // Auto-formater pendant la saisie
    value = value.replace(/[^A-Z0-9-]/g, '');
    
    // Limiter la longueur
    if (value.length > 10) {
      value = value.slice(0, 10);
    }
    
    setCode(value);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <LogIn className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Rejoindre une mission
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {success ? (
            // Success State
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {alreadyJoined ? 'Déjà présente' : 'Mission ajoutée!'}
              </h3>
              <p className="text-gray-600">
                {alreadyJoined ? 'Cette mission était déjà dans votre liste.' : 'La mission a été ajoutée à votre liste avec succès.'}
              </p>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-4">
                  Entrez le code de mission que vous avez reçu pour y accéder et réaliser l'inspection.
                </p>
                
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium mb-2">
                    📋 Format du code:
                  </p>
                  <p className="text-sm text-blue-700 font-mono font-bold">
                    XZ-ABC-123
                  </p>
                </div>
              </div>

              {/* Code Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Code de mission
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="XZ-ABC-123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-center text-2xl font-mono font-bold tracking-widest uppercase"
                  disabled={loading}
                  autoFocus
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {code.length}/10 caractères
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading || code.replace(/[^A-Z0-9]/g, '').length !== 8}
                  className="flex-1 px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Rejoindre
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Footer Tip */}
        {!success && (
          <div className="px-6 pb-6">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600">
                💡 <span className="font-medium">Astuce:</span> Vous pouvez coller le code directement depuis votre presse-papier.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
