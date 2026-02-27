import { useState, useEffect } from 'react';
import { Download, Smartphone, Apple, PlayCircle, FileDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MobileDownload() {
  const [downloading, setDownloading] = useState(false);
  const [latestVersion, setLatestVersion] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Charger la dernière version depuis Supabase
  useEffect(() => {
    loadLatestVersion();
  }, []);

  const loadLatestVersion = async () => {
    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('is_active', true)
        .order('version_code', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setLatestVersion(data);
    } catch (error) {
      console.error('Error loading latest version:', error);
    } finally {
      setLoading(false);
    }
  };

  // URLs de téléchargement
  const ENV_APK_URL = import.meta.env.VITE_ANDROID_APK_URL as string | undefined;
  const ENV_ANDROID_VERSION = (import.meta.env.VITE_ANDROID_VERSION as string | undefined) || '6.0.0';

  // Utiliser la version depuis Supabase si disponible, sinon fallback
  const ANDROID_APK_URL = latestVersion?.apk_url || ENV_APK_URL || 'https://expo.dev/artifacts/eas/qteFd2oCGibKVEaNE9hLKD.apk';
  const VERSION = latestVersion?.version_name || ENV_ANDROID_VERSION;

  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.checksfleet.app'; // À publier

  const handleDownloadAPK = async () => {
    setDownloading(true);
    try {
      // Incrémenter le compteur de téléchargements
      if (latestVersion?.id) {
        await supabase
          .from('app_versions')
          .update({ download_count: (latestVersion.download_count || 0) + 1 })
          .eq('id', latestVersion.id);
      }

      // Télécharger le fichier
      const link = document.createElement('a');
      link.href = ANDROID_APK_URL;
      link.download = 'CHECKSFLEET.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => setDownloading(false), 2000);
    } catch (error) {
      console.error('Erreur téléchargement:', error);
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/20 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-3xl mb-6 shadow-2xl">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Application Mobile
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Téléchargez l'application CHECKSFLEET sur votre smartphone pour gérer vos missions en déplacement
          </p>
        </div>

        {/* Cards de téléchargement */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Android */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <PlayCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">Android</h2>
                <p className="text-sm text-slate-600">Version {VERSION}</p>
              </div>
            </div>

            <p className="text-slate-600 mb-6">
              Compatible avec Android 8.0 et versions ultérieures
            </p>

            {latestVersion?.release_notes && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Notes de version
                </h3>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                  {latestVersion.release_notes}
                </pre>
              </div>
            )}

            {/* Téléchargement direct APK */}
            <button
              onClick={handleDownloadAPK}
              disabled={downloading}
              className="w-full mb-4 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Téléchargement...
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5" />
                  Télécharger APK
                </>
              )}
            </button>

            {/* Lien direct de secours */}
            <a
              href={ANDROID_APK_URL}
              className="block text-center text-sm text-slate-600 underline hover:text-slate-800 mb-2"
              download
            >
              Lien direct de téléchargement APK
            </a>

            {/* Google Play Store (à venir) */}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all duration-300 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <PlayCircle className="w-5 h-5" />
                Google Play Store
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  Bientôt
                </span>
              </div>
            </a>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Installation APK
              </p>
              <ol className="text-xs text-blue-800 space-y-1 ml-6 list-decimal">
                <li>Autoriser les sources inconnues dans les paramètres</li>
                <li>Télécharger le fichier APK</li>
                <li>Ouvrir le fichier et installer</li>
              </ol>
            </div>
          </div>

          {/* iOS – App Store bientôt */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Apple className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900">iOS / iPhone</h2>
                <p className="text-sm text-slate-500">Bientôt disponible</p>
              </div>
            </div>

            <p className="text-slate-600 mb-6">
              L'application iOS native est en cours de développement et sera disponible prochainement sur l'App Store.
            </p>

            {/* App Store (à venir) */}
            <div className="w-full px-6 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-center cursor-not-allowed">
              <div className="flex items-center justify-center gap-2">
                <Apple className="w-5 h-5" />
                App Store
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                  Bientôt
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Vous serez notifié dès la disponibilité sur l'App Store.
              </p>
            </div>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
          <h3 className="text-2xl font-black text-slate-900 mb-6 text-center">
            Fonctionnalités de l'application mobile
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: CheckCircle2, text: 'Gestion des missions en temps réel' },
              { icon: CheckCircle2, text: 'Suivi GPS des véhicules' },
              { icon: CheckCircle2, text: 'Rapports d\'inspection avec photos' },
              { icon: CheckCircle2, text: 'Facturation et devis' },
              { icon: CheckCircle2, text: 'Messagerie instantanée' },
              { icon: CheckCircle2, text: 'Notifications push' },
              { icon: CheckCircle2, text: 'Mode hors ligne' },
              { icon: CheckCircle2, text: 'Synchronisation automatique' },
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
                <feature.icon className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-700">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            Besoin d'aide ? Contactez notre{' '}
            <a href="/support" className="text-teal-600 hover:text-teal-700 font-bold underline">
              support client
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
