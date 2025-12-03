import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../screens/missions/mission_detail_screen.dart';

class DeepLinkService {
  static final DeepLinkService _instance = DeepLinkService._internal();
  factory DeepLinkService() => _instance;
  DeepLinkService._internal();

  static const platform = MethodChannel('app.finality/deeplink');
  
  StreamController<Uri> _linkStreamController = StreamController<Uri>.broadcast();
  Stream<Uri> get linkStream => _linkStreamController.stream;

  void initialize() {
    // Listen for app opened via deep link (app was killed)
    _getInitialLink();
    
    // Listen for deep links while app is running
    _listenForLinks();
  }

  Future<void> _getInitialLink() async {
    try {
      final String? initialLink = await platform.invokeMethod('getInitialLink');
      if (initialLink != null) {
        final uri = Uri.parse(initialLink);
        _linkStreamController.add(uri);
      }
    } on PlatformException catch (e) {
      debugPrint('Failed to get initial link: ${e.message}');
    }
  }

  void _listenForLinks() {
    platform.setMethodCallHandler((call) async {
      if (call.method == 'onNewLink') {
        final String link = call.arguments;
        final uri = Uri.parse(link);
        _linkStreamController.add(uri);
      }
    });
  }

  /// Handle deep link and navigate to appropriate screen
  Future<void> handleDeepLink(BuildContext context, Uri uri) async {
    debugPrint('Handling deep link: $uri');

    // Parse the URI
    final path = uri.path;
    final pathSegments = uri.pathSegments;

    if (pathSegments.isEmpty) {
      debugPrint('No path segments in URI');
      return;
    }

    // Handle mission links: https://finality.app/mission/{missionId} or finality://mission/{missionId}
    if ((uri.host == 'finality.app' && pathSegments.first == 'mission') ||
        (uri.scheme == 'checkflow' && uri.host == 'mission')) {
      
      final missionId = pathSegments.length > 1 
          ? pathSegments[1] 
          : uri.queryParameters['id'];
      
      if (missionId != null && missionId.isNotEmpty) {
        await _navigateToMission(context, missionId);
      } else {
        _showError(context, 'ID de mission invalide');
      }
    }
    else {
      debugPrint('Unknown deep link format: $uri');
      _showError(context, 'Lien non reconnu');
    }
  }

  Future<void> _navigateToMission(BuildContext context, String missionId) async {
    try {
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => MissionDetailScreen(missionId: missionId), // Updated
        ),
      );
    } catch (e) {
      debugPrint('Error navigating to mission: $e');
      _showError(context, 'Impossible d\'ouvrir la mission');
    }
  }

  void _showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  /// Generate shareable link for a trip
  String generateTripLink(String tripId) {
    return 'https://finality.app/trip/$tripId';
  }

  /// Generate shareable link for a mission
  String generateMissionLink(String missionId) {
    return 'https://finality.app/mission/$missionId';
  }

  /// Generate custom scheme link for a trip (fallback)
  String generateTripDeepLink(String tripId) {
    return 'finality://trip/$tripId';
  }

  /// Generate custom scheme link for a mission (fallback)
  String generateMissionDeepLink(String missionId) {
    return 'finality://mission/$missionId';
  }

  void dispose() {
    _linkStreamController.close();
  }
}
