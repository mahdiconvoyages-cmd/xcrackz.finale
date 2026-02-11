import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../main.dart';
import '../document_scanner/document_scanner_screen.dart';
import '../../theme/premium_theme.dart';

/// Modern Scanner Screen - Responsive Samsung Android
/// Design moderne avec grid/list view, filtres, search, actions rapides
class ScannedDocumentsScreenNew extends StatefulWidget {
  const ScannedDocumentsScreenNew({super.key});

  @override
  State<ScannedDocumentsScreenNew> createState() => _ScannedDocumentsScreenNewState();
}

class _ScannedDocumentsScreenNewState extends State<ScannedDocumentsScreenNew> with SingleTickerProviderStateMixin {
  List<Map<String, dynamic>> _documents = [];
  List<Map<String, dynamic>> _filteredDocuments = [];
  bool _isLoading = true;
  bool _isGridView = true;
  String _selectedFilter = 'all';
  final TextEditingController _searchController = TextEditingController();
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadDocuments();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        switch (_tabController.index) {
          case 0:
            _selectedFilter = 'all';
            break;
          case 1:
            _selectedFilter = 'invoice';
            break;
          case 2:
            _selectedFilter = 'contract';
            break;
          case 3:
            _selectedFilter = 'other';
            break;
        }
        _applyFilters();
      });
    }
  }

  Future<void> _loadDocuments() async {
    setState(() => _isLoading = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      final response = await supabase
          .from('inspection_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      if (!mounted) return;
      setState(() {
        _documents = List<Map<String, dynamic>>.from(response);
        _applyFilters();
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading documents: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  void _applyFilters() {
    List<Map<String, dynamic>> filtered = _documents;

    // Filtre par type
    if (_selectedFilter != 'all') {
      filtered = filtered.where((doc) {
        final type = doc['document_type'] ?? 'generic';
        return type.contains(_selectedFilter);
      }).toList();
    }

    // Filtre par recherche
    if (_searchController.text.isNotEmpty) {
      final query = _searchController.text.toLowerCase();
      filtered = filtered.where((doc) {
        final title = (doc['document_title'] ?? '').toString().toLowerCase();
        final text = (doc['extracted_text'] ?? '').toString().toLowerCase();
        return title.contains(query) || text.contains(query);
      }).toList();
    }

    setState(() {
      _filteredDocuments = filtered;
    });
  }

  Future<void> _scanNewDocument() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DocumentScannerScreen(
          onDocumentScanned: (documentPath, extractedText) async {
            try {
              final userId = supabase.auth.currentUser?.id;
              if (userId == null) return;

              final file = File(documentPath);
              final fileName = 'doc_${DateTime.now().millisecondsSinceEpoch}.jpg';
              final storagePath = 'raw/$userId/standalone/$fileName';

              await supabase.storage
                  .from('inspection-documents')
                  .upload(storagePath, file);

              final publicUrl = supabase.storage
                  .from('inspection-documents')
                  .getPublicUrl(storagePath);

              await supabase.from('inspection_documents').insert({
                'inspection_id': null,
                'document_type': 'generic',
                'document_title': 'Scan ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now())}',
                'document_url': publicUrl,
                'pages_count': 1,
                'user_id': userId,
                'extracted_text': extractedText,
              });

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.white),
                        SizedBox(width: 12),
                        Text('Document enregistré avec succès'),
                      ],
                    ),
                    backgroundColor: Color(0xFF10B981),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
                _loadDocuments();
              }
            } catch (e) {
              debugPrint('Error saving document: $e');
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Row(
                      children: [
                        const Icon(Icons.error, color: Colors.white),
                        const SizedBox(width: 12),
                        Expanded(child: Text('Erreur: $e')),
                      ],
                    ),
                    backgroundColor: const Color(0xFFEF4444),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            }
          },
        ),
      ),
    );
  }

  Future<void> _deleteDocument(Map<String, dynamic> doc) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 28),
            SizedBox(width: 12),
            Text('Supprimer le document', style: TextStyle(color: PremiumTheme.textPrimary, fontSize: 18)),
          ],
        ),
        content: Text(
          'Cette action est irréversible. Voulez-vous vraiment supprimer ce document ?',
          style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 15),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary)),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await supabase.from('inspection_documents').delete().eq('id', doc['id']);

        if (doc['document_url'] != null) {
          final uri = Uri.parse(doc['document_url']);
          final path = uri.pathSegments.skip(3).join('/');
          await supabase.storage.from('inspection-documents').remove([path]);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.white),
                  SizedBox(width: 12),
                  Text('Document supprimé'),
                ],
              ),
              backgroundColor: Color(0xFF10B981),
              behavior: SnackBarBehavior.floating,
            ),
          );
          _loadDocuments();
        }
      } catch (e) {
        debugPrint('Error deleting document: $e');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Erreur: $e'),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }
  }

  Future<void> _shareDocument(Map<String, dynamic> doc) async {
    final documentUrl = doc['document_url'];
    final documentTitle = doc['document_title'] ?? 'Document scanné';
    
    if (documentUrl == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.error_outline, color: Colors.white),
                SizedBox(width: 12),
                Text('Aucune image à partager'),
              ],
            ),
            backgroundColor: Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    // Show loading
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFF14B8A6)),
      ),
    );

    try {
      // Download the image
      final response = await http.get(Uri.parse(documentUrl));
      
      if (response.statusCode == 200) {
        // Get temp directory
        final tempDir = await getTemporaryDirectory();
        final fileName = '${documentTitle.replaceAll(RegExp(r'[^\w\s-]'), '_')}_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final file = File('${tempDir.path}/$fileName');
        
        // Save the image
        await file.writeAsBytes(response.bodyBytes);
        
        // Close loading dialog
        if (mounted) Navigator.of(context).pop();
        
        // Share the file
        await Share.shareXFiles(
          [XFile(file.path)],
          text: 'Document: $documentTitle',
          subject: documentTitle,
        );
      } else {
        throw Exception('Échec du téléchargement: ${response.statusCode}');
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.of(context).pop();
      
      debugPrint('Error sharing document: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text('Erreur de partage: $e')),
              ],
            ),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _viewDocument(Map<String, dynamic> doc) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF14B8A6), Color(0xFF0D9488)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.description, color: Colors.white, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            doc['document_title'] ?? 'Document',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            _formatDate(doc['created_at']),
                            style: const TextStyle(color: Colors.white70, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
              // Image
              Flexible(
                child: Container(
                  constraints: const BoxConstraints(maxHeight: 500),
                  child: doc['document_url'] != null
                      ? InteractiveViewer(
                          child: Image.network(
                            doc['document_url'],
                            fit: BoxFit.contain,
                            loadingBuilder: (context, child, loadingProgress) {
                              if (loadingProgress == null) return child;
                              return Center(
                                child: CircularProgressIndicator(
                                  value: loadingProgress.expectedTotalBytes != null
                                      ? loadingProgress.cumulativeBytesLoaded /
                                          loadingProgress.expectedTotalBytes!
                                      : null,
                                  color: const Color(0xFF14B8A6),
                                ),
                              );
                            },
                            errorBuilder: (context, error, stackTrace) => Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.error_outline, color: Colors.red, size: 48),
                                  SizedBox(height: 16),
                                  Text(
                                    'Erreur de chargement',
                                    style: TextStyle(color: PremiumTheme.textSecondary),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            'Aucune image disponible',
                            style: TextStyle(color: PremiumTheme.textSecondary),
                          ),
                        ),
                ),
              ),
              // Extracted Text
              if (doc['extracted_text'] != null && doc['extracted_text'].toString().isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: PremiumTheme.cardBgLight,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.text_fields, color: Color(0xFF14B8A6), size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Texte extrait',
                            style: TextStyle(
                              color: PremiumTheme.textPrimary,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        doc['extracted_text'],
                        style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 13),
                        maxLines: 5,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
              // Actions
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: PremiumTheme.cardBgLight,
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(20)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    TextButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _shareDocument(doc);
                      },
                      icon: const Icon(Icons.share, color: Color(0xFF14B8A6)),
                      label: const Text('Partager', style: TextStyle(color: Color(0xFF14B8A6))),
                    ),
                    TextButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                        _deleteDocument(doc);
                      },
                      icon: const Icon(Icons.delete, color: Color(0xFFEF4444)),
                      label: const Text('Supprimer', style: TextStyle(color: Color(0xFFEF4444))),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return 'Date inconnue';
    try {
      final dateTime = DateTime.parse(date.toString());
      return DateFormat('dd/MM/yyyy à HH:mm').format(dateTime);
    } catch (e) {
      return 'Date invalide';
    }
  }

  String _getDocumentIcon(String? type) {
    switch (type) {
      case 'invoice':
        return '🧾';
      case 'contract':
        return '📄';
      case 'receipt':
        return '🧾';
      default:
        return '📄';
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = screenWidth > 600 ? 3 : 2;
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: SafeArea(
        child: Column(
          children: [
            // Premium Header avec gradient
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: PremiumTheme.tealGradient,
                boxShadow: PremiumTheme.mediumShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.document_scanner,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        l10n.myDocuments,
                        style: PremiumTheme.heading2.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => setState(() => _isGridView = !_isGridView),
                        icon: Icon(
                          _isGridView ? Icons.view_list : Icons.grid_view,
                          color: Colors.white,
                        ),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.2),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _loadDocuments,
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withValues(alpha: 0.2),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Premium Search bar
                  TextField(
                    controller: _searchController,
                    onChanged: (value) => _applyFilters(),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: l10n.searchDocument,
                      hintStyle: const TextStyle(color: Colors.white54),
                      prefixIcon: const Icon(Icons.search, color: Colors.white70),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, color: Colors.white70),
                              onPressed: () {
                                _searchController.clear();
                                _applyFilters();
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.15),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
                        borderSide: const BorderSide(
                          color: Colors.white,
                          width: 2,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ],
              ),
            ),

            // Tabs modernisés
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: PremiumTheme.tealGradient,
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: Colors.white,
                unselectedLabelColor: PremiumTheme.textSecondary,
                labelStyle: PremiumTheme.body.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
                unselectedLabelStyle: PremiumTheme.body.copyWith(
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
                dividerColor: Colors.transparent,
                tabs: [
                  Tab(text: l10n.all),
                  Tab(text: l10n.invoices),
                  Tab(text: l10n.contracts),
                  Tab(text: l10n.others),
                ],
              ),
            ),

            // Content
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: Color(0xFF14B8A6)),
                    )
                  : _filteredDocuments.isEmpty
                      ? _buildEmptyState(l10n)
                      : RefreshIndicator(
                          onRefresh: _loadDocuments,
                          color: const Color(0xFF14B8A6),
                          child: _isGridView
                              ? _buildGridView(crossAxisCount)
                              : _buildListView(),
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _scanNewDocument,
        backgroundColor: const Color(0xFF14B8A6),
        icon: const Icon(Icons.document_scanner, color: Colors.white),
        label: Text(
          l10n.scanner,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }

  Widget _buildGridView(int crossAxisCount) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: _filteredDocuments.length,
      itemBuilder: (context, index) {
        final doc = _filteredDocuments[index];
        return _buildGridCard(doc);
      },
    );
  }

  Widget _buildListView() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _filteredDocuments.length,
      itemBuilder: (context, index) {
        final doc = _filteredDocuments[index];
        return _buildListCard(doc);
      },
    );
  }

  Widget _buildGridCard(Map<String, dynamic> doc) {
    final docType = doc['document_type'] ?? 'generic';
    final typeColor = docType == 'invoice' ? PremiumTheme.primaryIndigo 
                     : docType == 'contract' ? PremiumTheme.primaryPurple 
                     : PremiumTheme.primaryTeal;
    
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: typeColor.withValues(alpha: 0.3),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: typeColor.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _viewDocument(doc),
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image preview
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                  ),
                  child: Stack(
                    children: [
                      if (doc['document_url'] != null)
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                          child: Image.network(
                            doc['document_url'],
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
                            errorBuilder: (context, error, stackTrace) => Center(
                              child: Icon(Icons.broken_image, color: Colors.grey.shade400, size: 48),
                            ),
                          ),
                        )
                      else
                        Center(
                          child: Text(
                            _getDocumentIcon(doc['document_type']),
                            style: const TextStyle(fontSize: 48),
                          ),
                        ),
                      // Type badge
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: typeColor,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            docType == 'invoice' ? '🧾' : docType == 'contract' ? '📄' : '📋',
                            style: const TextStyle(fontSize: 12),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Info
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc['document_title'] ?? 'Document',
                      style: TextStyle(
                        color: PremiumTheme.textPrimary,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatDate(doc['created_at']),
                      style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 11),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: InkWell(
                            onTap: () => _shareDocument(doc),
                            child: Icon(Icons.share, color: PremiumTheme.primaryTeal, size: 18),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: InkWell(
                            onTap: () => _deleteDocument(doc),
                            child: const Icon(Icons.delete, color: Color(0xFFEF4444), size: 18),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildListCard(Map<String, dynamic> doc) {
    final docType = doc['document_type'] ?? 'generic';
    final typeColor = docType == 'invoice' ? PremiumTheme.primaryIndigo 
                     : docType == 'contract' ? PremiumTheme.primaryPurple 
                     : PremiumTheme.primaryTeal;
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: typeColor.withValues(alpha: 0.25),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: typeColor.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _viewDocument(doc),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Image preview
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: typeColor.withValues(alpha: 0.2),
                    ),
                  ),
                  child: doc['document_url'] != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.network(
                            doc['document_url'],
                            fit: BoxFit.cover,
                            width: 60,
                            height: 60,
                            errorBuilder: (context, error, stackTrace) => Center(
                              child: Text(
                                _getDocumentIcon(doc['document_type']),
                                style: const TextStyle(fontSize: 28),
                              ),
                            ),
                          ),
                        )
                      : Center(
                          child: Text(
                            _getDocumentIcon(doc['document_type']),
                            style: const TextStyle(fontSize: 28),
                          ),
                        ),
                ),
                const SizedBox(width: 12),
                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        doc['document_title'] ?? 'Document',
                        style: TextStyle(
                          color: PremiumTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(doc['created_at']),
                        style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 12),
                      ),
                      if (doc['extracted_text'] != null && doc['extracted_text'].toString().isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          doc['extracted_text'],
                          style: TextStyle(color: PremiumTheme.textTertiary, fontSize: 11),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                // Actions
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: InkWell(
                        onTap: () => _shareDocument(doc),
                        child: Icon(Icons.share, color: PremiumTheme.primaryTeal, size: 20),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: InkWell(
                        onTap: () => _deleteDocument(doc),
                        child: const Icon(Icons.delete, color: Color(0xFFEF4444), size: 20),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(AppLocalizations l10n) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  PremiumTheme.primaryTeal.withValues(alpha: 0.1),
                  PremiumTheme.primaryBlue.withValues(alpha: 0.1),
                ],
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: PremiumTheme.primaryTeal.withValues(alpha: 0.3), 
                width: 2,
              ),
            ),
            child: Icon(
              Icons.document_scanner,
              size: 64,
              color: PremiumTheme.primaryTeal,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            l10n.noDocument,
            style: TextStyle(
              color: PremiumTheme.textPrimary,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.scanFirstDocument,
            style: TextStyle(color: PremiumTheme.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              gradient: PremiumTheme.tealGradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: PremiumTheme.primaryTeal.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ElevatedButton.icon(
              onPressed: _scanNewDocument,
              icon: const Icon(Icons.add, color: Colors.white),
              label: Text(l10n.scanDocument, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
