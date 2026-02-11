import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

/// Service de gestion des subscriptions Supabase Realtime
/// Permet d'écouter les changements en temps réel sur les tables
class RealtimeService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final Map<String, RealtimeChannel> _channels = {};

  /// Subscribe to missions changes for a specific user
  StreamSubscription<dynamic>? subscribeMissions({
    required String userId,
    required Function(Map<String, dynamic>) onInsert,
    required Function(Map<String, dynamic>) onUpdate,
    Function(Map<String, dynamic>)? onDelete,
  }) {
    final channelKey = 'missions_$userId';
    
    // Remove existing channel if any
    _channels[channelKey]?.unsubscribe();

    final channel = _supabase
        .channel(channelKey)
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'missions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            logger.i('REALTIME: Mission inserted: ${payload.newRecord['id']}');
            onInsert(payload.newRecord);
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'missions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            logger.i('REALTIME: Mission updated: ${payload.newRecord['id']}');
            onUpdate(payload.newRecord);
          },
        )
        .subscribe();

    _channels[channelKey] = channel;
    return null;
  }

  /// Subscribe to user credits changes
  StreamSubscription<dynamic>? subscribeCredits({
    required String userId,
    required Function(int newCredits) onChange,
  }) {
    final channelKey = 'credits_$userId';
    
    _channels[channelKey]?.unsubscribe();

    final channel = _supabase
        .channel(channelKey)
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'profiles',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: userId,
          ),
          callback: (payload) {
            final newCredits = payload.newRecord['credits'] as int? ?? 0;
            logger.i('REALTIME: Credits updated: $newCredits');
            onChange(newCredits);
          },
        )
        .subscribe();

    _channels[channelKey] = channel;
    return null;
  }

  /// Subscribe to subscription changes
  StreamSubscription<dynamic>? subscribeSubscription({
    required String userId,
    required Function(Map<String, dynamic>) onChange,
  }) {
    final channelKey = 'subscription_$userId';
    
    _channels[channelKey]?.unsubscribe();

    final channel = _supabase
        .channel(channelKey)
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'subscriptions',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            logger.i('REALTIME: Subscription changed');
            onChange(payload.newRecord);
          },
        )
        .subscribe();

    _channels[channelKey] = channel;
    return null;
  }

  /// Subscribe to vehicle inspections changes
  StreamSubscription<dynamic>? subscribeInspections({
    required String userId,
    required Function(Map<String, dynamic>) onInsert,
    required Function(Map<String, dynamic>) onUpdate,
  }) {
    final channelKey = 'inspections_$userId';
    
    _channels[channelKey]?.unsubscribe();

    final channel = _supabase
        .channel(channelKey)
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'vehicle_inspections',
          callback: (payload) {
            logger.i('REALTIME: Inspection inserted: ${payload.newRecord['id']}');
            onInsert(payload.newRecord);
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'vehicle_inspections',
          callback: (payload) {
            logger.i('REALTIME: Inspection updated: ${payload.newRecord['id']}');
            onUpdate(payload.newRecord);
          },
        )
        .subscribe();

    _channels[channelKey] = channel;
    return null;
  }

  /// Unsubscribe from a specific channel
  void unsubscribe(String channelKey) {
    _channels[channelKey]?.unsubscribe();
    _channels.remove(channelKey);
    logger.d('REALTIME: Unsubscribed from $channelKey');
  }

  /// Unsubscribe from all channels
  void unsubscribeAll() {
    for (var channel in _channels.values) {
      channel.unsubscribe();
    }
    _channels.clear();
    logger.d('REALTIME: Unsubscribed from all channels');
  }

  /// Check if a channel is active
  bool isSubscribed(String channelKey) {
    return _channels.containsKey(channelKey);
  }

  /// Get all active channels
  List<String> getActiveChannels() {
    return _channels.keys.toList();
  }
}
