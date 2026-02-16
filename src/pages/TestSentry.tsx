import { useState } from 'react';
import * as Sentry from '@sentry/react';

/**
 * Page de test pour Sentry
 * Pour tester: Va sur /test-sentry et clique sur les boutons
 */
export default function TestSentry() {
  const [count, setCount] = useState(0);

  const throwError = () => {
    throw new Error('🧪 Test Sentry - Erreur volontaire pour tester le monitoring');
  };

  const logError = () => {
    Sentry.captureException(new Error('🧪 Erreur capturée manuellement'));
    alert('Erreur envoyée à Sentry! Va voir sur sentry.io');
  };

  const logMessage = () => {
    Sentry.captureMessage('🧪 Message de test depuis Finality', 'info');
    alert('Message envoyé à Sentry! Va voir sur sentry.io');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🧪 Test Sentry
          </h1>
          <p className="text-slate-600 mb-8">
            Clique sur les boutons pour tester le monitoring d'erreurs
          </p>

          <div className="space-y-4">
            {/* Test 1: Erreur qui crash */}
            <div className="border-2 border-red-200 rounded-xl p-6 bg-red-50">
              <h3 className="text-xl font-bold text-red-900 mb-2">
                1. Erreur qui crash l'app
              </h3>
              <p className="text-red-700 mb-4">
                Déclenche une vraie erreur JavaScript (sera capturée par ErrorBoundary)
              </p>
              <button
                onClick={throwError}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition"
              >
                💥 Throw Error
              </button>
            </div>

            {/* Test 2: Erreur capturée */}
            <div className="border-2 border-orange-200 rounded-xl p-6 bg-orange-50">
              <h3 className="text-xl font-bold text-orange-900 mb-2">
                2. Erreur capturée (sans crash)
              </h3>
              <p className="text-orange-700 mb-4">
                Envoie une erreur à Sentry sans crasher l'app
              </p>
              <button
                onClick={logError}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition"
              >
                🔶 Log Error
              </button>
            </div>

            {/* Test 3: Message simple */}
            <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                3. Message de log
              </h3>
              <p className="text-blue-700 mb-4">
                Envoie un message informatif à Sentry
              </p>
              <button
                onClick={logMessage}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                💬 Log Message
              </button>
            </div>

            {/* Test 4: Compteur normal */}
            <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50">
              <h3 className="text-xl font-bold text-green-900 mb-2">
                4. Fonctionnement normal
              </h3>
              <p className="text-green-700 mb-4">
                Compteur: {count} (aucune erreur)
              </p>
              <button
                onClick={() => setCount(count + 1)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
              >
                ✅ Incrémenter ({count})
              </button>
            </div>
          </div>

          <div className="mt-8 p-6 bg-slate-100 rounded-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              📊 Comment voir les erreurs sur Sentry:
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-700">
              <li>Va sur <a href="https://sentry.io" target="_blank" className="text-blue-600 underline">sentry.io</a></li>
              <li>Clique sur ton projet "finality-web"</li>
              <li>Tu verras les erreurs dans "Issues"</li>
              <li>Clique sur une erreur pour voir les détails</li>
            </ol>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
