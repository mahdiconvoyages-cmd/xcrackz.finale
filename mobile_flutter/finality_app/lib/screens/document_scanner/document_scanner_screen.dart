import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:image/image.dart' as img;
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme/premium_theme.dart';

/// Document Scanner — PremiumTheme Light Design
/// Single-page scan with enhance, B&W filter, OCR, share & save
class DocumentScannerScreen extends StatefulWidget {
  final String? inspectionId;
  final Function(String documentPath, String? extractedText)? onDocumentScanned;

  const DocumentScannerScreen({
    super.key,
    this.inspectionId,
    this.onDocumentScanned,
  });

  @override
  State<DocumentScannerScreen> createState() => _DocumentScannerScreenState();
}

class _DocumentScannerScreenState extends State<DocumentScannerScreen> {
  List<String> _paths = [];
  int _idx = 0;
  String? _text;
  bool _processing = false;
  bool _enhancing = false;
  bool _extracting = false;
  String _docName = 'Document';

  // ── Scan ─────────────────────────────────────────────────────
  Future<void> _scan() async {
    // 1. Vérifier la permission caméra AVANT d'ouvrir le scanner
    final status = await Permission.camera.request();
    if (!mounted) return;
    if (!status.isGranted) {
      _showCameraSettingsDialog();
      return;
    }

    setState(() => _processing = true);
    try {
      // Scanner natif : VisionKit (iOS) ou ML Kit (Android)
      // Renvoie null ou liste vide si l'utilisateur annule — pas d'erreur
      final images = await CunningDocumentScanner.getAllScannedImages();
      if (!mounted) return;
      if (images != null && images.isNotEmpty) {
        setState(() { _paths = images; _idx = 0; _processing = false; });
      } else {
        setState(() => _processing = false);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _processing = false);
      _snack('Impossible d\'ouvrir le scanner. Réessayez.', PremiumTheme.accentRed);
    }
  }

  void _showCameraSettingsDialog() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Caméra non autorisée'),
        content: const Text(
          'L\'accès à la caméra est nécessaire pour scanner.\n\nActivez-le dans Réglages > ChecksFleet > Caméra.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
          FilledButton(
            onPressed: () { Navigator.pop(context); openAppSettings(); },
            child: const Text('Réglages'),
          ),
        ],
      ),
    );
  }

  // ── Enhance ──────────────────────────────────────────────────
  Future<void> _enhance() async {
    if (_paths.isEmpty) return;
    setState(() => _enhancing = true);
    try {
      final bytes = await File(_paths[_idx]).readAsBytes();
      var image = img.decodeImage(bytes);
      if (image == null) throw Exception('Decode failed');
      image = img.adjustColor(image, contrast: 1.15, brightness: 1.05, saturation: 1.0);
      image = img.convolution(image, filter: [0, -1, 0, -1, 5, -1, 0, -1, 0]);
      final dir = await getApplicationDocumentsDirectory();
      final p = path.join(dir.path, 'enhanced_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await File(p).writeAsBytes(img.encodeJpg(image, quality: 95));
      if (!mounted) return;
      setState(() { _paths[_idx] = p; _enhancing = false; });
      _snack('Image amelioree', PremiumTheme.primaryTeal);
    } catch (e) {
      if (mounted) setState(() => _enhancing = false);
      _snack('Erreur: $e', PremiumTheme.accentRed);
    }
  }

  // ── B&W ──────────────────────────────────────────────────────
  Future<void> _bw() async {
    if (_paths.isEmpty) return;
    setState(() => _enhancing = true);
    try {
      final bytes = await File(_paths[_idx]).readAsBytes();
      var image = img.decodeImage(bytes);
      if (image == null) throw Exception('Decode failed');
      image = img.grayscale(image);
      image = img.adjustColor(image, contrast: 1.3, brightness: 1.1);
      final dir = await getApplicationDocumentsDirectory();
      final p = path.join(dir.path, 'bw_${DateTime.now().millisecondsSinceEpoch}.jpg');
      await File(p).writeAsBytes(img.encodeJpg(image, quality: 95));
      if (!mounted) return;
      setState(() { _paths[_idx] = p; _enhancing = false; });
      _snack('Filtre noir & blanc applique', PremiumTheme.primaryTeal);
    } catch (e) {
      if (mounted) setState(() => _enhancing = false);
      _snack('Erreur: $e', PremiumTheme.accentRed);
    }
  }

  // ── OCR ──────────────────────────────────────────────────────
  Future<void> _ocr() async {
    if (_paths.isEmpty) return;
    if (_text != null) { _showText(); return; }
    setState(() => _extracting = true);
    try {
      final input = InputImage.fromFilePath(_paths[_idx]);
      final rec = TextRecognizer(script: TextRecognitionScript.latin);
      final result = await rec.processImage(input);
      await rec.close();
      if (!mounted) return;
      setState(() { _text = result.text; _extracting = false; });
      if (_text != null && _text!.isNotEmpty) {
        _showText();
      } else {
        _snack('Aucun texte detecte', PremiumTheme.accentAmber);
      }
    } catch (e) {
      if (mounted) setState(() => _extracting = false);
      _snack('Erreur OCR: $e', PremiumTheme.accentRed);
    }
  }

  void _showText() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.6,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2))),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(9),
                    decoration: BoxDecoration(
                      color: PremiumTheme.primaryPurple.withValues(alpha: .1),
                      borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.text_fields_rounded,
                        color: PremiumTheme.primaryPurple, size: 20),
                  ),
                  const SizedBox(width: 10),
                  const Text('Texte extrait',
                      style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: PremiumTheme.textPrimary)),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.copy_rounded,
                        color: PremiumTheme.primaryBlue, size: 20),
                    onPressed: () {
                      // Copy to clipboard handled by SelectableText long press
                    },
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: SelectableText(
                  _text ?? '',
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: PremiumTheme.textPrimary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Share ────────────────────────────────────────────────────
  Future<void> _share() async {
    if (_paths.isEmpty) return;
    try {
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(_paths[_idx])],
          text: 'Document scanne: $_docName',
        ),
      );
    } catch (e) {
      _snack('Erreur partage: $e', PremiumTheme.accentRed);
    }
  }

  // ── Rename ───────────────────────────────────────────────────
  Future<void> _rename() async {
    final ctl = TextEditingController(text: _docName);
    final name = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryBlue.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.drive_file_rename_outline_rounded,
                color: PremiumTheme.primaryBlue, size: 22),
          ),
          const SizedBox(width: 10),
          const Text('Renommer', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        ]),
        content: TextField(
          controller: ctl,
          autofocus: true,
          decoration: InputDecoration(
            labelText: 'Nom du document',
            filled: true,
            fillColor: PremiumTheme.lightBg,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: PremiumTheme.primaryBlue, width: 2),
            ),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context),
            child: const Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary))),
          ElevatedButton(
            onPressed: () {
              final n = ctl.text.trim();
              if (n.isNotEmpty) Navigator.pop(context, n);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.primaryBlue,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0),
            child: const Text('Renommer', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (name != null && name.isNotEmpty) {
      setState(() => _docName = name);
      _snack('Renomme: $name', PremiumTheme.primaryTeal);
    }
  }

  // ── Save ─────────────────────────────────────────────────────
  void _save() {
    if (_paths.isNotEmpty && widget.onDocumentScanned != null) {
      widget.onDocumentScanned!(_paths[_idx], _text);
    }
    Navigator.pop(context, _paths.isNotEmpty ? _paths[_idx] : null);
  }

  void _rescan() {
    setState(() { _paths.clear(); _text = null; _idx = 0; });
    _scan();
  }

  void _snack(String msg, Color bg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: bg,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2)));
  }

  // ══════════════════════════════════════════════════════════════
  //  BUILD
  // ══════════════════════════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: PremiumTheme.textPrimary,
        title: Row(children: [
          Container(
            width: 28, height: 28,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryTeal.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.document_scanner_rounded,
                color: PremiumTheme.primaryTeal, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('Scanner document',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        ]),
        actions: [
          if (_paths.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.drive_file_rename_outline_rounded,
                  color: PremiumTheme.primaryBlue),
              onPressed: _rename,
              tooltip: 'Renommer',
            ),
        ],
      ),
      body: _processing
          ? _loader()
          : _paths.isEmpty
              ? _empty()
              : _preview(),
    );
  }

  // ── Loading state ────────────────────────────────────────────
  Widget _loader() {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(width: 48, height: 48,
            child: CircularProgressIndicator(
                color: PremiumTheme.primaryTeal, strokeWidth: 3)),
          SizedBox(height: 16),
          Text('Traitement en cours...',
              style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 14)),
        ],
      ),
    );
  }

  // ── Empty state ──────────────────────────────────────────────
  Widget _empty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: PremiumTheme.primaryTeal.withValues(alpha: .08),
                shape: BoxShape.circle,
                border: Border.all(
                    color: PremiumTheme.primaryTeal.withValues(alpha: .2),
                    width: 2),
              ),
              child: const Icon(Icons.document_scanner_rounded,
                  size: 64, color: PremiumTheme.primaryTeal),
            ),
            const SizedBox(height: 28),
            const Text('Pret a scanner',
                style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: PremiumTheme.textPrimary)),
            const SizedBox(height: 8),
            const Text('Appuyez sur le bouton ci-dessous pour commencer',
                textAlign: TextAlign.center,
                style: TextStyle(
                    color: PremiumTheme.textSecondary, fontSize: 14)),
            const SizedBox(height: 32),
            SizedBox(
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _scan,
                icon: const Icon(Icons.camera_alt_rounded, color: Colors.white),
                label: const Text('Demarrer le scan',
                    style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: PremiumTheme.primaryTeal,
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                  elevation: 0),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Preview & actions ────────────────────────────────────────
  Widget _preview() {
    return Column(
      children: [
        // Image
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: .06),
                    blurRadius: 16,
                    offset: const Offset(0, 4)),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.file(File(_paths[_idx]), fit: BoxFit.contain),
            ),
          ),
        ),

        // Actions bar
        Container(
          padding: EdgeInsets.fromLTRB(
              16, 16, 16, MediaQuery.of(context).padding.bottom + 16),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                  color: Colors.black.withValues(alpha: .05),
                  blurRadius: 10,
                  offset: const Offset(0, -4)),
            ],
          ),
          child: Column(
            children: [
              // Quick tools
              Row(
                children: [
                  _toolBtn(
                    icon: Icons.auto_fix_high_rounded,
                    label: 'Ameliorer',
                    color: PremiumTheme.primaryTeal,
                    busy: _enhancing,
                    onTap: _enhance,
                  ),
                  const SizedBox(width: 10),
                  _toolBtn(
                    icon: Icons.filter_b_and_w_rounded,
                    label: 'N&B',
                    color: PremiumTheme.textPrimary,
                    busy: _enhancing,
                    onTap: _bw,
                  ),
                  const SizedBox(width: 10),
                  _toolBtn(
                    icon: Icons.text_fields_rounded,
                    label: _text != null ? 'Voir texte' : 'OCR',
                    color: PremiumTheme.primaryPurple,
                    busy: _extracting,
                    onTap: _ocr,
                  ),
                  const SizedBox(width: 10),
                  _toolBtn(
                    icon: Icons.share_rounded,
                    label: 'Partager',
                    color: PremiumTheme.primaryBlue,
                    onTap: _share,
                  ),
                ],
              ),
              const SizedBox(height: 14),
              // Main actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _rescan,
                      icon: const Icon(Icons.refresh_rounded, size: 20),
                      label: const Text('Reprendre',
                          style: TextStyle(fontWeight: FontWeight.w600)),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: PremiumTheme.textSecondary,
                        side: const BorderSide(color: PremiumTheme.textTertiary),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _save,
                      icon: const Icon(Icons.check_rounded,
                          color: Colors.white, size: 20),
                      label: const Text('Valider',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.primaryTeal,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        elevation: 0),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _toolBtn({
    required IconData icon,
    required String label,
    required Color color,
    bool busy = false,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: busy ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: .06),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              busy
                  ? SizedBox(
                      width: 20, height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: color))
                  : Icon(icon, color: color, size: 22),
              const SizedBox(height: 6),
              Text(label,
                  style: TextStyle(
                      color: color, fontSize: 11, fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}
