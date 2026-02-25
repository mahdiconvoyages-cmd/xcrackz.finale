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

/// Scanned Documents List — PremiumTheme Light Design
class ScannedDocumentsScreenNew extends StatefulWidget {
  const ScannedDocumentsScreenNew({super.key});

  @override
  State<ScannedDocumentsScreenNew> createState() =>
      _ScannedDocumentsScreenNewState();
}

class _ScannedDocumentsScreenNewState extends State<ScannedDocumentsScreenNew> {
  List<Map<String, dynamic>> _docs = [];
  List<Map<String, dynamic>> _filtered = [];
  bool _loading = true;
  bool _grid = true;
  String _filter = 'all';
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  // ── Data ─────────────────────────────────────────────────────
  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final uid = supabase.auth.currentUser?.id;
      if (uid == null) return;
      final res = await supabase
          .from('inspection_documents')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', ascending: false)
          .limit(100);
      if (!mounted) return;
      setState(() {
        _docs = List<Map<String, dynamic>>.from(res);
        _applyFilters();
        _loading = false;
      });
    } catch (e) {
      debugPrint('Load error: $e');
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur de chargement: $e'),
          backgroundColor: Colors.red.shade600,
        ),
      );
    }
  }

  void _applyFilters() {
    var list = _docs.toList();
    if (_filter != 'all') {
      list = list.where((d) =>
          (d['document_type'] ?? 'generic').toString().contains(_filter)).toList();
    }
    if (_search.text.isNotEmpty) {
      final q = _search.text.toLowerCase();
      list = list.where((d) =>
          (d['document_title'] ?? '').toString().toLowerCase().contains(q) ||
          (d['extracted_text'] ?? '').toString().toLowerCase().contains(q)).toList();
    }
    setState(() => _filtered = list);
  }

  // ── Actions ──────────────────────────────────────────────────
  Future<void> _scan() async {
    await Navigator.push(context, MaterialPageRoute(
      builder: (_) => DocumentScannerScreen(
        onDocumentScanned: (path, text) async {
          try {
            final uid = supabase.auth.currentUser?.id;
            if (uid == null) return;
            final file = File(path);
            final name = 'doc_${DateTime.now().millisecondsSinceEpoch}.jpg';
            final storagePath = 'raw/$uid/standalone/$name';
            await supabase.storage.from('inspection-documents').upload(storagePath, file);
            final url = supabase.storage.from('inspection-documents').getPublicUrl(storagePath);
            await supabase.from('inspection_documents').insert({
              'inspection_id': null,
              'document_type': 'generic',
              'document_title': 'Scan ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now())}',
              'document_url': url,
              'pages_count': 1,
              'user_id': uid,
              'extracted_text': text,
            });
            if (mounted) {
              _snack('Document enregistre', PremiumTheme.accentGreen);
              _load();
            }
          } catch (e) {
            if (mounted) _snack('Erreur: $e', PremiumTheme.accentRed);
          }
        },
      ),
    ));
  }

  Future<void> _delete(Map<String, dynamic> doc) async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(children: [
          Icon(Icons.warning_amber_rounded, color: PremiumTheme.accentAmber, size: 24),
          const SizedBox(width: 10),
          const Text('Supprimer ?', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
        ]),
        content: const Text('Cette action est irreversible.',
            style: TextStyle(color: PremiumTheme.textSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler', style: TextStyle(color: PremiumTheme.textSecondary))),
          ElevatedButton(onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.accentRed, elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            child: const Text('Supprimer', style: TextStyle(color: Colors.white))),
        ],
      ));
    if (ok != true) return;
    try {
      await supabase.from('inspection_documents').delete().eq('id', doc['id']);
      if (doc['document_url'] != null) {
        final uri = Uri.parse(doc['document_url']);
        final p = uri.pathSegments.skip(3).join('/');
        await supabase.storage.from('inspection-documents').remove([p]);
      }
      if (mounted) { _snack('Document supprime', PremiumTheme.accentGreen); _load(); }
    } catch (e) {
      if (mounted) _snack('Erreur: $e', PremiumTheme.accentRed);
    }
  }

  Future<void> _share(Map<String, dynamic> doc) async {
    final url = doc['document_url'];
    final title = doc['document_title'] ?? 'Document scanne';
    if (url == null) { _snack('Aucune image', PremiumTheme.accentRed); return; }
    showDialog(context: context, barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator(color: PremiumTheme.primaryTeal)));
    try {
      final resp = await http.get(Uri.parse(url));
      if (resp.statusCode == 200) {
        final dir = await getTemporaryDirectory();
        final name = '${title.replaceAll(RegExp(r'[^\w\s-]'), '_')}_${DateTime.now().millisecondsSinceEpoch}.jpg';
        final file = File('${dir.path}/$name');
        await file.writeAsBytes(resp.bodyBytes);
        if (mounted) Navigator.pop(context);
        await Share.shareXFiles([XFile(file.path)], text: 'Document: $title', subject: title);
      } else {
        throw Exception('Echec du telechargement');
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) _snack('Erreur partage: $e', PremiumTheme.accentRed);
    }
  }

  void _view(Map<String, dynamic> doc) {
    showDialog(context: context, builder: (_) => _ViewDialog(
      doc: doc,
      onShare: () { Navigator.pop(context); _share(doc); },
      onDelete: () { Navigator.pop(context); _delete(doc); },
    ));
  }

  String _fmtDate(dynamic d) {
    if (d == null) return '';
    try { return DateFormat('dd/MM/yyyy a HH:mm').format(DateTime.parse(d.toString())); }
    catch (_) { return ''; }
  }

  void _snack(String msg, Color bg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg), backgroundColor: bg,
        behavior: SnackBarBehavior.floating));
  }

  // ══════════════════════════════════════════════════════════════
  //  BUILD
  // ══════════════════════════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    final w = MediaQuery.of(context).size.width;
    final cols = w > 600 ? 3 : 2;
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ─────────────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              decoration: const BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                        onPressed: () => Navigator.pop(context),
                        color: PremiumTheme.textPrimary,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: PremiumTheme.tealGradient,
                          borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.document_scanner_rounded,
                            color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(l.myDocuments,
                            style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: PremiumTheme.textPrimary)),
                      ),
                      _headerBtn(
                        icon: _grid ? Icons.view_list_rounded : Icons.grid_view_rounded,
                        onTap: () => setState(() => _grid = !_grid),
                      ),
                      const SizedBox(width: 8),
                      _headerBtn(
                        icon: Icons.refresh_rounded,
                        onTap: _load,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Search
                  TextField(
                    controller: _search,
                    onChanged: (_) => _applyFilters(),
                    decoration: InputDecoration(
                      hintText: l.searchDocument,
                      hintStyle: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 14),
                      prefixIcon: const Icon(Icons.search_rounded,
                          color: PremiumTheme.textTertiary, size: 22),
                      suffixIcon: _search.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded,
                                  color: PremiumTheme.textTertiary, size: 20),
                              onPressed: () { _search.clear(); _applyFilters(); })
                          : null,
                      filled: true,
                      fillColor: PremiumTheme.lightBg,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: PremiumTheme.primaryTeal, width: 2)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),

            // ── Filter chips ───────────────────────────────────
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(children: [
                _chip(l.all, 'all', PremiumTheme.primaryTeal),
                _chip(l.invoices, 'invoice', PremiumTheme.primaryBlue),
                _chip(l.contracts, 'contract', PremiumTheme.primaryPurple),
                _chip(l.others, 'other', PremiumTheme.textSecondary),
              ]),
            ),

            // ── Content ────────────────────────────────────────
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: PremiumTheme.primaryTeal))
                  : _filtered.isEmpty
                      ? _emptyState(l)
                      : RefreshIndicator(
                          onRefresh: _load,
                          color: PremiumTheme.primaryTeal,
                          child: _grid
                              ? _buildGrid(cols)
                              : _buildList(),
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _scan,
        backgroundColor: PremiumTheme.primaryTeal,
        elevation: 4,
        icon: const Icon(Icons.document_scanner_rounded, color: Colors.white),
        label: Text(l.scanner,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ),
    );
  }

  // ── Header button ────────────────────────────────────────────
  Widget _headerBtn({required IconData icon, required VoidCallback onTap}) {
    return Material(
      color: PremiumTheme.lightBg,
      borderRadius: BorderRadius.circular(10),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(9),
          child: Icon(icon, color: PremiumTheme.textSecondary, size: 22),
        ),
      ),
    );
  }

  // ── Filter chip ──────────────────────────────────────────────
  Widget _chip(String label, String key, Color color) {
    final active = _filter == key;
    final count = key == 'all'
        ? _docs.length
        : _docs.where((d) => (d['document_type'] ?? 'generic').toString().contains(key)).length;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text('$label ($count)'),
        selected: active,
        onSelected: (_) { setState(() => _filter = key); _applyFilters(); },
        selectedColor: color.withValues(alpha: .12),
        backgroundColor: Colors.white,
        labelStyle: TextStyle(
          color: active ? color : PremiumTheme.textSecondary,
          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
          fontSize: 13,
        ),
        side: BorderSide(color: active ? color : Colors.grey.shade200),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      ),
    );
  }

  // ── Empty state ──────────────────────────────────────────────
  Widget _emptyState(AppLocalizations l) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryTeal.withValues(alpha: .08),
              shape: BoxShape.circle,
              border: Border.all(color: PremiumTheme.primaryTeal.withValues(alpha: .2), width: 2),
            ),
            child: const Icon(Icons.document_scanner_rounded,
                size: 56, color: PremiumTheme.primaryTeal),
          ),
          const SizedBox(height: 24),
          Text(l.noDocument,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary)),
          const SizedBox(height: 8),
          Text(l.scanFirstDocument,
              style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 14)),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _scan,
            icon: const Icon(Icons.add_rounded, color: Colors.white),
            label: Text(l.scanDocument,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.primaryTeal,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0),
          ),
        ],
      ),
    );
  }

  // ── Grid view ────────────────────────────────────────────────
  Widget _buildGrid(int cols) {
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: cols, crossAxisSpacing: 12, mainAxisSpacing: 12, childAspectRatio: 0.76),
      itemCount: _filtered.length,
      itemBuilder: (_, i) => _gridCard(_filtered[i]),
    );
  }

  Widget _gridCard(Map<String, dynamic> doc) {
    final type = doc['document_type'] ?? 'generic';
    final color = _typeColor(type);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: .15)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .03), blurRadius: 10, offset: const Offset(0, 3))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _view(doc),
          borderRadius: BorderRadius.circular(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: PremiumTheme.lightBg,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(15))),
                  child: Stack(
                    children: [
                      if (doc['document_url'] != null)
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                          child: Image.network(doc['document_url'],
                              fit: BoxFit.cover, width: double.infinity, height: double.infinity,
                              errorBuilder: (_, __, ___) => Center(
                                child: Icon(Icons.broken_image_rounded,
                                    color: Colors.grey.shade300, size: 40))),
                        )
                      else
                        Center(child: Icon(_typeIcon(type), color: color.withValues(alpha: .3), size: 48)),
                      // Badge
                      Positioned(
                        top: 8, left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: color,
                            borderRadius: BorderRadius.circular(8)),
                          child: Icon(_typeIcon(type), color: Colors.white, size: 14),
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
                    Text(doc['document_title'] ?? 'Document',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary),
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    Text(_fmtDate(doc['created_at']),
                        style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 11)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        _miniBtn(Icons.share_rounded, PremiumTheme.primaryTeal, () => _share(doc)),
                        const SizedBox(width: 6),
                        _miniBtn(Icons.delete_rounded, PremiumTheme.accentRed, () => _delete(doc)),
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

  // ── List view ────────────────────────────────────────────────
  Widget _buildList() {
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
      itemCount: _filtered.length,
      itemBuilder: (_, i) => _listCard(_filtered[i]),
    );
  }

  Widget _listCard(Map<String, dynamic> doc) {
    final type = doc['document_type'] ?? 'generic';
    final color = _typeColor(type);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: .1)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .03), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _view(doc),
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                // Thumb
                Container(
                  width: 56, height: 56,
                  decoration: BoxDecoration(
                    color: PremiumTheme.lightBg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: color.withValues(alpha: .15))),
                  child: doc['document_url'] != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.network(doc['document_url'],
                              fit: BoxFit.cover, width: 56, height: 56,
                              errorBuilder: (_, __, ___) => Center(
                                child: Icon(_typeIcon(type), color: color, size: 24))))
                      : Center(child: Icon(_typeIcon(type), color: color, size: 24)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(doc['document_title'] ?? 'Document',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                      const SizedBox(height: 4),
                      Text(_fmtDate(doc['created_at']),
                          style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 12)),
                      if (doc['extracted_text'] != null && doc['extracted_text'].toString().isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(doc['extracted_text'].toString(),
                            style: const TextStyle(color: PremiumTheme.textTertiary, fontSize: 11),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ],
                  ),
                ),
                _miniBtn(Icons.share_rounded, PremiumTheme.primaryTeal, () => _share(doc)),
                const SizedBox(width: 6),
                _miniBtn(Icons.delete_rounded, PremiumTheme.accentRed, () => _delete(doc)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ── Helpers ──────────────────────────────────────────────────
  Widget _miniBtn(IconData icon, Color color, VoidCallback onTap) {
    return Material(
      color: color.withValues(alpha: .08),
      borderRadius: BorderRadius.circular(9),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(7),
          child: Icon(icon, color: color, size: 18),
        ),
      ),
    );
  }

  Color _typeColor(String type) {
    if (type.contains('invoice')) return PremiumTheme.primaryBlue;
    if (type.contains('contract')) return PremiumTheme.primaryPurple;
    return PremiumTheme.primaryTeal;
  }

  IconData _typeIcon(String type) {
    if (type.contains('invoice')) return Icons.receipt_long_rounded;
    if (type.contains('contract')) return Icons.description_rounded;
    return Icons.insert_drive_file_rounded;
  }
}

// ══════════════════════════════════════════════════════════════
//  Document Viewer Dialog
// ══════════════════════════════════════════════════════════════
class _ViewDialog extends StatelessWidget {
  final Map<String, dynamic> doc;
  final VoidCallback onShare;
  final VoidCallback onDelete;

  const _ViewDialog({
    required this.doc,
    required this.onShare,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final date = doc['created_at'] != null
        ? DateFormat('dd/MM/yyyy a HH:mm').format(DateTime.parse(doc['created_at']))
        : '';
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: PremiumTheme.tealGradient,
                borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
              child: Row(
                children: [
                  const Icon(Icons.description_rounded, color: Colors.white, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(doc['document_title'] ?? 'Document',
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text(date,
                            style: TextStyle(color: Colors.white.withValues(alpha: .7), fontSize: 12)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white),
                    onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            // Image
            Flexible(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 450),
                child: doc['document_url'] != null
                    ? InteractiveViewer(
                        child: Image.network(doc['document_url'],
                            fit: BoxFit.contain,
                            loadingBuilder: (_, child, p) {
                              if (p == null) return child;
                              return Center(child: CircularProgressIndicator(
                                  color: PremiumTheme.primaryTeal,
                                  value: p.expectedTotalBytes != null
                                      ? p.cumulativeBytesLoaded / p.expectedTotalBytes!
                                      : null));
                            },
                            errorBuilder: (_, __, ___) => Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.error_outline_rounded,
                                      color: PremiumTheme.accentRed, size: 48),
                                  const SizedBox(height: 12),
                                  const Text('Erreur de chargement',
                                      style: TextStyle(color: PremiumTheme.textSecondary)),
                                ],
                              ),
                            )),
                      )
                    : const Center(
                        child: Text('Aucune image',
                            style: TextStyle(color: PremiumTheme.textSecondary))),
              ),
            ),
            // Extracted text
            if (doc['extracted_text'] != null &&
                doc['extracted_text'].toString().isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(color: PremiumTheme.lightBg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Icon(Icons.text_fields_rounded,
                          color: PremiumTheme.primaryPurple, size: 18),
                      const SizedBox(width: 8),
                      const Text('Texte extrait',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary)),
                    ]),
                    const SizedBox(height: 8),
                    Text(doc['extracted_text'].toString(),
                        style: const TextStyle(color: PremiumTheme.textSecondary, fontSize: 12),
                        maxLines: 5, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            // Actions
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20))),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: onShare,
                    icon: const Icon(Icons.share_rounded, color: PremiumTheme.primaryTeal, size: 20),
                    label: const Text('Partager',
                        style: TextStyle(color: PremiumTheme.primaryTeal, fontWeight: FontWeight.w600)),
                  ),
                  TextButton.icon(
                    onPressed: onDelete,
                    icon: const Icon(Icons.delete_rounded, color: PremiumTheme.accentRed, size: 20),
                    label: const Text('Supprimer',
                        style: TextStyle(color: PremiumTheme.accentRed, fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
