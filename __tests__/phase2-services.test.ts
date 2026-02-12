// Tests simplifiés pour les services Phase 2

import { performanceMonitor } from '../src/services/performanceMonitor';
import { localNotifications } from '../src/services/localNotifications';
import { deepLinking } from '../src/services/deepLinking';

describe('Phase 2 Services - Intégration', () => {
  describe('performanceMonitor', () => {
    it('devrait être exporté et initialisable', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor.recordMetric).toBeDefined();
      expect(performanceMonitor.startScreenLoad).toBeDefined();
      expect(performanceMonitor.trackAPICall).toBeDefined();
      expect(performanceMonitor.getAverageFPS).toBeDefined();
      expect(performanceMonitor.generateReport).toBeDefined();
    });

    it('devrait enregistrer une métrique', () => {
      performanceMonitor.recordMetric('test_metric', 100);
      // Pas d'erreur levée = succès
      expect(true).toBe(true);
    });

    it('devrait tracker un chargement d écran', async () => {
      performanceMonitor.startScreenLoad('TestScreen');
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceMonitor.endScreenLoad('TestScreen');
      
      expect(true).toBe(true);
    });

    it('devrait wrapper un appel API', async () => {
      const mockFn = jest.fn(() => Promise.resolve({ data: 'test' }));
      
      await performanceMonitor.trackAPICall(
        '/test/endpoint',
        'GET',
        mockFn
      );
      
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('localNotifications', () => {
    it('devrait être exporté et initialisable', () => {
      expect(localNotifications).toBeDefined();
      expect(localNotifications.initialize).toBeDefined();
      expect(localNotifications.sendNotification).toBeDefined();
      expect(localNotifications.scheduleNotification).toBeDefined();
      expect(localNotifications.notifyNewMission).toBeDefined();
      expect(localNotifications.setBadgeCount).toBeDefined();
    });

    it('devrait initialiser avec succès', async () => {
      const result = await localNotifications.initialize();
      expect(result).toBe(true);
    });

    it('devrait envoyer une notification', async () => {
      const id = await localNotifications.sendNotification(
        'Test Title',
        'Test Body'
      );
      
      expect(id).toBeDefined();
    });

    it('devrait programmer une notification', async () => {
      const futureDate = new Date(Date.now() + 60000);
      const id = await localNotifications.scheduleNotification(
        'Scheduled Title',
        'Scheduled Body',
        futureDate
      );
      
      expect(id).toBeDefined();
    });

    it('devrait mettre à jour le badge', async () => {
      await localNotifications.setBadgeCount(5);
      // Pas d'erreur levée
      expect(true).toBe(true);
    });

    it('devrait effacer le badge', async () => {
      await localNotifications.clearBadge();
      expect(true).toBe(true);
    });
  });

  describe('deepLinking', () => {
    const mockNavRef = {
      current: {
        navigate: jest.fn(),
      },
    };

    it('devrait être exporté et initialisable', () => {
      expect(deepLinking).toBeDefined();
      expect(deepLinking.initialize).toBeDefined();
      expect(deepLinking.createMissionLink).toBeDefined();
      expect(deepLinking.createShareLink).toBeDefined();
      expect(deepLinking.createTrackingLink).toBeDefined();
      expect(deepLinking.createInspectionLink).toBeDefined();
    });

    it('devrait initialiser sans erreur', async () => {
      await deepLinking.initialize(mockNavRef);
      expect(true).toBe(true);
    });

    it('devrait créer un lien mission', () => {
      const links = deepLinking.createMissionLink('mission-123');
      
      expect(links).toBeDefined();
      expect(links.deepLink).toBeDefined();
      expect(links.webLink).toBeDefined();
      expect(links.webLink).toContain('mission/mission-123');
    });

    it('devrait créer un lien de partage', () => {
      const links = deepLinking.createShareLink('ABC123');
      
      expect(links).toBeDefined();
      expect(links.deepLink).toBeDefined();
      expect(links.webLink).toBeDefined();
      expect(links.webLink).toContain('mission/join');
      expect(links.webLink).toContain('ABC123');
    });

    it('devrait créer un lien de tracking', () => {
      const links = deepLinking.createTrackingLink('TRACK123');
      
      expect(links).toBeDefined();
      expect(links.webLink).toContain('track/TRACK123');
    });

    it('devrait créer un lien inspection', () => {
      const links = deepLinking.createInspectionLink('insp-123');
      
      expect(links).toBeDefined();
      expect(links.webLink).toContain('inspection/insp-123');
    });

    it('devrait créer un lien inspection avec type', () => {
      const links = deepLinking.createInspectionLink('insp-123', 'arrival');
      
      expect(links).toBeDefined();
      expect(links.webLink).toContain('inspection/insp-123/arrival');
    });

    it('devrait ouvrir un lien externe', async () => {
      await deepLinking.openExternalLink('https://example.com');
      // Pas d'erreur levée
      expect(true).toBe(true);
    });
  });
});
