import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CACHE_PREFIX = 'inspection_cache_';

interface CachedInspection {
  data: any;
  timestamp: number;
}

export const cacheManager = {
  async get(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const parsed: CachedInspection = JSON.parse(cached);
      const age = Date.now() - parsed.timestamp;

      if (age > CACHE_TTL) {
        await this.remove(key);
        return null;
      }

      return parsed.data;
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  },

  async set(key: string, data: any): Promise<void> {
    try {
      const cached: CachedInspection = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached));
    } catch (e) {
      console.error('Cache set error:', e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
    } catch (e) {
      console.error('Cache remove error:', e);
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (e) {
      console.error('Cache clear error:', e);
    }
  },
};
