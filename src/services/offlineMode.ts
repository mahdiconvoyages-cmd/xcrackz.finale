// Service de mode hors-ligne avec synchronisation
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { analytics } from './analytics';
import { crashReporting } from './crashReporting';

const OFFLINE_QUEUE_KEY = '@finality_offline_queue';
const CACHE_KEY_PREFIX = '@finality_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 heures

export interface PendingRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
}

export interface CachedData {
  data: any;
  timestamp: number;
  expiry: number;
}

class OfflineService {
  private isOnline = true;
  private unsubscribeNetInfo: (() => void) | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  /**
   * Initialiser le service offline
   */
  async initialize() {
    try {
      // Vérifier la connexion initiale
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected ?? false;

      console.log('📶 État initial:', this.isOnline ? 'En ligne' : 'Hors ligne');

      // Écouter les changements de connexion
      this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected ?? false;

        console.log('📶 Connexion:', this.isOnline ? 'Restaurée' : 'Perdue');

        // Notifier les listeners
        this.notifyListeners(this.isOnline);

        // Si on revient en ligne, synchroniser
        if (!wasOnline && this.isOnline) {
          this.syncPendingRequests();
        }

        analytics.logEvent('network_status_changed', {
          is_online: this.isOnline,
          connection_type: state.type,
        });
      });

      // Synchroniser automatiquement toutes les 30 secondes si en ligne
      this.startAutoSync();

      analytics.logEvent('offline_mode_initialized');
      console.log('✅ Mode offline initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation offline mode:', error);
      crashReporting.reportError(error as Error, {
        service: 'offline_mode',
        action: 'initialize',
      });
    }
  }

  /**
   * Vérifier si on est en ligne
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Ajouter un listener pour les changements de connexion
   */
  addConnectionListener(callback: (isOnline: boolean) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notifier tous les listeners
   */
  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (error) {
        console.error('❌ Erreur listener:', error);
      }
    });
  }

  /**
   * Ajouter une requête à la queue hors-ligne
   */
  async queueRequest(request: Omit<PendingRequest, 'id' | 'timestamp' | 'retries'>) {
    try {
      const pendingRequest: PendingRequest = {
        ...request,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retries: 0,
      };

      const queue = await this.getQueue();
      queue.push(pendingRequest);
      await this.saveQueue(queue);

      console.log('📝 Requête ajoutée à la queue:', pendingRequest.id);

      analytics.logEvent('request_queued', {
        method: request.method,
        url: request.url,
      });

      return pendingRequest.id;
    } catch (error) {
      console.error('❌ Erreur queue request:', error);
      throw error;
    }
  }

  /**
   * Obtenir la queue des requêtes en attente
   */
  private async getQueue(): Promise<PendingRequest[]> {
    try {
      const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('❌ Erreur lecture queue:', error);
      return [];
    }
  }

  /**
   * Sauvegarder la queue
   */
  private async saveQueue(queue: PendingRequest[]) {
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('❌ Erreur sauvegarde queue:', error);
    }
  }

  /**
   * Synchroniser toutes les requêtes en attente
   */
  async syncPendingRequests() {
    if (!this.isOnline) {
      console.log('⏸️  Hors ligne, sync impossible');
      return;
    }

    try {
      const queue = await this.getQueue();
      
      if (queue.length === 0) {
        console.log('✅ Aucune requête en attente');
        return;
      }

      console.log(`🔄 Synchronisation de ${queue.length} requêtes...`);

      const results = await Promise.allSettled(
        queue.map(request => this.executeRequest(request))
      );

      // Filtrer les requêtes qui ont échoué
      const failedRequests: PendingRequest[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const request = queue[index];
          request.retries += 1;
          
          // Maximum 3 tentatives
          if (request.retries < 3) {
            failedRequests.push(request);
          } else {
            console.log('❌ Requête abandonnée après 3 tentatives:', request.id);
            analytics.logEvent('request_sync_failed', {
              request_id: request.id,
              method: request.method,
            });
          }
        }
      });

      // Sauvegarder uniquement les requêtes échouées
      await this.saveQueue(failedRequests);

      const successCount = queue.length - failedRequests.length;
      console.log(`✅ ${successCount}/${queue.length} requêtes synchronisées`);

      analytics.logEvent('offline_sync_completed', {
        total: queue.length,
        success: successCount,
        failed: failedRequests.length,
      });
    } catch (error) {
      console.error('❌ Erreur sync:', error);
      crashReporting.reportError(error as Error, {
        service: 'offline_mode',
        action: 'sync',
      });
    }
  }

  /**
   * Exécuter une requête HTTP
   */
  private async executeRequest(request: PendingRequest): Promise<Response> {
    console.log(`🚀 Exécution requête: ${request.method} ${request.url}`);

    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers || {},
      body: request.body ? JSON.stringify(request.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Mettre en cache des données
   */
  async cacheData(key: string, data: any, expiryMs: number = CACHE_EXPIRY) {
    try {
      const cached: CachedData = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + expiryMs,
      };

      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${key}`,
        JSON.stringify(cached)
      );

      console.log('💾 Données mises en cache:', key);
    } catch (error) {
      console.error('❌ Erreur cache data:', error);
    }
  }

  /**
   * Récupérer des données du cache
   */
  async getCachedData<T = any>(key: string): Promise<T | null> {
    try {
      const cachedJson = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      
      if (!cachedJson) {
        return null;
      }

      const cached: CachedData = JSON.parse(cachedJson);

      // Vérifier si le cache a expiré
      if (Date.now() > cached.expiry) {
        console.log('⏰ Cache expiré:', key);
        await this.removeCachedData(key);
        return null;
      }

      console.log('📦 Données récupérées du cache:', key);
      return cached.data as T;
    } catch (error) {
      console.error('❌ Erreur get cache:', error);
      return null;
    }
  }

  /**
   * Supprimer des données du cache
   */
  async removeCachedData(key: string) {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
    } catch (error) {
      console.error('❌ Erreur remove cache:', error);
    }
  }

  /**
   * Vider tout le cache
   */
  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      
      console.log(`🧹 Cache vidé (${cacheKeys.length} entrées)`);
      analytics.logEvent('cache_cleared', { count: cacheKeys.length });
    } catch (error) {
      console.error('❌ Erreur clear cache:', error);
    }
  }

  /**
   * Obtenir les statistiques de la queue
   */
  async getQueueStats() {
    const queue = await this.getQueue();
    
    return {
      total: queue.length,
      byMethod: queue.reduce((acc, req) => {
        acc[req.method] = (acc[req.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      oldestTimestamp: queue.length > 0 
        ? Math.min(...queue.map(r => r.timestamp))
        : null,
    };
  }

  /**
   * Démarrer la synchronisation automatique
   */
  private startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingRequests();
      }
    }, 30000); // Toutes les 30 secondes
  }

  /**
   * Arrêter la synchronisation automatique
   */
  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Nettoyer et arrêter le service
   */
  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    this.stopAutoSync();
    this.listeners.clear();

    console.log('🧹 Offline mode nettoyé');
  }
}

export const offlineService = new OfflineService();

// Hook React pour le mode offline
export function useOfflineMode() {
  const React = require('react');
  const [isOnline, setIsOnline] = React.useState(offlineService.getIsOnline());
  const [queueStats, setQueueStats] = React.useState({ total: 0, byMethod: {}, oldestTimestamp: null });

  React.useEffect(() => {
    const unsubscribe = offlineService.addConnectionListener(setIsOnline);
    
    // Charger les stats initiales
    loadStats();

    return unsubscribe;
  }, []);

  const loadStats = async () => {
    const stats = await offlineService.getQueueStats();
    setQueueStats(stats);
  };

  const sync = async () => {
    await offlineService.syncPendingRequests();
    await loadStats();
  };

  return {
    isOnline,
    queueStats,
    sync,
    refreshStats: loadStats,
  };
}
