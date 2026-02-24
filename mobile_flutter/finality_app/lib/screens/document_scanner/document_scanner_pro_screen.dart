import 'dart:io';
import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/image_filter_service.dart';
import '../../services/pdf_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/sync_indicator.dart';
import '../../theme/premium_theme.dart';

/// Scanner Pro — PremiumTheme Light Design
/// Multi-page scan with filters, PDF generation, upload & share
class DocumentScannerProScreen extends StatefulWidget {
  final String? inspectionId;
  final Function(String documentPath)? onDocumentScanned;

  const DocumentScannerProScreen({
    super.key,
    this.inspectionId,
    this.onDocumentScanned,
  });

  @override
  State<DocumentScannerProScreen> createState() =>
      _DocumentScannerProScreenState();
}

class _DocumentScannerProScreenState extends State<DocumentScannerProScreen> {
  final List<ScannedPage> _pages = [];
  int _idx = 0;
  bool _scanning = false;
  bool _processing = false;
  SyncStatus _sync = SyncStatus.idle;
  double? _progress;

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
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              gradient: PremiumTheme.tealGradient,
              borderRadius: BorderRadius.circular(9)),
            child: const Icon(Icons.document_scanner_rounded,
                color: Colors.white, size: 18),
          ),
          const SizedBox(width: 10),
          const Text('Scanner Pro',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        ]),
        actions: [
          if (_pages.isNotEmpty) ...[
            SyncIndicator(
                status: _sync, progress: _progress, showText: false),
            const SizedBox(width: 4),
            IconButton(
              icon: const Icon(Icons.share_rounded,
                  color: PremiumTheme.primaryBlue),
              tooltip: 'Partager PDF',
              onPressed: _sharePDF,
            ),
            IconButton(
              icon: const Icon(Icons.save_rounded,
                  color: PremiumTheme.accentGreen),
              tooltip: 'Sauvegarder',
              onPressed: _savePDF,
            ),
          ],
        ],
      ),
      body: _pages.isEmpty ? _emptyState() : _pageView(),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_pages.isNotEmpty) ...[
            FloatingActionButton(
              heroTag: 'filter',
              mini: true,
              backgroundColor: Colors.white,
              elevation: 3,
              onPressed: _showFilters,
              child: const Icon(Icons.tune_rounded,
                  color: PremiumTheme.primaryPurple),
            ),
            const SizedBox(height: 12),
          ],
          FloatingActionButton.extended(
            heroTag: 'scan',
            onPressed: _scanning ? null : _scanPage,
            backgroundColor: PremiumTheme.primaryTeal,
            elevation: 4,
            icon: Icon(
                _pages.isEmpty
                    ? Icons.camera_alt_rounded
                    : Icons.add_rounded,
                color: Colors.white),
            label: Text(
              _pages.isEmpty ? 'Scanner' : 'Ajouter page',
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  // ── Empty state ──────────────────────────────────────────────
  Widget _emptyState() {
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
            const Text('Scanner Pro',
                style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: PremiumTheme.textPrimary)),
            const SizedBox(height: 8),
            const Text(
              'Scanner multi-pages professionnel\navec filtres et generation PDF',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: PremiumTheme.textSecondary, fontSize: 14),
            ),
            const SizedBox(height: 32),
            ..._features(),
          ],
        ),
      ),
    );
  }

  List<Widget> _features() {
    const items = [
      (Icons.tune_rounded, 'Filtres N&B, Gris, Couleur', PremiumTheme.primaryPurple),
      (Icons.layers_rounded, 'Scan multi-pages', PremiumTheme.primaryBlue),
      (Icons.picture_as_pdf_rounded, 'Generation PDF', PremiumTheme.accentRed),
      (Icons.cloud_upload_rounded, 'Upload automatique', PremiumTheme.accentGreen),
    ];
    return items
        .map((f) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                        color: Colors.black.withValues(alpha: .03),
                        blurRadius: 8,
                        offset: const Offset(0, 2)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: f.$3.withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(10)),
                      child: Icon(f.$1, color: f.$3, size: 20),
                    ),
                    const SizedBox(width: 14),
                    Text(f.$2,
                        style: const TextStyle(
                            color: PremiumTheme.textPrimary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ))
        .toList();
  }

  // ── Page view ────────────────────────────────────────────────
  Widget _pageView() {
    return Column(
      children: [
        // Thumbnail strip
        Container(
          height: 110,
          color: Colors.white,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(12),
            itemCount: _pages.length,
            itemBuilder: (_, i) {
              final selected = i == _idx;
              return GestureDetector(
                onTap: () => setState(() => _idx = i),
                child: Container(
                  width: 72,
                  margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected
                          ? PremiumTheme.primaryTeal
                          : Colors.grey.shade200,
                      width: selected ? 3 : 1.5,
                    ),
                    boxShadow: selected
                        ? [
                            BoxShadow(
                                color: PremiumTheme.primaryTeal
                                    .withValues(alpha: .2),
                                blurRadius: 8)
                          ]
                        : null,
                  ),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(_pages[i].imageFile,
                            fit: BoxFit.cover, width: 72, height: 110),
                      ),
                      // Page number
                      Positioned(
                        top: 4,
                        right: 4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: selected
                                ? PremiumTheme.primaryTeal
                                : Colors.black54,
                            borderRadius: BorderRadius.circular(6)),
                          child: Text('${i + 1}',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700)),
                        ),
                      ),
                      // Delete
                      Positioned(
                        bottom: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () => _deletePage(i),
                          child: Container(
                            padding: const EdgeInsets.all(3),
                            decoration: const BoxDecoration(
                                color: PremiumTheme.accentRed,
                                shape: BoxShape.circle),
                            child: const Icon(Icons.close_rounded,
                                size: 12, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Divider
        Container(height: 1, color: Colors.grey.shade100),

        // Preview
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: .05),
                    blurRadius: 12,
                    offset: const Offset(0, 4)),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: _processing
                ? const Center(
                    child: CircularProgressIndicator(
                        color: PremiumTheme.primaryTeal))
                : InteractiveViewer(
                    minScale: 0.5,
                    maxScale: 4.0,
                    child: _pages.isNotEmpty
                        ? Image.file(_pages[_idx].imageFile)
                        : const SizedBox(),
                  ),
          ),
        ),

        // Filter info
        if (_pages.isNotEmpty &&
            _pages[_idx].filterApplied != null)
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            padding: const EdgeInsets.symmetric(
                horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryPurple.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.tune_rounded,
                    size: 16, color: PremiumTheme.primaryPurple),
                const SizedBox(width: 8),
                Text(
                  'Filtre: ${ImageFilterService.getFilterName(_pages[_idx].filterApplied!)}',
                  style: const TextStyle(
                      color: PremiumTheme.primaryPurple,
                      fontSize: 12,
                      fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),

        const SizedBox(height: 8),

        // Page counter
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            'Page ${_idx + 1} / ${_pages.length}',
            style: const TextStyle(
                color: PremiumTheme.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w600),
          ),
        ),

        const SizedBox(height: 16),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════════════════════════════
  Future<void> _scanPage() async {
    setState(() => _scanning = true);
    try {
      // VisionKit (iOS) / ML Kit (Android) gèrent la permission caméra nativement
      final images = await CunningDocumentScanner.getPictures();
      if (!mounted) return;
      if (images != null && images.isNotEmpty) {
        final newPages = images.map((imgPath) => ScannedPage(
          id: DateTime.now().millisecondsSinceEpoch.toString() + imgPath.hashCode.toString(),
          imageFile: File(imgPath),
          order: _pages.length,
        )).toList();
        setState(() {
          _pages.addAll(newPages);
          _idx = _pages.length - 1;
          _scanning = false;
        });
        _snack('${images.length} page(s) ajoutée(s)', PremiumTheme.primaryTeal);
      } else {
        setState(() => _scanning = false);
      }
    } catch (e) {
      if (mounted) setState(() => _scanning = false);
      final errStr = e.toString().toLowerCase();
      if (errStr.contains('permission') || errStr.contains('denied') || errStr.contains('restricted')) {
        _showCameraSettingsDialog();
      } else {
        _snack('Impossible d\'ouvrir le scanner. Réessayez.', PremiumTheme.accentRed);
      }
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

  void _deletePage(int i) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Supprimer la page ?',
            style: TextStyle(fontWeight: FontWeight.w700)),
        content: Text('Voulez-vous supprimer la page ${i + 1} ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler',
                style: TextStyle(color: PremiumTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _pages.removeAt(i);
                if (_idx >= _pages.length && _pages.isNotEmpty) {
                  _idx = _pages.length - 1;
                }
              });
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.accentRed,
              elevation: 0,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10))),
            child: const Text('Supprimer',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // ── Filters ──────────────────────────────────────────────────
  void _showFilters() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 20),
            const Text('Appliquer un filtre',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: PremiumTheme.textPrimary)),
            const SizedBox(height: 16),
            _filterTile(ImageFilterService.filterBlackWhite,
                'Noir & Blanc', 'Contraste eleve pour texte',
                Icons.contrast_rounded, PremiumTheme.textPrimary),
            _filterTile(ImageFilterService.filterGrayscale,
                'Niveaux de gris', 'Conserve plus de details',
                Icons.gradient_rounded, PremiumTheme.textSecondary),
            _filterTile(ImageFilterService.filterColor,
                'Couleur amelioree', 'Garde les couleurs avec amelioration',
                Icons.palette_rounded, PremiumTheme.primaryBlue),
            _filterTile(ImageFilterService.filterEnhanced,
                'Auto-ameliorer', 'Amelioration automatique',
                Icons.auto_fix_high_rounded, PremiumTheme.primaryTeal),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
          ],
        ),
      ),
    );
  }

  Widget _filterTile(String filter, String title, String sub,
      IconData icon, Color color) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: .1),
          borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: color, size: 22),
      ),
      title: Text(title,
          style: const TextStyle(
              fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
      subtitle: Text(sub,
          style: const TextStyle(
              color: PremiumTheme.textSecondary, fontSize: 13)),
      trailing: const Icon(Icons.chevron_right_rounded,
          color: PremiumTheme.textTertiary),
      onTap: () {
        Navigator.pop(context);
        _applyFilter(filter);
      },
    );
  }

  Future<void> _applyFilter(String filter) async {
    if (_pages.isEmpty) return;
    setState(() => _processing = true);
    try {
      final page = _pages[_idx];
      final filtered =
          await ImageFilterService.applyFilter(page.imageFile, filter);
      if (!mounted) return;
      setState(() {
        _pages[_idx] = page.copyWith(
            imageFile: filtered, filterApplied: filter);
        _processing = false;
      });
      _snack(
          'Filtre ${ImageFilterService.getFilterName(filter)} applique',
          PremiumTheme.primaryTeal);
    } catch (e) {
      if (mounted) setState(() => _processing = false);
      _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed);
    }
  }

  // ── PDF ──────────────────────────────────────────────────────
  Future<void> _savePDF() async {
    if (_pages.isEmpty) return;
    setState(() { _processing = true; _sync = SyncStatus.syncing; });
    try {
      final files = _pages.map((p) => p.imageFile).toList();
      final pdf = await PdfService.generatePDFFromPages(files,
          title: 'Document scanne ${DateTime.now().toUtc().toIso8601String()}',
          documentType: 'Scan');
      if (widget.inspectionId != null) {
        if (mounted) setState(() => _progress = 0.0);
        final name =
            'inspection_${widget.inspectionId}_${DateTime.now().millisecondsSinceEpoch}.pdf';
        await SupabaseService.uploadFile(pdf, 'scans/$name',
            onProgress: (p) {
          if (mounted) setState(() => _progress = p);
        });
        if (!mounted) return;
        setState(() { _sync = SyncStatus.synced; _progress = null; });
        _snack('PDF sauvegarde et synchronise', PremiumTheme.accentGreen);
      } else {
        if (mounted) setState(() => _sync = SyncStatus.synced);
        _snack('PDF genere avec succes', PremiumTheme.primaryTeal);
      }
      widget.onDocumentScanned?.call(pdf.path);
      if (mounted) setState(() => _processing = false);
    } catch (e) {
      if (mounted) {
        setState(() {
          _processing = false;
          _sync = SyncStatus.error;
          _progress = null;
        });
      }
      _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed);
    }
  }

  Future<void> _sharePDF() async {
    if (_pages.isEmpty) return;
    setState(() => _processing = true);
    try {
      final files = _pages.map((p) => p.imageFile).toList();
      final pdf = await PdfService.generatePDFFromPages(files);
      await Share.shareXFiles(
        [XFile(pdf.path)],
        text:
            'Document scanné (${_pages.length} page${_pages.length > 1 ? 's' : ''})',
      );
      if (mounted) setState(() => _processing = false);
    } catch (e) {
      if (mounted) setState(() => _processing = false);
      _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed);
    }
  }

  void _snack(String msg, Color bg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg),
        backgroundColor: bg,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2)));
  }
}
