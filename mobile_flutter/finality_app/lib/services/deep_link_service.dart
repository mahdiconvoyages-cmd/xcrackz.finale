import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';
import '../screens/missions/mission_detail_screen.dart';
import '../utils/logger.dart';

class DeepLinkService {
  static final DeepLinkService _instance = DeepLinkService._internal();
  factory DeepLinkService() => _instance;
  DeepLinkService._internal();

  final StreamController<Uri> _linkStreamController = StreamController<Uri>.broadcast();
  Stream<Uri> get linkStream => _linkStreamController.stream;

  void initialize() {
    // Deep links are handled via Android intent filters / iOS universal links
    // No native MethodChannel needed — use Flutter's built-in mechanism
    _getInitialLink();
  }

  Future<void> _getInitialLink() async {
    try {
      // Use ServicesBinding to get the initial URI if available
      final initialUri = Uri.base;
      if (initialUri.pathSegments.isNotEmpty) {
        logger.d('Initial URI detected: $initialUri');
        _linkStreamController.add(initialUri);
      }
    } catch (e) {
      logger.e('Failed to get initial link: $e');
    }
  }

  /// Handle deep link and navigate to appropriate screen
  Future<void> handleDeepLink(BuildContext context, Uri uri) async {
    logger.d('Handling deep link: $uri');

    // Parse the URI
    final path = uri.path;
    final pathSegments = uri.pathSegments;

    if (pathSegments.isEmpty) {
      logger.w('No path segments in URI');
      return;
    }

    // Handle mission links: https://checksfleet.com/mission/{missionId} or CHECKSFLEET://mission/{missionId}
    if ((uri.host == 'checksfleet.com' || uri.host == 'xcrackz.com' || uri.host == 'www.checksfleet.com' || uri.host == 'www.xcrackz.com') && pathSegments.first == 'mission' ||
        (uri.scheme == 'CHECKSFLEET' && uri.host == 'mission')) {
      
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
      logger.w('Unknown deep link format: $uri');
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
      logger.e('Error navigating to mission: $e');
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
    return 'https://checksfleet.com/trip/$tripId';
  }

  /// Generate shareable link for a mission
  String generateMissionLink(String missionId) {
    return 'https://checksfleet.com/mission/$missionId';
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
