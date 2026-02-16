import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../services/deep_link_service.dart';

class SharingUtils {
  static final DeepLinkService _deepLinkService = DeepLinkService();

  /// Share a trip with others
  static Future<void> shareTrip(
    BuildContext context,
    String tripId,
    String tripTitle,
  ) async {
    final link = _deepLinkService.generateTripLink(tripId);
    final message = 'Rejoignez mon trajet: $tripTitle\n$link';

    try {
      await SharePlus.instance.share(
        ShareParams(
          text: message,
        ),
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du partage: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Share a mission with others
  static Future<void> shareMission(
    BuildContext context,
    String missionId,
    String missionTitle,
  ) async {
    final link = _deepLinkService.generateMissionLink(missionId);
    final message = 'Découvrez cette mission: $missionTitle\n$link';

    try {
      await SharePlus.instance.share(
        ShareParams(
          text: message,
        ),
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du partage: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Copy trip link to clipboard
  static Future<void> copyTripLink(
    BuildContext context,
    String tripId,
  ) async {
    final link = _deepLinkService.generateTripLink(tripId);
    
    await Clipboard.setData(ClipboardData(text: link));
    
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lien copié dans le presse-papiers'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  /// Copy mission link to clipboard
  static Future<void> copyMissionLink(
    BuildContext context,
    String missionId,
  ) async {
    final link = _deepLinkService.generateMissionLink(missionId);
    
    await Clipboard.setData(ClipboardData(text: link));
    
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Lien copié dans le presse-papiers'),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  /// Show share options dialog
  static Future<void> showShareDialog(
    BuildContext context, {
    required String id,
    required String title,
    required bool isTrip,
  }) async {
    await showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.share),
              title: const Text('Partager'),
              onTap: () {
                Navigator.pop(context);
                if (isTrip) {
                  shareTrip(context, id, title);
                } else {
                  shareMission(context, id, title);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.content_copy),
              title: const Text('Copier le lien'),
              onTap: () {
                Navigator.pop(context);
                if (isTrip) {
                  copyTripLink(context, id);
                } else {
                  copyMissionLink(context, id);
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.cancel),
              title: const Text('Annuler'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }
}
