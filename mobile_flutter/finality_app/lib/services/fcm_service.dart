import 'dart:convert';
import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart' show navigatorKey;
import '../screens/missions/mission_detail_screen.dart';
import '../utils/logger.dart';

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  logger.i('FCM background message: ${message.messageId}');
}

/// Firebase Cloud Messaging Service
/// Gère les notifications push via FCM
class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  StreamSubscription<RemoteMessage>? _onMessageSub;
  StreamSubscription<RemoteMessage>? _onMessageOpenedSub;
  StreamSubscription<String>? _onTokenRefreshSub;

  /// Initialise FCM et les notifications locales
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Set background handler
      FirebaseMessaging.onBackgroundMessage(
          _firebaseMessagingBackgroundHandler);

      // Request permission
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        logger.w('FCM: Notifications refusées par l\'utilisateur');
        return;
      }

      // Initialize local notifications for foreground
      const androidSettings =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _localNotifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      // Create notification channel
      const channel = AndroidNotificationChannel(
        'checksfleet_notifications',
        'ChecksFleet Notifications',
        description: 'Notifications de l\'application ChecksFleet',
        importance: Importance.high,
        playSound: true,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);

      // Handle foreground messages
      _onMessageSub = FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle message opened app
      _onMessageOpenedSub = FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

      // Check if app was opened from notification
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleMessageOpenedApp(initialMessage);
      }

      // Get and save FCM token
      await _saveToken();

      // Listen for token refresh
      _onTokenRefreshSub = _messaging.onTokenRefresh.listen((token) => _saveTokenToSupabase(token));

      _initialized = true;
      logger.i('FCM: Initialisé avec succès');
    } catch (e) {
      logger.e('FCM: Erreur d\'initialisation: $e');
    }
  }

  /// Récupère et sauvegarde le token FCM
  Future<void> _saveToken() async {
    try {
      final token = await _messaging.getToken();
      if (token != null) {
        logger.i('FCM Token: ${token.substring(0, 20)}...');
        await _saveTokenToSupabase(token);
      }
    } catch (e) {
      logger.e('FCM: Erreur récupération token: $e');
    }
  }

  /// Sauvegarde le token FCM dans Supabase (table profiles)
  Future<void> _saveTokenToSupabase(String token) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      await Supabase.instance.client
          .from('profiles')
          .update({'fcm_token': token}).eq('id', user.id);

      logger.i('FCM: Token sauvegardé dans profiles');
    } catch (e) {
      logger.e('FCM: Erreur sauvegarde token: $e');
    }
  }

  /// Gère les messages reçus quand l'app est au premier plan
  void _handleForegroundMessage(RemoteMessage message) {
    logger.i('FCM foreground: ${message.notification?.title}');

    final notification = message.notification;
    if (notification == null) return;

    _localNotifications.show(
      notification.hashCode,
      notification.title ?? 'ChecksFleet',
      notification.body ?? '',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'checksfleet_notifications',
          'ChecksFleet Notifications',
          channelDescription: 'Notifications de l\'application ChecksFleet',
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
      payload: jsonEncode(message.data),
    );
  }

  /// Gère le tap sur une notification (app ouverte depuis notification)
  void _handleMessageOpenedApp(RemoteMessage message) {
    logger.i('FCM notification tapped: ${message.data}');
    _navigateFromPayload(message.data);
  }

  /// Callback quand l'utilisateur tape sur une notification locale
  void _onNotificationTapped(NotificationResponse response) {
    logger.i('Notification tapped: ${response.payload}');
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!) as Map<String, dynamic>;
        _navigateFromPayload(data);
      } catch (_) {}
    }
  }

  /// Navigate based on notification payload data
  void _navigateFromPayload(Map<String, dynamic> data) {
    final context = navigatorKey.currentContext;
    if (context == null) return;

    final missionId = data['mission_id'] as String?;
    if (missionId != null && missionId.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => MissionDetailScreen(missionId: missionId),
        ),
      );
    }
  }

  /// Met à jour le token après login
  Future<void> refreshToken() async {
    await _saveToken();
  }

  /// Supprime le token (logout)
  Future<void> clearToken() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user != null) {
        await Supabase.instance.client
            .from('profiles')
            .update({'fcm_token': null}).eq('id', user.id);
      }
      await _messaging.deleteToken();
      logger.i('FCM: Token supprimé');
    } catch (e) {
      logger.e('FCM: Erreur suppression token: $e');
    }
  }

  /// Libère les listeners
  void dispose() {
    _onMessageSub?.cancel();
    _onMessageOpenedSub?.cancel();
    _onTokenRefreshSub?.cancel();
  }
}
