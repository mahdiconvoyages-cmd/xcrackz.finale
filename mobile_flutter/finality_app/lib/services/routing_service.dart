import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;

/// Route calculation result
class RouteResult {
  final double distanceKm;
  final double durationMinutes;
  final String method; // 'osrm' or 'haversine'

  RouteResult({
    required this.distanceKm,
    required this.durationMinutes,
    required this.method,
  });
}

/// Service for calculating real road distances using OSRM (free, open-source)
/// Falls back to Haversine straight-line distance if OSRM is unavailable
class RoutingService {
  static const _osrmBase = 'https://router.project-osrm.org';
  static const _timeout = Duration(seconds: 8);

  /// Calculate road distance between two GPS points
  /// Returns distance in km and duration in minutes
  static Future<RouteResult> getRouteDistance({
    required double fromLat,
    required double fromLng,
    required double toLat,
    required double toLng,
  }) async {
    try {
      final result = await _osrmRoute(fromLat, fromLng, toLat, toLng);
      if (result != null) return result;
    } catch (_) {}

    // Fallback to Haversine
    final km = haversineDistance(fromLat, fromLng, toLat, toLng);
    return RouteResult(
      distanceKm: km,
      durationMinutes: km / 80 * 60, // estimate at 80 km/h average
      method: 'haversine',
    );
  }

  /// Call OSRM routing API
  static Future<RouteResult?> _osrmRoute(
    double fromLat, double fromLng, double toLat, double toLng,
  ) async {
    final url = Uri.parse(
      '$_osrmBase/route/v1/driving/$fromLng,$fromLat;$toLng,$toLat?overview=false',
    );

    final response = await http.get(url).timeout(_timeout);
    if (response.statusCode != 200) return null;

    final data = json.decode(response.body);
    final routes = data['routes'] as List?;
    if (routes == null || routes.isEmpty) return null;

    final route = routes[0];
    return RouteResult(
      distanceKm: (route['distance'] as num) / 1000,
      durationMinutes: (route['duration'] as num) / 60,
      method: 'osrm',
    );
  }

  /// Haversine formula — straight-line distance between two GPS points (km)
  static double haversineDistance(
    double lat1, double lng1, double lat2, double lng2,
  ) {
    const R = 6371.0; // Earth radius in km
    final dLat = _toRad(lat2 - lat1);
    final dLng = _toRad(lng2 - lng1);

    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRad(lat1)) * cos(_toRad(lat2)) *
        sin(dLng / 2) * sin(dLng / 2);

    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  static double _toRad(double deg) => deg * pi / 180;

  /// Estimate ETA from a GPS position to a destination
  /// Returns minutes remaining based on either OSRM or fallback speed estimate
  static Future<int> estimateETA({
    required double currentLat,
    required double currentLng,
    required double destLat,
    required double destLng,
  }) async {
    final result = await getRouteDistance(
      fromLat: currentLat, fromLng: currentLng,
      toLat: destLat, toLng: destLng,
    );
    return result.durationMinutes.round();
  }
}
