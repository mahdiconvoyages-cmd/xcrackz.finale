// ===========================================================================
// _PlanningMapView — Carte interactive pour le réseau planning
//
// Affiche les offres de lift sur une carte OpenStreetMap avec flutter_map.
// Les villes sont géocodées via api-adresse.data.gouv.fr (gratuit, sans clé).
// ===========================================================================

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

import 'retour_lift_screen.dart';

// ── Couleurs ─────────────────────────────────────────────────────────────────
const _kTeal = Color(0xFF0D9488);
const _kBlue = Color(0xFF3B82F6);
const _kDark = Color(0xFF0F172A);
const _kGray = Color(0xFF64748B);

/// Carte des offres de lift disponibles autour de la position actuelle
class PlanningMapView extends StatefulWidget {
  const PlanningMapView({super.key});

  @override
  State<PlanningMapView> createState() => _PlanningMapViewState();
}

class _PlanningMapViewState extends State<PlanningMapView> {
  final _mapController = MapController();
  final _supabase = Supabase.instance.client;

  LatLng _center = const LatLng(46.603354, 1.888334); // France center
  double _zoom = 6.0;
  bool _loading = true;
  List<_OfferMarker> _markers = [];
  String? _error;

  // Cache city → LatLng to avoid redundant geocoding
  final Map<String, LatLng?> _geocodeCache = {};

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    // Try to get current position for map center
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.always ||
          perm == LocationPermission.whileInUse) {
        final pos = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.low,
            timeLimit: Duration(seconds: 5),
          ),
        );
        _center = LatLng(pos.latitude, pos.longitude);
        _zoom = 9.0;
      }
    } catch (_) {
      // Use default France center
    }

    await _loadOffers();
  }

  Future<void> _loadOffers() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final uid = _supabase.auth.currentUser?.id ?? '';
      final dateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());

      final data = await _supabase
          .from('ride_offers')
          .select('''
            *,
            profile:profiles!user_id(
              id, first_name, last_name, avatar_url, company_name
            )
          ''')
          .neq('user_id', uid)
          .inFilter('status', ['active', 'en_route'])
          .gte('departure_date', dateStr)
          .gt('seats_available', 0)
          .order('departure_date')
          .limit(50);

      final offers = List<Map<String, dynamic>>.from(data);

      // Geocode all unique cities in parallel
      final cities = <String>{};
      for (final o in offers) {
        final origin = o['origin_city'] as String?;
        final dest = o['destination_city'] as String?;
        if (origin != null && origin.isNotEmpty) cities.add(origin);
        if (dest != null && dest.isNotEmpty) cities.add(dest);
      }

      // Batch geocode (max 8 parallel)
      final toGeocode = cities.where((c) => !_geocodeCache.containsKey(c)).toList();
      for (var i = 0; i < toGeocode.length; i += 8) {
        final batch = toGeocode.skip(i).take(8).toList();
        await Future.wait(batch.map((city) => _geocode(city)));
      }

      // Build markers
      final markers = <_OfferMarker>[];
      for (final o in offers) {
        final origin = o['origin_city'] as String? ?? '';
        final originLatLng = _geocodeCache[origin];
        if (originLatLng != null) {
          markers.add(_OfferMarker(
            offer: o,
            point: originLatLng,
          ));
        }
      }

      if (mounted) {
        setState(() {
          _markers = markers;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Erreur de chargement: ${e.toString().split(':').first}';
          _loading = false;
        });
      }
    }
  }

  /// Geocode city name via api-adresse.data.gouv.fr
  Future<void> _geocode(String city) async {
    if (_geocodeCache.containsKey(city)) return;
    try {
      final uri = Uri.parse(
        'https://api-adresse.data.gouv.fr/search?q=${Uri.encodeComponent(city)}&limit=1&type=municipality',
      );
      final resp = await http.get(uri).timeout(const Duration(seconds: 5));
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body) as Map<String, dynamic>;
        final features = data['features'] as List? ?? [];
        if (features.isNotEmpty) {
          final coords = features.first['geometry']['coordinates'] as List;
          // GeoJSON is [lng, lat]
          _geocodeCache[city] = LatLng(
            (coords[1] as num).toDouble(),
            (coords[0] as num).toDouble(),
          );
          return;
        }
      }
    } catch (_) {}
    _geocodeCache[city] = null; // Mark as not found
  }

  void _showOfferDetail(_OfferMarker marker) {
    final o = marker.offer;
    final profile = (o['profile'] as Map?) ?? {};
    final name = '${profile['first_name'] ?? ''} ${profile['last_name'] ?? ''}'.trim();
    final origin = o['origin_city'] as String? ?? '—';
    final dest = o['destination_city'] as String? ?? '—';
    final seats = (o['seats_available'] as num?)?.toInt() ?? 0;
    final depDate = o['departure_date'] as String? ?? '';
    final depTime = (o['departure_time'] as String? ?? '').replaceAll(RegExp(r':\d{2}$'), '');
    final notes = o['notes'] as String? ?? '';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.fromLTRB(
            20, 12, 20, MediaQuery.of(ctx).padding.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36, height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: _kTeal.withOpacity(0.1),
                  backgroundImage: profile['avatar_url'] != null
                      ? NetworkImage(profile['avatar_url'] as String)
                      : null,
                  child: profile['avatar_url'] == null
                      ? Text(
                          name.isNotEmpty ? name[0].toUpperCase() : '?',
                          style: const TextStyle(
                            color: _kTeal,
                            fontWeight: FontWeight.bold,
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isNotEmpty ? name : 'Conducteur',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: _kDark,
                        ),
                      ),
                      if (profile['company_name'] != null)
                        Text(
                          profile['company_name'] as String,
                          style: const TextStyle(
                            fontSize: 13,
                            color: _kGray,
                          ),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _kTeal.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$seats place${seats > 1 ? 's' : ''}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _kTeal,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Route
            Row(
              children: [
                const Icon(Icons.trip_origin, size: 14, color: _kTeal),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '$origin → $dest',
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: _kDark,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Date/Time
            Row(
              children: [
                const Icon(Icons.schedule_rounded, size: 14, color: _kGray),
                const SizedBox(width: 8),
                Text(
                  '$depDate à $depTime',
                  style: const TextStyle(fontSize: 13, color: _kGray),
                ),
              ],
            ),
            if (notes.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                notes,
                style: const TextStyle(fontSize: 13, color: _kGray),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RetourLiftScreen(
                        fromCity: origin,
                        toCity: dest,
                      ),
                    ),
                  );
                },
                icon: const Icon(Icons.send_rounded, size: 16),
                label: const Text('Voir les offres depuis cette ville'),
                style: FilledButton.styleFrom(
                  backgroundColor: _kTeal,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _center,
            initialZoom: _zoom,
            maxZoom: 18,
            minZoom: 4,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.checksfleet.app',
            ),
            MarkerLayer(
              markers: _markers.map((m) {
                return Marker(
                  point: m.point,
                  width: 42,
                  height: 42,
                  child: GestureDetector(
                    onTap: () => _showOfferDetail(m),
                    child: Semantics(
                      button: true,
                      label:
                          'Offre de lift depuis ${m.offer['origin_city'] ?? ''}',
                      child: Container(
                        decoration: BoxDecoration(
                          color: _kTeal,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 6,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(Icons.directions_car,
                              color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
        // Loading / Error overlays
        if (_loading)
          const Center(
            child: Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: _kTeal, strokeWidth: 2),
                    SizedBox(width: 12),
                    Text('Chargement de la carte…'),
                  ],
                ),
              ),
            ),
          ),
        if (_error != null)
          Center(
            child: Card(
              color: const Color(0xFFFEE2E2),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFDC2626))),
              ),
            ),
          ),
        // Legend / count badge
        if (!_loading)
          Positioned(
            top: 16,
            left: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.directions_car, color: _kTeal, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    '${_markers.length} offre${_markers.length > 1 ? 's' : ''}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: _kDark,
                    ),
                  ),
                ],
              ),
            ),
          ),
        // Refresh button
        Positioned(
          top: 16,
          right: 16,
          child: FloatingActionButton.small(
            heroTag: 'mapRefresh',
            onPressed: _loadOffers,
            backgroundColor: Colors.white,
            child: const Icon(Icons.refresh, color: _kTeal),
          ),
        ),
        // Re-center button
        Positioned(
          bottom: 24,
          right: 16,
          child: FloatingActionButton.small(
            heroTag: 'mapCenter',
            onPressed: () {
              _mapController.move(_center, _zoom);
            },
            backgroundColor: Colors.white,
            child: const Icon(Icons.my_location, color: _kBlue),
          ),
        ),
      ],
    );
  }
}

/// Internal data class for offer markers
class _OfferMarker {
  final Map<String, dynamic> offer;
  final LatLng point;

  const _OfferMarker({required this.offer, required this.point});
}
