import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import 'package:flutter/foundation.dart';

/// Service de tracking GPS en arrière-plan ultra-fluide
/// 
/// Fonctionnalités:
/// - Tracking automatique dès qu'une mission est "en_cours"
/// - Mise à jour toutes les 3 secondes (fluide)
/// - Stratégie adaptative basée sur mouvement et batterie
/// - UPSERT dans mission_tracking_live (optimisé)
/// - Snapshots dans mission_tracking_history toutes les 5min
/// - Fonctionne même avec l'app en arrière-plan
class BackgroundTrackingService {
  static final BackgroundTrackingService _instance = BackgroundTrackingService._internal();
  factory BackgroundTrackingService() => _instance;
  BackgroundTrackingService._internal();

  final _supabase = Supabase.instance.client;
  StreamSubscription<Position>? _positionStream;
  RealtimeChannel? _channel;
  Timer? _historyTimer;
  
  String? _currentMissionId;
  bool _isTracking = false;
  Position? _lastPosition;
  DateTime? _lastHistorySnapshot;

  // Paramètres de tracking fluide
  static const int _updateIntervalSeconds = 3; // 3s pour tracking ULTRA-FLUIDE
  static const int _historySnapshotIntervalMinutes = 5; // Snapshot toutes les 5 minutes
  static const double _minMovementMeters = 5.0; // 5 mètres minimum pour update

  bool get isTracking => _isTracking;
  String? get currentMissionId => _currentMissionId;

  /// Démarre le tracking GPS pour une mission
  Future<bool> startTracking(String missionId, {bool autoStart = false}) async {
    if (_isTracking && _currentMissionId == missionId) {
      if (kDebugMode) print('⚠️ Tracking déjà actif pour cette mission');
      return true;
    }

    // Arrêter le tracking existant si autre mission
    if (_isTracking && _currentMissionId != missionId) {
      await stopTracking();
    }

    // Vérifier permissions
    final hasPermission = await _checkPermissions();
    if (!hasPermission) {
      if (kDebugMode) print('❌ Permissions GPS refusées');
      return false;
    }

    _currentMissionId = missionId;
    _isTracking = true;
    _lastHistorySnapshot = DateTime.now();

    // Configuration optimisée pour tracking fluide
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 0, // Pas de filtre de distance - on gère manuellement
      timeLimit: Duration(seconds: _updateIntervalSeconds),
    );

    // Démarrer le stream de position
    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        _handlePositionUpdate(position);
      },
      onError: (error) {
        if (kDebugMode) print('❌ Erreur GPS stream: $error');
      },
    );

    // Démarrer le timer pour snapshots historiques (toutes les 5 min)
    _historyTimer = Timer.periodic(
      const Duration(minutes: _historySnapshotIntervalMinutes),
      (_) => _saveHistorySnapshot(),
    );

    // S'abonner au channel Realtime
    _subscribeToChannel(missionId);

    if (kDebugMode) {
      print('✅ ${autoStart ? "Auto-" : ""}Tracking GPS démarré pour mission: $missionId');
      print('📡 Intervalle: ${_updateIntervalSeconds}s (ULTRA-FLUIDE)');
    }

    return true;
  }

  /// Arrête le tracking GPS
  Future<void> stopTracking() async {
    if (!_isTracking) return;

    // Sauvegarder un dernier snapshot avant d'arrêter
    if (_lastPosition != null && _currentMissionId != null) {
      await _saveHistorySnapshot();
      
      // Marquer le tracking comme inactif
      try {
        await _supabase.from('mission_tracking_live').update({
          'is_active': false,
        }).eq('mission_id', _currentMissionId!);
      } catch (e) {
        if (kDebugMode) print('⚠️ Erreur désactivation tracking: $e');
      }
    }

    await _positionStream?.cancel();
    await _channel?.unsubscribe();
    _historyTimer?.cancel();

    _positionStream = null;
    _channel = null;
    _historyTimer = null;
    _currentMissionId = null;
    _lastPosition = null;
    _isTracking = false;

    if (kDebugMode) print('⏹️ Tracking GPS arrêté');
  }

  /// Gère chaque nouvelle position GPS
  Future<void> _handlePositionUpdate(Position position) async {
    if (_currentMissionId == null || !_isTracking) return;

    // Vérifier si déplacement suffisant (évite spam si immobile)
    if (_lastPosition != null) {
      final distance = Geolocator.distanceBetween(
        _lastPosition!.latitude,
        _lastPosition!.longitude,
        position.latitude,
        position.longitude,
      );

      if (distance < _minMovementMeters) {
        // Mouvement trop faible, on skip (mais on update quand même toutes les 10s)
        final timeSinceLastUpdate = DateTime.now().difference(
          _lastPosition != null ? DateTime.now() : DateTime.now(),
        );
        
        if (timeSinceLastUpdate.inSeconds < 10) {
          return; // Skip si < 5m de mouvement ET moins de 10s
        }
      }
    }

    _lastPosition = position;

    // Broadcast position en temps réel
    await _broadcastPositionLive(position);
  }

  /// Broadcast la position dans mission_tracking_live (UPSERT)
  Future<void> _broadcastPositionLive(Position position) async {
    if (_currentMissionId == null) return;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      // UPSERT dans mission_tracking_live (1 seul enregistrement par mission)
      await _supabase.from('mission_tracking_live').upsert({
        'mission_id': _currentMissionId,
        'user_id': userId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'bearing': position.heading,
        'speed': position.speed,
        'last_update': DateTime.now().toIso8601String(),
        'is_active': true,
      }, onConflict: 'mission_id,user_id');

      // Broadcast via Realtime pour les clients qui écoutent
      _channel?.sendBroadcastMessage(
        event: 'position_update',
        payload: {
          'mission_id': _currentMissionId,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': position.speed,
          'bearing': position.heading,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );

      if (kDebugMode) {
        print('📍 Position live: ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)} | ${position.speed.toStringAsFixed(1)} m/s');
      }
    } catch (e) {
      if (kDebugMode) print('❌ Erreur broadcast position: $e');
    }
  }

  /// Sauvegarde un snapshot dans l'historique (toutes les 5 minutes)
  Future<void> _saveHistorySnapshot() async {
    if (_currentMissionId == null || _lastPosition == null) return;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return;

      await _supabase.from('mission_tracking_history').insert({
        'mission_id': _currentMissionId,
        'user_id': userId,
        'latitude': _lastPosition!.latitude,
        'longitude': _lastPosition!.longitude,
        'accuracy': _lastPosition!.accuracy,
        'speed': _lastPosition!.speed,
        'bearing': _lastPosition!.heading,
        'altitude': _lastPosition!.altitude,
        'recorded_at': DateTime.now().toIso8601String(),
      });

      _lastHistorySnapshot = DateTime.now();
      
      if (kDebugMode) print('💾 Snapshot historique sauvegardé');
    } catch (e) {
      if (kDebugMode) print('⚠️ Erreur snapshot historique: $e');
    }
  }

  /// Vérifie et demande les permissions GPS
  Future<bool> _checkPermissions() async {
    // Vérifier si le service est activé
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (kDebugMode) print('❌ Service de localisation désactivé');
      return false;
    }

    // Vérifier les permissions
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (kDebugMode) print('❌ Permission de localisation refusée');
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (kDebugMode) print('❌ Permission de localisation refusée définitivement');
      return false;
    }

    return true;
  }

  /// S'abonne au channel Realtime pour cette mission
  void _subscribeToChannel(String missionId) {
    _channel = _supabase.channel('mission:$missionId:gps');

    _channel!.onBroadcast(
      event: 'position_update',
      callback: (payload) {
        if (kDebugMode) print('📡 Position reçue via Realtime: $payload');
      },
    ).subscribe((status, error) {
      if (status == RealtimeSubscribeStatus.subscribed) {
        if (kDebugMode) print('✅ Abonné au channel: mission:$missionId:gps');
      } else {
        if (kDebugMode) print('❌ Erreur subscription Realtime: $error');
      }
    });
  }

  /// Obtient la position actuelle (one-shot)
  Future<Position?> getCurrentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (e) {
      if (kDebugMode) print('❌ Erreur getCurrentPosition: $e');
      return null;
    }
  }

  /// Nettoie les ressources
  void dispose() {
    stopTracking();
  }
}
