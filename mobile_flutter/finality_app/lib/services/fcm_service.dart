import 'dart:convert';
import 'dart:async';
import 'dart:io' show Platform;
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart' show navigatorKey;
import '../screens/missions/mission_detail_screen.dart';
import '../screens/planning/planning_network_screen.dart';
import '../screens/profile/support_chat_screen.dart';
import '../screens/tracking/tracking_list_screen.dart';
import '../screens/crm/crm_screen.dart';
import '../services/update_service.dart';
import '../widgets/update_dialog.dart';
import '../utils/logger.dart';

/// Alias for backward compatibility — NotificationService is now merged into FCMService
typedef NotificationService = FCMService;

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  logger.i('FCM background message: ${message.messageId}');
}

/// Firebase Cloud Messaging Service + Local Notifications (unified)
/// Gère les notifications push via FCM et les notifications locales
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

  // ─── Canaux Android dédiés ──────────────────────────────────────
  static const _channelDefault = AndroidNotificationChannel(
    'checksfleet_notifications',
    'ChecksFleet Notifications',
    description: 'Notifications de l\'application ChecksFleet',
    importance: Importance.high,
    playSound: true,
  );

  static const _channelMissions = AndroidNotificationChannel(
    'checksfleet_missions',
    'Missions',
    description: 'Notifications liées aux missions de convoyage',
    importance: Importance.high,
  );

  static const _channelChat = AndroidNotificationChannel(
    'checksfleet_chat',
    'Messages',
    description: 'Nouveaux messages de la messagerie',
    importance: Importance.high,
  );

  static const _channelSystem = AndroidNotificationChannel(
    'checksfleet_system',
    'Système',
    description: 'Alertes système (crédits, abonnement, etc.)',
    importance: Importance.defaultImportance,
  );

  static const _channelUpdates = AndroidNotificationChannel(
    'app_updates',
    'Mises à jour',
    description: 'Notifications de nouvelles versions disponibles',
    importance: Importance.high,
    playSound: true,
  );

  /// Initialise FCM et les notifications locales
  Future<void> initialize() async {
    if (kIsWeb) return; // FCM setup (background handler, local notifs) not supported on web
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

      // Create all notification channels
      final androidPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        await androidPlugin.createNotificationChannel(_channelDefault);
        await androidPlugin.createNotificationChannel(_channelMissions);
        await androidPlugin.createNotificationChannel(_channelChat);
        await androidPlugin.createNotificationChannel(_channelSystem);
        await androidPlugin.createNotificationChannel(_channelUpdates);
      }

      // Request iOS permissions
      if (Platform.isIOS) {
        await _localNotifications
            .resolvePlatformSpecificImplementation<
                IOSFlutterLocalNotificationsPlugin>()
            ?.requestPermissions(alert: true, badge: true, sound: true);
      }

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

      // Toujours sauvegarder le token en priorité
      await Supabase.instance.client
          .from('profiles')
          .update({
            'fcm_token': token,
          }).eq('id', user.id);

      // Tenter d'enregistrer la plateforme séparément (colonne peut ne pas exister encore)
      try {
        await Supabase.instance.client
            .from('profiles')
            .update({
              'device_platform': kIsWeb ? 'web' : (Platform.isIOS ? 'ios' : 'android'),
            }).eq('id', user.id);
      } catch (_) {
        logger.w('FCM: colonne device_platform non disponible');
      }

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

    // Déterminer le channel approprié
    final isUpdateNotif = message.data['type'] == 'app_update' ||
                          message.data['channel'] == 'updates';
    final channelId = isUpdateNotif ? 'app_updates' : 'checksfleet_notifications';
    final channelName = isUpdateNotif ? 'Mises à jour' : 'ChecksFleet Notifications';

    _localNotifications.show(
      notification.hashCode,
      notification.title ?? 'ChecksFleet',
      notification.body ?? '',
      NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          channelName,
          channelDescription: isUpdateNotif
              ? 'Notifications de nouvelles versions disponibles'
              : 'Notifications de l\'application ChecksFleet',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
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
    if (response.payload == null) return;

    final payload = response.payload!;

    // Handle simple string payloads (from showMissionNotification etc.)
    if (payload.startsWith('mission:')) {
      final missionId = payload.substring(8);
      final ctx = navigatorKey.currentContext;
      if (ctx != null) {
        Navigator.of(ctx).push(
          MaterialPageRoute(
            builder: (_) => MissionDetailScreen(missionId: missionId),
          ),
        );
      }
      return;
    }
    if (payload.startsWith('chat:')) {
      final conversationId = payload.substring(5);
      logger.i('Navigation vers conversation: $conversationId');
      return;
    }

    // Handle JSON payloads (from FCM foreground messages)
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      _navigateFromPayload(data);
    } catch (_) {}
  }

  /// Navigate based on notification payload data
  void _navigateFromPayload(Map<String, dynamic> data) {
    final context = navigatorKey.currentContext;
    if (context == null) return;

    final type = data['type'] as String?;

    // Handle app update notification — trigger update check
    if (type == 'app_update') {
      _handleAppUpdateNotification(context, data);
      return;
    }

    // Route by notification type
    switch (type) {
      case 'ride_match':
      case 'ride_message':
      case 'ride_accepted':
      case 'ride_declined':
      case 'in_transit':
        // Navigate to Planning Network for ride-related notifications
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const PlanningNetworkScreen()),
        );
        return;

      case 'support_message':
      case 'support_reply':
        // Navigate to Support Chat
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const SupportChatScreen()),
        );
        return;

      case 'tracking_update':
        // Navigate to Tracking list
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const TrackingListScreen()),
        );
        return;

      case 'invoice':
      case 'quote':
      case 'client':
        // Navigate to CRM
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const CRMScreen()),
        );
        return;
    }

    // Fallback: route by mission_id if present
    final missionId = data['mission_id'] as String?;
    if (missionId != null && missionId.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => MissionDetailScreen(missionId: missionId),
        ),
      );
    }
  }

  /// Handle app update notification — check for update and show dialog
  /// Falls back to notification [data] if DB lookup fails
  Future<void> _handleAppUpdateNotification(BuildContext context, Map<String, dynamic> data) async {
    try {
      // Essayer d'abord via la DB (table app_versions)
      AppUpdate? update = await UpdateService.instance.checkForUpdate();

      // Fallback: construire l'AppUpdate depuis les données de la notification
      if (update == null) {
        final downloadUrl = data['download_url'] as String? ?? '';
        final version = data['version'] as String? ?? '';
        final buildNumber = int.tryParse(data['build_number']?.toString() ?? '') ?? 0;
        final releaseNotes = data['release_notes'] as String?;

        if (downloadUrl.isNotEmpty) {
          update = AppUpdate(
            version: version,
            buildNumber: buildNumber,
            downloadUrl: downloadUrl,
            releaseNotes: releaseNotes,
          );
          logger.i('FCM: Using notification data fallback for update dialog');
        }
      }

      if (update != null && context.mounted) {
        await UpdateDialog.show(context, update);
      } else if (context.mounted) {
        // Dernier recours: afficher un snackbar informatif
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Nouvelle version ${data['version'] ?? ''} disponible !'),
            duration: const Duration(seconds: 5),
            action: SnackBarAction(
              label: 'OK',
              onPressed: () {},
            ),
          ),
        );
      }
    } catch (e) {
      logger.e('FCM: Erreur handling app_update: $e');
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

  // ─── Notifications locales par catégorie ─────────────────────────

  /// Notification liée aux missions (assignation, progression, etc.)
  Future<void> showMissionNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    await _showLocal(
      title: title,
      body: body,
      channel: _channelMissions,
      payload: payload,
    );
  }

  /// Notification de nouveau message chat
  Future<void> showChatNotification({
    required String senderName,
    required String message,
    String? conversationId,
  }) async {
    await _showLocal(
      title: 'Message de $senderName',
      body: message,
      channel: _channelChat,
      payload: conversationId != null ? 'chat:$conversationId' : null,
    );
  }

  /// Notification système (crédits faibles, abonnement, etc.)
  Future<void> showSystemNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    await _showLocal(
      title: title,
      body: body,
      channel: _channelSystem,
      payload: payload,
    );
  }

  /// Helper — afficher une notification locale sur un canal donné
  Future<void> _showLocal({
    required String title,
    required String body,
    required AndroidNotificationChannel channel,
    String? payload,
  }) async {
    if (kIsWeb) return;
    if (!_initialized) await initialize();

    // Use microseconds for unique IDs (avoids same-second collisions)
    final id = DateTime.now().microsecondsSinceEpoch % 2147483647;

    await _localNotifications.show(
      id,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          channel.id,
          channel.name,
          channelDescription: channel.description ?? '',
          importance: channel.importance,
          priority: Priority.high,
          showWhen: true,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: payload,
    );
  }

  /// Annuler toutes les notifications
  Future<void> cancelAll() async {
    await _localNotifications.cancelAll();
  }

  /// Annuler une notification par ID
  Future<void> cancel(int id) async {
    await _localNotifications.cancel(id);
  }

  /// Libère les listeners
  void dispose() {
    _onMessageSub?.cancel();
    _onMessageOpenedSub?.cancel();
    _onTokenRefreshSub?.cancel();
  }
}
