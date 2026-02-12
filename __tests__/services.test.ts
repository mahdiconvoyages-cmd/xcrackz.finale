//  Tests basiques pour les services

describe('secureStorage service', () => {
  it('devrait exporter les bonnes méthodes', () => {
    const secureStorage = require('../src/services/secureStorage');
    
    expect(secureStorage.secureStorage).toBeDefined();
    expect(typeof secureStorage.secureStorage.saveAuthToken).toBe('function');
    expect(typeof secureStorage.secureStorage.getAuthToken).toBe('function');
    expect(typeof secureStorage.secureStorage.deleteAuthToken).toBe('function');
    expect(typeof secureStorage.secureStorage.authenticateWithBiometrics).toBe('function');
    expect(typeof secureStorage.secureStorage.isBiometricAvailable).toBe('function');
  });
});

describe('analytics service', () => {
  it('devrait exporter les bonnes méthodes', () => {
    const analytics = require('../src/services/analytics');
    
    expect(analytics.analytics).toBeDefined();
    expect(typeof analytics.analytics.logEvent).toBe('function');
    expect(typeof analytics.analytics.logScreenView).toBe('function');
    expect(typeof analytics.analytics.logMissionCreated).toBe('function');
  });
});

describe('crashReporting service', () => {
  it('devrait exporter les bonnes méthodes', () => {
    const crashReporting = require('../src/services/crashReporting');
    
    expect(crashReporting.crashReporting).toBeDefined();
    expect(typeof crashReporting.crashReporting.reportError).toBe('function');
    expect(typeof crashReporting.crashReporting.reportMessage).toBe('function');
    expect(typeof crashReporting.crashReporting.addBreadcrumb).toBe('function');
  });
});

describe('useAccessibility hook', () => {
  it('devrait exporter les bonnes fonctions', () => {
    const accessibility = require('../src/hooks/useAccessibility');
    
    expect(typeof accessibility.createAccessibilityProps).toBe('function');
    expect(typeof accessibility.announceForAccessibility).toBe('function');
  });
  
  it('createAccessibilityProps devrait retourner les bonnes props', () => {
    const { createAccessibilityProps } = require('../src/hooks/useAccessibility');
    
    const props = createAccessibilityProps('Mon label', 'Mon hint', 'button');
    
    expect(props.accessible).toBe(true);
    expect(props.accessibilityLabel).toBe('Mon label');
    expect(props.accessibilityHint).toBe('Mon hint');
    expect(props.accessibilityRole).toBe('button');
  });
});
