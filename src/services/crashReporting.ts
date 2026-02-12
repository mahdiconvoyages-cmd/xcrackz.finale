// Service de crash reporting
// Prêt pour intégration Sentry

interface ErrorContext {
  screen?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

interface CrashReport {
  error: Error;
  context: ErrorContext;
  timestamp: number;
  deviceInfo?: any;
}

class CrashReportingService {
  private crashes: CrashReport[] = [];
  private userId: string | null = null;

  /**
   * Initialise le service
   */
  async init() {
    // TODO: Initialiser Sentry
    // Sentry.init({
    //   dsn: 'YOUR_SENTRY_DSN',
    //   enableNative: true,
    //   enableNativeCrashHandling: true,
    // });
    
    console.log('🚨 Crash Reporting: Initialized');

    // Capturer les erreurs non gérées
    this.setupGlobalErrorHandlers();
  }

  /**
   * Configure les handlers d'erreurs globales
   */
  private setupGlobalErrorHandlers() {
    // Capturer les erreurs React Native
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.reportError(error, { isFatal });
      originalHandler?.(error, isFatal);
    });

    // Capturer les promesses rejetées
    const originalRejectionHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: any) => {
      this.reportError(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
      });
      originalRejectionHandler?.(event);
    };
  }

  /**
   * Définit l'utilisateur actuel
   */
  setUser(userId: string | null, userData?: Record<string, any>) {
    this.userId = userId;
    
    // TODO: Sentry.setUser({
    //   id: userId,
    //   ...userData,
    // });
  }

  /**
   * Rapporte une erreur
   */
  reportError(error: Error, context?: ErrorContext) {
    const crash: CrashReport = {
      error,
      context: {
        ...context,
        userId: this.userId || undefined,
      },
      timestamp: Date.now(),
    };

    this.crashes.push(crash);
    console.error('🚨 Crash Report:', error.message, context);

    // TODO: Envoyer à Sentry
    // Sentry.captureException(error, {
    //   contexts: { custom: context },
    // });
  }

  /**
   * Rapporte un message (non-erreur)
   */
  reportMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`🚨 Report [${level}]:`, message);
    
    // TODO: Sentry.captureMessage(message, level);
  }

  /**
   * Ajoute du contexte (breadcrumb)
   */
  addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
    console.log('🍞 Breadcrumb:', message, category, data);
    
    // TODO: Sentry.addBreadcrumb({
    //   message,
    //   category,
    //   data,
    //   level: 'info',
    //   timestamp: Date.now(),
    // });
  }

  /**
   * Récupère tous les crashes (pour debug)
   */
  getCrashes(): CrashReport[] {
    return [...this.crashes];
  }

  /**
   * Efface l'historique des crashes
   */
  clearCrashes() {
    this.crashes = [];
  }

  /**
   * Test de crash (pour vérifier que le reporting fonctionne)
   */
  testCrash() {
    throw new Error('Test crash from CrashReportingService');
  }
}

export const crashReporting = new CrashReportingService();
