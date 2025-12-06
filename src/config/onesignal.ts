/**
 * OneSignal Configuration
 * 
 * Service de notifications push pour CHECKSFLEET
 * - Notifications missions
 * - Alertes temps réel
 * - Messages système
 */

import OneSignal from 'react-native-onesignal';
import { Platform } from 'react-native';

// Configuration OneSignal
export const ONESIGNAL_CONFIG = {
  appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
  
  // Notifications iOS
  ios: {
    promptForPushNotificationsWithUserResponse: true,
    requiresUserPrivacyConsent: false,
  },
  
  // Notifications Android
  android: {
    notificationChannels: [
      {
        id: 'missions',
        name: 'Missions',
        description: 'Notifications de nouvelles missions et mises à jour',
        importance: 4, // HIGH
        vibration: true,
        sound: 'default',
      },
      {
        id: 'urgent',
        name: 'Urgent',
        description: 'Notifications urgentes nécessitant une action immédiate',
        importance: 5, // MAX
        vibration: true,
        sound: 'default',
      },
      {
        id: 'updates',
        name: 'Mises à jour',
        description: 'Mises à jour de statut et informations générales',
        importance: 3, // DEFAULT
        vibration: false,
        sound: 'default',
      },
      {
        id: 'navigation',
        name: 'Navigation',
        description: 'Alertes et guidage navigation GPS',
        importance: 4, // HIGH
        vibration: true,
        sound: 'navigation_alert',
      },
    ],
  },
  
  // Tags par défaut
  defaultTags: {
    app_version: '1.0.0',
    platform: Platform.OS,
  },
};

/**
 * Types de notifications
 */
export enum NotificationType {
  NEW_MISSION = 'new_mission',
  MISSION_ASSIGNED = 'mission_assigned',
  MISSION_UPDATED = 'mission_updated',
  MISSION_CANCELLED = 'mission_cancelled',
  INSPECTION_REQUIRED = 'inspection_required',
  NAVIGATION_ALERT = 'navigation_alert',
  PAYMENT_RECEIVED = 'payment_received',
  MESSAGE_RECEIVED = 'message_received',
  SYSTEM_UPDATE = 'system_update',
}

/**
 * Templates de notifications
 */
export const NOTIFICATION_TEMPLATES = {
  [NotificationType.NEW_MISSION]: {
    title: '🚀 Nouvelle mission disponible',
    defaultMessage: 'Une nouvelle mission est disponible près de vous',
    channel: 'missions',
    priority: 'high' as const,
  },
  [NotificationType.MISSION_ASSIGNED]: {
    title: '✅ Mission attribuée',
    defaultMessage: 'Une mission vous a été attribuée',
    channel: 'missions',
    priority: 'high' as const,
  },
  [NotificationType.MISSION_UPDATED]: {
    title: '📝 Mission mise à jour',
    defaultMessage: 'Une de vos missions a été mise à jour',
    channel: 'updates',
    priority: 'default' as const,
  },
  [NotificationType.MISSION_CANCELLED]: {
    title: '❌ Mission annulée',
    defaultMessage: 'Une mission a été annulée',
    channel: 'urgent',
    priority: 'high' as const,
  },
  [NotificationType.INSPECTION_REQUIRED]: {
    title: '📸 Inspection requise',
    defaultMessage: 'Une inspection est requise pour cette mission',
    channel: 'missions',
    priority: 'high' as const,
  },
  [NotificationType.NAVIGATION_ALERT]: {
    title: '🧭 Alerte navigation',
    defaultMessage: 'Alerte sur votre itinéraire',
    channel: 'navigation',
    priority: 'high' as const,
  },
  [NotificationType.PAYMENT_RECEIVED]: {
    title: '💰 Paiement reçu',
    defaultMessage: 'Vous avez reçu un paiement',
    channel: 'updates',
    priority: 'default' as const,
  },
  [NotificationType.MESSAGE_RECEIVED]: {
    title: '💬 Nouveau message',
    defaultMessage: 'Vous avez reçu un nouveau message',
    channel: 'updates',
    priority: 'default' as const,
  },
  [NotificationType.SYSTEM_UPDATE]: {
    title: '🔔 Mise à jour système',
    defaultMessage: 'Une mise à jour importante est disponible',
    channel: 'updates',
    priority: 'default' as const,
  },
};

/**
 * Tags utilisateur pour segmentation
 */
export interface UserTags {
  user_id: string;
  user_type: 'driver' | 'client' | 'admin';
  city?: string;
  region?: string;
  vehicle_type?: string;
  is_verified?: boolean;
  language?: string;
  app_version?: string;
  platform?: string;
}

/**
 * Valider configuration
 */
export function validateOneSignalConfig(): boolean {
  if (!ONESIGNAL_CONFIG.appId) {
    console.error('❌ OneSignal: APP_ID manquant dans .env');
    return false;
  }
  
  if (ONESIGNAL_CONFIG.appId === 'your-onesignal-app-id') {
    console.error('❌ OneSignal: APP_ID non configuré (valeur par défaut)');
    return false;
  }
  
  console.log('✅ OneSignal: Configuration validée');
  return true;
}

export default ONESIGNAL_CONFIG;
