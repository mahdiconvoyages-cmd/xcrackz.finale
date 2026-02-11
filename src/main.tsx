import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import './styles/accessibility-simple.css';
import { errorLogger, showStoredErrors } from './utils/errorLogger';

// Initialiser Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: 0.2, // 20% des transactions
    // Session Replay
    replaysSessionSampleRate: 0.05, // 5% des sessions
    replaysOnErrorSampleRate: 1.0, // 100% des erreurs
  });
  console.log('✅ Sentry initialisé avec succès');
}

// Initialiser le logger d'erreurs
errorLogger;

// Afficher les erreurs précédentes en console
if (import.meta.env.DEV) {
  showStoredErrors();
}

// Fallback si l'app ne se monte pas
const mountTimeout = setTimeout(() => {
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    console.error('🔴 L\'application ne s\'est pas montée correctement');
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        color: white;
        padding: 20px;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
      ">
        <div style="
          background: rgba(220, 38, 38, 0.1);
          border: 2px solid #dc2626;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
        ">
          <h1 style="font-size: 48px; margin: 0 0 16px 0;">⚠️</h1>
          <h2 style="font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
            Erreur de chargement
          </h2>
          <p style="font-size: 16px; opacity: 0.9; margin: 0 0 24px 0; line-height: 1.6;">
            L'application n'a pas pu démarrer correctement.
            Veuillez vider le cache et recharger la page.
          </p>
          <button 
            onclick="localStorage.clear(); location.reload();"
            style="
              background: #dc2626;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              margin-right: 8px;
            "
          >
            Vider le cache et recharger
          </button>
          <button 
            onclick="location.reload();"
            style="
              background: rgba(255, 255, 255, 0.1);
              color: white;
              border: 1px solid rgba(255, 255, 255, 0.2);
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            Recharger
          </button>
        </div>
      </div>
    `;
  }
}, 5000); // 5 secondes timeout

try {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Element #root introuvable dans le DOM');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  // L'app s'est montée correctement, annuler le timeout
  clearTimeout(mountTimeout);
  console.log('✅ Application montée avec succès');
} catch (error) {
  console.error('🔴 Erreur critique lors du montage:', error);
  clearTimeout(mountTimeout);
  
  // Afficher un message d'erreur immédiatement
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        color: white;
        padding: 20px;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
      ">
        <div style="
          background: rgba(220, 38, 38, 0.1);
          border: 2px solid #dc2626;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
        ">
          <h1 style="font-size: 48px; margin: 0 0 16px 0;">❌</h1>
          <h2 style="font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">
            Erreur fatale
          </h2>
          <p style="font-size: 16px; opacity: 0.9; margin: 0 0 16px 0; line-height: 1.6;">
            ${(error as Error).message}
          </p>
          <details style="
            text-align: left;
            background: rgba(0, 0, 0, 0.3);
            padding: 12px;
            border-radius: 8px;
            margin: 16px 0;
            font-family: monospace;
            font-size: 12px;
          ">
            <summary style="cursor: pointer; margin-bottom: 8px;">Détails techniques</summary>
            <pre style="margin: 0; white-space: pre-wrap;">${(error as Error).stack}</pre>
          </details>
          <button 
            onclick="localStorage.clear(); location.reload();"
            style="
              background: #dc2626;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            Vider le cache et recharger
          </button>
        </div>
      </div>
    `;
  }
}

// Enregistrer le Service Worker pour la PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré:', registration.scope);
        
        // Forcer mise à jour immédiate
        registration.update();
        
        // Écouter les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouvelle version disponible
                console.log('🔄 Nouvelle version détectée, rechargement...');
                
                // Afficher notification
                const notification = document.createElement('div');
                notification.innerHTML = `
                  <div style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #14b8a6, #0d9488);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    z-index: 999999;
                    font-weight: 600;
                    animation: slideIn 0.3s ease-out;
                  ">
                    🚀 Nouvelle version disponible!<br>
                    <small style="opacity: 0.9;">Rechargement automatique...</small>
                  </div>
                  <style>
                    @keyframes slideIn {
                      from { transform: translateX(400px); opacity: 0; }
                      to { transform: translateX(0); opacity: 1; }
                    }
                  </style>
                `;
                document.body.appendChild(notification);
                
                // Recharger après 2 secondes
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
            });
          }
        });
        
        // Vérifier les mises à jour toutes les 5 minutes
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      })
      .catch((error) => {
        console.error('❌ Erreur Service Worker:', error);
      });
  });
}
