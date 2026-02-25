import 'dart:io';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/update_service.dart';
import '../theme/premium_theme.dart';

/// Dialog élégant de mise à jour de l'application
class UpdateDialog extends StatefulWidget {
  final AppUpdate update;

  const UpdateDialog({super.key, required this.update});

  /// Affiche le dialog de mise à jour
  /// Retourne true si l'utilisateur a lancé le téléchargement
  static Future<bool> show(BuildContext context, AppUpdate update) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: !update.isMandatory,
      builder: (_) => UpdateDialog(update: update),
    );
    return result ?? false;
  }

  @override
  State<UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<UpdateDialog> with SingleTickerProviderStateMixin {
  bool _isDownloading = false;
  double _progress = 0;
  String _statusText = '';
  String? _error;
  late AnimationController _animController;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _scaleAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOutBack);
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _startDownload() async {
    setState(() {
      _isDownloading = true;
      _progress = 0;
      _statusText = 'Préparation...';
      _error = null;
    });

    final filePath = await UpdateService.instance.downloadApk(
      widget.update,
      onProgress: (received, total) {
        if (!mounted) return;
        setState(() {
          if (total > 0) {
            _progress = received / total;
            final receivedMb = (received / 1024 / 1024).toStringAsFixed(1);
            final totalMb = (total / 1024 / 1024).toStringAsFixed(1);
            _statusText = '$receivedMb / $totalMb MB';
          } else {
            final receivedMb = (received / 1024 / 1024).toStringAsFixed(1);
            _statusText = '$receivedMb MB téléchargés';
          }
        });
      },
    );

    if (!mounted) return;

    if (filePath != null) {
      setState(() => _statusText = 'Installation...');
      await _installApk(filePath);
    } else {
      setState(() {
        _isDownloading = false;
        _error = 'Le téléchargement a échoué. Réessayez.';
      });
    }
  }

  Future<void> _installApk(String filePath) async {
    try {
      final file = File(filePath);
      if (!file.existsSync()) {
        setState(() {
          _isDownloading = false;
          _error = 'Fichier APK introuvable';
        });
        return;
      }

      // Utiliser un Intent Android pour installer l'APK
      // Sur Android, ouvrir le fichier avec le package installer
      final uri = Uri.parse(filePath);
      
      // Fallback: ouvrir l'URL de téléchargement dans le navigateur
      // Le navigateur gère le téléchargement + prompt d'installation
      final downloadUri = Uri.parse(widget.update.downloadUrl);
      if (await canLaunchUrl(downloadUri)) {
        await launchUrl(downloadUri, mode: LaunchMode.externalApplication);
        if (mounted) Navigator.of(context).pop(true);
      } else {
        setState(() {
          _isDownloading = false;
          _error = 'Impossible d\'ouvrir le lien de téléchargement';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isDownloading = false;
        _error = 'Erreur d\'installation: $e';
      });
    }
  }

  Future<void> _openInBrowser() async {
    final uri = Uri.parse(widget.update.downloadUrl);
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = 'Impossible d\'ouvrir le navigateur');
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !widget.update.isMandatory,
      child: ScaleTransition(
        scale: _scaleAnim,
        child: Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          backgroundColor: Colors.white,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ── Icône ──
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF14B8A6), Color(0xFF0EA5E9)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF14B8A6).withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.system_update, color: Colors.white, size: 40),
                  ),

                  const SizedBox(height: 20),

                  // ── Titre ──
                  Text(
                    widget.update.isMandatory
                        ? 'Mise à jour obligatoire'
                        : 'Nouvelle version disponible !',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                    textAlign: TextAlign.center,
                  ),

                  const SizedBox(height: 8),

                  // ── Version ──
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF86EFAC)),
                    ),
                    child: Text(
                      'Version ${widget.update.version}',
                      style: const TextStyle(
                        color: Color(0xFF16A34A),
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ),

                  if (widget.update.fileSizeMb != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      '${widget.update.fileSizeMb!.toStringAsFixed(0)} MB',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],

                  // ── Notes de mise à jour ──
                  if (widget.update.releaseNotes != null && widget.update.releaseNotes!.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.new_releases, size: 16, color: Color(0xFF14B8A6)),
                              SizedBox(width: 6),
                              Text(
                                'Nouveautés',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Text(
                            widget.update.releaseNotes!,
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF64748B),
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 24),

                  // ── Barre de progression ──
                  if (_isDownloading) ...[
                    Column(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: _progress > 0 ? _progress : null,
                            minHeight: 8,
                            backgroundColor: const Color(0xFFE2E8F0),
                            valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF14B8A6)),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _statusText,
                          style: TextStyle(color: Colors.grey[600], fontSize: 12),
                        ),
                        if (_progress > 0)
                          Text(
                            '${(_progress * 100).toInt()}%',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF14B8A6),
                              fontSize: 16,
                            ),
                          ),
                      ],
                    ),
                  ],

                  // ── Erreur ──
                  if (_error != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFFCA5A5)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(color: Color(0xFFDC2626), fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // ── Boutons ──
                  if (!_isDownloading) ...[
                    // Bouton principal : Télécharger
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: ElevatedButton.icon(
                        onPressed: _startDownload,
                        icon: const Icon(Icons.download, size: 20),
                        label: const Text(
                          'Télécharger la mise à jour',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF14B8A6),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Bouton secondaire : Ouvrir dans le navigateur
                    SizedBox(
                      width: double.infinity,
                      child: TextButton.icon(
                        onPressed: _openInBrowser,
                        icon: Icon(Icons.open_in_browser, size: 18, color: Colors.grey[600]),
                        label: Text(
                          'Ouvrir dans le navigateur',
                          style: TextStyle(color: Colors.grey[600], fontSize: 13),
                        ),
                      ),
                    ),

                    // Bouton ignorer (seulement si pas obligatoire)
                    if (!widget.update.isMandatory) ...[
                      const SizedBox(height: 4),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () => Navigator.of(context).pop(false),
                          child: Text(
                            'Plus tard',
                            style: TextStyle(color: Colors.grey[400], fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
