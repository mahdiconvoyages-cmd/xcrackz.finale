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
   * 📋 Écouter les changements sur missions
   */
  subscribeToMissions(callback: (payload: MissionPayload) => void) {
    console.log('🔄 Subscribing to missions realtime...');
    
    const channel = supabase
      .channel('missions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'missions',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('🔄 Mission changed:', payload.eventType, payload.new?.reference);
          callback(payload as MissionPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('🔄 Missions subscription status:', status);
      });

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
   * 📍 Écouter les positions GPS pour des missions spécifiques
   */
  subscribeToLocations(missionIds: string[], callback: (payload: MissionPayload) => void) {
    if (missionIds.length === 0) {
      console.log('⚠️ No mission IDs provided for location tracking');
      return null;
    }

    console.log('🔄 Subscribing to locations for missions:', missionIds.length);
    
    const channel = supabase
      .channel('locations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mission_locations',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Filtrer uniquement les missions qui nous intéressent
          if (payload.new && missionIds.includes(payload.new.mission_id)) {
            console.log('📍 New location for tracked mission:', payload.new.mission_id);
            callback(payload as MissionPayload);
          }
        }
      )
      .subscribe((status: any) => {
        console.log('🔄 Locations subscription status:', status);
      });

    this.channels.push(channel);
    return channel;
  }

  /**
   * 👥 Écouter les changements sur profiles (statuts, disponibilités)
   */
  subscribeToProfiles(callback: (payload: MissionPayload) => void) {
    console.log('🔄 Subscribing to profiles realtime...');
    
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('👤 Profile updated:', payload.new?.id);
          callback(payload as MissionPayload);
        }
      )
      .subscribe((status: any) => {
        console.log('🔄 Profiles subscription status:', status);
      });

    this.channels.push(channel);
    return channel;
  }

  /**
   * 🔄 Écouter TOUS les changements assignments (pour admin/créateur)
   */
  subscribeToAllAssignments(callback: (payload: MissionPayload) => void) {
    console.log('🔄 Subscribing to ALL assignments...');
    
    const channel = supabase
      .channel('all-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_assignments',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('🔔 Assignment status changed:', payload.eventType, payload.new?.status);
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
      .subscribe((status: any) => {
        console.log('🔄 All assignments subscription status:', status);
      });

    this.channels.push(channel);
    return channel;
  }

  /**
   * 🧹 Nettoyer toutes les subscriptions
   */
  unsubscribeAll() {
    console.log('🧹 Unsubscribing from all channels:', this.channels.length);
    
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
