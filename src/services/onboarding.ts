// Service d'onboarding pour first-time users
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './analytics';

const ONBOARDING_KEY = '@finality_onboarding_completed';
const ONBOARDING_STEP_KEY = '@finality_onboarding_step';
const ONBOARDING_VERSION = '1.0';
const ONBOARDING_VERSION_KEY = '@finality_onboarding_version';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  icon: string;
  action?: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '🚗 Bienvenue sur Finality',
    description: 'Gérez vos missions de transport de véhicules en toute simplicité',
    icon: 'rocket-outline',
  },
  {
    id: 'missions',
    title: '📋 Créez vos missions',
    description: 'Créez et partagez des missions de transport avec vos collaborateurs',
    icon: 'briefcase-outline',
  },
  {
    id: 'inspections',
    title: '🔍 Inspections détaillées',
    description: 'Effectuez des inspections complètes avec photos et signatures',
    icon: 'camera-outline',
  },
  {
    id: 'tracking',
    title: '📍 Tracking GPS en temps réel',
    description: 'Suivez vos véhicules en temps réel et partagez le lien de tracking',
    icon: 'location-outline',
  },
  {
    id: 'collaboration',
    title: '👥 Travaillez en équipe',
    description: 'Assignez des missions, partagez des codes et collaborez efficacement',
    icon: 'people-outline',
  },
];

class OnboardingService {
  /**
   * Vérifier si l'onboarding a été complété
   */
  async isOnboardingCompleted(): Promise<boolean> {
    try {
      const [completed, version] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(ONBOARDING_VERSION_KEY),
      ]);

      // Si la version a changé, redemander l'onboarding
      if (version !== ONBOARDING_VERSION) {
        return false;
      }

      return completed === 'true';
    } catch (error) {
      console.error('❌ Erreur vérification onboarding:', error);
      return false;
    }
  }

  /**
   * Marquer l'onboarding comme complété
   */
  async completeOnboarding(): Promise<boolean> {
    try {
      await Promise.all([
        AsyncStorage.setItem(ONBOARDING_KEY, 'true'),
        AsyncStorage.setItem(ONBOARDING_VERSION_KEY, ONBOARDING_VERSION),
        AsyncStorage.removeItem(ONBOARDING_STEP_KEY),
      ]);

      console.log('✅ Onboarding complété');
      analytics.logEvent('onboarding_completed', {
        version: ONBOARDING_VERSION,
        timestamp: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('❌ Erreur completion onboarding:', error);
      return false;
    }
  }

  /**
   * Sauvegarder la progression de l'onboarding
   */
  async saveOnboardingStep(stepIndex: number): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_STEP_KEY, stepIndex.toString());

      analytics.logEvent('onboarding_step_viewed', {
        step_index: stepIndex,
        step_id: ONBOARDING_STEPS[stepIndex]?.id,
      });
    } catch (error) {
      console.error('❌ Erreur sauvegarde step:', error);
    }
  }

  /**
   * Récupérer la dernière étape vue
   */
  async getLastStep(): Promise<number> {
    try {
      const step = await AsyncStorage.getItem(ONBOARDING_STEP_KEY);
      return step ? parseInt(step, 10) : 0;
    } catch (error) {
      console.error('❌ Erreur récupération step:', error);
      return 0;
    }
  }

  /**
   * Réinitialiser l'onboarding (pour debug ou re-onboarding)
   */
  async resetOnboarding(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_KEY),
        AsyncStorage.removeItem(ONBOARDING_STEP_KEY),
        AsyncStorage.removeItem(ONBOARDING_VERSION_KEY),
      ]);

      console.log('🔄 Onboarding réinitialisé');
      analytics.logEvent('onboarding_reset');
    } catch (error) {
      console.error('❌ Erreur reset onboarding:', error);
    }
  }

  /**
   * Skip l'onboarding
   */
  async skipOnboarding(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(ONBOARDING_KEY, 'true'),
        AsyncStorage.setItem(ONBOARDING_VERSION_KEY, ONBOARDING_VERSION),
      ]);

      console.log('⏭️  Onboarding skippé');
      analytics.logEvent('onboarding_skipped', {
        version: ONBOARDING_VERSION,
      });
    } catch (error) {
      console.error('❌ Erreur skip onboarding:', error);
    }
  }

  /**
   * Obtenir les étapes d'onboarding
   */
  getSteps(): OnboardingStep[] {
    return ONBOARDING_STEPS;
  }

  /**
   * Log l'événement de début d'onboarding
   */
  async startOnboarding(): Promise<void> {
    analytics.logEvent('onboarding_started', {
      version: ONBOARDING_VERSION,
      total_steps: ONBOARDING_STEPS.length,
    });
  }
}

export const onboarding = new OnboardingService();

// Hook React pour l'onboarding
export function useOnboarding() {
  const React = require('react');
  const [completed, setCompleted] = React.useState<boolean>(true);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    const isCompleted = await onboarding.isOnboardingCompleted();
    setCompleted(isCompleted);
    setLoading(false);
  };

  const complete = async () => {
    await onboarding.completeOnboarding();
    setCompleted(true);
  };

  const skip = async () => {
    await onboarding.skipOnboarding();
    setCompleted(true);
  };

  const reset = async () => {
    await onboarding.resetOnboarding();
    setCompleted(false);
  };

  return {
    completed,
    loading,
    complete,
    skip,
    reset,
    steps: ONBOARDING_STEPS,
  };
}
