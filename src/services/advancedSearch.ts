// Service de recherche avancée avec filtres et historique
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { analytics } from './analytics';

const SEARCH_HISTORY_KEY = '@finality_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchFilters {
  query?: string;
  status?: ('pending' | 'in_progress' | 'completed')[];
  minPrice?: number;
  maxPrice?: number;
  startDate?: Date;
  endDate?: Date;
  vehicleBrand?: string;
  vehicleModel?: string;
  pickupCity?: string;
  deliveryCity?: string;
}

export interface SearchSortOptions {
  field: 'created_at' | 'pickup_date' | 'delivery_date' | 'price' | 'reference';
  order: 'asc' | 'desc';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters: SearchFilters;
  timestamp: number;
  resultsCount: number;
}

export interface SearchResult {
  missions: any[];
  total: number;
  filters: SearchFilters;
  sort: SearchSortOptions;
}

class AdvancedSearchService {
  /**
   * Recherche avancée avec filtres
   */
  async search(
    userId: string,
    filters: SearchFilters = {},
    sort: SearchSortOptions = { field: 'created_at', order: 'desc' }
  ): Promise<SearchResult> {
    try {
      console.log('🔍 Recherche avec filtres:', filters);
      
      // Construire la requête Supabase
      let query = supabase
        .from('missions')
        .select('*', { count: 'exact' })
        .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`);

      // Recherche textuelle (reference, pickup, delivery)
      if (filters.query && filters.query.trim()) {
        const searchTerm = `%${filters.query.trim()}%`;
        query = query.or(
          `reference.ilike.${searchTerm},pickup_address.ilike.${searchTerm},delivery_address.ilike.${searchTerm},vehicle_brand.ilike.${searchTerm},vehicle_model.ilike.${searchTerm}`
        );
      }

      // Filtrer par statut
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Filtrer par prix
      if (filters.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice);
      }

      // Filtrer par dates
      if (filters.startDate) {
        query = query.gte('pickup_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('pickup_date', filters.endDate.toISOString());
      }

      // Filtrer par marque de véhicule
      if (filters.vehicleBrand) {
        query = query.ilike('vehicle_brand', `%${filters.vehicleBrand}%`);
      }

      // Filtrer par modèle de véhicule
      if (filters.vehicleModel) {
        query = query.ilike('vehicle_model', `%${filters.vehicleModel}%`);
      }

      // Filtrer par ville de départ
      if (filters.pickupCity) {
        query = query.ilike('pickup_address', `%${filters.pickupCity}%`);
      }

      // Filtrer par ville d'arrivée
      if (filters.deliveryCity) {
        query = query.ilike('delivery_address', `%${filters.deliveryCity}%`);
      }

      // Tri
      query = query.order(sort.field, { ascending: sort.order === 'asc' });

      // Exécuter la requête
      const { data, error, count } = await query;

      if (error) throw error;

      console.log(`✅ Recherche terminée: ${count} résultats`);

      // Sauvegarder dans l'historique
      if (filters.query) {
        await this.addToHistory({
          query: filters.query,
          filters,
          resultsCount: count || 0,
        });
      }

      analytics.logEvent('advanced_search_performed', {
        query: filters.query,
        has_filters: Object.keys(filters).length > 1,
        results_count: count || 0,
      });

      return {
        missions: data || [],
        total: count || 0,
        filters,
        sort,
      };
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      throw error;
    }
  }

  /**
   * Recherche rapide (query simple)
   */
  async quickSearch(userId: string, query: string): Promise<any[]> {
    const result = await this.search(userId, { query });
    return result.missions;
  }

  /**
   * Ajouter à l'historique de recherche
   */
  private async addToHistory(item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) {
    try {
      const history = await this.getHistory();
      
      const newItem: SearchHistoryItem = {
        ...item,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      // Ajouter en début de liste
      const updatedHistory = [newItem, ...history];

      // Garder seulement les N derniers
      const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(
        SEARCH_HISTORY_KEY,
        JSON.stringify(trimmedHistory)
      );

      console.log('📝 Recherche ajoutée à l\'historique');
    } catch (error) {
      console.error('❌ Erreur ajout historique:', error);
    }
  }

  /**
   * Obtenir l'historique de recherche
   */
  async getHistory(): Promise<SearchHistoryItem[]> {
    try {
      const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      console.error('❌ Erreur lecture historique:', error);
      return [];
    }
  }

  /**
   * Supprimer un élément de l'historique
   */
  async removeFromHistory(id: string) {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
      console.log('🗑️  Élément supprimé de l\'historique');
    } catch (error) {
      console.error('❌ Erreur suppression historique:', error);
    }
  }

  /**
   * Vider l'historique
   */
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      console.log('🧹 Historique vidé');
      analytics.logEvent('search_history_cleared');
    } catch (error) {
      console.error('❌ Erreur clear historique:', error);
    }
  }

  /**
   * Obtenir des suggestions de recherche basées sur l'historique
   */
  async getSuggestions(prefix: string): Promise<string[]> {
    try {
      const history = await this.getHistory();
      
      // Filtrer les queries qui commencent par le préfixe
      const suggestions = history
        .map(item => item.query)
        .filter(query => 
          query.toLowerCase().startsWith(prefix.toLowerCase())
        )
        .slice(0, 5); // Max 5 suggestions

      // Éliminer les doublons
      return [...new Set(suggestions)];
    } catch (error) {
      console.error('❌ Erreur suggestions:', error);
      return [];
    }
  }

  /**
   * Obtenir les marques de véhicules les plus populaires
   */
  async getPopularBrands(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('vehicle_brand')
        .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`)
        .not('vehicle_brand', 'is', null)
        .limit(1000);

      if (error) throw error;

      // Compter les occurrences
      const brandCounts = (data || []).reduce((acc, mission) => {
        const brand = mission.vehicle_brand?.trim();
        if (brand) {
          acc[brand] = (acc[brand] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Trier par popularité
      const sortedBrands = Object.entries(brandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([brand]) => brand);

      return sortedBrands;
    } catch (error) {
      console.error('❌ Erreur popular brands:', error);
      return [];
    }
  }

  /**
   * Obtenir les villes de départ les plus fréquentes
   */
  async getPopularPickupCities(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('pickup_address')
        .or(`user_id.eq.${userId},assigned_user_id.eq.${userId}`)
        .not('pickup_address', 'is', null)
        .limit(1000);

      if (error) throw error;

      // Extraire les villes (premier mot avant la virgule)
      const cities = (data || [])
        .map(m => m.pickup_address?.split(',')[0]?.trim())
        .filter(Boolean);

      // Compter occurrences
      const cityCounts = cities.reduce((acc, city) => {
        acc[city!] = (acc[city!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Trier par popularité
      const sortedCities = Object.entries(cityCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([city]) => city);

      return sortedCities;
    } catch (error) {
      console.error('❌ Erreur popular cities:', error);
      return [];
    }
  }

  /**
   * Recherche par plage de prix prédéfinie
   */
  async searchByPriceRange(
    userId: string,
    range: '0-500' | '500-1000' | '1000-2000' | '2000+'
  ) {
    const priceRanges = {
      '0-500': { minPrice: 0, maxPrice: 500 },
      '500-1000': { minPrice: 500, maxPrice: 1000 },
      '1000-2000': { minPrice: 1000, maxPrice: 2000 },
      '2000+': { minPrice: 2000 },
    };

    return this.search(userId, priceRanges[range]);
  }

  /**
   * Recherche des missions cette semaine
   */
  async searchThisWeek(userId: string) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return this.search(userId, {
      startDate: startOfWeek,
      endDate: endOfWeek,
    });
  }

  /**
   * Recherche des missions ce mois
   */
  async searchThisMonth(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return this.search(userId, {
      startDate: startOfMonth,
      endDate: endOfMonth,
    });
  }
}

export const advancedSearch = new AdvancedSearchService();

// Hook React pour la recherche avancée
export function useAdvancedSearch(userId: string | null) {
  const React = require('react');
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<SearchHistoryItem[]>([]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  React.useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const h = await advancedSearch.getHistory();
    setHistory(h);
  };

  const search = async (filters: SearchFilters, sort?: SearchSortOptions) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await advancedSearch.search(userId, filters, sort);
      setResults(result.missions);
      await loadHistory();
      return result;
    } finally {
      setLoading(false);
    }
  };

  const quickSearch = async (query: string) => {
    if (!userId) return [];
    
    setLoading(true);
    try {
      const missions = await advancedSearch.quickSearch(userId, query);
      setResults(missions);
      await loadHistory();
      return missions;
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async (prefix: string) => {
    const sugg = await advancedSearch.getSuggestions(prefix);
    setSuggestions(sugg);
    return sugg;
  };

  const clearHistory = async () => {
    await advancedSearch.clearHistory();
    await loadHistory();
  };

  return {
    loading,
    results,
    history,
    suggestions,
    search,
    quickSearch,
    getSuggestions,
    clearHistory,
    refreshHistory: loadHistory,
  };
}
