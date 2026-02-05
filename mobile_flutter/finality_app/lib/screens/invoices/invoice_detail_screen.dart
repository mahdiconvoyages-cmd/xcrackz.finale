import 'package:flutter/material.dart';
import '../../utils/error_helper.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../../models/invoice.dart';
import '../../models/company_info.dart';
import '../../services/invoice_service.dart';

class InvoiceDetailScreen extends StatefulWidget {
  final String invoiceId;

  const InvoiceDetailScreen({
    super.key,
    required this.invoiceId,
  });

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  final InvoiceService _invoiceService = InvoiceService();
  Invoice? _invoice;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadInvoice();
  }

  Future<void> _loadInvoice() async {
    setState(() => _isLoading = true);

    try {
      final invoice = await _invoiceService.getInvoiceById(widget.invoiceId);
      setState(() {
        _invoice = invoice;
        _isLoading = false;
      });
    } catch (e) {
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

    if (_invoice == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Facture')),
        body: const Center(child: Text('Facture introuvable')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_invoice!.invoiceNumber),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareInvoice,
            tooltip: 'Partager',
          ),
          IconButton(
            icon: const Icon(Icons.print),
            onPressed: _printInvoice,
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
            _buildInfoSection(),
            const SizedBox(height: 24),
            _buildItemsSection(),
            const SizedBox(height: 24),
            _buildTotalsSection(),
            if (_invoice!.notes != null) ...[
              const SizedBox(height: 24),
              _buildNotesSection(),
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

    switch (_invoice!.status) {
      case 'paid':
        backgroundColor = Colors.green;
        textColor = Colors.white;
        icon = Icons.check_circle;
        text = 'Facture payée';
        break;
      case 'pending':
        backgroundColor = Colors.orange;
        textColor = Colors.white;
        icon = Icons.pending;
        text = 'En attente de paiement';
        break;
      case 'overdue':
        backgroundColor = Colors.red;
        textColor = Colors.white;
        icon = Icons.warning;
        text = 'Paiement en retard';
        break;
      case 'cancelled':
        backgroundColor = Colors.grey;
        textColor = Colors.white;
        icon = Icons.cancel;
        text = 'Facture annulée';
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
                if (_invoice!.paidAt != null)
                  Text(
                    'Payée le ${DateFormat('dd/MM/yyyy').format(_invoice!.paidAt!)}',
                    style: TextStyle(color: textColor, fontSize: 14),
                  ),
              ],
            ),
          ),
        ],
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
            _buildInfoRow('Numéro', _invoice!.invoiceNumber),
            const SizedBox(height: 12),
            _buildInfoRow(
              'Date',
              DateFormat('dd/MM/yyyy').format(_invoice!.invoiceDate),
            ),
            if (_invoice!.dueDate != null) ...[
              const SizedBox(height: 12),
              _buildInfoRow(
                'Échéance',
                DateFormat('dd/MM/yyyy').format(_invoice!.dueDate!),
              ),
            ],
            if (_invoice!.paymentMethod != null) ...[
              const SizedBox(height: 12),
              _buildInfoRow('Moyen de paiement', _invoice!.paymentMethod!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: Colors.grey[600], fontSize: 14),
        ),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
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
            ..._invoice!.items.map((item) {
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
              '${_invoice!.subtotal.toStringAsFixed(2)} €',
              false,
            ),
            const SizedBox(height: 8),
            _buildTotalRow(
              'TVA (${_invoice!.taxRate.toStringAsFixed(0)}%)',
              '${_invoice!.taxAmount.toStringAsFixed(2)} €',
              false,
            ),
            const Divider(height: 24),
            _buildTotalRow(
              'Total TTC',
              '${_invoice!.total.toStringAsFixed(2)} €',
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
            Text(_invoice!.notes!),
          ],
        ),
      ),
    );
  }

  Widget _buildActionsSection() {
    return Column(
      children: [
        if (_invoice!.status == 'pending') ...[
          ElevatedButton.icon(
            onPressed: _markAsPaid,
            icon: const Icon(Icons.check),
            label: const Text('Marquer comme payée'),
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _cancelInvoice,
            icon: const Icon(Icons.cancel),
            label: const Text('Annuler la facture'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.red,
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ],
        const SizedBox(height: 12),
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

  Future<void> _markAsPaid() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Marquer comme payée'),
        content: const Text('Confirmer le paiement de cette facture ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _invoiceService.markAsPaid(_invoice!.id!);
      _loadInvoice();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Facture marquée comme payée')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _cancelInvoice() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Annuler la facture'),
        content: const Text('Êtes-vous sûr de vouloir annuler cette facture ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Non'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Annuler'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _invoiceService.cancelInvoice(_invoice!.id!);
      _loadInvoice();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Facture annulée')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ErrorHelper.cleanError(e))),
      );
    }
  }

  Future<void> _printInvoice() async {
    final pdf = await _generatePDF();
    await Printing.layoutPdf(onLayout: (format) async => pdf.save());
  }

  Future<void> _shareInvoice() async {
    try {
      final pdf = await _generatePDF();
      final bytes = await pdf.save();
      
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${_invoice!.invoiceNumber}.pdf');
      await file.writeAsBytes(bytes);
      
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: 'Facture ${_invoice!.invoiceNumber}',
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
      final file = File('${dir.path}/${_invoice!.invoiceNumber}.pdf');
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
    final company = CompanyInfo.defaultChecksFleet();
    
    // Calcul des conditions de paiement
    final paymentDueDate = _invoice!.dueDate ?? 
        _invoice!.invoiceDate.add(Duration(days: company.defaultPaymentDays));

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(40),
        build: (context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // ============================================
              // EN-TÊTE PROFESSIONNEL
              // ============================================
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  // Logo et informations entreprise
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: pw.BoxDecoration(
                            gradient: const pw.LinearGradient(
                              colors: [PdfColor.fromInt(0xFF14B8A6), PdfColor.fromInt(0xFF0D9488)],
                            ),
                            borderRadius: pw.BorderRadius.circular(8),
                          ),
                          child: pw.Text(
                            company.companyName.toUpperCase(),
                            style: pw.TextStyle(
                              fontSize: 24,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.white,
                            ),
                          ),
                        ),
                        pw.SizedBox(height: 12),
                        pw.Text(
                          company.legalForm,
                          style: pw.TextStyle(
                            fontSize: 10,
                            color: PdfColor.fromHex('#6B7280'),
                          ),
                        ),
                        pw.SizedBox(height: 8),
                        pw.Text(
                          company.address,
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                        pw.Text(
                          '${company.postalCode} ${company.city}',
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                        pw.SizedBox(height: 8),
                        pw.Text(
                          'Tél: ${company.phone}',
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                        pw.Text(
                          'Email: ${company.email}',
                          style: const pw.TextStyle(fontSize: 9),
                        ),
                        if (company.website != null)
                          pw.Text(
                            company.website!,
                            style: pw.TextStyle(
                              fontSize: 9,
                              color: PdfColor.fromHex('#14B8A6'),
                            ),
                          ),
                      ],
                    ),
                  ),
                  
                  pw.SizedBox(width: 40),
                  
                  // Type de document et numéro
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'FACTURE',
                        style: pw.TextStyle(
                          fontSize: 32,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColor.fromHex('#1E293B'),
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: pw.BoxDecoration(
                          color: _getStatusColor(_invoice!.status),
                          borderRadius: pw.BorderRadius.circular(4),
                        ),
                        child: pw.Text(
                          _getStatusLabel(_invoice!.status),
                          style: pw.TextStyle(
                            fontSize: 10,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.white,
                          ),
                        ),
                      ),
                      pw.SizedBox(height: 16),
                      pw.Text(
                        'N° ${_invoice!.invoiceNumber}',
                        style: pw.TextStyle(
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Text(
                        'Date: ${DateFormat('dd/MM/yyyy').format(_invoice!.invoiceDate)}',
                        style: const pw.TextStyle(fontSize: 10),
                      ),
                      if (_invoice!.dueDate != null)
                        pw.Text(
                          'Échéance: ${DateFormat('dd/MM/yyyy').format(_invoice!.dueDate!)}',
                          style: pw.TextStyle(
                            fontSize: 10,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColor.fromHex('#EF4444'),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              
              pw.SizedBox(height: 30),
              pw.Divider(thickness: 2, color: PdfColor.fromHex('#E5E7EB')),
              pw.SizedBox(height: 20),

              // ============================================
              // INFORMATIONS CLIENT
              // ============================================
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(16),
                      decoration: pw.BoxDecoration(
                        color: PdfColor.fromHex('#F9FAFB'),
                        border: pw.Border.all(color: PdfColor.fromHex('#E5E7EB')),
                        borderRadius: pw.BorderRadius.circular(8),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'FACTURÉ À',
                            style: pw.TextStyle(
                              fontSize: 10,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColor.fromHex('#6B7280'),
                            ),
                          ),
                          pw.SizedBox(height: 8),
                          pw.Text(
                            _invoice!.clientInfo?['name'] ?? 'Client',
                            style: pw.TextStyle(
                              fontSize: 12,
                              fontWeight: pw.FontWeight.bold,
                            ),
                          ),
                          if (_invoice!.clientInfo?['address'] != null) ...[
                            pw.SizedBox(height: 4),
                            pw.Text(
                              _invoice!.clientInfo!['address'],
                              style: const pw.TextStyle(fontSize: 9),
                            ),
                          ],
                          if (_invoice!.clientInfo?['email'] != null) ...[
                            pw.SizedBox(height: 4),
                            pw.Text(
                              _invoice!.clientInfo!['email'],
                              style: const pw.TextStyle(fontSize: 9),
                            ),
                          ],
                          if (_invoice!.clientInfo?['phone'] != null) ...[
                            pw.SizedBox(height: 4),
                            pw.Text(
                              _invoice!.clientInfo!['phone'],
                              style: const pw.TextStyle(fontSize: 9),
                            ),
                          ],
                          if (_invoice!.clientInfo?['siret'] != null) ...[
                            pw.SizedBox(height: 4),
                            pw.Text(
                              'SIRET: ${_invoice!.clientInfo!['siret']}',
                              style: pw.TextStyle(
                                fontSize: 8,
                                color: PdfColor.fromHex('#6B7280'),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 30),

              // ============================================
              // TABLEAU DES PRESTATIONS
              // ============================================
              pw.Table(
                border: pw.TableBorder.all(color: PdfColor.fromHex('#E5E7EB')),
                children: [
                  // En-tête
                  pw.TableRow(
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromHex('#14B8A6'),
                    ),
                    children: [
                      _buildTableHeader('DESCRIPTION'),
                      _buildTableHeader('QTÉ'),
                      _buildTableHeader('PRIX UNIT.'),
                      _buildTableHeader('TOTAL HT'),
                    ],
                  ),
                  // Articles
                  ..._invoice!.items.map((item) {
                    return pw.TableRow(
                      children: [
                        _buildTableCell(item.description, align: pw.TextAlign.left),
                        _buildTableCell(item.quantity.toString()),
                        _buildTableCell('${item.unitPrice.toStringAsFixed(2)} €'),
                        _buildTableCell(
                          '${item.total.toStringAsFixed(2)} €',
                          bold: true,
                        ),
                      ],
                    );
                  }),
                ],
              ),

              pw.SizedBox(height: 20),

              // ============================================
              // TOTAUX
              // ============================================
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 280,
                    padding: const pw.EdgeInsets.all(16),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColor.fromHex('#E5E7EB')),
                      borderRadius: pw.BorderRadius.circular(8),
                    ),
                    child: pw.Column(
                      children: [
                        _buildPdfTotalRow('TOTAL HT', '${_invoice!.subtotal.toStringAsFixed(2)} €'),
                        pw.SizedBox(height: 8),
                        _buildPdfTotalRow(
                          'TVA (${_invoice!.taxRate.toStringAsFixed(1)}%)',
                          '${_invoice!.taxAmount.toStringAsFixed(2)} €',
                        ),
                        pw.SizedBox(height: 8),
                        pw.Divider(color: PdfColor.fromHex('#E5E7EB')),
                        pw.SizedBox(height: 8),
                        _buildPdfTotalRow(
                          'TOTAL TTC',
                          '${_invoice!.total.toStringAsFixed(2)} €',
                          bold: true,
                          fontSize: 16,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 30),

              // ============================================
              // CONDITIONS DE PAIEMENT
              // ============================================
              pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#FEF3C7'),
                  border: pw.Border.all(color: PdfColor.fromHex('#F59E0B')),
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'CONDITIONS DE RÈGLEMENT',
                      style: pw.TextStyle(
                        fontSize: 10,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColor.fromHex('#92400E'),
                      ),
                    ),
                    pw.SizedBox(height: 8),
                    pw.Text(
                      'Paiement à ${company.defaultPaymentDays} jours - Date limite: ${DateFormat('dd/MM/yyyy').format(paymentDueDate)}',
                      style: pw.TextStyle(
                        fontSize: 9,
                        color: PdfColor.fromHex('#78350F'),
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'En cas de retard de paiement, pénalités de ${company.latePaymentPenaltyRate.toStringAsFixed(2)}% par an (art. L441-6 du Code de commerce)',
                      style: pw.TextStyle(
                        fontSize: 8,
                        color: PdfColor.fromHex('#78350F'),
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Indemnité forfaitaire pour frais de recouvrement: ${company.recoveryFee.toStringAsFixed(2)} € (art. D441-5 du Code de commerce)',
                      style: pw.TextStyle(
                        fontSize: 8,
                        color: PdfColor.fromHex('#78350F'),
                      ),
                    ),
                  ],
                ),
              ),

              // Coordonnées bancaires
              if (company.bankName != null) ...[
                pw.SizedBox(height: 16),
                pw.Container(
                  padding: const pw.EdgeInsets.all(16),
                  decoration: pw.BoxDecoration(
                    color: PdfColor.fromHex('#F0F9FF'),
                    border: pw.Border.all(color: PdfColor.fromHex('#3B82F6')),
                    borderRadius: pw.BorderRadius.circular(8),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'COORDONNÉES BANCAIRES',
                        style: pw.TextStyle(
                          fontSize: 10,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColor.fromHex('#1E40AF'),
                        ),
                      ),
                      pw.SizedBox(height: 8),
                      pw.Row(
                        children: [
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  'Banque: ${company.bankName}',
                                  style: const pw.TextStyle(fontSize: 9),
                                ),
                                if (company.bankIban != null) ...[
                                  pw.SizedBox(height: 4),
                                  pw.Text(
                                    'IBAN: ${company.bankIban}',
                                    style: pw.TextStyle(
                                      fontSize: 9,
                                      fontWeight: pw.FontWeight.bold,
                                    ),
                                  ),
                                ],
                                if (company.bankBic != null) ...[
                                  pw.SizedBox(height: 4),
                                  pw.Text(
                                    'BIC: ${company.bankBic}',
                                    style: const pw.TextStyle(fontSize: 9),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],

              // Notes additionnelles
              if (_invoice!.notes != null && _invoice!.notes!.isNotEmpty) ...[
                pw.SizedBox(height: 16),
                pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    color: PdfColor.fromHex('#F9FAFB'),
                    borderRadius: pw.BorderRadius.circular(8),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'NOTES',
                        style: pw.TextStyle(
                          fontSize: 9,
                          fontWeight: pw.FontWeight.bold,
                          color: PdfColor.fromHex('#6B7280'),
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        _invoice!.notes!,
                        style: const pw.TextStyle(fontSize: 8),
                      ),
                    ],
                  ),
                ),
              ],

              pw.Spacer(),

              // ============================================
              // PIED DE PAGE - MENTIONS LÉGALES
              // ============================================
              pw.Divider(color: PdfColor.fromHex('#E5E7EB')),
              pw.SizedBox(height: 8),
              
              // Mentions légales
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColor.fromHex('#F9FAFB'),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      company.legalMentions,
                      textAlign: pw.TextAlign.center,
                      style: pw.TextStyle(
                        fontSize: 8,
                        color: PdfColor.fromHex('#6B7280'),
                      ),
                    ),
                    if (company.capital != null) ...[
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Capital social: ${company.capital}',
                        textAlign: pw.TextAlign.center,
                        style: pw.TextStyle(
                          fontSize: 7,
                          color: PdfColor.fromHex('#9CA3AF'),
                        ),
                      ),
                    ],
                    if (company.isMicroEntrepreneur) ...[
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Dispensé d\'immatriculation au RCS et au RM (Article L123-1-1 du Code de commerce)',
                        textAlign: pw.TextAlign.center,
                        style: pw.TextStyle(
                          fontSize: 7,
                          color: PdfColor.fromHex('#9CA3AF'),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              
              pw.SizedBox(height: 8),
              pw.Center(
                child: pw.Text(
                  'Document généré le ${DateFormat('dd/MM/yyyy à HH:mm').format(DateTime.now())}',
                  style: pw.TextStyle(
                    fontSize: 7,
                    color: PdfColor.fromHex('#9CA3AF'),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf;
  }

  // Helpers pour le PDF
  pw.Widget _buildTableHeader(String text) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          fontSize: 9,
          fontWeight: pw.FontWeight.bold,
          color: PdfColors.white,
        ),
        textAlign: pw.TextAlign.center,
      ),
    );
  }

  pw.Widget _buildTableCell(String text, {bool bold = false, pw.TextAlign align = pw.TextAlign.center}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(8),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          fontSize: 9,
          fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
        ),
        textAlign: align,
      ),
    );
  }

  pw.Widget _buildPdfTotalRow(String label, String value, {bool bold = false, double fontSize = 10}) {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text(
          label,
          style: pw.TextStyle(
            fontSize: fontSize,
            fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
          ),
        ),
        pw.Text(
          value,
          style: pw.TextStyle(
            fontSize: fontSize,
            fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
            color: bold ? PdfColor.fromHex('#14B8A6') : null,
          ),
        ),
      ],
    );
  }

  PdfColor _getStatusColor(String status) {
    switch (status) {
      case 'paid':
        return PdfColor.fromHex('#10B981');
      case 'pending':
        return PdfColor.fromHex('#F59E0B');
      case 'overdue':
        return PdfColor.fromHex('#EF4444');
      case 'cancelled':
        return PdfColor.fromHex('#6B7280');
      default:
        return PdfColor.fromHex('#9CA3AF');
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'paid':
        return 'PAYÉE';
      case 'pending':
        return 'EN ATTENTE';
      case 'overdue':
        return 'EN RETARD';
      case 'cancelled':
        return 'ANNULÉE';
      default:
        return 'INCONNUE';
    }
  }
}
