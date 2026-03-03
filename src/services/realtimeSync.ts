/**
 * 🔄 Service de synchronisation temps réel Web ↔ Supabase
 * 
 * Utilise Supabase Realtime pour synchroniser toutes les données
 * entre web et mobile instantanément
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface MissionPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
}

class RealtimeSync {
  private channels: RealtimeChannel[] = [];

  /**
   * 📋 Écouter les changements sur missions — filtré par user_id
   * Requiert userId pour éviter de recevoir toutes les missions de tous les utilisateurs
   */
  subscribeToMissions(userId: string, callback: (payload: MissionPayload) => void) {
    if (!userId) return null;
    
    const channel = supabase
      .channel(`missions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          callback(payload as MissionPayload);
        }
      )
      .subscribe();

    this.channels.push(channel);
    return channel;
  }

  /**
   * 🎯 Écouter les changements sur assignments d'un utilisateur
   */
  subscribeToAssignments(userId: string, callback: (payload: MissionPayload) => void) {
    console.log('🔄 Subscribing to assignments for user:', userId);
    
    const channel = supabase
      .channel(`assignments-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('🔔 Assignment changed:', payload.eventType);
          callback(payload as MissionPayload);
          
          // Notification browser si nouvelle assignation
          if (payload.eventType === 'INSERT' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('🚗 Nouvelle Mission', {
                body: 'Une mission vous a été assignée',
                icon: '/logo.png',
              });
            }
          }
        }
      )
      .subscribe((status: any) => {
        console.log('🔄 Assignments subscription status:', status);
      });

    this.channels.push(channel);
    return channel;
  }

  /**
   * 📍 Écouter les positions GPS — une souscription filtrée par mission
   * Évite de recevoir les positions GPS de toutes les missions
   */
  subscribeToLocations(missionIds: string[], callback: (payload: MissionPayload) => void) {
    if (missionIds.length === 0) return null;

    // Une souscription filtrée par mission_id au lieu d'une globale
    const channels: RealtimeChannel[] = [];
    for (const missionId of missionIds.slice(0, 5)) { // max 5 missions en simultané
      const ch = supabase
        .channel(`locations-${missionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mission_tracking_live',
            filter: `mission_id=eq.${missionId}`,
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            callback(payload as MissionPayload);
          }
        )
        .subscribe();
      channels.push(ch);
      this.channels.push(ch);
    }
    return channels[0] ?? null;
  }

  /**
   * 👥 Écouter les changements sur un profil spécifique uniquement
   */
  subscribeToProfiles(userId: string, callback: (payload: MissionPayload) => void) {
    if (!userId) return null;

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          callback(payload as MissionPayload);
        }
      )
      .subscribe();

    this.channels.push(channel);
    return channel;
  }

  /**
   * 🔄 Écouter les changements assignments pour un créateur (filtré)
   */
  subscribeToAllAssignments(creatorId: string, callback: (payload: MissionPayload) => void) {
    if (!creatorId) return null;

    const channel = supabase
      .channel(`all-assignments-${creatorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
          filter: `created_by=eq.${creatorId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          callback(payload as MissionPayload);
          
          // Notification si acceptance/refus
          if (payload.eventType === 'UPDATE' && payload.new?.status !== payload.old?.status) {
            const status = payload.new.status;
            if (status === 'accepted' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('✅ Mission Acceptée', {
                body: 'Un collaborateur a accepté la mission',
                icon: '/logo.png',
              });
            }
            if (status === 'refused' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('❌ Mission Refusée', {
                body: 'Un collaborateur a refusé la mission',
                icon: '/logo.png',
              });
            }
          }
        }
      )
      .subscribe();

    this.channels.push(channel);
    return channel;
  }

  /**
   * 🧹 Nettoyer toutes les subscriptions
   */
  unsubscribeAll() {
    
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    
    this.channels = [];
  }

  /**
   * 📊 Obtenir le statut des subscriptions
   */
  getStatus() {
    return {
      activeChannels: this.channels.length,
      channels: this.channels.map(ch => ch.topic),
    };
  }

  /**
   * 🔔 Demander permission notifications browser
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('⚠️ Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission === 'granted';
    }

    return false;
  }
}

// Export singleton
export const realtimeSync = new RealtimeSync();

// Export pour debugging
if (typeof window !== 'undefined') {
  (window as any).realtimeSync = realtimeSync;
}
