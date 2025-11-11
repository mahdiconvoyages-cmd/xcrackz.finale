/**
 * 🔄 Hook pour synchronisation temps réel Supabase
 * 
 * Synchronise automatiquement les données entre web et mobile:
 * - Missions
 * - Inspections
 * - Rapports
 * - Covoiturage
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeTable = 'missions' | 'vehicle_inspections' | 'inspection_reports' | 'carpooling';

interface RealtimeSyncOptions {
  table: RealtimeTable;
  userId?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  filter?: string;
}

/**
 * Active la synchronisation temps réel pour une table
 */
export function useRealtimeSync({
  table,
  userId,
  onInsert,
  onUpdate,
  onDelete,
  filter,
}: RealtimeSyncOptions) {
  useEffect(() => {
    let channel: RealtimeChannel;
    // Conserver des callbacks stables pour éviter les resubscriptions inutiles
    const insertRef = { current: onInsert };
    const updateRef = { current: onUpdate };
    const deleteRef = { current: onDelete };

    const setupRealtime = async () => {
      // Créer le canal de synchronisation
      channel = supabase
        .channel(`${table}_changes_${userId || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: table,
            filter: filter,
          },
          (payload) => {
            console.log(`[Realtime] INSERT ${table}:`, payload.new);
            insertRef.current?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: table,
            filter: filter,
          },
          (payload) => {
            console.log(`[Realtime] UPDATE ${table}:`, payload.new);
            updateRef.current?.(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: table,
            filter: filter,
          },
          (payload) => {
            console.log(`[Realtime] DELETE ${table}:`, payload.old);
            deleteRef.current?.(payload.old);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] ${table} subscription status:`, status);
        });
    };

    setupRealtime();

    // Cleanup: unsubscribe au démontage
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log(`[Realtime] Unsubscribed from ${table}`);
      }
    };
  }, [table, userId, filter]);
}

/**
 * Hook pour synchroniser les missions
 */
export function useMissionsSync(userId: string, onUpdate: () => void) {
  useRealtimeSync({
    table: 'missions',
    userId,
    filter: `user_id=eq.${userId}`,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
  });

  // Aussi écouter les missions assignées
  useRealtimeSync({
    table: 'missions',
    userId,
    filter: `assigned_to_user_id=eq.${userId}`,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
  });
}

/**
 * Hook pour synchroniser les inspections
 */
export function useInspectionsSync(userId: string, onUpdate: () => void) {
  useRealtimeSync({
    table: 'vehicle_inspections',
    userId,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
  });
}

/**
 * Hook pour synchroniser les rapports
 */
export function useReportsSync(userId: string, onUpdate: () => void) {
  useRealtimeSync({
    table: 'vehicle_inspections',
    userId,
    onInsert: onUpdate,
    onUpdate: onUpdate,
  });
}

/**
 * Hook pour synchroniser le covoiturage
 */
export function useCarpoolingSync(userId: string, onUpdate: () => void) {
  useRealtimeSync({
    table: 'carpooling',
    userId,
    filter: `user_id=eq.${userId}`,
    onInsert: onUpdate,
    onUpdate: onUpdate,
    onDelete: onUpdate,
  });
}
