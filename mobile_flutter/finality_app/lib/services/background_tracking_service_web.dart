/// Web stub for BackgroundTrackingService.
/// On web, background GPS tracking is not supported (browser limitation).
/// All methods are no-ops that return safely.
library background_tracking_service_web;

import 'package:geolocator/geolocator.dart';

class BackgroundTrackingService {
  static final BackgroundTrackingService _instance =
      BackgroundTrackingService._internal();
  factory BackgroundTrackingService() => _instance;
  BackgroundTrackingService._internal();

  bool _isTracking = false;
  String? _currentMissionId;

  bool get isTracking => _isTracking;
  String? get currentMissionId => _currentMissionId;

  /// No-op on web — background services not supported
  static Future<void> initializeService() async {}

  /// On web, tracking runs in foreground only (screen must stay on)
  Future<bool> startTracking(String missionId,
      {bool autoStart = false}) async {
    _currentMissionId = missionId;
    _isTracking = true;
    return true;
  }

  Future<void> stopTracking() async {
    _currentMissionId = null;
    _isTracking = false;
  }

  Future<void> forceStopIfRunning() async {
    _currentMissionId = null;
    _isTracking = false;
  }

  Future<Position?> getCurrentPosition() async {
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
    } catch (_) {
      return null;
    }
  }

  void dispose() {
    stopTracking();
  }
}
