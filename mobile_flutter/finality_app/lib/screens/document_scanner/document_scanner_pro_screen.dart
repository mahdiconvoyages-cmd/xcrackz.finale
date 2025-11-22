import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/image_filter_service.dart';
import '../../services/pdf_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/sync_indicator.dart';

/// Professional Document Scanner Pro - Matching Expo ScannerProScreen
/// Features: Multi-page, Filters, PDF Generation, Upload, Share
class DocumentScannerProScreen extends StatefulWidget {
  final String? inspectionId;
  final Function(String documentPath)? onDocumentScanned;

  const DocumentScannerProScreen({
    super.key,
    this.inspectionId,
    this.onDocumentScanned,
  });

  @override
  State<DocumentScannerProScreen> createState() => _DocumentScannerProScreenState();
}

class _DocumentScannerProScreenState extends State<DocumentScannerProScreen> {
  final List<ScannedPage> _pages = [];
  int _currentPageIndex = 0;
  bool _isScanning = false;
  bool _isProcessing = false;
  SyncStatus _syncStatus = SyncStatus.idle;
  double? _uploadProgress;
  String? _selectedFilter;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0f172a),
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF14b8a6), Color(0xFF0d9488)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        title: const Text('Scanner Pro'),
        actions: [
          if (_pages.isNotEmpty) ...[
            SyncIndicator(
              status: _syncStatus,
              progress: _uploadProgress,
              showText: false,
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.share),
              tooltip: 'Partager',
              onPressed: _sharePDF,
            ),
            IconButton(
              icon: const Icon(Icons.save),
              tooltip: 'Sauvegarder',
              onPressed: _savePDF,
            ),
          ],
        ],
      ),
      body: _pages.isEmpty ? _buildEmptyState() : _buildPageView(),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_pages.isNotEmpty) ...[
            FloatingActionButton(
              heroTag: 'filter',
              mini: true,
              backgroundColor: const Color(0xFF1e293b),
              onPressed: _showFilterModal,
              child: const Icon(Icons.filter, color: Color(0xFF14b8a6)),
            ),
            const SizedBox(height: 12),
          ],
          FloatingActionButton.extended(
            onPressed: _isScanning ? null : _scanNewPage,
            backgroundColor: const Color(0xFF14b8a6),
            icon: Icon(_pages.isEmpty ? Icons.camera_alt : Icons.add),
            label: Text(_pages.isEmpty ? 'Scanner' : 'Ajouter page'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF14b8a6).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.document_scanner,
              size: 64,
              color: Color(0xFF14b8a6),
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Scanner Pro',
            style: TextStyle(
              color: Colors.white,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Scanner professionnel multi-pages\navec filtres et génération PDF',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),
          _buildFeaturesList(),
        ],
      ),
    );
  }

  Widget _buildFeaturesList() {
    final features = [
      {'icon': Icons.filter_alt, 'text': 'Filtres N&B, Gris, Couleur'},
      {'icon': Icons.layers, 'text': 'Scan multi-pages'},
      {'icon': Icons.picture_as_pdf, 'text': 'Génération PDF'},
      {'icon': Icons.cloud_upload, 'text': 'Upload automatique'},
    ];

    return Column(
      children: features.map((feature) {
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                feature['icon'] as IconData,
                size: 20,
                color: const Color(0xFF14b8a6),
              ),
              const SizedBox(width: 12),
              Text(
                feature['text'] as String,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 14,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPageView() {
    return Column(
      children: [
        // Horizontal page list
        Container(
          height: 120,
          color: const Color(0xFF1e293b),
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.all(12),
            itemCount: _pages.length,
            itemBuilder: (context, index) {
              final page = _pages[index];
              final isSelected = index == _currentPageIndex;
              
              return GestureDetector(
                onTap: () => setState(() => _currentPageIndex = index),
                child: Container(
                  width: 80,
                  margin: const EdgeInsets.only(right: 12),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isSelected 
                        ? const Color(0xFF14b8a6) 
                        : Colors.transparent,
                      width: 3,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          page.imageFile,
                          fit: BoxFit.cover,
                          width: 80,
                          height: 120,
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () => _deletePage(index),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.close,
                              size: 12,
                              color: Colors.white,
                            ),
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
        
        // Current page preview
        Expanded(
          child: Center(
            child: _pages.isNotEmpty
                ? InteractiveViewer(
                    minScale: 0.5,
                    maxScale: 4.0,
                    child: Image.file(_pages[_currentPageIndex].imageFile),
                  )
                : const SizedBox(),
          ),
        ),
        
        // Filter info
        if (_pages.isNotEmpty && _pages[_currentPageIndex].filterApplied != null)
          Container(
            padding: const EdgeInsets.all(12),
            color: const Color(0xFF1e293b),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.filter_alt, size: 16, color: Color(0xFF14b8a6)),
                const SizedBox(width: 8),
                Text(
                  'Filtre: ${ImageFilterService.getFilterName(_pages[_currentPageIndex].filterApplied!)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _scanNewPage() async {
    setState(() => _isScanning = true);

    try {
      final pictures = await CunningDocumentScanner.getPictures(noOfPages: 1);

      if (pictures != null && pictures.isNotEmpty) {
        final imageFile = File(pictures.first);
        final page = ScannedPage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          imageFile: imageFile,
          order: _pages.length,
        );

        setState(() {
          _pages.add(page);
          _currentPageIndex = _pages.length - 1;
          _isScanning = false;
        });

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Page ajoutée avec succès'),
            backgroundColor: Color(0xFF14b8a6),
            duration: Duration(seconds: 2),
          ),
        );
      } else {
        setState(() => _isScanning = false);
      }
    } catch (e) {
      setState(() => _isScanning = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur scan: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _deletePage(int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer la page'),
        content: Text('Voulez-vous supprimer la page ${index + 1}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _pages.removeAt(index);
                if (_currentPageIndex >= _pages.length && _pages.isNotEmpty) {
                  _currentPageIndex = _pages.length - 1;
                }
              });
              Navigator.pop(context);
            },
            child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showFilterModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1e293b),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Appliquer un filtre',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              _buildFilterOption(
                ImageFilterService.filterBlackWhite,
                'Noir & Blanc',
                'Contraste élevé pour texte',
                Icons.contrast,
              ),
              _buildFilterOption(
                ImageFilterService.filterGrayscale,
                'Niveaux de gris',
                'Conserve plus de détails',
                Icons.gradient,
              ),
              _buildFilterOption(
                ImageFilterService.filterColor,
                'Couleur améliorée',
                'Garde les couleurs avec amélioration',
                Icons.palette,
              ),
              _buildFilterOption(
                ImageFilterService.filterEnhanced,
                'Auto-améliorer',
                'Amélioration automatique',
                Icons.auto_fix_high,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterOption(String filter, String title, String subtitle, IconData icon) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF14b8a6)),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      subtitle: Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.6))),
      onTap: () {
        Navigator.pop(context);
        _applyFilter(filter);
      },
    );
  }

  Future<void> _applyFilter(String filterType) async {
    if (_pages.isEmpty) return;

    setState(() => _isProcessing = true);

    try {
      final currentPage = _pages[_currentPageIndex];
      final filteredFile = await ImageFilterService.applyFilter(
        currentPage.imageFile,
        filterType,
      );

      setState(() {
        _pages[_currentPageIndex] = currentPage.copyWith(
          imageFile: filteredFile,
          filterApplied: filterType,
        );
        _isProcessing = false;
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Filtre ${ImageFilterService.getFilterName(filterType)} appliqué'),
          backgroundColor: const Color(0xFF14b8a6),
        ),
      );
    } catch (e) {
      setState(() => _isProcessing = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur filtre: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _savePDF() async {
    if (_pages.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _syncStatus = SyncStatus.syncing;
    });

    try {
      // Generate PDF
      final imageFiles = _pages.map((p) => p.imageFile).toList();
      final pdfFile = await PdfService.generatePDFFromPages(
        imageFiles,
        title: 'Document scanné ${DateTime.now().toIso8601String()}',
        documentType: 'Scan',
      );

      // Upload to Supabase if inspection ID provided
      if (widget.inspectionId != null) {
        setState(() => _uploadProgress = 0.0);
        
        final fileName = 'inspection_${widget.inspectionId}_${DateTime.now().millisecondsSinceEpoch}.pdf';
        await SupabaseService.uploadFile(
          pdfFile,
          'scans/$fileName',
          onProgress: (progress) {
            setState(() => _uploadProgress = progress);
          },
        );
        
        setState(() {
          _syncStatus = SyncStatus.synced;
          _uploadProgress = null;
        });

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('PDF sauvegardé et synchronisé'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() => _syncStatus = SyncStatus.synced);
        
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('PDF généré avec succès'),
            backgroundColor: Color(0xFF14b8a6),
          ),
        );
      }

      if (widget.onDocumentScanned != null) {
        widget.onDocumentScanned!(pdfFile.path);
      }

      setState(() => _isProcessing = false);
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _syncStatus = SyncStatus.error;
        _uploadProgress = null;
      });
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _sharePDF() async {
    if (_pages.isEmpty) return;

    setState(() => _isProcessing = true);

    try {
      final imageFiles = _pages.map((p) => p.imageFile).toList();
      final pdfFile = await PdfService.generatePDFFromPages(imageFiles);

      await Share.shareXFiles(
        [XFile(pdfFile.path)],
        text: 'Document scanné (${_pages.length} page${_pages.length > 1 ? 's' : ''})',
      );

      setState(() => _isProcessing = false);
    } catch (e) {
      setState(() => _isProcessing = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur partage: $e'), backgroundColor: Colors.red),
      );
    }
  }
}
