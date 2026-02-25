import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'routing_service.dart';

/// Service de localisation dédié au Réseau Planning
/// - Met à jour la position de l'utilisateur dans profiles
/// - Calcule les ETA en temps réel vers les villes du planning actif
/// - Détecte quand le convoyeur a quitté une ville (rayon 2km)
/// - Envoie des notifications locales pour les matchs, messages, etc.
class PlanningLocationService {
  static final PlanningLocationService _instance = PlanningLocationService._internal();
  factory PlanningLocationService() => _instance;
  PlanningLocationService._internal();

  final _supabase = Supabase.instance.client;
  final _notifications = FlutterLocalNotificationsPlugin();

  StreamSubscription<Position>? _positionSub;
  RealtimeChannel? _notifChannel;
  Position? _lastPosition;
  bool _isActive = false;
  Timer? _locationUploadTimer;

  String get _userId => _supabase.auth.currentUser?.id ?? '';

  bool get isActive => _isActive;
  Position? get lastPosition => _lastPosition;

  /// Initialise les notifications locales
  Future<void> initNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(android: androidSettings, iOS: iosSettings);
    await _notifications.initialize(settings);

    // Android notification channel for planning
    await _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          'planning_notifications',
          'Entraide Convoyeurs',
          description: 'Notifications entraide convoyeurs (matchs, messages)',
          importance: Importance.high,
        ));
  }

  /// Démarre le tracking de position pour le planning network
  Future<void> startTracking() async {
    if (_isActive || _userId.isEmpty) return;

    // Vérifier les permissions
    final perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;

    _isActive = true;

    // Position initiale
    try {
      _lastPosition = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      _uploadLocation();
    } catch (_) {}

    // Stream de position
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 100, // Mise à jour tous les 100m de mouvement
      ),
    ).listen((position) {
      _lastPosition = position;
    });

    // Upload toutes les 30 secondes (pas trop souvent pour économiser la batterie)
    _locationUploadTimer = Timer.periodic(const Duration(seconds: 30), (_) => _uploadLocation());

    // Écouter les notifications en temps réel
    _startNotificationListener();
  }

  /// Arrête le tracking
  Future<void> stopTracking() async {
    _positionSub?.cancel();
    _positionSub = null;
    _locationUploadTimer?.cancel();
    _locationUploadTimer = null;
    _notifChannel?.unsubscribe();
    _notifChannel = null;
    _isActive = false;
  }

  /// Upload la position vers Supabase
  Future<void> _uploadLocation() async {
    if (_lastPosition == null || _userId.isEmpty) return;
    try {
      await _supabase.rpc('update_user_location', params: {
        'p_lat': _lastPosition!.latitude,
        'p_lng': _lastPosition!.longitude,
      });
    } catch (_) {}
  }

  /// Écoute les notifications en temps réel
  void _startNotificationListener() {
    _notifChannel?.unsubscribe();
    _notifChannel = _supabase
        .channel('planning-notifs-$_userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'planning_notifications',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'user_id', value: _userId),
          callback: (payload) {
            final notif = payload.newRecord;
            _showLocalNotification(notif);
          },
        )
        .subscribe();
  }

  /// Affiche une notification locale
  Future<void> _showLocalNotification(Map<String, dynamic> notif) async {
    final type = notif['type'] ?? '';
    final title = notif['title'] ?? 'ChecksFleet';
    final body = notif['body'] ?? '';

    int notifId;
    switch (type) {
      case 'new_match':
        notifId = 1001;
        break;
      case 'match_accepted':
        notifId = 1002;
        break;
      case 'match_declined':
        notifId = 1003;
        break;
      case 'new_message':
        notifId = 1004 + (notif['id'].hashCode % 1000);
        break;
      default:
        notifId = 1000;
    }

    await _notifications.show(
      notifId,
      title,
      body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'planning_notifications',
          'Entraide Convoyeurs',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
          channelShowBadge: true,
          autoCancel: true,
        ),
        iOS: DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
    );
  }

  /// Calcule l'ETA vers une position cible (en minutes)
  /// Utilise OSRM pour le calcul routier, fallback Haversine
  Future<int?> calculateETA(double targetLat, double targetLng) async {
    if (_lastPosition == null) return null;
    try {
      return await RoutingService.estimateETA(
        currentLat: _lastPosition!.latitude,
        currentLng: _lastPosition!.longitude,
        destLat: targetLat,
        destLng: targetLng,
      );
    } catch (_) {
      // Fallback to straight-line estimate
      final distanceKm = Geolocator.distanceBetween(
        _lastPosition!.latitude,
        _lastPosition!.longitude,
        targetLat,
        targetLng,
      ) / 1000;
      return (distanceKm / 80 * 60).round();
    }
  }

  /// Vérifie si le convoyeur est dans un rayon de 2km d'une position
  bool isNearCity(double lat, double lng) {
    if (_lastPosition == null) return false;
    final distance = Geolocator.distanceBetween(
      _lastPosition!.latitude,
      _lastPosition!.longitude,
      lat,
      lng,
    );
    return distance < 2000; // 2km
  }

  void dispose() {
    stopTracking();
  }
}
