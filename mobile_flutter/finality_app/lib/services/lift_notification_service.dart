// =============================================================
// LiftNotificationService
//
// Écoute les événements Supabase Realtime pour les ride_matches
// et ride_messages liés à l'utilisateur courant et affiche une
// notification locale (app au premier plan) ou FCM (arrière-plan
// via l'Edge Function send-lift-notification).
// =============================================================

import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';

class LiftNotificationService {
  static final LiftNotificationService _instance =
      LiftNotificationService._internal();
  factory LiftNotificationService() => _instance;
  LiftNotificationService._internal();

  final _sb = Supabase.instance.client;
  final _local = FlutterLocalNotificationsPlugin();

  RealtimeChannel? _channelMatches;
  RealtimeChannel? _channelMessages;
  bool _initialized = false;

  String get _uid => _sb.auth.currentUser?.id ?? '';

  // Callback de navigation (branché depuis main.dart)
  static Function(String routeName, Map<String, dynamic> args)? onNavigate;

  // ── Init ────────────────────────────────────────────────────────────────────

  Future<void> initialize() async {
    if (_initialized || _uid.isEmpty) return;
    _initialized = true;

    // Local notifications channel
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _local.initialize(
      const InitializationSettings(android: android, iOS: ios),
      onDidReceiveNotificationResponse: _onTap,
    );

    await _local
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            'lift_notifications',
            'Notifications Lift',
            description: 'Matchs et messages du réseau de lifts',
            importance: Importance.high,
          ),
        );

    _subscribeMatches();
    _subscribeMessages();
    logger.i('LiftNotificationService: initialisé pour $_uid');
  }

  void dispose() {
    _channelMatches?.unsubscribe();
    _channelMessages?.unsubscribe();
    _initialized = false;
  }

  // ── Realtime ride_matches ─────────────────────────────────────────────────

  void _subscribeMatches() {
    _channelMatches = _sb.channel('lift_matches_$_uid')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'ride_matches',
        filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq, column: 'driver_id', value: _uid),
        callback: (payload) => _onNewMatchAsDriver(payload.newRecord),
      )
      ..onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'ride_matches',
        filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq, column: 'passenger_id', value: _uid),
        callback: (payload) => _onMatchUpdatedAsPassenger(payload.newRecord),
      )
      ..subscribe();
  }

  void _subscribeMessages() {
    // Écoute tous les messages dans les matchs où je suis impliqué
    _channelMessages = _sb.channel('lift_messages_$_uid')
      ..onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'ride_messages',
        callback: (payload) => _onNewMessage(payload.newRecord),
      )
      ..subscribe();
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  Future<void> _onNewMatchAsDriver(Map<String, dynamic> match) async {
    final pickup  = match['pickup_city']  as String? ?? '?';
    final dropoff = match['dropoff_city'] as String? ?? '?';
    await _notify(
      id: match['id'].hashCode.abs() % 100000,
      title: '🚗 Nouvelle demande de lift',
      body:  '$pickup → $dropoff · Réponds vite !',
      payload: 'match:${match['id']}',
    );
  }

  Future<void> _onMatchUpdatedAsPassenger(Map<String, dynamic> match) async {
    final status = match['status'] as String? ?? '';
    switch (status) {
      case 'accepted':
        await _notify(
          id: match['id'].hashCode.abs() % 100000,
          title: '✅ Lift confirmé !',
          body:  'Le conducteur a accepté ta demande. Ouvre le chat pour les détails.',
          payload: 'match:${match['id']}',
        );
      case 'declined':
        await _notify(
          id: match['id'].hashCode.abs() % 100000,
          title: '❌ Demande refusée',
          body:  'Le conducteur ne peut pas te prendre. Cherche une autre option.',
          payload: 'match:${match['id']}',
        );
      case 'cancelled':
        await _notify(
          id: match['id'].hashCode.abs() % 100000,
          title: '🔴 Lift annulé',
          body:  'Ton lift a été annulé. Ta demande passe en mode urgence.',
          payload: 'match:${match['id']}',
        );
    }
  }

  Future<void> _onNewMessage(Map<String, dynamic> message) async {
    // Ne pas notifier ses propres messages
    if (message['sender_id'] == _uid) return;

    // Vérifier que ce message concerne un de mes matchs
    final matchId = message['match_id'] as String?;
    if (matchId == null) return;

    try {
      final match = await _sb
          .from('ride_matches')
          .select('driver_id, passenger_id, pickup_city, dropoff_city')
          .eq('id', matchId)
          .maybeSingle();
      if (match == null) return;
      if (match['driver_id'] != _uid && match['passenger_id'] != _uid) return;
    } catch (_) {
      return;
    }

    final content = message['content'] as String? ?? '...';
    await _notify(
      id: message['id'].hashCode.abs() % 100000,
      title: '💬 Message lift',
      body: content.length > 80 ? '${content.substring(0, 80)}…' : content,
      payload: 'chat:$matchId',
    );
  }

  // ── Notification locale ───────────────────────────────────────────────────

  Future<void> _notify({
    required int id,
    required String title,
    required String body,
    String? payload,
  }) async {
    await _local.show(
      id,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'lift_notifications',
          'Notifications Lift',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  void _onTap(NotificationResponse r) {
    final payload = r.payload ?? '';
    logger.i('LiftNotification tapped: $payload');
    if (payload.startsWith('match:') || payload.startsWith('chat:')) {
      final id = payload.split(':').last;
      onNavigate?.call('/planning', {'matchId': id});
    }
  }

  /// Appelé depuis l'app quand un nouveau match est créé côté passager
  /// → envoie une notif push au conducteur via Supabase Edge Function
  Future<void> sendPushToDriver({
    required String driverUserId,
    required String pickupCity,
    required String dropoffCity,
  }) async {
    try {
      await _sb.functions.invoke('send-lift-notification', body: {
        'to_user_id': driverUserId,
        'title': '🚗 Nouvelle demande de lift',
        'body': '$pickupCity → $dropoffCity · Réponds vite !',
        'data': {'type': 'new_match'},
      });
    } catch (e) {
      logger.w('LiftNotif push driver failed: $e');
    }
  }

  /// Appelé quand le conducteur accepte → notif push au passager
  Future<void> sendPushToPassenger({
    required String passengerUserId,
    required String status,
    required String pickupCity,
    required String dropoffCity,
  }) async {
    String title, body;
    switch (status) {
      case 'accepted':
        title = '✅ Lift confirmé !';
        body  = '$pickupCity → $dropoffCity · Ouvre le chat pour les détails.';
      case 'declined':
        title = '❌ Demande refusée';
        body  = 'Cherche une autre option sur le réseau.';
      default:
        return;
    }
    try {
      await _sb.functions.invoke('send-lift-notification', body: {
        'to_user_id': passengerUserId,
        'title': title,
        'body': body,
        'data': {'type': 'match_update', 'status': status},
      });
    } catch (e) {
      logger.w('LiftNotif push passenger failed: $e');
    }
  }
}
