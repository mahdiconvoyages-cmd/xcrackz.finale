import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../utils/logger.dart';

/// Notification channel for Android foreground service
const String _notificationChannelId = 'checksfleet_gps_tracking';
const String _notificationChannelName = 'Suivi GPS ChecksFleet';
const int _notificationId = 888;

/// Service de tracking GPS en arrière-plan avec flutter_background_service
///
/// Fonctionnalités:
/// - Tracking GPS persistant même quand l'app est fermée / en arrière-plan
/// - Foreground service Android avec notification permanente
/// - UPSERT dans mission_tracking_live (temps réel)
/// - Snapshots dans mission_tracking_history toutes les 5 min
/// - Communication bidirectionnelle UI ↔ Service
class BackgroundTrackingService {
  static final BackgroundTrackingService _instance =
      BackgroundTrackingService._internal();
  factory BackgroundTrackingService() => _instance;
  BackgroundTrackingService._internal();

  final _service = FlutterBackgroundService();
  final _supabase = Supabase.instance.client;

  String? _currentMissionId;
  bool _isTracking = false;

  // Paramètres
  static const int _updateIntervalSeconds = 3;
  static const int _historySnapshotIntervalMinutes = 5;
  static const double _minMovementMeters = 5.0;

  bool get isTracking => _isTracking;
  String? get currentMissionId => _currentMissionId;

  /// Initialise le background service (appeler une seule fois au démarrage)
  static Future<void> initializeService() async {
    final service = FlutterBackgroundService();

    // Créer le canal de notification Android
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      _notificationChannelId,
      _notificationChannelName,
      description: 'Notification de suivi GPS en cours',
      importance: Importance.low,
    );

    final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
        FlutterLocalNotificationsPlugin();

    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: _notificationChannelId,
        initialNotificationTitle: 'ChecksFleet GPS',
        initialNotificationContent: 'Suivi GPS en attente...',
        foregroundServiceNotificationId: _notificationId,
        foregroundServiceTypes: [AndroidForegroundType.location],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onStart,
        onBackground: _onIosBackground,
      ),
    );
  }

  /// Démarre le tracking GPS pour une mission
  Future<bool> startTracking(String missionId, {bool autoStart = false}) async {
    if (_isTracking && _currentMissionId == missionId) {
      logger.w('Tracking déjà actif pour cette mission');
      return true;
    }

    // Arrêter le tracking existant si autre mission
    if (_isTracking && _currentMissionId != missionId) {
      await stopTracking();
    }

    // Vérifier permissions
    final hasPermission = await _checkPermissions();
    if (!hasPermission) {
      logger.e('Permissions GPS refusées');
      return false;
    }

    // Demander la permission "Always" pour le background
    await _requestAlwaysPermission();

    _currentMissionId = missionId;
    _isTracking = true;

    // Récupérer les infos Supabase pour le service isolé
    final url = dotenv.env['SUPABASE_URL'] ?? '';
    final key = dotenv.env['SUPABASE_ANON_KEY'] ?? '';
    final userId = _supabase.auth.currentUser?.id ?? '';
    final accessToken = _supabase.auth.currentSession?.accessToken ?? '';
    final refreshToken = _supabase.auth.currentSession?.refreshToken ?? '';

    // Démarrer le background service
    final isRunning = await _service.isRunning();
    if (!isRunning) {
      await _service.startService();
      // Attendre que le service soit prêt
      await Future.delayed(const Duration(milliseconds: 500));
    }

    // Envoyer les paramètres au service
    _service.invoke('startTracking', {
      'missionId': missionId,
      'supabaseUrl': url,
      'supabaseKey': key,
      'userId': userId,
      'accessToken': accessToken,
      'refreshToken': refreshToken,
    });

    // Écouter les mises à jour du service
    _service.on('positionUpdate').listen((event) {
      if (event != null) {
        logger.d(
            'Position: ${event['latitude']?.toStringAsFixed(6)}, ${event['longitude']?.toStringAsFixed(6)}');
      }
    });

    logger.i(
        '${autoStart ? "Auto-" : ""}Tracking GPS démarré pour mission: $missionId (background service)');
    return true;
  }

  /// Arrête le tracking GPS
  Future<void> stopTracking() async {
    if (!_isTracking) return;

    final isRunning = await _service.isRunning();
    if (isRunning) {
      _service.invoke('stopTracking');
      // Petit délai pour laisser le service faire le ménage
      await Future.delayed(const Duration(milliseconds: 300));
      _service.invoke('stopSelf');
    }

    _currentMissionId = null;
    _isTracking = false;

    logger.i('Tracking GPS arrêté');
  }

  /// Demande la permission "Always" (localisation en arrière-plan)
  /// Sur Android 11+, le système redirige vers les paramètres
  Future<void> _requestAlwaysPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    if (permission == LocationPermission.whileInUse) {
      // Demander "Always" — sur Android 11+ cela ouvre les paramètres système
      logger.i('Permission actuelle: whileInUse — demande de "Always" pour le background');
      final result = await Geolocator.requestPermission();
      if (result == LocationPermission.whileInUse) {
        // L'utilisateur n'a pas accordé "Always", guider vers les paramètres
        logger.w('Permission "Always" non accordée — ouverture des paramètres');
        await Geolocator.openAppSettings();
      }
    }
  }

  /// Vérifie et demande les permissions GPS
  Future<bool> _checkPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      logger.e('Service de localisation désactivé');
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        logger.e('Permission de localisation refusée');
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      logger.e('Permission de localisation refusée définitivement');
      return false;
    }

    return true;
  }

  /// Obtient la position actuelle (one-shot)
  Future<Position?> getCurrentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      logger.e('Erreur getCurrentPosition: $e');
      return null;
    }
  }

  /// Nettoie les ressources
  void dispose() {
    stopTracking();
  }
}

// ═══════════════════════════════════════════════════════════════════
// BACKGROUND ISOLATE — Ce code s'exécute dans un isolate séparé
// ═══════════════════════════════════════════════════════════════════

/// Point d'entrée du background service (Android & iOS foreground)
@pragma('vm:entry-point')
Future<void> _onStart(ServiceInstance service) async {
  // Nécessaire pour les plugins dans un isolate
  DartPluginRegistrant.ensureInitialized();

  StreamSubscription<Position>? positionStream;
  Timer? historyTimer;
  Position? lastPosition;
  DateTime? lastHistorySnapshot;
  String? currentMissionId;
  SupabaseClient? supabaseClient;
  String? userId;

  // Gérer l'arrêt du service
  service.on('stopSelf').listen((_) async {
    await positionStream?.cancel();
    historyTimer?.cancel();
    await service.stopSelf();
  });

  // Gérer le démarrage du tracking
  service.on('startTracking').listen((event) async {
    if (event == null) return;

    currentMissionId = event['missionId'] as String?;
    userId = event['userId'] as String?;
    final supabaseUrl = event['supabaseUrl'] as String? ?? '';
    final supabaseKey = event['supabaseKey'] as String? ?? '';
    final accessToken = event['accessToken'] as String? ?? '';
    final refreshToken = event['refreshToken'] as String? ?? '';

    if (currentMissionId == null || userId == null) return;

    // Initialiser Supabase dans l'isolate
    try {
      await Supabase.initialize(url: supabaseUrl, anonKey: supabaseKey);
      supabaseClient = Supabase.instance.client;

      // Restaurer la session
      if (accessToken.isNotEmpty && refreshToken.isNotEmpty) {
        await supabaseClient!.auth.setSession(refreshToken);
      }
    } catch (e) {
      // Supabase peut être déjà initialisé
      try {
        supabaseClient = Supabase.instance.client;
      } catch (_) {}
    }

    lastHistorySnapshot = DateTime.now();

    // Mettre à jour la notification
    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: 'ChecksFleet - Suivi GPS actif',
        content: 'Mission en cours de suivi...',
      );
    }

    // Démarrer le stream GPS
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 0,
    );

    await positionStream?.cancel();

    positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) async {
      if (currentMissionId == null) return;

      // Filtre de mouvement minimal
      bool shouldUpdate = true;
      if (lastPosition != null) {
        final distance = Geolocator.distanceBetween(
          lastPosition!.latitude,
          lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );
        if (distance < 5.0) {
          shouldUpdate = false;
        }
      }

      lastPosition = position;

      if (!shouldUpdate) return;

      // UPSERT dans mission_tracking_live
      try {
        await supabaseClient?.from('mission_tracking_live').upsert({
          'mission_id': currentMissionId,
          'user_id': userId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'altitude': position.altitude,
          'bearing': position.heading,
          'speed': position.speed,
          'last_update': DateTime.now().toUtc().toIso8601String(),
          'is_active': true,
        }, onConflict: 'mission_id,user_id');
      } catch (_) {}

      // Envoyer la position à l'UI
      service.invoke('positionUpdate', {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'speed': position.speed,
        'bearing': position.heading,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      });

      // Mettre à jour la notification
      if (service is AndroidServiceInstance) {
        service.setForegroundNotificationInfo(
          title: 'ChecksFleet - Suivi GPS actif',
          content:
              'Position: ${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)} | ${position.speed.toStringAsFixed(1)} m/s',
        );
      }
    });

    // Snapshots historiques toutes les 5 min
    historyTimer?.cancel();
    historyTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) async {
        if (currentMissionId == null || lastPosition == null) return;
        try {
          await supabaseClient?.from('mission_tracking_history').insert({
            'mission_id': currentMissionId,
            'user_id': userId,
            'latitude': lastPosition!.latitude,
            'longitude': lastPosition!.longitude,
            'accuracy': lastPosition!.accuracy,
            'speed': lastPosition!.speed,
            'bearing': lastPosition!.heading,
            'altitude': lastPosition!.altitude,
            'recorded_at': DateTime.now().toUtc().toIso8601String(),
          });
        } catch (_) {}
      },
    );
  });

  // Gérer l'arrêt du tracking
  service.on('stopTracking').listen((_) async {
    await positionStream?.cancel();
    positionStream = null;
    historyTimer?.cancel();
    historyTimer = null;

    // Marquer le tracking comme inactif
    if (currentMissionId != null && supabaseClient != null) {
      try {
        await supabaseClient!.from('mission_tracking_live').update({
          'is_active': false,
        }).eq('mission_id', currentMissionId!);
      } catch (_) {}

      // Dernier snapshot
      if (lastPosition != null) {
        try {
          await supabaseClient!.from('mission_tracking_history').insert({
            'mission_id': currentMissionId,
            'user_id': userId,
            'latitude': lastPosition!.latitude,
            'longitude': lastPosition!.longitude,
            'accuracy': lastPosition!.accuracy,
            'speed': lastPosition!.speed,
            'bearing': lastPosition!.heading,
            'altitude': lastPosition!.altitude,
            'recorded_at': DateTime.now().toUtc().toIso8601String(),
          });
        } catch (_) {}
      }
    }

    currentMissionId = null;
    lastPosition = null;

    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: 'ChecksFleet GPS',
        content: 'Suivi GPS arrêté',
      );
    }
  });
}

/// Point d'entrée iOS background
@pragma('vm:entry-point')
Future<bool> _onIosBackground(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  return true;
}
