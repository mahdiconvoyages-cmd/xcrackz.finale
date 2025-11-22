import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';

class GPSTrackingService {
  static final GPSTrackingService _instance = GPSTrackingService._internal();
  factory GPSTrackingService() => _instance;
  GPSTrackingService._internal();

  final _supabase = Supabase.instance.client;
  StreamSubscription<Position>? _positionStream;
  RealtimeChannel? _channel;
  String? _currentMissionId;
  bool _isTracking = false;

  bool get isTracking => _isTracking;
  String? get currentMissionId => _currentMissionId;

  Future<bool> startTracking(String missionId) async {
    if (_isTracking) {
      print('⚠️ Tracking déjà actif');
      return false;
    }

    // Vérifier permissions
    final hasPermission = await _checkPermissions();
    if (!hasPermission) {
      print('❌ Permissions GPS refusées');
      return false;
    }

    _currentMissionId = missionId;
    _isTracking = true;

    // Configuration du stream de position
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Update tous les 10 mètres
    );

    // Démarrer le stream
    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) {
        _broadcastPosition(position);
      },
      onError: (error) {
        print('❌ Erreur GPS stream: $error');
      },
    );

    // S'abonner au channel Realtime
    _subscribeToChannel(missionId);

    print('✅ Tracking GPS démarré pour mission: $missionId');
    return true;
  }

  Future<void> stopTracking() async {
    if (!_isTracking) return;

    await _positionStream?.cancel();
    await _channel?.unsubscribe();

    _positionStream = null;
    _channel = null;
    _currentMissionId = null;
    _isTracking = false;

    print('⏹️ Tracking GPS arrêté');
  }

  Future<bool> _checkPermissions() async {
    // Vérifier si le service est activé
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    // Vérifier les permissions
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  Future<void> _broadcastPosition(Position position) async {
    if (_currentMissionId == null) return;

    try {
      // Enregistrer dans la base de données
      await _supabase.from('mission_tracking_positions').upsert({
        'mission_id': _currentMissionId,
        'user_id': _supabase.auth.currentUser?.id,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'bearing': position.heading,
        'speed': position.speed,
        'timestamp': DateTime.now().toIso8601String(),
      }, onConflict: 'mission_id,user_id');

      // Broadcast via Realtime
      _channel?.sendBroadcastMessage(
        event: 'gps_update',
        payload: {
          'mission_id': _currentMissionId,
          'user_id': _supabase.auth.currentUser?.id,
          'latitude': position.latitude,
          'longitude': position.longitude,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );

      print('📍 Position broadcast: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      print('❌ Erreur broadcast position: $e');
    }
  }

  void _subscribeToChannel(String missionId) {
    _channel = _supabase.channel('mission:$missionId:gps');

    _channel!.onBroadcast(
      event: 'gps_update',
      callback: (payload) {
        print('📡 GPS update reçu: $payload');
      },
    ).subscribe((status, error) {
      if (status == RealtimeSubscribeStatus.subscribed) {
        print('✅ Abonné au channel GPS: mission:$missionId:gps');
      } else {
        print('❌ Erreur subscription: $error');
      }
    });
  }

  Future<Position?> getCurrentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
    } catch (e) {
      print('❌ Erreur getCurrentPosition: $e');
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> getTrackingHistory(String missionId) async {
    try {
      final response = await _supabase
          .from('mission_tracking_positions')
          .select('*')
          .eq('mission_id', missionId)
          .order('timestamp', ascending: false)
          .limit(100);

      return List<Map<String, dynamic>>.from(response as List);
    } catch (e) {
      print('❌ Erreur chargement historique GPS: $e');
      return [];
    }
  }

  // Auto-stop si l'app est fermée
  void autoStopTracking() {
    if (_isTracking) {
      print('🔄 Auto-stop tracking...');
      stopTracking();
    }
  }

  // Distance entre deux positions
  double calculateDistance(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    return Geolocator.distanceBetween(
      startLat,
      startLng,
      endLat,
      endLng,
    );
  }

  // Durée estimée basée sur distance et vitesse moyenne
  int estimateDuration(double distanceInMeters, {double avgSpeedKmh = 50}) {
    final distanceKm = distanceInMeters / 1000;
    final hours = distanceKm / avgSpeedKmh;
    return (hours * 60).round(); // Retourne en minutes
  }
}
