import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../main.dart';
import '../document_scanner/document_scanner_screen.dart';

/// Screen to view all scanned documents
class ScannedDocumentsScreen extends StatefulWidget {
  const ScannedDocumentsScreen({super.key});

  @override
  State<ScannedDocumentsScreen> createState() => _ScannedDocumentsScreenState();
}

class _ScannedDocumentsScreenState extends State<ScannedDocumentsScreen> {
  List<Map<String, dynamic>> _documents = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadDocuments();
  }

  Future<void> _loadDocuments() async {
    setState(() => _isLoading = true);

    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) return;

      // Charger les documents depuis Supabase
      final response = await supabase
          .from('inspection_documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      setState(() {
        _documents = List<Map<String, dynamic>>.from(response);
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading documents: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _scanNewDocument() async {
    final result = await Navigator.push<String>(
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

              // Upload vers Supabase Storage (même bucket que l'Expo mobile)
              await supabase.storage
                  .from('inspection-documents')
                  .upload(storagePath, file);

              final publicUrl = supabase.storage
                  .from('inspection-documents')
                  .getPublicUrl(storagePath);

              // Sauvegarder dans la base de données (format Expo compatible)
              await supabase.from('inspection_documents').insert({
                'inspection_id': null, // Document standalone (non lié à une inspection)
                'document_type': 'generic',
                'document_title': 'Scan ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
                'document_url': publicUrl,
                'pages_count': 1,
                'user_id': userId,
                'extracted_text': extractedText,
              });

              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Document enregistré avec succès'),
                    backgroundColor: Color(0xFF14B8A6),
                  ),
                );
                _loadDocuments(); // Recharger la liste
              }
            } catch (e) {
              debugPrint('Error saving document: $e');
            }
          },
        ),
      ),
    );
  }

  Future<void> _deleteDocument(String id, String? documentUrl) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF374151),
        title: const Text(
          'Supprimer le document',
          style: TextStyle(color: Colors.white),
        ),
        content: const Text(
          'Êtes-vous sûr de vouloir supprimer ce document ?',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(
              'ANNULER',
              style: TextStyle(color: Colors.white70),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              'SUPPRIMER',
              style: TextStyle(color: Color(0xFFEF4444)),
            ),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        // Supprimer de la base de données
        await supabase.from('inspection_documents').delete().eq('id', id);

        // Supprimer du storage si l'URL existe
        if (documentUrl != null) {
          final uri = Uri.parse(documentUrl);
          final path = uri.pathSegments.skip(3).join('/');
          await supabase.storage.from('inspection-documents').remove([path]);
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Document supprimé'),
              backgroundColor: Color(0xFF14B8A6),
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
            ),
          );
        }
      }
    }
  }

  void _viewDocument(Map<String, dynamic> doc) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.black,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF111827),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Document #${doc['id']}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
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
            Expanded(
              child: InteractiveViewer(
                child: Image.network(
                  doc['document_url'],
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) => const Center(
                    child: Icon(Icons.error, color: Colors.red, size: 48),
                  ),
                ),
              ),
            ),
            // Text extrait
            if (doc['extracted_text'] != null && doc['extracted_text'].toString().isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                color: const Color(0xFF111827),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Texte extrait:',
                      style: TextStyle(
                        color: Color(0xFF14B8A6),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      doc['extracted_text'],
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                      maxLines: 5,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF111827),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1F2937),
        elevation: 0,
        title: const Text(
          'Mes numérisations',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadDocuments,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF14B8A6)),
              ),
            )
          : _documents.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.insert_drive_file_outlined,
                        size: 80,
                        color: Colors.white24,
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Aucune numérisation',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Scannez votre premier document',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton.icon(
                        onPressed: _scanNewDocument,
                        icon: const Icon(Icons.document_scanner),
                        label: const Text('Scanner un document'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF14B8A6),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                        ),
                      ),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 0.75,
                  ),
                  itemCount: _documents.length,
                  itemBuilder: (context, index) {
                    final doc = _documents[index];
                    return GestureDetector(
                      onTap: () => _viewDocument(doc),
                      child: Card(
                        color: const Color(0xFF1F2937),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(12),
                                ),
                                child: Image.network(
                                  doc['document_url'],
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) => Container(
                                    color: const Color(0xFF374151),
                                    child: const Icon(
                                      Icons.error,
                                      color: Colors.white54,
                                      size: 40,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(8),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Document #${doc['id']}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _formatDate(doc['created_at']),
                                          style: const TextStyle(
                                            color: Colors.white54,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      color: Color(0xFFEF4444),
                                      size: 20,
                                    ),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(),
                                    onPressed: () => _deleteDocument(
                                      doc['id'].toString(),
                                      doc['document_url'],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
      floatingActionButton: _documents.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: _scanNewDocument,
              backgroundColor: const Color(0xFF14B8A6),
              icon: const Icon(Icons.add),
              label: const Text('Scanner'),
            )
          : null,
    );
  }

  String _formatDate(dynamic date) {
    try {
      final dt = DateTime.parse(date.toString());
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (e) {
      return '';
    }
  }
}
