import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

/// Service de synchronisation en temps réel avec le backend web
class SyncService {
  SupabaseClient get _supabase => Supabase.instance.client;
  final Map<String, RealtimeChannel> _channels = {};
  final Map<String, StreamController> _controllers = {};
  final Map<String, Timer?> _debounceTimers = {};
  static const _debounceDuration = Duration(milliseconds: 500);

  /// Synchroniser les missions en temps réel
  Stream<List<Map<String, dynamic>>> syncMissions() {
    const channelName = 'missions_sync';
    
    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<List<Map<String, dynamic>>>;
    }

    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    _controllers[channelName] = controller;

    // Charger les données initiales
    _loadMissions().then((missions) {
      if (!controller.isClosed) {
        controller.add(missions);
      }
    });

    // Écouter les changements en temps réel
    final channel = _supabase.channel(channelName);
    
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'missions',
          callback: (payload) async {
            _debounceTimers[channelName]?.cancel();
            _debounceTimers[channelName] = Timer(_debounceDuration, () async {
              final missions = await _loadMissions();
              if (!controller.isClosed) {
                controller.add(missions);
              }
            });
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  /// Synchroniser les inspections en temps réel
  Stream<List<Map<String, dynamic>>> syncInspections() {
    const channelName = 'vehicle_inspections_sync';
    
    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<List<Map<String, dynamic>>>;
    }

    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    _controllers[channelName] = controller;

    // Charger les données initiales
    _loadInspections().then((inspections) {
      if (!controller.isClosed) {
        controller.add(inspections);
      }
    });

    // Écouter les changements en temps réel
    final channel = _supabase.channel(channelName);
    
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'vehicle_inspections',
          callback: (payload) async {
            _debounceTimers[channelName]?.cancel();
            _debounceTimers[channelName] = Timer(_debounceDuration, () async {
              final inspections = await _loadInspections();
              if (!controller.isClosed) {
                controller.add(inspections);
              }
            });
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  /// Synchroniser les factures en temps réel
  Stream<List<Map<String, dynamic>>> syncInvoices() {
    const channelName = 'invoices_sync';
    
    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<List<Map<String, dynamic>>>;
    }

    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    _controllers[channelName] = controller;

    // Charger les données initiales
    _loadInvoices().then((invoices) {
      if (!controller.isClosed) {
        controller.add(invoices);
      }
    });

    // Écouter les changements en temps réel
    final channel = _supabase.channel(channelName);
    
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'invoices',
          callback: (payload) async {
            final invoices = await _loadInvoices();
            if (!controller.isClosed) {
              controller.add(invoices);
            }
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  /// Synchroniser les devis en temps réel
  Stream<List<Map<String, dynamic>>> syncQuotes() {
    const channelName = 'quotes_sync';
    
    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<List<Map<String, dynamic>>>;
    }

    final controller = StreamController<List<Map<String, dynamic>>>.broadcast();
    _controllers[channelName] = controller;

    // Charger les données initiales
    _loadQuotes().then((quotes) {
      if (!controller.isClosed) {
        controller.add(quotes);
      }
    });

    // Écouter les changements en temps réel
    final channel = _supabase.channel(channelName);
    
    channel
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'quotes',
          callback: (payload) async {
            final quotes = await _loadQuotes();
            if (!controller.isClosed) {
              controller.add(quotes);
            }
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  /// Synchroniser le profil utilisateur en temps réel
  Stream<Map<String, dynamic>?> syncUserProfile(String userId) {
    final channelName = 'profile_sync_$userId';
    
    if (_controllers.containsKey(channelName)) {
      return _controllers[channelName]!.stream as Stream<Map<String, dynamic>?>;
    }

    final controller = StreamController<Map<String, dynamic>?>.broadcast();
    _controllers[channelName] = controller;

    // Charger les données initiales
    _loadUserProfile(userId).then((profile) {
      if (!controller.isClosed) {
        controller.add(profile);
      }
    });

    // Écouter les changements en temps réel
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
            if (!controller.isClosed) {
              controller.add(profile);
            }
          },
        )
        .subscribe();

    _channels[channelName] = channel;
    return controller.stream;
  }

  // Méthodes de chargement des données

  Future<List<Map<String, dynamic>>> _loadMissions() async {
    try {
      final response = await _supabase
          .from('missions')
          .select()
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      logger.e('Error loading missions: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _loadInspections() async {
    try {
      final response = await _supabase
          .from('vehicle_inspections')
          .select()
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      logger.e('Error loading inspections: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _loadInvoices() async {
    try {
      final response = await _supabase
          .from('invoices')
          .select()
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      logger.e('Error loading invoices: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> _loadQuotes() async {
    try {
      final response = await _supabase
          .from('quotes')
          .select()
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      logger.e('Error loading quotes: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> _loadUserProfile(String userId) async {
    try {
      final response = await _supabase
          .from('profiles')
          .select()
          .eq('id', userId)
          .single();
      return response as Map<String, dynamic>;
    } catch (e) {
      logger.e('Error loading user profile: $e');
      return null;
    }
  }

  /// Nettoyer tous les canaux de synchronisation
  void dispose() {      for (var timer in _debounceTimers.values) {
        timer?.cancel();
      }
      _debounceTimers.clear();    for (var channel in _channels.values) {
      _supabase.removeChannel(channel);
    }
    for (var controller in _controllers.values) {
      controller.close();
    }
    _channels.clear();
    _controllers.clear();
  }

  /// Arrêter la synchronisation d'un canal spécifique
  void stopSync(String channelName) {
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

/// Provider pour le service de synchronisation
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
