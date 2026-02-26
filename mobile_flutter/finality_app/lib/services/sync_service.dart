import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

/// @deprecated Use [RealtimeService] instead. This service's functionality
/// has been merged into RealtimeService (see realtime_service.dart).
///
/// Service de synchronisation en temps réel avec le backend web.
///
/// Provides reactive [Stream]s for Supabase tables via Realtime channels.
/// All list queries are scoped to the current authenticated user (`user_id`).
class SyncService {
  SupabaseClient get _supabase => Supabase.instance.client;
  final Map<String, RealtimeChannel> _channels = {};
  final Map<String, StreamController> _controllers = {};
  final Map<String, Timer?> _debounceTimers = {};
  static const _debounceDuration = Duration(milliseconds: 500);

  /// Current authenticated user id, or `null`.
  String? get _currentUserId => _supabase.auth.currentUser?.id;

  // ──────────────────────────────────────────────────────────────
  // Generic sync helper — eliminates code duplication across tables
  // ──────────────────────────────────────────────────────────────

  /// Sets up a realtime-synced [Stream] for [table] filtered by `user_id`.
  ///
  /// [channelName] must be unique per table.
  /// [loader] fetches the full dataset when data changes.
  Stream<List<Map<String, dynamic>>> _syncTable({
    required String channelName,
    required String table,
    required Future<List<Map<String, dynamic>>> Function() loader,
  }) {
    final userId = _currentUserId;
    if (userId == null) {
      logger.w('$channelName called without authenticated user');
      return Stream.value([]);
    }

    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<List<Map<String, dynamic>>>;
    }

    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    _controllers[channelName] = controller;

    // Load initial data
    loader().then((data) {
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
              final data = await loader();
              if (!controller.isClosed) controller.add(data);
            });
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  /// Generic data loader — fetches all rows for [table] where `user_id` matches.
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

  // ──────────────────────────────────────────────────────────────
  // Public sync streams (thin wrappers around _syncTable)
  // ──────────────────────────────────────────────────────────────

  /// Synchroniser les missions en temps réel.
  Stream<List<Map<String, dynamic>>> syncMissions() => _syncTable(
        channelName: 'missions_sync',
        table: 'missions',
        loader: () => _loadTable('missions'),
      );

  /// Synchroniser les inspections en temps réel.
  Stream<List<Map<String, dynamic>>> syncInspections() => _syncTable(
        channelName: 'vehicle_inspections_sync',
        table: 'vehicle_inspections',
        loader: () => _loadTable('vehicle_inspections'),
      );

  /// Synchroniser les factures en temps réel.
  Stream<List<Map<String, dynamic>>> syncInvoices() => _syncTable(
        channelName: 'invoices_sync',
        table: 'invoices',
        loader: () => _loadTable('invoices'),
      );

  /// Synchroniser les devis en temps réel.
  Stream<List<Map<String, dynamic>>> syncQuotes() => _syncTable(
        channelName: 'quotes_sync',
        table: 'quotes',
        loader: () => _loadTable('quotes'),
      );

  /// Synchroniser le profil utilisateur en temps réel.
  Stream<Map<String, dynamic>?> syncUserProfile(String userId) {
    final channelName = 'profile_sync_$userId';

    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<Map<String, dynamic>?>;
    }

    final controller = StreamController<Map<String, dynamic>?>.broadcast();
    _controllers[channelName] = controller;

    _loadUserProfile(userId).then((profile) {
      if (!controller.isClosed) controller.add(profile);
    });

    final channel = _supabase.channel(channelName);
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'profiles',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: userId,
          ),
          callback: (payload) async {
            final profile = await _loadUserProfile(userId);
            if (!controller.isClosed) controller.add(profile);
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  Future<Map<String, dynamic>?> _loadUserProfile(String userId) async {
    try {
      final response = await _supabase
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();
      return response;
    } catch (e) {
      logger.e('Error loading user profile: $e');
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────

  /// Clean up all realtime channels and stream controllers.
  void dispose() {
    for (var timer in _debounceTimers.values) {
      timer?.cancel();
    }
    _debounceTimers.clear();
    for (var channel in _channels.values) {
      _supabase.removeChannel(channel);
    }
    for (var controller in _controllers.values) {
      controller.close();
    }
    _channels.clear();
    _controllers.clear();
  }

  /// Stop synchronisation for a specific channel.
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

/// Provider pour le service de synchronisation.
class SyncProvider extends InheritedWidget {
  final SyncService syncService;

  const SyncProvider({
    super.key,
    required this.syncService,
    required super.child,
  });

  static SyncService? of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<SyncProvider>()?.syncService;
  }

  @override
  bool updateShouldNotify(SyncProvider oldWidget) => false;
}
