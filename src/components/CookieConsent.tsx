import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'cookie-consent';
const THIRTEEN_MONTHS_MS = 13 * 30 * 24 * 60 * 60 * 1000; // ~13 mois (CNIL)

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) {
      setShowBanner(true);
      return;
    }
    try {
      const consent = JSON.parse(raw);
      // Vérifier l'expiration de 13 mois (CNIL)
      if (consent.timestamp) {
        const elapsed = Date.now() - new Date(consent.timestamp).getTime();
        if (elapsed > THIRTEEN_MONTHS_MS) {
          localStorage.removeItem(COOKIE_CONSENT_KEY);
          setShowBanner(true);
        }
      }
    } catch {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (analytics: boolean, functional: boolean) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      necessary: true,
      analytics,
      functional,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptAll = () => saveConsent(true, true);
  const rejectAll = () => saveConsent(false, false);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2">Respect de votre vie privée</h3>
            <p className="text-slate-300 text-sm">
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu.
              Vous pouvez accepter, refuser ou gérer vos préférences.
              <a href="/legal/cookie-policy" className="text-teal-400 hover:underline ml-1">Gérer mes préférences</a>
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={rejectAll}
              className="px-6 py-2 rounded-lg bg-white/5 border border-white/20 text-white hover:bg-white/10 transition font-semibold"
            >
              Tout refuser
            </button>
            <button
              onClick={acceptAll}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition"
            >
              Tout accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
