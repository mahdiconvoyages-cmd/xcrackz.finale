import 'package:flutter/material.dart';
import 'package:app_links/app_links.dart';
import 'dart:async';
import '../screens/missions/mission_detail_screen.dart';
import '../utils/logger.dart';

class DeepLinkService {
  static final DeepLinkService _instance = DeepLinkService._internal();
  factory DeepLinkService() => _instance;
  DeepLinkService._internal();

  final _appLinks = AppLinks();
  final StreamController<Uri> _linkStreamController = StreamController<Uri>.broadcast();
  Stream<Uri> get linkStream => _linkStreamController.stream;
  StreamSubscription<Uri>? _sub;

  void initialize() {
    _getInitialLink();
    // Listen to incoming links
    _sub = _appLinks.uriLinkStream.listen((uri) {
      logger.d('Deep link received: $uri');
      _linkStreamController.add(uri);
    }, onError: (e) {
      logger.e('Deep link stream error: $e');
    });
  }

  Future<void> _getInitialLink() async {
    try {
      final initialUri = await _appLinks.getInitialLink();
      if (initialUri != null) {
        logger.d('Initial deep link: $initialUri');
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
    if ((uri.host == 'checksfleet.com' || uri.host == 'www.checksfleet.com') && pathSegments.first == 'mission' ||
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
    _sub?.cancel();
    _linkStreamController.close();
  }
}
