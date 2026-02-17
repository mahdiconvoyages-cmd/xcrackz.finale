import 'dart:io';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../utils/logger.dart';

/// Service centralisé de notifications locales et préparation push (FCM).
///
/// Responsabilités :
///  - Initialisation unique du plugin flutter_local_notifications
///  - Canaux Android pré-configurés (missions, chat, système)
///  - Méthodes typées par catégorie
///  - Placeholder pour enregistrement token FCM (future intégration Firebase)
class NotificationService {
  // Singleton
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  // ─── Canaux Android ───────────────────────────────────────────────
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

  // ─── Initialisation ───────────────────────────────────────────────
  Future<void> initialize() async {
    if (_initialized) return;

    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Créer les canaux Android
    if (Platform.isAndroid) {
      final androidPlugin =
          _plugin.resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>();
      await androidPlugin?.createNotificationChannel(_channelMissions);
      await androidPlugin?.createNotificationChannel(_channelChat);
      await androidPlugin?.createNotificationChannel(_channelSystem);
    }

    // Demander la permission sur iOS
    if (Platform.isIOS) {
      await _plugin
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, badge: true, sound: true);
    }

    _initialized = true;
    AppLogger.info('NotificationService initialisé');
  }

  // ─── Notifications par catégorie ──────────────────────────────────

  /// Nouvelle mission assignée ou mise à jour de statut
  Future<void> showMissionNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    await _show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      channelId: _channelMissions.id,
      channelName: _channelMissions.name,
      channelDescription: _channelMissions.description ?? '',
      payload: payload,
    );
  }

  /// Nouveau message dans le chat
  Future<void> showChatNotification({
    required String senderName,
    required String message,
    String? conversationId,
  }) async {
    await _show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: 'Message de $senderName',
      body: message,
      channelId: _channelChat.id,
      channelName: _channelChat.name,
      channelDescription: _channelChat.description ?? '',
      payload: conversationId != null ? 'chat:$conversationId' : null,
    );
  }

  /// Notification système (crédits faibles, abonnement expirant, etc.)
  Future<void> showSystemNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    await _show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      channelId: _channelSystem.id,
      channelName: _channelSystem.name,
      channelDescription: _channelSystem.description ?? '',
      payload: payload,
    );
  }

  // ─── Push / FCM placeholder ───────────────────────────────────────

  /// Enregistrer le token push auprès du backend.
  /// À implémenter quand Firebase Cloud Messaging sera configuré.
  ///
  /// Exemple d'utilisation future :
  /// ```dart
  /// final token = await FirebaseMessaging.instance.getToken();
  /// await NotificationService().registerPushToken(token!);
  /// ```
  Future<void> registerPushToken(String token) async {
    // TODO: Envoyer le token à Supabase pour stockage
    // await supabase.from('push_tokens').upsert({
    //   'user_id': supabase.auth.currentUser!.id,
    //   'token': token,
    //   'platform': Platform.isIOS ? 'ios' : 'android',
    //   'updated_at': DateTime.now().toIso8601String(),
    // });
    AppLogger.info('Push token enregistré (placeholder): ${token.substring(0, 10)}...');
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  Future<void> _show({
    required int id,
    required String title,
    required String body,
    required String channelId,
    required String channelName,
    required String channelDescription,
    String? payload,
  }) async {
    if (!_initialized) await initialize();

    final androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    await _plugin.show(
      id,
      title,
      body,
      NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: payload,
    );
  }

  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null) return;

    // Routage basé sur le payload
    if (payload.startsWith('chat:')) {
      final conversationId = payload.substring(5);
      AppLogger.info('Navigation vers conversation: $conversationId');
      // TODO: Naviguer vers l'écran de chat
    } else if (payload.startsWith('mission:')) {
      final missionId = payload.substring(8);
      AppLogger.info('Navigation vers mission: $missionId');
      // TODO: Naviguer vers le détail mission
    }
  }

  /// Annuler toutes les notifications
  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }

  /// Annuler une notification par ID
  Future<void> cancel(int id) async {
    await _plugin.cancel(id);
  }
}
