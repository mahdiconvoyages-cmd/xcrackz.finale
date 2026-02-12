// Service d'analytics centralisé
// Support pour Firebase Analytics et analytics personnalisés

interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
  timestamp: number;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private userId: string | null = null;
  private sessionId: string = this.generateSessionId();

  /**
   * Génère un ID de session unique
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Définit l'utilisateur actuel
   */
  setUserId(userId: string | null) {
    this.userId = userId;
    console.log('📊 Analytics: User ID set:', userId);
  }

  /**
   * Track un événement
   */
  logEvent(eventName: string, params?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      params: {
        ...params,
        user_id: this.userId,
        session_id: this.sessionId,
      },
      timestamp: Date.now(),
    };

    this.events.push(event);
    console.log(`📊 Analytics Event: ${eventName}`, params);

    // TODO: Envoyer à Firebase Analytics
    // analytics().logEvent(eventName, params);
  }

  /**
   * Track une page vue
   */
  logScreenView(screenName: string, screenClass?: string) {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  /**
   * Track une erreur
   */
  logError(error: Error, context?: Record<string, any>) {
    this.logEvent('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  /**
   * Track le temps de chargement d'un écran
   */
  logPerformance(screenName: string, durationMs: number) {
    this.logEvent('screen_load_time', {
      screen: screenName,
      duration_ms: durationMs,
    });
  }

  // Événements métier spécifiques

  logMissionCreated(missionId: string, missionType: string) {
    this.logEvent('mission_created', {
      mission_id: missionId,
      mission_type: missionType,
    });
  }

  logMissionCompleted(missionId: string, durationMinutes: number) {
    this.logEvent('mission_completed', {
      mission_id: missionId,
      duration_minutes: durationMinutes,
    });
  }

  logInspectionStarted(inspectionType: 'departure' | 'arrival', missionId: string) {
    this.logEvent('inspection_started', {
      inspection_type: inspectionType,
      mission_id: missionId,
    });
  }

  logInspectionCompleted(
    inspectionType: 'departure' | 'arrival',
    missionId: string,
    photoCount: number,
    aiEnabled: boolean
  ) {
    this.logEvent('inspection_completed', {
      inspection_type: inspectionType,
      mission_id: missionId,
      photo_count: photoCount,
      ai_enabled: aiEnabled,
    });
  }

  logPhotoTaken(photoType: string, aiDescriptionGenerated: boolean) {
    this.logEvent('photo_taken', {
      photo_type: photoType,
      ai_description_generated: aiDescriptionGenerated,
    });
  }

  logGPSTrackingStarted(missionId: string) {
    this.logEvent('gps_tracking_started', {
      mission_id: missionId,
    });
  }

  logGPSTrackingStopped(missionId: string, durationMinutes: number, pointsCount: number) {
    this.logEvent('gps_tracking_stopped', {
      mission_id: missionId,
      duration_minutes: durationMinutes,
      points_count: pointsCount,
    });
  }

  logShareMission(missionId: string, shareMethod: 'qr' | 'code' | 'link') {
    this.logEvent('mission_shared', {
      mission_id: missionId,
      share_method: shareMethod,
    });
  }

  logLogin(method: 'email' | 'biometric') {
    this.logEvent('login', {
      method,
    });
  }

  logLogout() {
    this.logEvent('logout');
  }

  /**
   * Récupère tous les événements (pour debug)
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Efface l'historique des événements
   */
  clearEvents() {
    this.events = [];
  }
}

export const analytics = new AnalyticsService();
