import { ArrowLeft, Cookie, Settings, Eye, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

export default function CookiePolicy() {
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true, // Toujours actifs
    functional: true,
    analytics: false,
    marketing: false,
  });

  const handleSavePreferences = () => {
    // Sauvegarder dans localStorage
    localStorage.setItem('cookie_preferences', JSON.stringify(cookiePreferences));
    alert('✅ Vos préférences ont été enregistrées');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Cookie className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Politique de Cookies
              </h1>
              <p className="text-slate-600 text-lg">Dernière mise à jour : 15 octobre 2025</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-8 shadow-xl space-y-8">
          
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-slate-900">Qu'est-ce qu'un cookie ?</h2>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>
                Un <strong>cookie</strong> est un petit fichier texte déposé sur votre appareil (ordinateur, smartphone, tablette)
                lorsque vous visitez un site web. Les cookies permettent de mémoriser vos préférences et d'améliorer
                votre expérience de navigation.
              </p>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                <p className="font-semibold text-orange-900">🍪 Sur ChecksFleet, nous utilisons des cookies pour :</p>
                <ul className="text-sm list-disc list-inside space-y-1 mt-2">
                  <li>Maintenir votre session connectée</li>
                  <li>Mémoriser vos préférences (langue, thème, IA activée/désactivée)</li>
                  <li>Analyser l'utilisation de la plateforme (statistiques anonymes)</li>
                  <li>Améliorer la sécurité et prévenir les fraudes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Types de cookies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-slate-900">Types de Cookies Utilisés</h2>
            </div>
            <div className="space-y-4">
              
              {/* Cookies essentiels */}
              <div className="border-2 border-green-300 rounded-xl p-5 bg-green-50">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-bold text-green-900">1. Cookies Essentiels (Obligatoires)</h3>
                </div>
                <p className="text-slate-700 mb-3">
                  Ces cookies sont indispensables au fonctionnement de la plateforme. Ils ne peuvent pas être désactivés.
                </p>
                <div className="bg-white border border-green-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">sb-access-token</p>
                      <p className="text-sm text-slate-600">Authentification Supabase</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">7 jours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">sb-refresh-token</p>
                      <p className="text-sm text-slate-600">Renouvellement de session</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">30 jours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">csrf_token</p>
                      <p className="text-sm text-slate-600">Protection contre les attaques CSRF</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">Session</span>
                  </div>
                </div>
              </div>

              {/* Cookies fonctionnels */}
              <div className="border-2 border-blue-300 rounded-xl p-5 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-blue-900">2. Cookies Fonctionnels</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cookiePreferences.functional}
                      onChange={(e) => setCookiePreferences({ ...cookiePreferences, functional: e.target.checked })}
                      className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-blue-900">Activer</span>
                  </label>
                </div>
                <p className="text-slate-700 mb-3">
                  Ces cookies permettent d'améliorer votre expérience en mémorisant vos choix et préférences.
                </p>
                <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">user_preferences</p>
                      <p className="text-sm text-slate-600">Thème, langue, paramètres</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">1 an</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">tour_completed</p>
                      <p className="text-sm text-slate-600">Tutoriel d'introduction vu</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Permanent</span>
                  </div>
                </div>
              </div>

              {/* Cookies analytiques */}
              <div className="border-2 border-purple-300 rounded-xl p-5 bg-purple-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Eye className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-bold text-purple-900">3. Cookies Analytiques (Statistiques)</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cookiePreferences.analytics}
                      onChange={(e) => setCookiePreferences({ ...cookiePreferences, analytics: e.target.checked })}
                      className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-semibold text-purple-900">Activer</span>
                  </label>
                </div>
                <p className="text-slate-700 mb-3">
                  Ces cookies nous aident à comprendre comment vous utilisez la plateforme (pages visitées, temps passé, fonctionnalités utilisées).
                  Les données sont anonymisées.
                </p>
                <div className="bg-white border border-purple-200 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">_ga</p>
                      <p className="text-sm text-slate-600">Google Analytics (utilisateur unique)</p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full">2 ans</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">_ga_[ID]</p>
                      <p className="text-sm text-slate-600">Google Analytics (état de session)</p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full">2 ans</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">usage_stats</p>
                      <p className="text-sm text-slate-600">Statistiques d'utilisation internes</p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full">1 an</span>
                  </div>
                </div>
              </div>

              {/* Cookies marketing */}
              <div className="border-2 border-pink-300 rounded-xl p-5 bg-pink-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-pink-600" />
                    <h3 className="text-xl font-bold text-pink-900">4. Cookies Marketing (Publicité)</h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cookiePreferences.marketing}
                      onChange={(e) => setCookiePreferences({ ...cookiePreferences, marketing: e.target.checked })}
                      className="w-5 h-5 rounded border-pink-300 text-pink-600 focus:ring-pink-500"
                    />
                    <span className="text-sm font-semibold text-pink-900">Activer</span>
                  </label>
                </div>
                <p className="text-slate-700 mb-3">
                  <strong>Actuellement, nous n'utilisons PAS de cookies marketing ou publicitaires.</strong>
                  ChecksFleet ne diffuse pas de publicité et ne partage pas vos données avec des annonceurs.
                </p>
                <div className="bg-white border border-pink-200 rounded-lg p-4">
                  <p className="text-sm text-slate-600 italic">Aucun cookie marketing actif pour le moment.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Gestion des cookies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-slate-900">Gestion de vos Cookies</h2>
            </div>
            <div className="text-slate-700 space-y-4">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-6">
                <p className="font-bold text-lg mb-3">⚙️ Personnaliser vos préférences</p>
                <p className="mb-4">
                  Vous pouvez activer ou désactiver les cookies non essentiels ci-dessus. Vos choix seront enregistrés.
                </p>
                <button
                  onClick={handleSavePreferences}
                  className="bg-white text-orange-600 font-bold px-6 py-3 rounded-lg hover:bg-orange-50 transition shadow-lg flex items-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Enregistrer mes préférences
                </button>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="font-semibold text-blue-900 mb-2">🌐 Paramètres du navigateur</p>
                <p className="text-sm mb-2">
                  Vous pouvez également gérer ou supprimer les cookies directement dans votre navigateur :
                </p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li><strong>Chrome :</strong> Paramètres → Confidentialité et sécurité → Cookies</li>
                  <li><strong>Firefox :</strong> Paramètres → Vie privée et sécurité → Cookies</li>
                  <li><strong>Safari :</strong> Préférences → Confidentialité → Cookies</li>
                  <li><strong>Edge :</strong> Paramètres → Cookies et autorisations de site</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="font-semibold text-yellow-900 mb-2">⚠️ Attention</p>
                <p className="text-sm">
                  Si vous bloquez tous les cookies, certaines fonctionnalités de ChecksFleet ne seront plus disponibles
                  (connexion automatique, sauvegarde des préférences, etc.).
                </p>
              </div>
            </div>
          </section>

          {/* Cookies tiers */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-slate-900">Services Tiers</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>ChecksFleet utilise des services tiers qui peuvent déposer leurs propres cookies :</p>
              
              <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">🔐 Supabase (Authentification)</p>
                    <a
                      href="https://supabase.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Politique de confidentialité →
                    </a>
                  </div>
                  <p className="text-sm text-slate-600">Gestion des sessions utilisateurs</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">🤖 Google Cloud (IA Gemini)</p>
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Politique de confidentialité →
                    </a>
                  </div>
                  <p className="text-sm text-slate-600">Analyses d'images pour inspections</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">📊 Google Analytics (Optionnel)</p>
                    <a
                      href="https://policies.google.com/technologies/cookies"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Politique cookies →
                    </a>
                  </div>
                  <p className="text-sm text-slate-600">Statistiques d'utilisation (anonymisées)</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">💳 Stripe (Paiements)</p>
                    <a
                      href="https://stripe.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Politique de confidentialité →
                    </a>
                  </div>
                  <p className="text-sm text-slate-600">Traitement sécurisé des paiements</p>
                </div>
              </div>
            </div>
          </section>

          {/* Conformité RGPD */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-2xl font-bold text-slate-900">Conformité RGPD</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Conformément au <strong>Règlement Général sur la Protection des Données (RGPD)</strong> et à la
                directive ePrivacy, nous vous informons de l'utilisation de cookies et recueillons votre consentement
                pour les cookies non essentiels.
              </p>
              <p>
                Pour plus d'informations sur le traitement de vos données personnelles, consultez notre
                <Link to="/legal/privacy-policy" className="text-blue-600 hover:underline font-semibold ml-1">
                  Politique de Confidentialité
                </Link>.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4">Contact</h2>
            <div className="space-y-2">
              <p className="text-lg">Pour toute question concernant les cookies :</p>
              <p className="font-bold text-xl">📧 contact@checksfleet.com</p>
              <p>📞 +33 6 83 39 74 61</p>
            </div>
          </section>

          {/* Récapitulatif */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6">
            <h3 className="font-bold text-lg text-green-900 mb-3">📊 Récapitulatif de vos choix actuels :</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Cookies essentiels : <strong>Actifs</strong> (obligatoires)</span>
              </div>
              <div className="flex items-center gap-2">
                {cookiePreferences.functional ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-slate-700">
                  Cookies fonctionnels : <strong>{cookiePreferences.functional ? 'Actifs' : 'Désactivés'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cookiePreferences.analytics ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-slate-700">
                  Cookies analytiques : <strong>{cookiePreferences.analytics ? 'Actifs' : 'Désactivés'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cookiePreferences.marketing ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-slate-700">
                  Cookies marketing : <strong>{cookiePreferences.marketing ? 'Actifs' : 'Désactivés'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
