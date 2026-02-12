import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type SubscriptionCallback = () => void;

class RealtimeSync {
  private subscriptions: Map<string, RealtimeChannel> = new Map();

  /**
   * S'abonner aux changements d'une table pour un utilisateur
   */
  subscribe(
    table: string,
    userId: string,
    onUpdate: SubscriptionCallback
  ): RealtimeChannel {
    const channelName = `${table}_${userId}`;

    // Si déjà abonné, retourner la souscription existante
    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName)!;
    }

    console.log(`[Realtime] Subscribing to ${table} for user ${userId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log(`[Realtime] Change detected in ${table}:`, payload.eventType);
          onUpdate();
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for ${table}:`, status);
      });

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  /**
   * S'abonner aux missions
   */
  subscribeToMissions(userId: string, onUpdate: SubscriptionCallback) {
    return this.subscribe('missions', userId, onUpdate);
  }

  /**
   * S'abonner aux inspections de véhicules
   */
  subscribeToInspections(userId: string, onUpdate: SubscriptionCallback) {
    return this.subscribe('vehicle_inspections', userId, onUpdate);
  }

  /**
   * S'abonner aux factures
   */
  subscribeToInvoices(userId: string, onUpdate: SubscriptionCallback) {
    return this.subscribe('invoices', userId, onUpdate);
  }

  /**
   * S'abonner aux devis
   */
  subscribeToQuotes(userId: string, onUpdate: SubscriptionCallback) {
    return this.subscribe('quotes', userId, onUpdate);
  }

  /**
   * S'abonner aux clients
   */
  subscribeToClients(userId: string, onUpdate: SubscriptionCallback) {
    return this.subscribe('clients', userId, onUpdate);
  }

  /**
   * S'abonner aux messages de covoiturage pour un trip spécifique
   */
  subscribeToCarpoolingMessages(tripId: string, onUpdate: SubscriptionCallback) {
    const channelName = `carpooling_messages_${tripId}`;

    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName)!;
    }

    console.log(`[Realtime] Subscribing to messages for trip ${tripId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'carpooling_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log('[Realtime] New message:', payload);
          onUpdate();
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  /**
   * S'abonner aux voyages de covoiturage
   */
  subscribeToCarpoolingTrips(userId: string, onUpdate: SubscriptionCallback) {
    return this.subscribe('carpooling_trips', userId, onUpdate);
  }

  /**
   * S'abonner aux réservations de covoiturage (comme conducteur ou passager)
   */
  subscribeToCarpoolingBookings(userId: string, onUpdate: SubscriptionCallback) {
    const channelName = `carpooling_bookings_${userId}`;

    if (this.subscriptions.has(channelName)) {
      return this.subscriptions.get(channelName)!;
    }

    console.log(`[Realtime] Subscribing to carpooling bookings for user ${userId}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carpooling_bookings',
          filter: `passenger_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Booking change (as passenger):', payload.eventType);
          onUpdate();
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    return channel;
  }

  /**
   * Se désabonner d'un canal spécifique
   */
  async unsubscribe(channelName: string) {
    const channel = this.subscriptions.get(channelName);
    if (channel) {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      await supabase.removeChannel(channel);
      this.subscriptions.delete(channelName);
    }
  }

  /**
   * Se désabonner de tous les canaux
   */
  async unsubscribeAll() {
    console.log('[Realtime] Unsubscribing from all channels');
    for (const [channelName, channel] of this.subscriptions) {
      await supabase.removeChannel(channel);
    }
    this.subscriptions.clear();
  }

  /**
   * Vérifier si un canal est actif
   */
  isSubscribed(channelName: string): boolean {
    return this.subscriptions.has(channelName);
  }

  /**
   * Obtenir tous les canaux actifs
   */
  getActiveChannels(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Instance singleton
export const realtimeSync = new RealtimeSync();
