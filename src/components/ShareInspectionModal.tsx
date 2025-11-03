/**
 * 🔗 Modal de Partage de Rapport d'Inspection
 * 
 * Permet de générer et partager un lien public sécurisé
 */

// @ts-nocheck
import { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Copy, Mail, MessageSquare, Check, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../utils/toast';

interface ShareInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string;
  missionReference: string;
  reportType: 'departure' | 'arrival' | 'complete';
}

export default function ShareInspectionModal({
  isOpen,
  onClose,
  missionId,
  missionReference,
  reportType
}: ShareInspectionModalProps) {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && missionId) {
      generateShareLink();
    }
  }, [isOpen, missionId, reportType]);

  const generateShareLink = async () => {
    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      const { data, error } = await supabase.rpc('create_or_get_inspection_share', {
        p_mission_id: missionId,
        p_user_id: userData.user.id,
        p_report_type: reportType
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setShareUrl(data[0].share_url);
      }
    } catch (error: any) {
      console.error('Erreur génération lien:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erreur de copie');
    }
  };

  const shareViaEmail = () => {
    const subject = `Rapport d'inspection - ${missionReference}`;
    const body = `Bonjour,\n\nVeuillez consulter le rapport d'inspection pour la mission ${missionReference}:\n\n${shareUrl}\n\nCordialement`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareViaWhatsApp = () => {
    const text = `Rapport d'inspection ${missionReference}: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaSMS = () => {
    const text = `Rapport d'inspection ${missionReference}: ${shareUrl}`;
    window.location.href = `sms:?body=${encodeURIComponent(text)}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* En-tête */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LinkIcon className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Partager le Rapport</h2>
                <p className="text-sm text-white/80">Mission {missionReference}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Génération du lien...</p>
            </div>
          ) : (
            <>
              {/* Type de rapport */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium">
                  Type de rapport: <span className="font-bold">
                    {reportType === 'departure' ? 'Départ uniquement' :
                     reportType === 'arrival' ? 'Arrivée uniquement' : 
                     'Complet (Départ + Arrivée)'}
                  </span>
                </p>
              </div>

              {/* URL de partage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lien de partage
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-3 rounded-lg transition-all font-medium ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Ce lien permet de consulter le rapport sans connexion
                </p>
              </div>

              {/* Actions de partage rapide */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Partager via
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={shareViaEmail}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <Mail className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Email</span>
                  </button>

                  <button
                    onClick={shareViaWhatsApp}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                  >
                    <MessageSquare className="w-6 h-6 text-gray-600 group-hover:text-green-600" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">WhatsApp</span>
                  </button>

                  <button
                    onClick={shareViaSMS}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                  >
                    <MessageSquare className="w-6 h-6 text-gray-600 group-hover:text-purple-600" />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-purple-600">SMS</span>
                  </button>
                </div>
              </div>

              {/* Prévisualiser */}
              <div>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  Prévisualiser le rapport
                </a>
              </div>

              {/* Infos */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-900 text-sm mb-2">ℹ️ Informations</h4>
                <ul className="text-xs text-amber-800 space-y-1">
                  <li>• Le lien est permanent et ne nécessite aucune connexion</li>
                  <li>• Le rapport affiché sera toujours à jour</li>
                  <li>• Vous pouvez partager ce lien avec vos clients</li>
                  <li>• Les statistiques de consultation sont disponibles</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Pied de page */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
