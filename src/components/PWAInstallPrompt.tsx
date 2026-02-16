/**
 * Composant PWA Install Prompt - Version Minimaliste
 * Toast balayable pour installer l'application sur mobile/desktop
 */

import { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Vérifier si déjà installé
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Vérifier si déjà refusé récemment (7 jours)
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Afficher le prompt après 5 secondes
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Détecter l'installation réussie
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Gestion du swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Permettre seulement le swipe vers la droite
    if (diff > 0) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    // Si swipé plus de 100px, fermer
    if (swipeOffset > 100) {
      handleDismiss();
    } else {
      setSwipeOffset(0);
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA installée');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      setShowPrompt(false);
      setIsDismissing(false);
      setSwipeOffset(0);
      localStorage.setItem('pwa-dismissed', Date.now().toString());
    }, 300);
  };

  // Ne rien afficher si déjà installé ou pas de prompt
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      ref={toastRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-auto md:max-w-xs z-50 transition-all duration-300 ${
        isDismissing ? 'opacity-0 translate-x-full' : 'opacity-100'
      }`}
      style={{
        transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
        opacity: swipeOffset > 0 ? Math.max(0, 1 - swipeOffset / 150) : undefined
      }}
    >
      <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          {/* Icône */}
          <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/30">
            <Download className="w-4 h-4" />
          </div>
          
          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Installer CHECKSFLEET</p>
            <p className="text-xs text-slate-400 hidden md:block">Accès rapide • Hors ligne</p>
          </div>
          
          {/* Boutons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-xs font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg shadow-teal-500/20"
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Indicateur de swipe sur mobile */}
        <div className="md:hidden h-0.5 bg-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-100"
            style={{ width: `${Math.min(100, (swipeOffset / 100) * 100)}%` }}
          />
        </div>
      </div>
      
      {/* Hint swipe sur mobile */}
      <p className="md:hidden text-center text-[10px] text-slate-500 mt-1">
        Balayer pour fermer →
      </p>
    </div>
  );
}
