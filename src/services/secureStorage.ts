// Service de stockage sécurisé avec authentification biométrique
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

class SecureStorageService {
  /**
   * Vérifie si l'authentification biométrique est disponible
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Authentifie l'utilisateur avec biométrie
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentification requise',
        fallbackLabel: 'Utiliser le code',
        cancelLabel: 'Annuler',
      });
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Sauvegarde un item de manière sécurisée
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  /**
   * Récupère un item sécurisé
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return null;
    }
  }

  /**
   * Récupère un item avec authentification biométrique
   */
  async getItemWithBiometrics(key: string): Promise<string | null> {
    const authenticated = await this.authenticateWithBiometrics();
    if (!authenticated) return null;
    
    return this.getItem(key);
  }

  /**
   * Supprime un item
   */
  async deleteItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
    }
  }

  /**
   * Sauvegarde le token d'authentification
   */
  async saveAuthToken(token: string): Promise<void> {
    return this.setItem('auth_token', token);
  }

  /**
   * Sauvegarde le refresh token
   */
  async saveRefreshToken(token: string): Promise<void> {
    return this.setItem('refresh_token', token);
  }

  /**
   * Récupère le token d'authentification
   */
  async getAuthToken(): Promise<string | null> {
    return this.getItem('auth_token');
  }

  /**
   * Supprime le token d'authentification
   */
  async deleteAuthToken(): Promise<void> {
    await this.deleteItem('auth_token');
  }

  /**
   * Récupère le refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return this.getItem('refresh_token');
  }

  /**
   * Efface tous les tokens
   */
  async clearTokens(): Promise<void> {
    await this.deleteItem('auth_token');
    await this.deleteItem('refresh_token');
  }
}

export const secureStorage = new SecureStorageService();
