// Service de monitoring de performance
import { InteractionManager, Platform } from 'react-native';
import * as Device from 'expo-device';
import { analytics } from './analytics';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ScreenLoadMetric {
  screenName: string;
  loadTime: number;
  renderTime?: number;
  apiCalls?: number;
  apiDuration?: number;
}

interface APIMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  error?: boolean;
}

class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private screenLoadTimes: Map<string, number> = new Map();
  private apiMetrics: APIMetric[] = [];
  private maxMetricsStored = 100;

  // FPS Monitoring
  private lastFrameTime = Date.now();
  private frameCount = 0;
  private fpsValues: number[] = [];

  /**
   * Démarrer le monitoring FPS
   */
  startFPSMonitoring() {
    if (Platform.OS === 'web') return;

    const measureFPS = () => {
      const now = Date.now();
      const delta = now - this.lastFrameTime;
      
      if (delta > 0) {
        const fps = 1000 / delta;
        this.fpsValues.push(fps);
        
        // Garder seulement les 60 dernières valeurs
        if (this.fpsValues.length > 60) {
          this.fpsValues.shift();
        }
      }
      
      this.lastFrameTime = now;
      this.frameCount++;
      
      // Logger toutes les 5 secondes
      if (this.frameCount % 300 === 0) {
        const avgFPS = this.getAverageFPS();
        this.recordMetric('fps_average', avgFPS, {
          min: Math.min(...this.fpsValues),
          max: Math.max(...this.fpsValues),
        });
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Obtenir le FPS moyen
   */
  getAverageFPS(): number {
    if (this.fpsValues.length === 0) return 0;
    const sum = this.fpsValues.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsValues.length);
  }

  /**
   * Tracker le temps de chargement d'un écran
   */
  startScreenLoad(screenName: string) {
    this.screenLoadTimes.set(screenName, Date.now());
    console.log(`⏱️ Screen load started: ${screenName}`);
  }

  /**
   * Terminer le tracking d'un écran
   */
  endScreenLoad(screenName: string, metadata?: Record<string, any>) {
    const startTime = this.screenLoadTimes.get(screenName);
    if (!startTime) {
      console.warn(`⚠️ No start time found for screen: ${screenName}`);
      return;
    }

    const loadTime = Date.now() - startTime;
    this.screenLoadTimes.delete(screenName);

    const metric: ScreenLoadMetric = {
      screenName,
      loadTime,
      ...metadata,
    };

    console.log(`✅ Screen loaded: ${screenName} in ${loadTime}ms`, metadata);

    // Enregistrer la métrique
    this.recordMetric(`screen_load_${screenName}`, loadTime, metadata);

    // Logger dans analytics
    analytics.logPerformance(screenName, loadTime);

    // Alerter si le temps est trop long
    if (loadTime > 3000) {
      console.warn(`⚠️ Slow screen load: ${screenName} took ${loadTime}ms`);
      analytics.logEvent('performance_slow_screen', {
        screen: screenName,
        duration: loadTime,
      });
    }

    return metric;
  }

  /**
   * Tracker les appels API
   */
  async trackAPICall<T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let status = 200;
    let error = false;

    try {
      const result = await apiCall();
      return result;
    } catch (err: any) {
      error = true;
      status = err.status || 500;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      const metric: APIMetric = {
        endpoint,
        method,
        duration,
        status,
        error,
      };

      this.apiMetrics.push(metric);
      
      // Garder seulement les 50 derniers appels
      if (this.apiMetrics.length > 50) {
        this.apiMetrics.shift();
      }

      console.log(`🌐 API ${method} ${endpoint}: ${duration}ms (${status})`);

      // Logger la performance
      this.recordMetric(`api_${method}_${endpoint}`, duration, {
        status,
        error,
      });

      // Alerter si l'appel est lent
      if (duration > 5000) {
        console.warn(`⚠️ Slow API call: ${method} ${endpoint} took ${duration}ms`);
        analytics.logEvent('performance_slow_api', {
          endpoint,
          method,
          duration,
          status,
        });
      }
    }
  }

  /**
   * Enregistrer une métrique personnalisée
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Garder seulement les N dernières métriques
    if (this.metrics.length > this.maxMetricsStored) {
      this.metrics.shift();
    }

    // Logger dans analytics si c'est une métrique importante
    if (value > 1000 || name.includes('slow')) {
      analytics.logEvent('performance_metric', {
        metric_name: name,
        value,
        ...metadata,
      });
    }
  }

  /**
   * Obtenir les métriques récentes
   */
  getMetrics(count: number = 20): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Obtenir les statistiques API
   */
  getAPIStats() {
    if (this.apiMetrics.length === 0) {
      return {
        totalCalls: 0,
        averageDuration: 0,
        slowestCall: null,
        errorRate: 0,
      };
    }

    const durations = this.apiMetrics.map(m => m.duration);
    const errors = this.apiMetrics.filter(m => m.error).length;
    const slowest = this.apiMetrics.reduce((prev, current) => 
      (prev.duration > current.duration) ? prev : current
    );

    return {
      totalCalls: this.apiMetrics.length,
      averageDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      slowestCall: slowest,
      errorRate: Math.round((errors / this.apiMetrics.length) * 100),
    };
  }

  /**
   * Obtenir des informations sur le device
   */
  async getDeviceInfo() {
    return {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
      totalMemory: Device.totalMemory,
      deviceType: Device.deviceType,
    };
  }

  /**
   * Monitorer l'utilisation mémoire
   */
  async measureMemoryUsage() {
    // Note: React Native ne fournit pas directement la mémoire
    // Cette fonction est un placeholder pour des outils natifs
    console.log('📊 Memory monitoring - Available via native modules only');
    
    this.recordMetric('memory_check', Date.now(), {
      note: 'Use native tools for accurate memory tracking',
    });
  }

  /**
   * Générer un rapport de performance
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      device: Device.modelName,
      os: `${Device.osName} ${Device.osVersion}`,
      fps: {
        current: this.getAverageFPS(),
        min: Math.min(...this.fpsValues),
        max: Math.max(...this.fpsValues),
      },
      api: this.getAPIStats(),
      recentMetrics: this.getMetrics(10),
    };

    console.log('📊 Performance Report:', JSON.stringify(report, null, 2));
    
    // Logger dans analytics
    analytics.logEvent('performance_report_generated', {
      avg_fps: report.fps.current,
      api_calls: report.api.totalCalls,
      api_avg_duration: report.api.averageDuration,
    });

    return report;
  }

  /**
   * Effacer toutes les métriques
   */
  clearMetrics() {
    this.metrics = [];
    this.apiMetrics = [];
    this.fpsValues = [];
    this.screenLoadTimes.clear();
    console.log('🧹 Performance metrics cleared');
  }

  /**
   * Hook pour mesurer le render time d'un composant
   */
  measureComponentRender(componentName: string, callback: () => void) {
    const startTime = Date.now();
    
    InteractionManager.runAfterInteractions(() => {
      callback();
      const renderTime = Date.now() - startTime;
      
      this.recordMetric(`component_render_${componentName}`, renderTime);
      
      if (renderTime > 100) {
        console.warn(`⚠️ Slow component render: ${componentName} took ${renderTime}ms`);
      }
    });
  }
}

export const performanceMonitor = new PerformanceMonitorService();

// Hook pour tracker le performance
export function usePerformanceTracking(screenName: string, metadata?: Record<string, any>) {
  const React = require('react');
  
  React.useEffect(() => {
    performanceMonitor.startScreenLoad(screenName);
    
    const timer = setTimeout(() => {
      performanceMonitor.endScreenLoad(screenName, metadata);
    }, 100); // Petit délai pour laisser le render se terminer

    return () => {
      clearTimeout(timer);
    };
  }, [screenName]);
}

// Utilitaire pour mesurer le temps d'exécution
export async function measureExecutionTime<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    performanceMonitor.recordMetric(`execution_${name}`, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    performanceMonitor.recordMetric(`execution_${name}_error`, duration);
    throw error;
  }
}
