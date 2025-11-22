import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../utils/sharing_utils.dart';
import '../../services/deep_link_service.dart';

class PublicSharingScreen extends StatefulWidget {
  final String? itemId;
  final String? itemType; // 'trip' or 'mission'
  final String? itemTitle;

  const PublicSharingScreen({
    super.key,
    this.itemId,
    this.itemType,
    this.itemTitle,
  });

  @override
  State<PublicSharingScreen> createState() => _PublicSharingScreenState();
}

class _PublicSharingScreenState extends State<PublicSharingScreen> {
  final DeepLinkService _deepLinkService = DeepLinkService();
  String? _generatedShareLink;
  bool _showQR = false;

  @override
  void initState() {
    super.initState();
    if (widget.itemId != null && widget.itemType != null) {
      _generateLink();
    }
  }

  void _generateLink() {
    if (widget.itemType == 'trip') {
      _generatedShareLink = _deepLinkService.generateTripLink(widget.itemId!);
    } else if (widget.itemType == 'mission') {
      _generatedShareLink = _deepLinkService.generateMissionLink(widget.itemId!);
    }
    setState(() {});
  }

  Future<void> _copyLink() async {
    if (_generatedShareLink == null) return;
    
    await Clipboard.setData(ClipboardData(text: _generatedShareLink!));
    
    if (!mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Lien copié dans le presse-papiers'),
        duration: Duration(seconds: 2),
      ),
    );
  }

  Future<void> _shareLinkViaApp() async {
    if (_generatedShareLink == null || widget.itemTitle == null) return;
    
    if (widget.itemType == 'trip') {
      await SharingUtils.shareTrip(
        context,
        widget.itemId!,
        widget.itemTitle!,
      );
    } else if (widget.itemType == 'mission') {
      await SharingUtils.shareMission(
        context,
        widget.itemId!,
        widget.itemTitle!,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Partage Public'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header illustration
            Container(
              height: 150,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.primary,
                    Theme.of(context).colorScheme.secondary,
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _showQR ? Icons.qr_code_2 : Icons.share,
                    size: 64,
                    color: Colors.white,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _showQR ? 'Code QR' : 'Partager',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 32),
            
            if (widget.itemTitle != null) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            widget.itemType == 'trip'
                                ? Icons.directions_car
                                : Icons.assignment,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.itemType == 'trip' ? 'Trajet' : 'Mission',
                                  style: Theme.of(context).textTheme.labelSmall,
                                ),
                                Text(
                                  widget.itemTitle!,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
            
            // Toggle between link and QR
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(
                  value: false,
                  label: Text('Lien'),
                  icon: Icon(Icons.link),
                ),
                ButtonSegment(
                  value: true,
                  label: Text('QR Code'),
                  icon: Icon(Icons.qr_code_2),
                ),
              ],
              selected: {_showQR},
              onSelectionChanged: (Set<bool> selected) {
                setState(() => _showQR = selected.first);
              },
            ),
            
            const SizedBox(height: 24),
            
            // Display link or QR code
            if (!_showQR) ...[
              if (_generatedShareLink != null) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Lien de partage',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: SelectableText(
                            _generatedShareLink!,
                            style: const TextStyle(
                              fontSize: 14,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _copyLink,
                        icon: const Icon(Icons.content_copy),
                        label: const Text('Copier'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _shareLinkViaApp,
                        icon: const Icon(Icons.share),
                        label: const Text('Partager'),
                      ),
                    ),
                  ],
                ),
              ] else
                const Center(
                  child: Text('Aucun lien à partager'),
                ),
            ] else ...[
              // QR Code display
              if (_generatedShareLink != null) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: QrImageView(
                            data: _generatedShareLink!,
                            version: QrVersions.auto,
                            size: 250,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Scannez ce code QR pour accéder',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: Theme.of(context).colorScheme.onSurfaceVariant,
                              ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    // TODO: Implement QR code download/share
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Téléchargement du QR code...'),
                      ),
                    );
                  },
                  icon: const Icon(Icons.download),
                  label: const Text('Télécharger le QR Code'),
                ),
              ] else
                const Center(
                  child: Text('Impossible de générer le QR code'),
                ),
            ],
            
            const SizedBox(height: 32),
            
            // Info section
            Card(
              color: Theme.of(context).colorScheme.secondaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Theme.of(context).colorScheme.onSecondaryContainer,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'À propos',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSecondaryContainer,
                              ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Partagez ce lien pour donner accès aux détails de la mission.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSecondaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
