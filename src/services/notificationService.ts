import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// ⚠️ IMPORTANT: Les notifications push ne fonctionnent plus dans Expo Go (SDK 53+)
// Pour tester les notifications, il faut créer un development build avec `npx expo run:android`
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private notificationListener: any;
  private responseListener: any;

  /**
   * Demander les permissions pour les notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    let token: string | null = null;

    // ⚠️ Vérifier si on est dans Expo Go (SDK 53+)
    if (IS_EXPO_GO) {
      console.warn('⚠️ Les notifications push ne sont pas supportées dans Expo Go (SDK 53+)');
      console.warn('ℹ️ Pour tester les notifications, créez un development build: npx expo run:android');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Les notifications push ne fonctionnent que sur un appareil physique');
      return null;
    }

    // Vérifier et demander les permissions
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission pour les notifications refusée');
        return null;
      }

      // Obtenir le token Expo Push
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('📱 Push token obtenu:', token);
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'obtention du push token:', error.message);
      // Ne pas crash l'app si les notifications échouent
      return null;
    }

    // Configuration Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22d3ee',
      });

      // Canal pour missions
      await Notifications.setNotificationChannelAsync('missions', {
        name: 'Missions',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
        description: 'Notifications pour les missions',
      });

      // Canal pour covoiturage
      await Notifications.setNotificationChannelAsync('carpooling', {
        name: 'Covoiturage',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22d3ee',
        description: 'Notifications pour le covoiturage',
      });

      // Canal pour messages
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
        description: 'Notifications pour les messages',
      });
    }

    return token;
  }

  /**
   * Enregistrer le token dans Supabase
   */
  async saveTokenToDatabase(userId: string, token: string) {
    try {
      const { error } = await supabase.from('user_push_tokens').upsert(
        {
          user_id: userId,
          push_token: token,
          platform: Platform.OS,
          device_name: Device.deviceName || 'Unknown',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

      if (error) throw error;
      console.log('✅ Push token enregistré dans la base de données');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du token:', error);
    }
  }

  /**
   * Configurer les listeners de notifications
   */
  setupNotificationListeners(navigation: any) {
    // Listener pour les notifications reçues quand l'app est ouverte
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification reçue:', notification);
      }
    );

    // Listener pour les interactions avec les notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification cliquée:', response);
        this.handleNotificationResponse(response, navigation);
      }
    );
  }

  /**
   * Gérer la navigation lors du clic sur une notification
   */
  private handleNotificationResponse(response: any, navigation: any) {
    const data = response.notification.request.content.data;

    if (!data || !data.type) return;

    switch (data.type) {
      case 'mission_assigned':
        navigation.navigate('Missions', {
          screen: 'MissionDetails',
          params: { missionId: data.missionId },
        });
        break;

      case 'booking_confirmed':
      case 'booking_rejected':
        navigation.navigate('Covoiturage', {
          screen: 'MyBookings',
        });
        break;

      case 'trip_booking_request':
        navigation.navigate('Covoiturage', {
          screen: 'TripDetails',
          params: { tripId: data.tripId },
        });
        break;

      case 'message_received':
        navigation.navigate('Covoiturage', {
          screen: 'CarpoolingChat',
          params: { tripId: data.tripId, otherUserId: data.senderId },
        });
        break;

      case 'mission_status_changed':
        navigation.navigate('Missions', {
          screen: 'MissionDetails',
          params: { missionId: data.missionId },
        });
        break;

      default:
        console.log('Type de notification inconnu:', data.type);
    }
  }

  /**
   * Envoyer une notification locale (pour tests)
   */
  async sendLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // null = envoyer immédiatement
    });
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Obtenir le badge count (nombre de notifications non lues)
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Définir le badge count
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Effacer toutes les notifications
   */
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }
}

// Instance singleton
export const notificationService = new NotificationService();
