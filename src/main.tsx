import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/accessibility-simple.css';
import { errorLogger, showStoredErrors } from './utils/errorLogger';

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
        
        // Vérifier les mises à jour toutes les heures
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('❌ Erreur Service Worker:', error);
      });
  });
}
