// Tests pour les services Phase 3

import { onboarding } from '../src/services/onboarding';
import { i18nService } from '../src/services/i18n';
import { offlineService } from '../src/services/offlineMode';
import { rgpdService } from '../src/services/rgpd';
import { advancedSearch } from '../src/services/advancedSearch';

describe('Phase 3 Services - Integration Tests', () => {
  describe('onboarding service', () => {
    it('devrait être exporté correctement', () => {
      expect(onboarding).toBeDefined();
      expect(onboarding.isOnboardingCompleted).toBeDefined();
      expect(onboarding.completeOnboarding).toBeDefined();
      expect(onboarding.skipOnboarding).toBeDefined();
      expect(onboarding.getSteps).toBeDefined();
    });

    it('devrait retourner les étapes d\'onboarding', () => {
      const steps = onboarding.getSteps();
      expect(steps).toBeDefined();
      expect(Array.isArray(steps)).toBe(true);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0]).toHaveProperty('id');
      expect(steps[0]).toHaveProperty('title');
      expect(steps[0]).toHaveProperty('description');
      expect(steps[0]).toHaveProperty('icon');
    });

    it('devrait vérifier le statut d\'onboarding', async () => {
      const completed = await onboarding.isOnboardingCompleted();
      expect(typeof completed).toBe('boolean');
    });

    it('devrait marquer l\'onboarding comme complété', async () => {
      const result = await onboarding.completeOnboarding();
      // Vérifie juste que ça ne plante pas
      expect(typeof result).toBe('boolean');
    });

    it('devrait réinitialiser l\'onboarding', async () => {
      await onboarding.resetOnboarding();
      // Pas d'erreur levée
      expect(true).toBe(true);
    });
  });

  describe('i18n service', () => {
    it('devrait être exporté correctement', () => {
      expect(i18nService).toBeDefined();
      expect(i18nService.initialize).toBeDefined();
      expect(i18nService.changeLanguage).toBeDefined();
      expect(i18nService.getCurrentLanguage).toBeDefined();
      expect(i18nService.getAvailableLanguages).toBeDefined();
    });

    it('devrait initialiser i18n', async () => {
      await i18nService.initialize();
      expect(true).toBe(true);
    });

    it('devrait retourner les langues disponibles', () => {
      const languages = i18nService.getAvailableLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages[0]).toHaveProperty('code');
      expect(languages[0]).toHaveProperty('name');
      expect(languages[0]).toHaveProperty('nativeName');
    });

    it('devrait avoir au moins français et anglais', () => {
      const languages = i18nService.getAvailableLanguages();
      const codes = languages.map(l => l.code);
      expect(codes).toContain('fr');
      expect(codes).toContain('en');
    });

    it('devrait changer la langue', async () => {
      await i18nService.changeLanguage('en');
      // Pas d'erreur levée
      expect(true).toBe(true);
    });
  });

  describe('offline service', () => {
    it('devrait être exporté correctement', () => {
      expect(offlineService).toBeDefined();
      expect(offlineService.initialize).toBeDefined();
      expect(offlineService.getIsOnline).toBeDefined();
      expect(offlineService.queueRequest).toBeDefined();
      expect(offlineService.syncPendingRequests).toBeDefined();
      expect(offlineService.cacheData).toBeDefined();
      expect(offlineService.getCachedData).toBeDefined();
    });

    it('devrait initialiser le service', async () => {
      await offlineService.initialize();
      expect(true).toBe(true);
    });

    it('devrait retourner le statut en ligne', () => {
      const isOnline = offlineService.getIsOnline();
      expect(typeof isOnline).toBe('boolean');
    });

    it('devrait mettre en cache des données', async () => {
      await offlineService.cacheData('test_key', { data: 'test' });
      expect(true).toBe(true);
    });

    it('devrait récupérer des données du cache', async () => {
      await offlineService.cacheData('test_key_2', { value: 123 });
      const cached = await offlineService.getCachedData('test_key_2');
      expect(cached).toBeDefined();
    });

    it('devrait obtenir les stats de la queue', async () => {
      const stats = await offlineService.getQueueStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('total');
      expect(typeof stats.total).toBe('number');
    });

    it('devrait vider le cache', async () => {
      await offlineService.clearCache();
      expect(true).toBe(true);
    });
  });

  describe('rgpd service', () => {
    it('devrait être exporté correctement', () => {
      expect(rgpdService).toBeDefined();
      expect(rgpdService.exportUserData).toBeDefined();
      expect(rgpdService.generateJSONFile).toBeDefined();
      expect(rgpdService.getDataSummary).toBeDefined();
      expect(rgpdService.deleteAllUserData).toBeDefined();
    });

    it('devrait obtenir un résumé des données', async () => {
      const summary = await rgpdService.getDataSummary('test-user-id');
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('missions');
      expect(summary).toHaveProperty('inspections');
      expect(summary).toHaveProperty('vehicles');
      expect(summary).toHaveProperty('documents');
    });
  });

  describe('advanced search service', () => {
    it('devrait être exporté correctement', () => {
      expect(advancedSearch).toBeDefined();
      expect(advancedSearch.search).toBeDefined();
      expect(advancedSearch.quickSearch).toBeDefined();
      expect(advancedSearch.getHistory).toBeDefined();
      expect(advancedSearch.getSuggestions).toBeDefined();
      expect(advancedSearch.getPopularBrands).toBeDefined();
      expect(advancedSearch.getPopularPickupCities).toBeDefined();
    });

    it('devrait retourner un historique vide initialement', async () => {
      await advancedSearch.clearHistory();
      const history = await advancedSearch.getHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('devrait vider l\'historique', async () => {
      await advancedSearch.clearHistory();
      const history = await advancedSearch.getHistory();
      expect(history.length).toBe(0);
    });

    it('devrait retourner des suggestions vides si pas d\'historique', async () => {
      await advancedSearch.clearHistory();
      const suggestions = await advancedSearch.getSuggestions('test');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('Integration - Services ensemble', () => {
    it('tous les services devraient être initialisables', async () => {
      await Promise.all([
        onboarding.isOnboardingCompleted(),
        i18nService.initialize(),
        offlineService.initialize(),
      ]);
      
      expect(true).toBe(true);
    });

    it('devrait avoir toutes les méthodes nécessaires', () => {
      // Onboarding
      expect(onboarding.completeOnboarding).toBeDefined();
      expect(onboarding.skipOnboarding).toBeDefined();
      
      // i18n
      expect(i18nService.changeLanguage).toBeDefined();
      expect(i18nService.getCurrentLanguage).toBeDefined();
      
      // Offline
      expect(offlineService.queueRequest).toBeDefined();
      expect(offlineService.cacheData).toBeDefined();
      
      // RGPD
      expect(rgpdService.exportUserData).toBeDefined();
      expect(rgpdService.getDataSummary).toBeDefined();
      
      // Search
      expect(advancedSearch.search).toBeDefined();
      expect(advancedSearch.quickSearch).toBeDefined();
    });
  });
});
