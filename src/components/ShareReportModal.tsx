import { useState, useEffect } from 'react';
import { Share2, X, Copy, CheckCircle, Link as LinkIcon, Loader2, MessageCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  missionReference?: string;
  vehicleLabel?: string;
  plate?: string;
}

export default function ShareReportModal({
  isOpen,
  onClose,
  missionId,
  missionReference,
  vehicleLabel,
  plate,
}: ShareReportModalProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && missionId) {
      generateShareLink();
    }
  }, [isOpen, missionId]);

  const generateShareLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_or_update_public_report', {
        p_mission_id: missionId,
      }) as any;

      if (rpcError) throw rpcError;

      if (data?.success) {
        setShareUrl(data.share_url);
      } else {
        throw new Error('Impossible de générer le lien');
      }
    } catch (err: any) {
      console.error('Error generating share link:', err);
      setError(err.message || 'Erreur lors de la génération du lien');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareUrl) return;
    const text = `📋 Rapport d'inspection - ${missionReference || 'Mission'}\n${vehicleLabel ? vehicleLabel + (plate ? ` (${plate})` : '') + '\n' : ''}Consultez le rapport complet : ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    if (!shareUrl) return;
    const subject = `Rapport d'inspection - ${missionReference || 'Mission'}${vehicleLabel ? ' - ' + vehicleLabel : ''}`;
    const body = `Bonjour,\n\nVeuillez consulter le rapport d'inspection complet via ce lien :\n\n${shareUrl}\n\n${missionReference ? `Référence mission : ${missionReference}\n` : ''}${vehicleLabel ? `Véhicule : ${vehicleLabel}${plate ? ` (${plate})` : ''}\n` : ''}\nCordialement,\nFinality Transport`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const shareViaSMS = () => {
    if (!shareUrl) return;
    const text = `Rapport d'inspection ${missionReference ? `- ${missionReference}` : ''}: ${shareUrl}`;
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-teal-600" />
            Partager le rapport
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contexte */}
        {(missionReference || vehicleLabel) && (
          <div className="bg-gradient-to-r from-teal-50 to-sky-50 rounded-xl p-4 mb-4 border border-teal-100">
            <div className="text-sm space-y-1">
              {missionReference && (
                <p className="text-slate-700">
                  <strong className="text-slate-900">Mission:</strong> {missionReference}
                </p>
              )}
              {vehicleLabel && (
                <p className="text-slate-700">
                  <strong className="text-slate-900">Véhicule:</strong> {vehicleLabel}
                  {plate ? ` (${plate})` : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* État de chargement */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-3" />
            <p className="text-slate-600 font-medium">Génération du lien...</p>
          </div>
        )}

        {/* Erreur */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={generateShareLink}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Lien généré */}
        {shareUrl && !loading && (
          <>
            {/* URL */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Lien de partage
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition ${
                    copied
                      ? 'bg-green-500 text-white'
                      : 'bg-teal-500 text-white hover:bg-teal-600'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span className="hidden sm:inline">Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span className="hidden sm:inline">Copier</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Ce lien est public et accessible sans connexion. Il se met à jour automatiquement quand l'inspection d'arrivée est ajoutée.
              </p>
            </div>

            {/* Actions de partage */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700 mb-3">Partager via</p>

              <button
                onClick={shareViaWhatsApp}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition group"
              >
                <MessageCircle className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                <span className="font-semibold text-green-700 group-hover:text-green-800">
                  WhatsApp
                </span>
              </button>

              <button
                onClick={shareViaEmail}
                className="w-full flex items-center gap-3 px-4 py-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition group"
              >
                <Mail className="w-5 h-5 text-sky-600 group-hover:text-sky-700" />
                <span className="font-semibold text-sky-700 group-hover:text-sky-800">
                  Email
                </span>
              </button>

              <button
                onClick={shareViaSMS}
                className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition group"
              >
                <MessageCircle className="w-5 h-5 text-purple-600 group-hover:text-purple-700" />
                <span className="font-semibold text-purple-700 group-hover:text-purple-800">
                  SMS
                </span>
              </button>
            </div>

            {/* Note */}
            <div className="mt-4 bg-teal-50 border border-teal-100 rounded-lg p-3">
              <p className="text-xs text-teal-700">
                💡 <strong>Astuce:</strong> Le client pourra consulter le rapport et télécharger toutes les photos en ZIP directement depuis ce lien.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
