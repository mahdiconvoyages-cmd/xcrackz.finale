/**
 * Système de logging d'erreurs pour diagnostic
 * Capture les erreurs JavaScript sur mobile
 */

interface ErrorLog {
  type: 'error' | 'unhandledRejection' | 'chunkLoadError';
  message: string;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
}

class ErrorLogger {
  private static instance: ErrorLogger;
  private errors: ErrorLog[] = [];
  private MAX_ERRORS = 50;

  private constructor() {
    this.setupErrorHandlers();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  private setupErrorHandlers() {
    // Erreurs JavaScript globales
    window.addEventListener('error', (event) => {
      console.error('🔴 Global Error:', event.error);
      this.logError({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });

    // Promesses rejetées non gérées
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🔴 Unhandled Promise Rejection:', event.reason);
      this.logError({
        type: 'unhandledRejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    });
  }

  private logError(error: ErrorLog) {
    this.errors.push(error);
    
    // Limiter le nombre d'erreurs stockées
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors.shift();
    }

    // Stocker dans localStorage pour debug
    try {
      localStorage.setItem('app_errors', JSON.stringify(this.errors));
    } catch (e) {
      console.error('Impossible de stocker les erreurs:', e);
    }

    // Afficher dans la console
    this.displayErrorOverlay(error);
  }

  private displayErrorOverlay(error: ErrorLog) {
    // En développement, afficher une overlay d'erreur
    if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        right: 10px;
        background: #dc2626;
        color: white;
        padding: 16px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-height: 200px;
        overflow: auto;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      `;
      
      overlay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px;">⚠️ ${error.type}</div>
        <div style="margin-bottom: 4px;">${error.message}</div>
        ${error.stack ? `<pre style="font-size: 10px; margin-top: 8px; opacity: 0.8; white-space: pre-wrap;">${error.stack.slice(0, 500)}</pre>` : ''}
        <button onclick="this.parentElement.remove()" style="margin-top: 8px; padding: 4px 8px; background: white; color: #dc2626; border: none; border-radius: 4px; cursor: pointer;">
          Fermer
        </button>
      `;
      
      document.body.appendChild(overlay);
      
      // Auto-fermer après 10 secondes
      setTimeout(() => overlay.remove(), 10000);
    }
  }

  getErrors(): ErrorLog[] {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('app_errors');
  }

  // Vérifier les erreurs stockées
  static checkStoredErrors(): ErrorLog[] {
    try {
      const stored = localStorage.getItem('app_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
}

// Initialiser le logger au démarrage
export const errorLogger = ErrorLogger.getInstance();

// Fonction utilitaire pour afficher les erreurs stockées
export function showStoredErrors() {
  const errors = ErrorLogger.checkStoredErrors();
  if (errors.length > 0) {
    console.group('📋 Erreurs stockées (' + errors.length + ')');
    errors.forEach((error, i) => {
      console.log(`\n${i + 1}. [${error.type}] ${new Date(error.timestamp).toLocaleString()}`);
      console.log('   Message:', error.message);
      if (error.stack) console.log('   Stack:', error.stack);
    });
    console.groupEnd();
  }
  return errors;
}
