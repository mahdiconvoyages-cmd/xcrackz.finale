import 'dart:io';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
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

  Future<void> _shareDocument(Map<String, dynamic> doc) async {
    try {
      final response = await http.get(Uri.parse(doc['document_url']));
      final tempDir = await getTemporaryDirectory();
      final fileName = 'document_${doc['id']}.jpg';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      await SharePlus.instance.shareXFiles(
        [XFile(file.path)],
        subject: doc['document_title'] ?? 'Document scanné',
        text: 'Document scanné le ${_formatDate(doc['created_at'])}',
      );
    } catch (e) {
      debugPrint('Error sharing document: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur lors du partage: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  Future<void> _renameDocument(Map<String, dynamic> doc) async {
    final controller = TextEditingController(
      text: doc['document_title'] ?? 'Document',
    );
    
    final newName = await showDialog<String>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: const Color(0xFF1F2937),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.drive_file_rename_outline,
                      color: Color(0xFF14B8A6),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Renommer le document',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              TextField(
                controller: controller,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Nom du document',
                  labelStyle: const TextStyle(color: Colors.white70),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFF4B5563)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                    borderSide: const BorderSide(color: Color(0xFF14B8A6), width: 2),
                  ),
                  filled: true,
                  fillColor: const Color(0xFF374151),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: TextButton.styleFrom(
                      foregroundColor: Colors.white70,
                    ),
                    child: const Text('ANNULER'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: () {
                      final name = controller.text.trim();
                      if (name.isNotEmpty) {
                        Navigator.of(context).pop(name);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                    ),
                    child: const Text('RENOMMER'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (newName != null && newName.isNotEmpty) {
      try {
        await supabase
            .from('inspection_documents')
            .update({'document_title': newName})
            .eq('id', doc['id']);

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Document renommé: $newName'),
              backgroundColor: const Color(0xFF14B8A6),
            ),
          );
          _loadDocuments();
        }
      } catch (e) {
        debugPrint('Error renaming: $e');
      }
    }
  }

  void _showDocumentOptions(Map<String, dynamic> doc) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF1F2937),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF14B8A6).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.share, color: Color(0xFF14B8A6)),
              ),
              title: const Text(
                'Partager',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
              onTap: () {
                Navigator.pop(context);
                _shareDocument(doc);
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.drive_file_rename_outline, color: Color(0xFF8B5CF6)),
              ),
              title: const Text(
                'Renommer',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
              onTap: () {
                Navigator.pop(context);
                _renameDocument(doc);
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
              ),
              title: const Text(
                'Supprimer',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
              onTap: () {
                Navigator.pop(context);
                _deleteDocument(doc['id'].toString(), doc['document_url']);
              },
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
          ],
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
                      onLongPress: () => _showDocumentOptions(doc),
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
                              child: Column(
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              doc['document_title'] ?? 'Document #${doc['id']}',
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
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  // Boutons d'action
                                  Row(
                                    children: [
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: () => _shareDocument(doc),
                                          icon: const Icon(Icons.share, size: 16),
                                          label: const Text(
                                            'Partager',
                                            style: TextStyle(fontSize: 11),
                                          ),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: const Color(0xFF14B8A6),
                                            side: const BorderSide(
                                              color: Color(0xFF14B8A6),
                                              width: 1,
                                            ),
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: () => _renameDocument(doc),
                                          icon: const Icon(Icons.drive_file_rename_outline, size: 16),
                                          label: const Text(
                                            'Renommer',
                                            style: TextStyle(fontSize: 11),
                                          ),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: const Color(0xFF8B5CF6),
                                            side: const BorderSide(
                                              color: Color(0xFF8B5CF6),
                                              width: 1,
                                            ),
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      IconButton(
                                        onPressed: () => _deleteDocument(
                                          doc['id'].toString(),
                                          doc['document_url'],
                                        ),
                                        icon: const Icon(Icons.delete_outline),
                                        color: const Color(0xFFEF4444),
                                        iconSize: 20,
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                      ),
                                    ],
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
