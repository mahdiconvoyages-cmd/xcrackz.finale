import { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: true,
      functional: true,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: false,
      functional: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-white font-bold mb-2">Respect de votre vie privée</h3>
            <p className="text-slate-300 text-sm">
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu.
              Vous pouvez choisir d'accepter tous les cookies ou uniquement les cookies essentiels.
              <a href="/legal" className="text-teal-400 hover:underline ml-1">En savoir plus</a>
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={acceptNecessary}
              className="px-6 py-2 rounded-lg bg-white/5 border border-white/20 text-white hover:bg-white/10 transition font-semibold"
            >
              Nécessaires uniquement
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
