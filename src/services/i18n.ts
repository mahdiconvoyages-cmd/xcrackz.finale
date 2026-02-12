// Service d'internationalisation (i18n)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { analytics } from './analytics';

const LANGUAGE_KEY = '@finality_language';

// Traductions françaises
const fr = {
  translation: {
    // Commun
    common: {
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      cancel: 'Annuler',
      confirm: 'Confirmer',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      back: 'Retour',
      next: 'Suivant',
      skip: 'Passer',
      start: 'Commencer',
      finish: 'Terminer',
      yes: 'Oui',
      no: 'Non',
    },
    
    // Navigation
    nav: {
      missions: 'Missions',
      profile: 'Profil',
      settings: 'Paramètres',
      tracking: 'Suivi',
    },
    
    // Missions
    missions: {
      title: 'Mes Missions',
      created: 'Créées',
      received: 'Reçues',
      create: 'Créer une mission',
      join: 'Rejoindre',
      active: 'Actives',
      pending: 'En attente',
      inProgress: 'En cours',
      completed: 'Terminées',
      emptyCreated: 'Aucune mission créée',
      emptyReceived: 'Aucune mission reçue',
      reference: 'Référence',
      pickup: 'Départ',
      delivery: 'Arrivée',
      status: 'Statut',
      price: 'Prix',
    },
    
    // Inspections
    inspections: {
      title: 'Inspections',
      arrival: 'Arrivée',
      departure: 'Départ',
      photos: 'Photos',
      damages: 'Dommages',
      signature: 'Signature',
      complete: 'Compléter',
    },
    
    // Auth
    auth: {
      signIn: 'Se connecter',
      signUp: 'S\'inscrire',
      signOut: 'Se déconnecter',
      email: 'Email',
      password: 'Mot de passe',
      forgotPassword: 'Mot de passe oublié ?',
      biometric: 'Connexion biométrique',
    },
    
    // Settings
    settings: {
      title: 'Paramètres',
      language: 'Langue',
      theme: 'Thème',
      notifications: 'Notifications',
      privacy: 'Confidentialité',
      about: 'À propos',
      version: 'Version',
      exportData: 'Exporter mes données',
      deleteAccount: 'Supprimer mon compte',
    },
    
    // Onboarding
    onboarding: {
      welcome: 'Bienvenue sur Finality',
      welcomeDesc: 'Gérez vos missions de transport de véhicules en toute simplicité',
      missions: 'Créez vos missions',
      missionsDesc: 'Créez et partagez des missions de transport avec vos collaborateurs',
      inspections: 'Inspections détaillées',
      inspectionsDesc: 'Effectuez des inspections complètes avec photos et signatures',
      tracking: 'Tracking GPS en temps réel',
      trackingDesc: 'Suivez vos véhicules en temps réel et partagez le lien de tracking',
      collaboration: 'Travaillez en équipe',
      collaborationDesc: 'Assignez des missions, partagez des codes et collaborez efficacement',
    },
    
    // Errors
    errors: {
      networkError: 'Erreur réseau',
      serverError: 'Erreur serveur',
      notFound: 'Non trouvé',
      unauthorized: 'Non autorisé',
      unknown: 'Erreur inconnue',
    },
  },
};

// Traductions anglaises
const en = {
  translation: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      skip: 'Skip',
      start: 'Start',
      finish: 'Finish',
      yes: 'Yes',
      no: 'No',
    },
    
    // Navigation
    nav: {
      missions: 'Missions',
      profile: 'Profile',
      settings: 'Settings',
      tracking: 'Tracking',
    },
    
    // Missions
    missions: {
      title: 'My Missions',
      created: 'Created',
      received: 'Received',
      create: 'Create mission',
      join: 'Join',
      active: 'Active',
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
      emptyCreated: 'No created missions',
      emptyReceived: 'No received missions',
      reference: 'Reference',
      pickup: 'Pickup',
      delivery: 'Delivery',
      status: 'Status',
      price: 'Price',
    },
    
    // Inspections
    inspections: {
      title: 'Inspections',
      arrival: 'Arrival',
      departure: 'Departure',
      photos: 'Photos',
      damages: 'Damages',
      signature: 'Signature',
      complete: 'Complete',
    },
    
    // Auth
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot password?',
      biometric: 'Biometric login',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications',
      privacy: 'Privacy',
      about: 'About',
      version: 'Version',
      exportData: 'Export my data',
      deleteAccount: 'Delete my account',
    },
    
    // Onboarding
    onboarding: {
      welcome: 'Welcome to Finality',
      welcomeDesc: 'Manage your vehicle transport missions with ease',
      missions: 'Create your missions',
      missionsDesc: 'Create and share transport missions with your team',
      inspections: 'Detailed inspections',
      inspectionsDesc: 'Perform complete inspections with photos and signatures',
      tracking: 'Real-time GPS tracking',
      trackingDesc: 'Track your vehicles in real-time and share tracking links',
      collaboration: 'Work as a team',
      collaborationDesc: 'Assign missions, share codes and collaborate effectively',
    },
    
    // Errors
    errors: {
      networkError: 'Network error',
      serverError: 'Server error',
      notFound: 'Not found',
      unauthorized: 'Unauthorized',
      unknown: 'Unknown error',
    },
  },
};

class I18nService {
  private initialized = false;

  /**
   * Initialiser i18n
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Récupérer la langue sauvegardée ou utiliser celle du système
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
      const deviceLanguage = Localization.locale.split('-')[0]; // 'fr-FR' -> 'fr'
      const defaultLanguage = savedLanguage || deviceLanguage || 'fr';

      await i18n
        .use(initReactI18next)
        .init({
          resources: {
            fr,
            en,
          },
          lng: defaultLanguage,
          fallbackLng: 'fr',
          interpolation: {
            escapeValue: false,
          },
          compatibilityJSON: 'v3',
        });

      this.initialized = true;
      console.log('✅ i18n initialisé avec langue:', defaultLanguage);

      analytics.logEvent('i18n_initialized', {
        language: defaultLanguage,
        device_language: deviceLanguage,
      });
    } catch (error) {
      console.error('❌ Erreur initialisation i18n:', error);
    }
  }

  /**
   * Changer la langue
   */
  async changeLanguage(language: string) {
    try {
      await i18n.changeLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_KEY, language);

      console.log('✅ Langue changée:', language);
      analytics.logEvent('language_changed', {
        from: i18n.language,
        to: language,
      });
    } catch (error) {
      console.error('❌ Erreur changement langue:', error);
    }
  }

  /**
   * Obtenir la langue actuelle
   */
  getCurrentLanguage(): string {
    return i18n.language || 'fr';
  }

  /**
   * Obtenir toutes les langues disponibles
   */
  getAvailableLanguages(): { code: string; name: string; nativeName: string }[] {
    return [
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'en', name: 'English', nativeName: 'English' },
    ];
  }

  /**
   * Traduire une clé
   */
  t(key: string, options?: any): string {
    return i18n.t(key, options);
  }

  /**
   * Vérifier si une clé existe
   */
  exists(key: string): boolean {
    return i18n.exists(key);
  }
}

export const i18nService = new I18nService();
export { i18n };

// Hook React pour i18n
export function useI18n() {
  const React = require('react');
  const { useTranslation } = require('react-i18next');
  
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = React.useState(i18n.language);

  const changeLanguage = async (language: string) => {
    await i18nService.changeLanguage(language);
    setCurrentLanguage(language);
  };

  return {
    t,
    currentLanguage,
    changeLanguage,
    availableLanguages: i18nService.getAvailableLanguages(),
  };
}
