import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';

class TrackingMapScreen extends StatefulWidget {
  final String missionId;

  const TrackingMapScreen({
    super.key,
    required this.missionId,
  });

  @override
  State<TrackingMapScreen> createState() => _TrackingMapScreenState();
}

class _TrackingMapScreenState extends State<TrackingMapScreen> {
  final _supabase = Supabase.instance.client;
  GoogleMapController? _mapController;
  
  Position? _currentPosition;
  Map<String, dynamic>? _mission;
  bool _isLoading = true;
  bool _isTracking = false;
  
  final Set<Marker> _markers = {};
  final List<LatLng> _routeCoordinates = [];
  
  double _totalDistance = 0;
  int _estimatedDuration = 0;
  
  StreamSubscription<Position>? _positionStream;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _loadMission();
    _checkLocationPermission();
  }

  @override
  void dispose() {
    _positionStream?.cancel();
    _realtimeChannel?.unsubscribe();
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _checkLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez activer le GPS')),
      );
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permission de localisation refusée')),
        );
        return;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Permission de localisation refusée définitivement'),
        ),
      );
      return;
    }

    _getCurrentLocation();
  }

  Future<void> _getCurrentLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      
      setState(() {
        _currentPosition = position;
      });

      _mapController?.animateCamera(
        CameraUpdate.newLatLng(
          LatLng(position.latitude, position.longitude),
        ),
      );
    } catch (e) {
      print('Erreur récupération position: $e');
    }
  }

  Future<void> _loadMission() async {
    try {
      final response = await _supabase
          .from('missions')
          .select('*')
          .eq('id', widget.missionId)
          .single();

      setState(() {
        _mission = response;
        _isLoading = false;
      });

      _setupMarkers();
    } catch (e) {
      print('Erreur chargement mission: $e');
      setState(() => _isLoading = false);
    }
  }

  void _setupMarkers() {
    if (_mission == null) return;

    _markers.clear();

    // Marqueur de départ
    if (_mission!['pickup_lat'] != null && _mission!['pickup_lng'] != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: LatLng(
            _mission!['pickup_lat'],
            _mission!['pickup_lng'],
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
          infoWindow: InfoWindow(
            title: 'Départ',
            snippet: _mission!['pickup_address'] ?? '',
          ),
        ),
      );
    }

    // Marqueur d'arrivée
    if (_mission!['delivery_lat'] != null && _mission!['delivery_lng'] != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('delivery'),
          position: LatLng(
            _mission!['delivery_lat'],
            _mission!['delivery_lng'],
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: InfoWindow(
            title: 'Arrivée',
            snippet: _mission!['delivery_address'] ?? '',
          ),
        ),
      );

      // Calculer distance et durée estimée
      if (_mission!['pickup_lat'] != null && _mission!['pickup_lng'] != null) {
        _calculateRoute();
      }
    }

    // Marqueur position actuelle
    if (_currentPosition != null) {
      _markers.add(
        Marker(
          markerId: const MarkerId('current'),
          position: LatLng(
            _currentPosition!.latitude,
            _currentPosition!.longitude,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          infoWindow: const InfoWindow(title: 'Ma position'),
        ),
      );
    }

    setState(() {});
  }

  void _calculateRoute() {
    if (_mission!['pickup_lat'] == null || 
        _mission!['delivery_lat'] == null) return;

    final pickup = LatLng(_mission!['pickup_lat'], _mission!['pickup_lng']);
    final delivery = LatLng(_mission!['delivery_lat'], _mission!['delivery_lng']);

    // Ligne droite simple pour le moment
    _routeCoordinates.clear();
    _routeCoordinates.add(pickup);
    _routeCoordinates.add(delivery);

    // Calculer distance
    _totalDistance = Geolocator.distanceBetween(
      pickup.latitude,
      pickup.longitude,
      delivery.latitude,
      delivery.longitude,
    ) / 1000; // Conversion en km

    // Estimation durée (50 km/h moyenne)
    _estimatedDuration = (_totalDistance / 50 * 60).round();

    setState(() {});
  }

  void _startTracking() {
    if (_isTracking) return;

    setState(() => _isTracking = true);

    // Stream de position en temps réel
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Update tous les 10m
    );

    _positionStream = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      setState(() {
        _currentPosition = position;
      });

      _setupMarkers();

      // Broadcast position via Supabase Realtime
      _broadcastPosition(position);

      // Centrer la caméra
      _mapController?.animateCamera(
        CameraUpdate.newLatLng(
          LatLng(position.latitude, position.longitude),
        ),
      );
    });

    // Écouter les updates GPS d'autres utilisateurs
    _subscribeToRealtimeUpdates();
  }

  void _stopTracking() {
    setState(() => _isTracking = false);
    _positionStream?.cancel();
    _realtimeChannel?.unsubscribe();
  }

  Future<void> _broadcastPosition(Position position) async {
    try {
      await _supabase.from('mission_tracking_positions').upsert({
        'mission_id': widget.missionId,
        'user_id': _supabase.auth.currentUser?.id,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'timestamp': DateTime.now().toIso8601String(),
        'bearing': position.heading,
      });
    } catch (e) {
      print('Erreur broadcast GPS: $e');
    }
  }

  void _subscribeToRealtimeUpdates() {
    _realtimeChannel = _supabase.channel('mission:${widget.missionId}:gps');
    
    _realtimeChannel!.onBroadcast(
      event: 'gps_update',
      callback: (payload) {
        print('GPS update reçu: $payload');
        // Mettre à jour la position d'autres utilisateurs si nécessaire
      },
    ).subscribe();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_mission?['reference'] ?? 'Suivi GPS'),
        actions: [
          IconButton(
            icon: Icon(_isTracking ? Icons.stop : Icons.play_arrow),
            onPressed: _isTracking ? _stopTracking : _startTracking,
            tooltip: _isTracking ? 'Arrêter' : 'Démarrer',
          ),
        ],
      ),
      body: Stack(
        children: [
          // Carte Google Maps
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _currentPosition != null
                  ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
                  : const LatLng(48.8566, 2.3522), // Paris par défaut
              zoom: 12,
            ),
            markers: _markers,
            polylines: {
              if (_routeCoordinates.isNotEmpty)
                Polyline(
                  polylineId: const PolylineId('route'),
                  points: _routeCoordinates,
                  color: Colors.blue,
                  width: 4,
                ),
            },
            myLocationEnabled: true,
            myLocationButtonEnabled: true,
            zoomControlsEnabled: true,
            onMapCreated: (controller) {
              _mapController = controller;
            },
          ),

          // Panneau d'informations
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: _buildInfoPanel(),
          ),

          // Bouton centrer position
          Positioned(
            bottom: 80,
            right: 16,
            child: FloatingActionButton(
              heroTag: 'center',
              onPressed: _getCurrentLocation,
              child: const Icon(Icons.my_location),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoPanel() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(
                  _isTracking ? Icons.gps_fixed : Icons.gps_off,
                  color: _isTracking ? Colors.green : Colors.grey,
                ),
                const SizedBox(width: 8),
                Text(
                  _isTracking ? 'Suivi actif' : 'Suivi inactif',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _isTracking ? Colors.green : Colors.grey,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            if (_totalDistance > 0) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildInfoItem(
                    Icons.straighten,
                    'Distance',
                    '${_totalDistance.toStringAsFixed(1)} km',
                  ),
                  _buildInfoItem(
                    Icons.access_time,
                    'Durée est.',
                    '$_estimatedDuration min',
                  ),
                ],
              ),
            ],
            if (_currentPosition != null) ...[
              const SizedBox(height: 12),
              Text(
                'Lat: ${_currentPosition!.latitude.toStringAsFixed(6)}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
              Text(
                'Lng: ${_currentPosition!.longitude.toStringAsFixed(6)}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, size: 24, color: Colors.blue),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }
}
