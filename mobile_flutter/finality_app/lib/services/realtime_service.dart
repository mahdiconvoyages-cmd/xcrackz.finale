import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

/// Unified Realtime service for Supabase Postgres Changes.
///
/// Provides both:
///  - **Callback-based** subscriptions (credits, subscription, inspections, missions)
///  - **Stream-based** sync for full table lists with debounce
///
/// Replaces both the old RealtimeService and SyncService.
class RealtimeService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final Map<String, RealtimeChannel> _channels = {};
  final Map<String, StreamController> _controllers = {};
  final Map<String, Timer?> _debounceTimers = {};
  static const _debounceDuration = Duration(milliseconds: 500);

  String? get _currentUserId => _supabase.auth.currentUser?.id;

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
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
          callback: (payload) {
            logger.i('REALTIME: Inspection inserted: ${payload.newRecord['id']}');
            onInsert(payload.newRecord);
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'vehicle_inspections',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'user_id',
            value: userId,
          ),
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
    // Also clean up stream-based resources
    for (var timer in _debounceTimers.values) {
      timer?.cancel();
    }
    _debounceTimers.clear();
    for (var controller in _controllers.values) {
      controller.close();
    }
    _controllers.clear();
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

  // ──────────────────────────────────────────────────────────────
  //  STREAM-BASED SYNC (from former SyncService)
  // ──────────────────────────────────────────────────────────────

  /// Sets up a realtime-synced [Stream] for [table] filtered by `user_id`.
  /// The stream emits the full list each time a change is detected (debounced).
  Stream<List<Map<String, dynamic>>> syncTable({
    required String channelName,
    required String table,
    Future<List<Map<String, dynamic>>> Function()? loader,
  }) {
    final userId = _currentUserId;
    if (userId == null) {
      logger.w('$channelName called without authenticated user');
      return Stream.value([]);
    }

    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<List<Map<String, dynamic>>>;
    }

    final defaultLoader = loader ?? () => _loadTable(table);
    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    _controllers[channelName] = controller;

    // Load initial data
    defaultLoader().then((data) {
      if (!controller.isClosed) controller.add(data);
    });

    // Realtime subscription with debounce
    final channel = _supabase.channel(channelName);
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: table,
          callback: (payload) async {
            _debounceTimers[channelName]?.cancel();
            _debounceTimers[channelName] = Timer(_debounceDuration, () async {
              final data = await defaultLoader();
              if (!controller.isClosed) controller.add(data);
            });
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  /// Generic loader — fetches all rows for [table] where `user_id` matches.
  Future<List<Map<String, dynamic>>> _loadTable(String table) async {
    try {
      final userId = _currentUserId;
      if (userId == null) return [];
      final response = await _supabase
          .from(table)
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      logger.e('Error loading $table: $e');
      return [];
    }
  }

  /// Sync missions stream.
  Stream<List<Map<String, dynamic>>> syncMissions() =>
      syncTable(channelName: 'missions_sync', table: 'missions');

  /// Sync inspections stream.
  Stream<List<Map<String, dynamic>>> syncInspections() =>
      syncTable(channelName: 'vehicle_inspections_sync', table: 'vehicle_inspections');

  /// Sync invoices stream.
  Stream<List<Map<String, dynamic>>> syncInvoices() =>
      syncTable(channelName: 'invoices_sync', table: 'invoices');

  /// Sync quotes stream.
  Stream<List<Map<String, dynamic>>> syncQuotes() =>
      syncTable(channelName: 'quotes_sync', table: 'quotes');

  /// Stop sync for a specific channel.
  void stopSync(String channelName) {
    _debounceTimers[channelName]?.cancel();
    _debounceTimers.remove(channelName);
    if (_channels.containsKey(channelName)) {
      _supabase.removeChannel(_channels[channelName]!);
      _channels.remove(channelName);
    }
    if (_controllers.containsKey(channelName)) {
      _controllers[channelName]!.close();
      _controllers.remove(channelName);
    }
  }
}
