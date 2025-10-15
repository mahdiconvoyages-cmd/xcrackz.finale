/**
 * OneSignal Service
 * 
 * Gestion centralisée des notifications push
 * - Initialisation
 * - Envoi notifications
 * - Gestion tags utilisateur
 * - Tracking événements
 */

import OneSignal from 'react-native-onesignal';
import { Platform } from 'react-native';
import { 
  ONESIGNAL_CONFIG, 
  NotificationType, 
  NOTIFICATION_TEMPLATES,
  UserTags,
  validateOneSignalConfig,
} from '../config/onesignal';
import { supabase } from '../lib/supabase';

class OneSignalService {
  private initialized = false;
  private userId: string | null = null;
  private playerId: string | null = null;

  /**
   * Initialiser OneSignal
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ OneSignal déjà initialisé');
      return;
    }

    try {
      // Valider config
      if (!validateOneSignalConfig()) {
        throw new Error('Configuration OneSignal invalide');
      }

      console.log('🔔 Initialisation OneSignal...');

      // Initialiser OneSignal
      OneSignal.setAppId(ONESIGNAL_CONFIG.appId);

      // iOS: Demander permission
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse();
      }

      // Android: Créer canaux de notification
      if (Platform.OS === 'android') {
        this.setupAndroidChannels();
      }

      // Event handlers
      this.setupEventHandlers();

      // Récupérer device state
      const deviceState = await OneSignal.getDeviceState();
      if (deviceState) {
        this.playerId = deviceState.userId;
        console.log('✅ OneSignal Player ID:', this.playerId);
      }

      this.initialized = true;
      console.log('✅ OneSignal initialisé avec succès');

    } catch (error) {
      console.error('❌ Erreur initialisation OneSignal:', error);
      throw error;
    }
  }

  /**
   * Configurer canaux Android
   */
  private setupAndroidChannels(): void {
    if (Platform.OS !== 'android') return;

    // Note: setNotificationChannel is deprecated in v4
    // Channels are now configured via app.json plugin
    console.log('✅ Canaux de notification Android (configurés via app.json)');
  }

  /**
   * Configurer event handlers
   */
  private setupEventHandlers(): void {
    // Notification reçue (app au premier plan)
    OneSignal.setNotificationWillShowInForegroundHandler(
      (notificationReceivedEvent: any) => {
        console.log('📬 Notification reçue:', notificationReceivedEvent);
        
        const notification = notificationReceivedEvent.getNotification();
        const data = notification.additionalData;

        // Logger en BDD
        this.logNotification(notification.notificationId, 'received', data);

        // Afficher la notification
        notificationReceivedEvent.complete(notification);
      }
    );

    // Notification cliquée
    OneSignal.setNotificationOpenedHandler(
      (openedEvent: any) => {
        console.log('👆 Notification cliquée:', openedEvent);
        
        const notification = openedEvent.notification;
        const data = notification.additionalData;

        // Logger en BDD
        this.logNotification(notification.notificationId, 'clicked', data);

        // Navigation selon le type
        this.handleNotificationClick(data);
      }
    );

    console.log('✅ Event handlers configurés');
  }

  /**
   * Gérer clic sur notification
   */
  private handleNotificationClick(data: any): void {
    if (!data) return;

    const { type, mission_id, screen, params } = data;

    // TODO: Implémenter navigation selon le type
    console.log('📍 Navigation vers:', { type, screen, params });

    // Exemples de navigation:
    // - NEW_MISSION → MissionDetailsScreen
    // - NAVIGATION_ALERT → NavigationScreen
    // - MESSAGE_RECEIVED → ChatScreen
  }

  /**
   * Logger notification en BDD
   */
  private async logNotification(
    notificationId: string,
    action: 'sent' | 'received' | 'clicked',
    data?: any
  ): Promise<void> {
    try {
      await supabase.from('notification_logs').insert({
        notification_id: notificationId,
        user_id: this.userId,
        player_id: this.playerId,
        action,
        data,
        platform: Platform.OS,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Erreur log notification:', error);
    }
  }

  /**
   * Associer utilisateur à OneSignal
   */
  async setUser(userId: string, userData?: Partial<UserTags>): Promise<void> {
    if (!this.initialized) {
      console.warn('⚠️ OneSignal non initialisé');
      return;
    }

    try {
      this.userId = userId;

      // Définir external user ID
      OneSignal.setExternalUserId(userId);

      // Définir tags utilisateur
      const tags: Record<string, string> = {
        user_id: userId,
        user_type: userData?.user_type || 'driver',
        platform: Platform.OS,
        app_version: ONESIGNAL_CONFIG.defaultTags.app_version,
        ...(userData as Record<string, string>),
      };

      await OneSignal.sendTags(tags);

      // Sauvegarder player ID en BDD
      await this.savePlayerIdToDatabase(userId);

      console.log('✅ Utilisateur OneSignal configuré:', userId);
    } catch (error) {
      console.error('❌ Erreur setUser OneSignal:', error);
    }
  }

  /**
   * Sauvegarder Player ID en BDD
   */
  private async savePlayerIdToDatabase(userId: string): Promise<void> {
    if (!this.playerId) return;

    try {
      await supabase.from('user_devices').upsert({
        user_id: userId,
        player_id: this.playerId,
        platform: Platform.OS,
        app_version: ONESIGNAL_CONFIG.defaultTags.app_version,
        last_active: new Date().toISOString(),
      });

      console.log('✅ Player ID sauvegardé en BDD');
    } catch (error) {
      console.error('❌ Erreur sauvegarde Player ID:', error);
    }
  }

  /**
   * Supprimer tags utilisateur (déconnexion)
   */
  async clearUser(): Promise<void> {
    if (!this.initialized) return;

    try {
      OneSignal.removeExternalUserId();
      OneSignal.deleteTags(['user_id', 'user_type', 'city', 'region']);
      
      this.userId = null;
      console.log('✅ Utilisateur OneSignal déconnecté');
    } catch (error) {
      console.error('❌ Erreur clearUser OneSignal:', error);
    }
  }

  /**
   * Envoyer notification à un utilisateur
   */
  async sendNotificationToUser(
    userId: string,
    type: NotificationType,
    customMessage?: string,
    data?: any
  ): Promise<void> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      
      const notification = {
        contents: { en: customMessage || template.defaultMessage },
        headings: { en: template.title },
        data: {
          type,
          ...data,
        },
        android_channel_id: template.channel,
        priority: template.priority === 'high' ? 10 : 5,
        include_external_user_ids: [userId],
      };

      // Appeler API OneSignal via backend
      await supabase.functions.invoke('send-notification', {
        body: notification,
      });

      console.log('✅ Notification envoyée:', type);
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
    }
  }

  /**
   * Envoyer notification à plusieurs utilisateurs
   */
  async sendNotificationToUsers(
    userIds: string[],
    type: NotificationType,
    customMessage?: string,
    data?: any
  ): Promise<void> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      
      const notification = {
        contents: { en: customMessage || template.defaultMessage },
        headings: { en: template.title },
        data: {
          type,
          ...data,
        },
        android_channel_id: template.channel,
        priority: template.priority === 'high' ? 10 : 5,
        include_external_user_ids: userIds,
      };

      await supabase.functions.invoke('send-notification', {
        body: notification,
      });

      console.log(`✅ Notification envoyée à ${userIds.length} utilisateurs`);
    } catch (error) {
      console.error('❌ Erreur envoi notifications:', error);
    }
  }

  /**
   * Envoyer notification par segment (tags)
   */
  async sendNotificationBySegment(
    filters: Array<{ field: string; relation: string; value: string }>,
    type: NotificationType,
    customMessage?: string,
    data?: any
  ): Promise<void> {
    try {
      const template = NOTIFICATION_TEMPLATES[type];
      
      const notification = {
        contents: { en: customMessage || template.defaultMessage },
        headings: { en: template.title },
        data: {
          type,
          ...data,
        },
        android_channel_id: template.channel,
        priority: template.priority === 'high' ? 10 : 5,
        filters,
      };

      await supabase.functions.invoke('send-notification', {
        body: notification,
      });

      console.log('✅ Notification envoyée par segment');
    } catch (error) {
      console.error('❌ Erreur envoi notification segment:', error);
    }
  }

  /**
   * Obtenir statut permission
   */
  async getPermissionStatus(): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      const deviceState = await OneSignal.getDeviceState();
      return deviceState?.isSubscribed || false;
    } catch (error) {
      console.error('❌ Erreur getPermissionStatus:', error);
      return false;
    }
  }

  /**
   * Demander permission notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.initialized) {
      console.warn('⚠️ OneSignal non initialisé');
      return false;
    }

    try {
      if (Platform.OS === 'ios') {
        OneSignal.promptForPushNotificationsWithUserResponse();
        console.log('📱 Permission iOS demandée');
        return true;
      }

      // Android: permission accordée par défaut
      return true;
    } catch (error) {
      console.error('❌ Erreur requestPermission:', error);
      return false;
    }
  }

  /**
   * Obtenir Player ID
   */
  getPlayerId(): string | null {
    return this.playerId;
  }

  /**
   * Obtenir statistiques
   */
  async getStats(): Promise<{
    playerId: string | null;
    userId: string | null;
    isSubscribed: boolean;
    platform: string;
  }> {
    const deviceState = await OneSignal.getDeviceState();
    
    return {
      playerId: this.playerId,
      userId: this.userId,
      isSubscribed: deviceState?.isSubscribed || false,
      platform: Platform.OS,
    };
  }
}

// Export instance singleton
export const oneSignalService = new OneSignalService();
export default oneSignalService;
