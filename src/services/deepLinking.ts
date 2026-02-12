// Service de deep linking complet
import * as Linking from 'expo-linking';
import { analytics } from './analytics';
import { crashReporting } from './crashReporting';
import { Routes } from '../navigation/Routes';

interface DeepLinkConfig {
  path: string;
  parse?: Record<string, (value: string) => any>;
  exact?: boolean;
}

interface DeepLinkRoute {
  screen: string;
  params?: Record<string, any>;
}

class DeepLinkingService {
  private baseUrl = 'finality://';
  private webUrl = 'https://finality.app';
  private navigationRef: any = null;
  private linkingListener: any = null;

  // Configuration des routes
  private routeConfig: Record<string, DeepLinkConfig> = {
    // Missions
    'mission/:missionId': {
      path: 'mission/:missionId',
      parse: {
        missionId: (id) => id,
      },
    },
    'mission/:missionId/edit': {
      path: 'mission/:missionId/edit',
    },
    'mission/create': {
      path: 'mission/create',
      exact: true,
    },
    'mission/join/:shareCode': {
      path: 'mission/join/:shareCode',
      parse: {
        shareCode: (code) => code.toUpperCase(),
      },
    },

    // Inspections
    'inspection/:inspectionId': {
      path: 'inspection/:inspectionId',
    },
    'inspection/:inspectionId/arrival': {
      path: 'inspection/:inspectionId/arrival',
    },
    'inspection/:inspectionId/departure': {
      path: 'inspection/:inspectionId/departure',
    },
    'inspection/:inspectionId/report': {
      path: 'inspection/:inspectionId/report',
    },

    // Profil & Paramètres
    'profile': {
      path: 'profile',
      exact: true,
    },
    'profile/edit': {
      path: 'profile/edit',
    },
    'settings': {
      path: 'settings',
      exact: true,
    },
    'settings/:section': {
      path: 'settings/:section',
      parse: {
        section: (s) => s,
      },
    },

    // Paiements & Facturation
    'billing': {
      path: 'billing',
      exact: true,
    },
    'billing/invoice/:invoiceId': {
      path: 'billing/invoice/:invoiceId',
    },
    'subscription': {
      path: 'subscription',
      exact: true,
    },

    // Dashboard & Stats
    'dashboard': {
      path: 'dashboard',
      exact: true,
    },
    'stats': {
      path: 'stats',
      exact: true,
    },

    // Notifications
    'notifications': {
      path: 'notifications',
      exact: true,
    },

    // Tracking
    'track/:trackingCode': {
      path: 'track/:trackingCode',
      parse: {
        trackingCode: (code) => code.toUpperCase(),
      },
    },
  };

  /**
   * Initialiser le service
   */
  async initialize(navigationRef: any) {
    this.navigationRef = navigationRef;

    try {
      // Gérer le lien initial (app lancée via deep link)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🔗 Initial URL:', initialUrl);
        this.handleDeepLink(initialUrl);
      }

      // Écouter les deep links pendant que l'app est ouverte
      this.linkingListener = Linking.addEventListener('url', ({ url }) => {
        console.log('🔗 Deep link reçu:', url);
        this.handleDeepLink(url);
      });

      console.log('✅ Deep linking initialisé');
      analytics.logEvent('deep_linking_initialized');
    } catch (error) {
      console.error('❌ Erreur initialisation deep linking:', error);
      crashReporting.reportError(error as Error, {
        service: 'deep_linking',
        action: 'initialize',
      });
    }
  }

  /**
   * Gérer un deep link
   */
  private async handleDeepLink(url: string) {
    try {
      const parsed = Linking.parse(url);
      console.log('📱 Deep link parsé:', parsed);

      analytics.logEvent('deep_link_opened', {
        url,
        hostname: parsed.hostname,
        path: parsed.path,
      });

      // Extraire le chemin et les paramètres
      const route = this.matchRoute(parsed.path || '', parsed.queryParams);

      if (route) {
        this.navigateToRoute(route.screen, route.params);
      } else {
        console.warn('⚠️ Aucune route trouvée pour:', parsed.path);
        analytics.logEvent('deep_link_not_found', {
          path: parsed.path,
        });
      }
    } catch (error) {
      console.error('❌ Erreur traitement deep link:', error);
      crashReporting.reportError(error as Error, {
        service: 'deep_linking',
        action: 'handle',
        url,
      });
    }
  }

  /**
   * Matcher un chemin avec la configuration
   */
  private matchRoute(path: string, queryParams?: Record<string, any>): DeepLinkRoute | null {
    // Nettoyer le chemin
    path = path.replace(/^\//, '').replace(/\/$/, '');

    for (const [routeKey, config] of Object.entries(this.routeConfig)) {
      const regex = this.pathToRegex(config.path);
      const match = path.match(regex);

      if (match) {
        const params = this.extractParams(config.path, match, config.parse);
        
        // Fusionner avec les query params
        const allParams = { ...params, ...queryParams };

        // Mapper vers le nom de l'écran React Navigation
        const screen = this.mapPathToScreen(routeKey);

        return {
          screen,
          params: allParams,
        };
      }
    }

    return null;
  }

  /**
   * Convertir un chemin en regex
   */
  private pathToRegex(path: string): RegExp {
    const regexPath = path
      .replace(/:\w+/g, '([^/]+)') // :param -> capture group
      .replace(/\//g, '\\/');      // escape slashes
    
    return new RegExp(`^${regexPath}$`);
  }

  /**
   * Extraire les paramètres du match
   */
  private extractParams(
    path: string,
    match: RegExpMatchArray,
    parse?: Record<string, (value: string) => any>
  ): Record<string, any> {
    const paramNames = path.match(/:\w+/g)?.map(p => p.slice(1)) || [];
    const params: Record<string, any> = {};

    paramNames.forEach((name, index) => {
      const value = match[index + 1];
      params[name] = parse?.[name] ? parse[name](value) : value;
    });

    return params;
  }

  /**
   * Mapper un chemin vers un écran
   */
  private mapPathToScreen(routeKey: string): string {
    const mapping: Record<string, string> = {
      'mission/:missionId': Routes.MissionView,
      'mission/:missionId/edit': Routes.MissionEdit,
      'mission/create': Routes.MissionCreate,
      'mission/join/:shareCode': Routes.Missions, // + modal
      
      'inspection/:inspectionId': Routes.InspectionView,
      'inspection/:inspectionId/arrival': Routes.InspectionArrival,
      'inspection/:inspectionId/departure': Routes.InspectionDeparture,
      'inspection/:inspectionId/report': Routes.InspectionReport,
      
      'profile': Routes.Profile,
      'profile/edit': Routes.ProfileEdit,
      'settings': Routes.Settings,
      
      'dashboard': Routes.Dashboard,
      'notifications': Routes.Notifications,
      
      'billing': Routes.Billing,
      'subscription': Routes.Subscription,
      
      'track/:trackingCode': Routes.TrackingPublic,
    };

    return mapping[routeKey] || Routes.Missions;
  }

  /**
   * Naviguer vers une route
   */
  private navigateToRoute(screen: string, params?: Record<string, any>) {
    if (!this.navigationRef?.current) {
      console.warn('⚠️ Navigation ref non disponible');
      return;
    }

    try {
      console.log(`🧭 Navigation vers ${screen}`, params);
      this.navigationRef.current.navigate(screen, params);
      
      analytics.logEvent('deep_link_navigated', {
        screen,
        has_params: !!params,
      });
    } catch (error) {
      console.error('❌ Erreur navigation:', error);
      crashReporting.reportError(error as Error, {
        service: 'deep_linking',
        action: 'navigate',
        screen,
      });
    }
  }

  /**
   * Créer un deep link
   */
  createDeepLink(path: string, params?: Record<string, any>): string {
    const url = Linking.createURL(path, { queryParams: params });
    console.log('🔗 Deep link créé:', url);
    return url;
  }

  /**
   * Créer un lien web
   */
  createWebLink(path: string, params?: Record<string, any>): string {
    const query = params
      ? '?' + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
      : '';
    
    const url = `${this.webUrl}/${path}${query}`;
    console.log('🌐 Web link créé:', url);
    return url;
  }

  /**
   * Partager un lien vers une mission
   */
  createMissionLink(missionId: string): { deepLink: string; webLink: string } {
    return {
      deepLink: this.createDeepLink(`mission/${missionId}`),
      webLink: this.createWebLink(`mission/${missionId}`),
    };
  }

  /**
   * Créer un lien de partage avec code
   */
  createShareLink(shareCode: string): { deepLink: string; webLink: string } {
    return {
      deepLink: this.createDeepLink(`mission/join/${shareCode}`),
      webLink: this.createWebLink(`mission/join/${shareCode}`),
    };
  }

  /**
   * Créer un lien de tracking public
   */
  createTrackingLink(trackingCode: string): { deepLink: string; webLink: string } {
    return {
      deepLink: this.createDeepLink(`track/${trackingCode}`),
      webLink: this.createWebLink(`track/${trackingCode}`),
    };
  }

  /**
   * Créer un lien vers une inspection
   */
  createInspectionLink(
    inspectionId: string,
    type?: 'arrival' | 'departure' | 'report'
  ): { deepLink: string; webLink: string } {
    const path = type
      ? `inspection/${inspectionId}/${type}`
      : `inspection/${inspectionId}`;
    
    return {
      deepLink: this.createDeepLink(path),
      webLink: this.createWebLink(path),
    };
  }

  /**
   * Ouvrir un lien externe
   */
  async openExternalLink(url: string) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
        analytics.logEvent('external_link_opened', { url });
      } else {
        console.warn('⚠️ Impossible d\'ouvrir:', url);
      }
    } catch (error) {
      console.error('❌ Erreur ouverture lien:', error);
      crashReporting.reportError(error as Error, {
        service: 'deep_linking',
        action: 'open_external',
        url,
      });
    }
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    if (this.linkingListener) {
      this.linkingListener.remove();
    }
    console.log('🧹 Deep linking nettoyé');
  }
}

export const deepLinking = new DeepLinkingService();

// Hook React pour deep linking
export function useDeepLinking(navigationRef: any) {
  const React = require('react');
  
  React.useEffect(() => {
    deepLinking.initialize(navigationRef);
    
    return () => {
      deepLinking.cleanup();
    };
  }, [navigationRef]);

  return {
    createMissionLink: deepLinking.createMissionLink.bind(deepLinking),
    createShareLink: deepLinking.createShareLink.bind(deepLinking),
    createTrackingLink: deepLinking.createTrackingLink.bind(deepLinking),
    openExternalLink: deepLinking.openExternalLink.bind(deepLinking),
  };
}
