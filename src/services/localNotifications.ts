// Service de notifications locales
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { analytics } from './analytics';

// Configuration des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationData {
  type: 'mission' | 'inspection' | 'payment' | 'reminder' | 'general';
  id: string;
  [key: string]: any;
}

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  data: NotificationData;
  trigger: Date | number;
}

class LocalNotificationService {
  private notificationListener: any;
  private responseListener: any;

  /**
   * Initialiser le service de notifications
   */
  async initialize() {
    try {
      // Demander la permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Permission de notification refusée');
        return false;
      }

      console.log('✅ Permissions de notification accordées');

      // Configurer le canal Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notifications Finality',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0ea5e9',
          sound: 'default',
        });

        // Canal pour les missions urgentes
        await Notifications.setNotificationChannelAsync('urgent', {
          name: 'Missions Urgentes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#f44336',
          sound: 'default',
        });
      }

      // Listeners
      this.setupListeners();

      analytics.logEvent('notifications_initialized');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
      return false;
    }
  }

  /**
   * Configurer les listeners
   */
  private setupListeners() {
    // Notification reçue pendant que l'app est ouverte
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification reçue:', notification);
      analytics.logEvent('notification_received', {
        type: notification.request.content.data.type,
      });
    });

    // Utilisateur interagit avec la notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification cliquée:', response);
      const data = response.notification.request.content.data as NotificationData;
      
      analytics.logEvent('notification_clicked', {
        type: data.type,
        id: data.id,
      });

      // Navigation selon le type
      this.handleNotificationClick(data);
    });
  }

  /**
   * Gérer le clic sur une notification
   */
  private handleNotificationClick(data: NotificationData) {
    // TODO: Implémenter la navigation deep linking
    console.log('🔗 Navigation vers:', data);
  }

  /**
   * Envoyer une notification immédiate
   */
  async sendNotification(
    title: string,
    body: string,
    data: NotificationData
  ) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          badge: 1,
        },
        trigger: null, // Immédiat
      });

      console.log('✅ Notification envoyée:', id);
      analytics.logEvent('notification_sent', { type: data.type });
      return id;
    } catch (error) {
      console.error('❌ Erreur envoi notification:', error);
      return null;
    }
  }

  /**
   * Programmer une notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    data: NotificationData,
    trigger: Date | number // Date ou secondes
  ) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          badge: 1,
        },
        trigger:
          trigger instanceof Date
            ? { date: trigger }
            : { seconds: trigger },
      });

      console.log('⏰ Notification programmée:', id, 'pour', trigger);
      analytics.logEvent('notification_scheduled', {
        type: data.type,
        trigger: trigger instanceof Date ? trigger.toISOString() : `${trigger}s`,
      });
      
      return id;
    } catch (error) {
      console.error('❌ Erreur programmation notification:', error);
      return null;
    }
  }

  /**
   * Notification pour une nouvelle mission reçue
   */
  async notifyNewMission(missionId: string, reference: string) {
    return this.sendNotification(
      '🚗 Nouvelle mission',
      `Mission ${reference} vous a été assignée`,
      {
        type: 'mission',
        id: missionId,
        action: 'view',
      }
    );
  }

  /**
   * Notification pour changement de statut mission
   */
  async notifyMissionStatusChange(
    missionId: string,
    reference: string,
    newStatus: string
  ) {
    const statusLabels: Record<string, string> = {
      pending: 'en attente',
      in_progress: 'en cours',
      completed: 'terminée',
    };

    return this.sendNotification(
      '📋 Statut mis à jour',
      `Mission ${reference} est maintenant ${statusLabels[newStatus] || newStatus}`,
      {
        type: 'mission',
        id: missionId,
        status: newStatus,
      }
    );
  }

  /**
   * Rappel pour une mission imminente
   */
  async scheduleUpcomingMissionReminder(
    missionId: string,
    reference: string,
    pickupDate: Date
  ) {
    // Rappel 24h avant
    const oneDayBefore = new Date(pickupDate.getTime() - 24 * 60 * 60 * 1000);
    
    if (oneDayBefore > new Date()) {
      await this.scheduleNotification(
        '⏰ Mission demain',
        `Rappel: Mission ${reference} prévue demain`,
        {
          type: 'reminder',
          id: missionId,
          reminderType: 'upcoming_mission',
        },
        oneDayBefore
      );
    }

    // Rappel 1h avant
    const oneHourBefore = new Date(pickupDate.getTime() - 60 * 60 * 1000);
    
    if (oneHourBefore > new Date()) {
      await this.scheduleNotification(
        '🚨 Mission dans 1h',
        `Mission ${reference} commence bientôt!`,
        {
          type: 'reminder',
          id: missionId,
          reminderType: 'upcoming_mission_urgent',
        },
        oneHourBefore
      );
    }
  }

  /**
   * Notification pour inspection en attente
   */
  async notifyPendingInspection(inspectionId: string, missionRef: string) {
    return this.sendNotification(
      '📸 Inspection en attente',
      `L'inspection de ${missionRef} doit être complétée`,
      {
        type: 'inspection',
        id: inspectionId,
        action: 'complete',
      }
    );
  }

  /**
   * Notification pour paiement reçu
   */
  async notifyPaymentReceived(amount: number, missionRef: string) {
    return this.sendNotification(
      '💰 Paiement reçu',
      `${amount.toFixed(2)}€ pour ${missionRef}`,
      {
        type: 'payment',
        id: missionRef,
        amount: amount.toString(),
      }
    );
  }

  /**
   * Rappel quotidien pour les missions actives
   */
  async scheduleDailyReminder() {
    // Tous les jours à 9h
    const tomorrow9AM = new Date();
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
    tomorrow9AM.setHours(9, 0, 0, 0);

    return this.scheduleNotification(
      '📋 Missions du jour',
      'Vous avez des missions actives aujourd\'hui',
      {
        type: 'reminder',
        id: 'daily',
        reminderType: 'daily_missions',
      },
      tomorrow9AM
    );
  }

  /**
   * Annuler une notification programmée
   */
  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('🗑️ Notification annulée:', notificationId);
      return true;
    } catch (error) {
      console.error('❌ Erreur annulation notification:', error);
      return false;
    }
  }

  /**
   * Annuler toutes les notifications
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🗑️ Toutes les notifications annulées');
      return true;
    } catch (error) {
      console.error('❌ Erreur annulation notifications:', error);
      return false;
    }
  }

  /**
   * Obtenir toutes les notifications programmées
   */
  async getAllScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📅 Notifications programmées:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
      return [];
    }
  }

  /**
   * Mettre à jour le badge
   */
  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('🔴 Badge mis à jour:', count);
    } catch (error) {
      console.error('❌ Erreur mise à jour badge:', error);
    }
  }

  /**
   * Réinitialiser le badge
   */
  async clearBadge() {
    await this.setBadgeCount(0);
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    console.log('🧹 Listeners de notifications nettoyés');
  }

  /**
   * Vérifier si les notifications sont activées
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
}

export const localNotifications = new LocalNotificationService();

// Hook React pour les notifications
export function useNotifications() {
  React.useEffect(() => {
    localNotifications.initialize();
    
    return () => {
      localNotifications.cleanup();
    };
  }, []);

  return {
    sendNotification: localNotifications.sendNotification.bind(localNotifications),
    scheduleNotification: localNotifications.scheduleNotification.bind(localNotifications),
    cancelNotification: localNotifications.cancelNotification.bind(localNotifications),
    clearBadge: localNotifications.clearBadge.bind(localNotifications),
  };
}
