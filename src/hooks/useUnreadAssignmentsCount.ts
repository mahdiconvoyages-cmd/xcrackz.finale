import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook pour compter le nombre de missions reçues non lues
 */
export function useUnreadAssignmentsCount(userId: string | null) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }

    loadCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadCount = async () => {
    if (!userId) return;

    try {
      const { count: assignmentsCount, error } = await supabase
        .from('mission_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'assigned'); // Seulement les nouvelles assignations

      if (error) throw error;

      setCount(assignmentsCount || 0);
    } catch (error) {
      console.error('Error loading assignments count:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  return { count, loading, refresh: loadCount };
}
