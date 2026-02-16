import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

/// Affiche un dialog avec le lien public du rapport d'inspection
/// Format: https://www.checksfleet.com/rapport-inspection/{share_token}
class InspectionReportLinkDialog extends StatelessWidget {
  final String shareToken;
  final String reportType; // 'departure' ou 'arrival' ou 'complete'

  const InspectionReportLinkDialog({
    super.key,
    required this.shareToken,
    this.reportType = 'complete',
  });

  String get _publicLink => 'https://www.checksfleet.com/rapport-inspection/$shareToken';

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF1e293b),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Success icon
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                color: Color(0xFF14B8A6),
                size: 48,
              ),
            ),
            const SizedBox(height: 24),

            // Title
            const Text(
              'Rapport créé avec succès !',
              style: TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),

            // Subtitle
            Text(
              'Rapport d\'inspection ${_getReportTypeLabel()}',
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),

            // Public link
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0f172a),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF14B8A6).withValues(alpha: 0.3),
                  width: 1,
                ),
              ),
              child: SelectableText(
                _publicLink,
                style: const TextStyle(
                  color: Color(0xFF14B8A6),
                  fontSize: 12,
                ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 24),

            // Buttons
            Row(
              children: [
                // Copy button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: _publicLink));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Lien copié dans le presse-papier'),
                          backgroundColor: Color(0xFF14B8A6),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.copy),
                    label: const Text('Copier'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFF475569)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Share button
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      SharePlus.instance.share(
                        ShareParams(
                          text: 'Voici le rapport d\'inspection de votre véhicule :\n\n$_publicLink',
                          subject: 'Rapport d\'inspection CHECKSFLEET',
                        ),
                      );
                    },
                    icon: const Icon(Icons.share),
                    label: const Text('Partager'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Close button
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text(
                'Fermer',
                style: TextStyle(color: Colors.white70),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getReportTypeLabel() {
    switch (reportType) {
      case 'departure':
        return 'de départ';
      case 'arrival':
        return 'd\'arrivée';
      case 'complete':
        return 'complet';
      default:
        return '';
    }
  }
}
