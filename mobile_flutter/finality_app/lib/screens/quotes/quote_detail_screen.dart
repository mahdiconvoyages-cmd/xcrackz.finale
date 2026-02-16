import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../../models/quote.dart';
import '../../services/quote_service.dart';
import 'quote_form_screen.dart';

class QuoteDetailScreen extends StatefulWidget {
  final String quoteId;

  const QuoteDetailScreen({
    super.key,
    required this.quoteId,
  });

  @override
  State<QuoteDetailScreen> createState() => _QuoteDetailScreenState();
}

class _QuoteDetailScreenState extends State<QuoteDetailScreen> {
  final QuoteService _quoteService = QuoteService();
  Quote? _quote;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadQuote();
  }

  Future<void> _loadQuote() async {
    setState(() => _isLoading = true);

    try {
      final quote = await _quoteService.getQuoteById(widget.quoteId);
      if (!mounted) return;
      setState(() {
        _quote = quote;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_quote == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Devis')),
        body: const Center(child: Text('Devis introuvable')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_quote!.quoteNumber),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: _editQuote,
            tooltip: 'Modifier',
          ),
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareQuote,
            tooltip: 'Partager',
          ),
          IconButton(
            icon: const Icon(Icons.print),
            onPressed: _printQuote,
            tooltip: 'Imprimer',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusBanner(),
            const SizedBox(height: 24),
            _buildClientSection(),
            const SizedBox(height: 24),
            _buildInfoSection(),
            const SizedBox(height: 24),
            _buildItemsSection(),
            const SizedBox(height: 24),
            _buildTotalsSection(),
            if (_quote!.notes != null) ...[
              const SizedBox(height: 24),
              _buildNotesSection(),
            ],
            if (_quote!.terms != null) ...[
              const SizedBox(height: 24),
              _buildTermsSection(),
            ],
            const SizedBox(height: 24),
            _buildActionsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBanner() {
    Color backgroundColor;
    Color textColor;
    IconData icon;
    String text;

    switch (_quote!.status) {
      case 'draft':
        backgroundColor = Colors.grey;
        textColor = Colors.white;
        icon = Icons.edit;
        text = 'Brouillon';
        break;
      case 'sent':
        backgroundColor = Colors.blue;
        textColor = Colors.white;
        icon = Icons.send;
        text = 'Envoyé';
        break;
      case 'accepted':
        backgroundColor = Colors.green;
        textColor = Colors.white;
        icon = Icons.check_circle;
        text = 'Accepté';
        break;
      case 'rejected':
        backgroundColor = Colors.red;
        textColor = Colors.white;
        icon = Icons.cancel;
        text = 'Rejeté';
        break;
      case 'converted':
        backgroundColor = Colors.purple;
        textColor = Colors.white;
        icon = Icons.receipt;
        text = 'Converti en facture';
        break;
      default:
        backgroundColor = Colors.grey;
        textColor = Colors.white;
        icon = Icons.help_outline;
        text = 'Statut inconnu';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: textColor, size: 32),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (_quote!.sentAt != null)
                  Text(
                    'Envoyé le ${DateFormat('dd/MM/yyyy').format(_quote!.sentAt!)}',
                    style: TextStyle(color: textColor, fontSize: 14),
                  ),
                if (_quote!.acceptedAt != null)
                  Text(
                    'Accepté le ${DateFormat('dd/MM/yyyy').format(_quote!.acceptedAt!)}',
                    style: TextStyle(color: textColor, fontSize: 14),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientSection() {
    if (_quote!.clientName == null) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Client',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Divider(height: 24),
            _buildInfoRow('Nom', _quote!.clientName!),
            if (_quote!.clientEmail != null) ...[
              const SizedBox(height: 12),
              _buildInfoRow('Email', _quote!.clientEmail!),
            ],
            if (_quote!.clientPhone != null) ...[
              const SizedBox(height: 12),
              _buildInfoRow('Téléphone', _quote!.clientPhone!),
            ],
            if (_quote!.clientAddress != null) ...[
              const SizedBox(height: 12),
              _buildInfoRow('Adresse', _quote!.clientAddress!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Informations',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Divider(height: 24),
            _buildInfoRow('Numéro', _quote!.quoteNumber),
            const SizedBox(height: 12),
            _buildInfoRow(
              'Date',
              DateFormat('dd/MM/yyyy').format(_quote!.quoteDate),
            ),
            if (_quote!.validUntil != null) ...[
              const SizedBox(height: 12),
              _buildInfoRow(
                'Valide jusqu\'au',
                DateFormat('dd/MM/yyyy').format(_quote!.validUntil!),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey[600], fontSize: 14),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
            textAlign: TextAlign.right,
          ),
        ),
      ],
    );
  }

  Widget _buildItemsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Articles / Services',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Divider(height: 24),
            ..._quote!.items.map((item) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.description,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${item.quantity} × ${item.unitPrice.toStringAsFixed(2)} €',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                        ),
                        Text(
                          '${item.total.toStringAsFixed(2)} €',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildTotalRow(
              'Sous-total HT',
              '${_quote!.subtotal.toStringAsFixed(2)} €',
              false,
            ),
            const SizedBox(height: 8),
            _buildTotalRow(
              'TVA (${_quote!.taxRate.toStringAsFixed(0)}%)',
              '${_quote!.taxAmount.toStringAsFixed(2)} €',
              false,
            ),
            const Divider(height: 24),
            _buildTotalRow(
              'Total TTC',
              '${_quote!.total.toStringAsFixed(2)} €',
              true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTotalRow(String label, String value, bool isBold) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: isBold ? 20 : 14,
            fontWeight: FontWeight.bold,
            color: isBold ? Colors.green : Colors.black,
          ),
        ),
      ],
    );
  }

  Widget _buildNotesSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Notes',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Divider(height: 24),
            Text(_quote!.notes!),
          ],
        ),
      ),
    );
  }

  Widget _buildTermsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Conditions',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Divider(height: 24),
            Text(_quote!.terms!),
          ],
        ),
      ),
    );
  }

  Widget _buildActionsSection() {
    return Column(
      children: [
        if (_quote!.status == 'draft') ...[
          ElevatedButton.icon(
            onPressed: _markAsSent,
            icon: const Icon(Icons.send),
            label: const Text('Marquer comme envoyé'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (_quote!.status == 'sent') ...[
          ElevatedButton.icon(
            onPressed: _markAsAccepted,
            icon: const Icon(Icons.check),
            label: const Text('Marquer comme accepté'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _markAsRejected,
            icon: const Icon(Icons.cancel),
            label: const Text('Marquer comme rejeté'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (_quote!.status == 'accepted' || _quote!.status == 'sent') ...[
          FilledButton.icon(
            onPressed: _convertToInvoice,
            icon: const Icon(Icons.receipt),
            label: const Text('Convertir en facture'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
          const SizedBox(height: 12),
        ],
        OutlinedButton.icon(
          onPressed: _downloadPDF,
          icon: const Icon(Icons.download),
          label: const Text('Télécharger PDF'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
          ),
        ),
      ],
    );
  }

  void _editQuote() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => QuoteFormScreen(quote: _quote),
      ),
    ).then((_) => _loadQuote());
  }

  Future<void> _markAsSent() async {
    try {
      await _quoteService.markAsSent(_quote!.id!);
      _loadQuote();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Devis marqué comme envoyé')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _markAsAccepted() async {
    try {
      await _quoteService.markAsAccepted(_quote!.id!);
      _loadQuote();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Devis marqué comme accepté')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _markAsRejected() async {
    try {
      await _quoteService.markAsRejected(_quote!.id!);
      _loadQuote();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Devis marqué comme rejeté')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _convertToInvoice() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Convertir en facture'),
        content: const Text(
          'Cette action créera une nouvelle facture basée sur ce devis. Continuer ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Convertir'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _quoteService.convertToInvoice(_quote!.id!);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Devis converti en facture')),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _printQuote() async {
    final pdf = await _generatePDF();
    await Printing.layoutPdf(onLayout: (format) async => pdf.save());
  }

  Future<void> _shareQuote() async {
    try {
      final pdf = await _generatePDF();
      final bytes = await pdf.save();
      
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${_quote!.quoteNumber}.pdf');
      await file.writeAsBytes(bytes);
      
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: 'Devis ${_quote!.quoteNumber}',
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _downloadPDF() async {
    try {
      final pdf = await _generatePDF();
      final bytes = await pdf.save();
      
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/${_quote!.quoteNumber}.pdf');
      await file.writeAsBytes(bytes);
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('PDF enregistré: ${file.path}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<pw.Document> _generatePDF() async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // En-tête
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'DEVIS',
                        style: pw.TextStyle(
                          fontSize: 32,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(_quote!.quoteNumber),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('Votre Entreprise'),
                      pw.Text('123 Rue Example'),
                      pw.Text('75000 Paris'),
                      pw.Text('contact@entreprise.fr'),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 40),

              // Client
              if (_quote!.clientName != null) ...[
                pw.Text(
                  'Client:',
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 8),
                pw.Text(_quote!.clientName!),
                if (_quote!.clientEmail != null) pw.Text(_quote!.clientEmail!),
                if (_quote!.clientPhone != null) pw.Text(_quote!.clientPhone!),
                if (_quote!.clientAddress != null) pw.Text(_quote!.clientAddress!),
                pw.SizedBox(height: 20),
              ],

              // Informations
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Date: ${DateFormat('dd/MM/yyyy').format(_quote!.quoteDate)}',
                      ),
                      if (_quote!.validUntil != null)
                        pw.Text(
                          'Valide jusqu\'au: ${DateFormat('dd/MM/yyyy').format(_quote!.validUntil!)}',
                        ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 40),

              // Tableau des articles
              pw.Table(
                border: pw.TableBorder.all(),
                children: [
                  // En-tête
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey300),
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Description',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Quantité',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Prix unitaire',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Total',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  // Articles
                  ..._quote!.items.map((item) {
                    return pw.TableRow(
                      children: [
                        pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(item.description),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text(item.quantity.toString()),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('${item.unitPrice.toStringAsFixed(2)} €'),
                        ),
                        pw.Padding(
                          padding: const pw.EdgeInsets.all(8),
                          child: pw.Text('${item.total.toStringAsFixed(2)} €'),
                        ),
                      ],
                    );
                  }),
                ],
              ),
              pw.SizedBox(height: 20),

              // Totaux
              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Container(
                  width: 250,
                  child: pw.Column(
                    children: [
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text('Sous-total HT:'),
                          pw.Text('${_quote!.subtotal.toStringAsFixed(2)} €'),
                        ],
                      ),
                      pw.SizedBox(height: 8),
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text('TVA (${_quote!.taxRate.toStringAsFixed(0)}%):'),
                          pw.Text('${_quote!.taxAmount.toStringAsFixed(2)} €'),
                        ],
                      ),
                      pw.Divider(),
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            'Total TTC:',
                            style: pw.TextStyle(
                              fontSize: 18,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                          pw.Text(
                            '${_quote!.total.toStringAsFixed(2)} €',
                            style: pw.TextStyle(
                              fontSize: 18,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Notes
              if (_quote!.notes != null) ...[
                pw.SizedBox(height: 40),
                pw.Text(
                  'Notes:',
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 8),
                pw.Text(_quote!.notes!),
              ],

              // Conditions
              if (_quote!.terms != null) ...[
                pw.SizedBox(height: 20),
                pw.Text(
                  'Conditions:',
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                ),
                pw.SizedBox(height: 8),
                pw.Text(_quote!.terms!),
              ],

              // Pied de page
              pw.Spacer(),
              pw.Divider(),
              pw.Center(
                child: pw.Text(
                  'Devis valable ${_quote!.validUntil != null ? "jusqu\'au ${DateFormat('dd/MM/yyyy').format(_quote!.validUntil!)}" : "30 jours"}',
                  style: const pw.TextStyle(fontSize: 12),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }
}
