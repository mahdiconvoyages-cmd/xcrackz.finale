import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/mission.dart';

class MissionMapScreen extends StatefulWidget {
  final Mission mission;

  const MissionMapScreen({
    super.key,
    required this.mission,
  });

  @override
  State<MissionMapScreen> createState() => _MissionMapScreenState();
}

class _MissionMapScreenState extends State<MissionMapScreen> {
  GoogleMapController? _mapController;
  Position? _currentPosition;
  final Set<Marker> _markers = {};
  final Set<Polyline> _polylines = {};
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initializeMap();
  }

  Future<void> _initializeMap() async {
    try {
      // Vérifier les permissions de localisation
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        _currentPosition = await Geolocator.getCurrentPosition();
      }

      // Créer les markers pour pickup et delivery
      _markers.add(
        Marker(
          markerId: const MarkerId('pickup'),
          position: const LatLng(48.8566, 2.3522), // TODO: Géocoder l'adresse pickup
          infoWindow: InfoWindow(
            title: 'Enlèvement',
            snippet: widget.mission.pickupAddress,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        ),
      );

      _markers.add(
        Marker(
          markerId: const MarkerId('delivery'),
          position: const LatLng(45.7640, 4.8357), // TODO: Géocoder l'adresse delivery
          infoWindow: InfoWindow(
            title: 'Livraison',
            snippet: widget.mission.deliveryAddress,
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        ),
      );

      // Créer la ligne entre les deux points
      _polylines.add(
        Polyline(
          polylineId: const PolylineId('route'),
          points: [
            const LatLng(48.8566, 2.3522),
            const LatLng(45.7640, 4.8357),
          ],
          color: Colors.blue,
          width: 4,
        ),
      );

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur carte: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Carte du trajet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: _centerOnCurrentLocation,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : GoogleMap(
              initialCameraPosition: const CameraPosition(
                target: LatLng(47.2173, 3.3960), // Centre de la France
                zoom: 6,
              ),
              markers: _markers,
              polylines: _polylines,
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              onMapCreated: (controller) {
                _mapController = controller;
                _fitBounds();
              },
            ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.small(
            heroTag: 'pickup',
            onPressed: _centerOnPickup,
            child: const Icon(Icons.place),
            backgroundColor: Colors.green,
          ),
          const SizedBox(height: 8),
          FloatingActionButton.small(
            heroTag: 'delivery',
            onPressed: _centerOnDelivery,
            child: const Icon(Icons.flag),
            backgroundColor: Colors.red,
          ),
        ],
      ),
    );
  }

  void _fitBounds() {
    if (_mapController == null) return;

    final bounds = LatLngBounds(
      southwest: const LatLng(45.7640, 2.3522),
      northeast: const LatLng(48.8566, 4.8357),
    );

    _mapController!.animateCamera(
      CameraUpdate.newLatLngBounds(bounds, 50),
    );
  }

  void _centerOnPickup() {
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(
        const LatLng(48.8566, 2.3522),
        12,
      ),
    );
  }

  void _centerOnDelivery() {
    _mapController?.animateCamera(
      CameraUpdate.newLatLngZoom(
        const LatLng(45.7640, 4.8357),
        12,
      ),
    );
  }

  void _centerOnCurrentLocation() {
    if (_currentPosition != null) {
      _mapController?.animateCamera(
        CameraUpdate.newLatLngZoom(
          LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
          14,
        ),
      );
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }
}
