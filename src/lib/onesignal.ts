import OneSignal from 'react-onesignal';

let isInitialized = false;

export async function initOneSignal() {
  if (isInitialized) return;

  try {
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing OneSignal:', error);
  }
}

export async function subscribeToNotifications() {
  try {
    await OneSignal.Slidedown.promptPush();
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
  }
}

export async function sendNotification(title: string, message: string, userId?: string) {
  try {
    console.log('Notification would be sent:', { title, message, userId });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

export async function setUserId(userId: string) {
  try {
    await OneSignal.login(userId);
  } catch (error) {
    console.error('Error setting user ID:', error);
  }
}

export async function removeUserId() {
  try {
    await OneSignal.logout();
  } catch (error) {
    console.error('Error removing user ID:', error);
  }
}
