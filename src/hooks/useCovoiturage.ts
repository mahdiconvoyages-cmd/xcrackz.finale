import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Trip {
  id: string;
  user_id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  arrival_time?: string;
  duration?: number;
  available_seats: number;
  price_per_seat: number;
  total_distance?: number;
  comfort_level?: string;
  features?: string[];
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  status: string;
  notes?: string;
  created_at?: string;
}

interface UseCovoiturageResult {
  trips: Trip[];
  loading: boolean;
  error: string | null;
  searchTrips: (from: string, to: string, date?: string) => Promise<void>;
  createTrip: (tripData: Partial<Trip>) => Promise<Trip | null>;
  getMyTrips: () => Promise<void>;
}

/**
 * Hook pour gérer les opérations de covoiturage avec Supabase
 * 
 * @example
 * const { trips, loading, searchTrips, createTrip } = useCovoiturage();
 * 
 * // Rechercher des trajets
 * await searchTrips('Paris', 'Lyon');
 * 
 * // Créer un trajet
 * await createTrip({
 *   departure_city: 'Paris',
 *   arrival_city: 'Lyon',
 *   departure_date: '2025-10-15',
 *   departure_time: '14:30',
 *   available_seats: 3,
 *   price_per_seat: 25.00,
 * });
 */
export const useCovoiturage = (): UseCovoiturageResult => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Rechercher des trajets de covoiturage
   */
  const searchTrips = async (
    from: string,
    to: string,
    date?: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Covoiturage] Recherche trajets:', { from, to, date });

      let query = supabase
        .from('covoiturage_trips')
        .select('*')
        .eq('status', 'published')
        .order('departure_date', { ascending: true })
        .order('departure_time', { ascending: true });

      // Filtrer par ville de départ
      if (from && from.trim()) {
        query = query.ilike('departure_city', `%${from.trim()}%`);
      }

      // Filtrer par ville d'arrivée
      if (to && to.trim()) {
        query = query.ilike('arrival_city', `%${to.trim()}%`);
      }

      // Filtrer par date
      if (date) {
        query = query.eq('departure_date', date);
      } else {
        // Sans date précise : ne montrer que les trajets d'aujourd'hui ou futurs
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('departure_date', today);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('[Covoiturage] Erreur requête:', queryError);
        throw queryError;
      }

      console.log('[Covoiturage] Trajets trouvés:', data?.length || 0);
      setTrips(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[Covoiturage] Erreur recherche:', errorMessage);
      setError(errorMessage);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Créer un nouveau trajet de covoiturage
   */
  const createTrip = async (tripData: Partial<Trip>): Promise<Trip | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Covoiturage] Création trajet:', tripData);

      // Récupérer l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Utilisateur non connecté');
      }

      // Préparer les données du trajet
      const tripToInsert = {
        ...tripData,
        user_id: user.id,
        status: 'published',
      };

      // Insérer le trajet dans la base de données
      const { data, error: insertError } = await supabase
        .from('covoiturage_trips')
        .insert([tripToInsert])
        .select()
        .single();

      if (insertError) {
        console.error('[Covoiturage] Erreur insertion:', insertError);
        throw insertError;
      }

      console.log('[Covoiturage] Trajet créé avec succès:', data.id);
      
      // Ajouter le nouveau trajet à la liste locale
      setTrips(prev => [data, ...prev]);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[Covoiturage] Erreur création:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Récupérer les trajets de l'utilisateur connecté
   */
  const getMyTrips = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Utilisateur non connecté');
      }

      const { data, error: queryError } = await supabase
        .from('covoiturage_trips')
        .select('*')
        .eq('user_id', user.id)
        .order('departure_date', { ascending: false });

      if (queryError) throw queryError;

      setTrips(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[Covoiturage] Erreur récupération trajets:', errorMessage);
      setError(errorMessage);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    trips,
    loading,
    error,
    searchTrips,
    createTrip,
    getMyTrips,
  };
};
