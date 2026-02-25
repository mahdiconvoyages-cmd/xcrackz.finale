// =============================================================
// RideTrackingService
//
// Gère le tracking GPS en temps réel pendant un lift in_transit :
//   - Le conducteur partage sa position (toutes les 15s)
//   - La position est stockée dans ride_matches (driver_lat/lng)
//   - Le passager voit la position via Supabase Realtime
//   - ETA calculé via OSRM ou Haversine en fallback
// =============================================================

import 'dart:async';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../utils/logger.dart';
import '../config/api_config.dart';

class RideTrackingService {
  static final RideTrackingService _instance = RideTrackingService._internal();
  factory RideTrackingService() => _instance;
  RideTrackingService._internal();

  final _sb = Supabase.instance.client;

  StreamSubscription<Position>? _positionSub;
  Timer? _uploadTimer;
  String? _activeMatchId;
  Position? _lastPosition;
  bool _isTracking = false;

  // Cached dropoff coordinates (static during a ride)
  double? _cachedDropoffLat;
  double? _cachedDropoffLng;

  String get _uid => _sb.auth.currentUser?.id ?? '';
  bool get isTracking => _isTracking;
  String? get activeMatchId => _activeMatchId;

  // ── Start tracking (called by driver) ──────────────────────────────────────

  Future<bool> startTracking(String matchId) async {
    if (_isTracking) return true;
    if (_uid.isEmpty) return false;

    // Vérifier les permissions GPS
    LocationPermission perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return false;
    }

    _activeMatchId = matchId;
    _isTracking = true;

    // Cache dropoff coordinates (they don't change during a ride)
    try {
      final matchData = await _sb.from('ride_matches')
          .select('dropoff_lat, dropoff_lng')
          .eq('id', matchId)
          .maybeSingle();
      if (matchData != null) {
        _cachedDropoffLat = (matchData['dropoff_lat'] as num?)?.toDouble();
        _cachedDropoffLng = (matchData['dropoff_lng'] as num?)?.toDouble();
      }
    } catch (_) {}

    // Position initiale
    try {
      _lastPosition = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      await _uploadPosition();
    } catch (e) {
      logger.w('RideTracking: initial position failed: $e');
    }

    // Stream de position en continu
    _positionSub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50, // Mise à jour tous les 50m
      ),
    ).listen((pos) {
      _lastPosition = pos;
    });

    // Upload toutes les 15 secondes
    _uploadTimer = Timer.periodic(const Duration(seconds: 15), (_) => _uploadPosition());

    logger.i('RideTracking: started for match $matchId');
    return true;
  }

  // ── Stop tracking ──────────────────────────────────────────────────────────

  Future<void> stopTracking() async {
    _positionSub?.cancel();
    _positionSub = null;
    _uploadTimer?.cancel();
    _uploadTimer = null;
    _isTracking = false;
    _activeMatchId = null;
    _lastPosition = null;
    _cachedDropoffLat = null;
    _cachedDropoffLng = null;
    logger.i('RideTracking: stopped');
  }

  // ── Upload position to Supabase ────────────────────────────────────────────

  Future<void> _uploadPosition() async {
    if (_lastPosition == null || _activeMatchId == null) return;
    try {
      // Use cached dropoff coords instead of querying DB every 15s
      int? eta;
      if (_cachedDropoffLat != null && _cachedDropoffLng != null) {
        eta = await _calculateETA(_cachedDropoffLat!, _cachedDropoffLng!);
      }

      await _sb.from('ride_matches').update({
        'driver_lat': _lastPosition!.latitude,
        'driver_lng': _lastPosition!.longitude,
        'driver_location_updated_at': DateTime.now().toUtc().toIso8601String(),
        if (eta != null) 'eta_minutes': eta,
      }).eq('id', _activeMatchId!);
    } catch (e) {
      logger.w('RideTracking: upload failed: $e');
    }
  }

  // ── ETA calculation via OSRM (free) ────────────────────────────────────────

  Future<int?> _calculateETA(double destLat, double destLng) async {
    if (_lastPosition == null) return null;
    try {
      final url = '${ApiConfig.osrmBase}/route/v1/driving/'
          '${_lastPosition!.longitude},${_lastPosition!.latitude}'
          ';$destLng,$destLat'
          '?overview=false';
      final res = await http.get(Uri.parse(url))
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map;
        final routes = (data['routes'] as List?) ?? [];
        if (routes.isNotEmpty) {
          final duration = (routes[0]['duration'] as num?)?.toDouble() ?? 0;
          return (duration / 60).round();
        }
      }
    } catch (_) {}
    
    // Fallback: distance en ligne droite / 80 km/h
    final distM = Geolocator.distanceBetween(
      _lastPosition!.latitude, _lastPosition!.longitude,
      destLat, destLng,
    );
    return ((distM / 1000) / 80 * 60).round().clamp(1, 999);
  }

  // ── Subscribe as passenger (watch driver position) ─────────────────────────

  RealtimeChannel? _watchChannel;

  /// Le passager s'abonne aux updates de position du conducteur
  RealtimeChannel watchDriverPosition(String matchId, void Function(Map<String, dynamic>) onUpdate) {
    _watchChannel?.unsubscribe();
    _watchChannel = _sb.channel('ride_track_$matchId')
      ..onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'ride_matches',
        filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq, column: 'id', value: matchId),
        callback: (payload) {
          onUpdate(payload.newRecord);
        },
      )
      ..subscribe();
    return _watchChannel!;
  }

  void stopWatching() {
    _watchChannel?.unsubscribe();
    _watchChannel = null;
  }

  void dispose() {
    stopTracking();
    stopWatching();
  }
}
