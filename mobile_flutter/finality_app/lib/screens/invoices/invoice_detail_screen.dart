import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../../utils/error_helper.dart';
import '../../models/invoice.dart';
import '../../models/company_info.dart';
import '../../services/invoice_service.dart';
import '../../theme/premium_theme.dart';
import 'invoice_form_screen.dart';

class InvoiceDetailScreen extends StatefulWidget {
  final String invoiceId;
  const InvoiceDetailScreen({super.key, required this.invoiceId});

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  final InvoiceService _svc = InvoiceService();
  final _fmt = NumberFormat.currency(locale: 'fr_FR', symbol: '\u20AC');
  Invoice? _inv;
  bool _loading = true;
  bool _changed = false;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final inv = await _svc.getInvoiceByIdWithItems(widget.invoiceId);
      if (!mounted) return;
      setState(() { _inv = inv; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed);
    }
  }

  void _snack(String msg, Color bg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: bg, behavior: SnackBarBehavior.floating));
  }

  // ── Status config ────────────────────────────────────────────
  static const _cfg = {
    'draft':     ('Brouillon',  Icons.edit_note_rounded,     Color(0xFF6B7280)),
    'pending':   ('En attente', Icons.schedule_rounded,      Color(0xFFF59E0B)),
    'sent':      ('Envoyee',    Icons.send_rounded,          Color(0xFF3B82F6)),
    'paid':      ('Payee',      Icons.check_circle_rounded,  Color(0xFF10B981)),
    'overdue':   ('En retard',  Icons.warning_rounded,       Color(0xFFEF4444)),
    'cancelled': ('Annulee',    Icons.cancel_rounded,        Color(0xFF9CA3AF)),
  };
  (String, IconData, Color) _si(String s) =>
      _cfg[s] ?? ('Inconnu', Icons.help_outline, const Color(0xFF9CA3AF));

  // ══════════════════════════════════════════════════════════════
  //  BUILD
  // ══════════════════════════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: PremiumTheme.lightBg,
        appBar: AppBar(backgroundColor: Colors.white, elevation: 0,
          leading: const BackButton(color: PremiumTheme.textPrimary)),
        body: const Center(child: CircularProgressIndicator(color: PremiumTheme.primaryBlue)),
      );
    }
    if (_inv == null) {
      return Scaffold(
        backgroundColor: PremiumTheme.lightBg,
        appBar: AppBar(backgroundColor: Colors.white, elevation: 0,
          leading: const BackButton(color: PremiumTheme.textPrimary),
          title: const Text('Facture', style: TextStyle(color: PremiumTheme.textPrimary))),
        body: const Center(child: Text('Facture introuvable')),
      );
    }

    final (sLabel, sIcon, sColor) = _si(_inv!.status);
    final client = _inv!.clientInfo ?? {};

    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop && _changed) Navigator.of(context).pop(true);
      },
      child: Scaffold(
        backgroundColor: PremiumTheme.lightBg,
        body: CustomScrollView(
          slivers: [
            // ── App bar ────────────────────────────────────────
            SliverAppBar(
              pinned: true,
              expandedHeight: 140,
              backgroundColor: Colors.white,
              foregroundColor: PremiumTheme.textPrimary,
              leading: BackButton(onPressed: () => Navigator.pop(context, _changed)),
              actions: [
                IconButton(icon: const Icon(Icons.edit_rounded), tooltip: 'Modifier',
                  onPressed: () async {
                    final ok = await Navigator.push<bool>(context,
                      MaterialPageRoute(builder: (_) => InvoiceFormScreen(invoice: _inv)));
                    if (ok == true) { _changed = true; _load(); }
                  }),
                IconButton(icon: const Icon(Icons.share_rounded), tooltip: 'Partager', onPressed: _share),
                IconButton(icon: const Icon(Icons.print_rounded), tooltip: 'Imprimer', onPressed: _print),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  alignment: Alignment.bottomLeft,
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: Row(children: [
                    Expanded(child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_inv!.invoiceNumber,
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary)),
                        const SizedBox(height: 4),
                        Text(client['name'] ?? 'Client',
                            style: const TextStyle(fontSize: 14, color: PremiumTheme.textSecondary)),
                      ],
                    )),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                      decoration: BoxDecoration(
                        color: sColor.withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(20)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(sIcon, color: sColor, size: 16),
                        const SizedBox(width: 6),
                        Text(sLabel, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: sColor)),
                      ]),
                    ),
                  ]),
                ),
              ),
            ),

            // ── Content ────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(delegate: SliverChildListDelegate([
                // Status banner
                _statusBanner(sLabel, sIcon, sColor),
                const SizedBox(height: 16),
                // Info
                _infoCard(client),
                const SizedBox(height: 16),
                // Items
                _itemsCard(),
                const SizedBox(height: 16),
                // Totals
                _totalsCard(),
                if (_inv!.notes != null && _inv!.notes!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _notesCard(),
                ],
                const SizedBox(height: 16),
                // Actions
                _actionsCard(sColor),
                const SizedBox(height: 32),
              ])),
            ),
          ],
        ),
      ),
    );
  }

  // ── Status banner ────────────────────────────────────────────
  Widget _statusBanner(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [color, color.withValues(alpha: .8)]),
        borderRadius: BorderRadius.circular(14)),
      child: Row(children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700)),
          if (_inv!.paidAt != null)
            Text('Payee le ${DateFormat('dd/MM/yyyy').format(_inv!.paidAt!)}',
                style: TextStyle(color: Colors.white.withValues(alpha: .85), fontSize: 13)),
          if (_inv!.paymentMethod != null)
            Text('Via ${_inv!.paymentMethod}',
                style: TextStyle(color: Colors.white.withValues(alpha: .85), fontSize: 13)),
        ])),
        Text(_fmt.format(_inv!.total),
            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
      ]),
    );
  }

  // ── Info card ────────────────────────────────────────────────
  Widget _infoCard(Map<String, dynamic> client) {
    return _card('Informations', Icons.info_outline_rounded, PremiumTheme.primaryBlue, [
      _row('Numero', _inv!.invoiceNumber),
      _row('Date emission', DateFormat('dd/MM/yyyy').format(_inv!.invoiceDate)),
      if (_inv!.dueDate != null) _row('Echeance', DateFormat('dd/MM/yyyy').format(_inv!.dueDate!)),
      if (_inv!.paymentMethod != null) _row('Paiement', _inv!.paymentMethod!),
      const Divider(height: 20),
      _row('Client', client['name'] ?? 'N/A'),
      if (client['email'] != null && (client['email'] as String).isNotEmpty)
        _row('Email', client['email']),
      if (client['phone'] != null && (client['phone'] as String).isNotEmpty)
        _row('Telephone', client['phone']),
      if (client['address'] != null && (client['address'] as String).isNotEmpty)
        _row('Adresse', client['address']),
      if (client['siret'] != null && (client['siret'] as String).isNotEmpty)
        _row('SIRET', client['siret']),
    ]);
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(children: [
        SizedBox(width: 110, child: Text(label,
            style: const TextStyle(fontSize: 13, color: PremiumTheme.textTertiary))),
        Expanded(child: Text(value,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary))),
      ]),
    );
  }

  // ── Items card ───────────────────────────────────────────────
  Widget _itemsCard() {
    return _card('Articles / Prestations', Icons.shopping_bag_rounded, PremiumTheme.accentGreen, [
      // Header
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: PremiumTheme.lightBg, borderRadius: BorderRadius.circular(8)),
        child: const Row(children: [
          Expanded(flex: 5, child: Text('Description',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PremiumTheme.textTertiary))),
          Expanded(flex: 1, child: Text('Qte', textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PremiumTheme.textTertiary))),
          Expanded(flex: 2, child: Text('P.U. HT', textAlign: TextAlign.right,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PremiumTheme.textTertiary))),
          Expanded(flex: 2, child: Text('Total HT', textAlign: TextAlign.right,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: PremiumTheme.textTertiary))),
        ]),
      ),
      const SizedBox(height: 4),
      ..._inv!.items.map((item) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey.shade100))),
        child: Row(children: [
          Expanded(flex: 5, child: Text(item.description,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500))),
          Expanded(flex: 1, child: Text('${item.quantity}', textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13))),
          Expanded(flex: 2, child: Text('${item.unitPrice.toStringAsFixed(2)} \u20AC',
              textAlign: TextAlign.right, style: const TextStyle(fontSize: 13))),
          Expanded(flex: 2, child: Text('${item.total.toStringAsFixed(2)} \u20AC',
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))),
        ]),
      )),
    ]);
  }

  // ── Totals card ──────────────────────────────────────────────
  Widget _totalsCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .1), blurRadius: 12)],
      ),
      child: Column(children: [
        _totalLine('Sous-total HT', _inv!.subtotal, Colors.white70),
        const SizedBox(height: 8),
        _totalLine('TVA (${_inv!.taxRate.toStringAsFixed(0)}%)', _inv!.taxAmount, Colors.white70),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: PremiumTheme.accentGreen.withValues(alpha: .15),
            borderRadius: BorderRadius.circular(12)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('TOTAL TTC', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800,
                color: Colors.white, letterSpacing: 1)),
            Text(_fmt.format(_inv!.total),
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
          ]),
        ),
      ]),
    );
  }

  Widget _totalLine(String label, double val, Color c) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: 14, color: c)),
      Text('${val.toStringAsFixed(2)} \u20AC', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: c)),
    ]);
  }

  // ── Notes card ───────────────────────────────────────────────
  Widget _notesCard() {
    return _card('Notes', Icons.note_rounded, PremiumTheme.textSecondary, [
      Text(_inv!.notes!, style: const TextStyle(fontSize: 14, color: PremiumTheme.textSecondary, height: 1.5)),
    ]);
  }

  // ── Actions card ─────────────────────────────────────────────
  Widget _actionsCard(Color sColor) {
    final canAct = _inv!.status == 'draft' || _inv!.status == 'pending' || _inv!.status == 'overdue';
    return Column(children: [
      if (canAct) ...[
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _markPaid,
            icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
            label: const Text('Marquer comme payee', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15)),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.accentGreen,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _cancel,
            icon: const Icon(Icons.cancel_rounded, color: PremiumTheme.accentRed),
            label: const Text('Annuler la facture',
                style: TextStyle(color: PremiumTheme.accentRed, fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: PremiumTheme.accentRed),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
          ),
        ),
        const SizedBox(height: 10),
      ],
      SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: _download,
          icon: const Icon(Icons.download_rounded, color: PremiumTheme.primaryBlue),
          label: const Text('Telecharger PDF',
              style: TextStyle(color: PremiumTheme.primaryBlue, fontWeight: FontWeight.w600)),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: PremiumTheme.primaryBlue),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        ),
      ),
    ]);
  }

  // ── Shared card widget ───────────────────────────────────────
  Widget _card(String title, IconData icon, Color color, List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .04), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
        ),
      ]),
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════════════════════════════
  Future<void> _markPaid() async {
    final method = await showModalBottomSheet<String>(
      context: context, backgroundColor: Colors.transparent,
      builder: (_) => const _PaymentSheet());
    if (method == null) return;
    try {
      await _svc.markAsPaid(_inv!.id!, paymentMethod: method);
      _changed = true;
      _snack('Facture marquee comme payee', PremiumTheme.accentGreen);
      _load();
    } catch (e) { _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed); }
  }

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Annuler la facture ?'),
        content: Text('Annuler ${_inv!.invoiceNumber} ? Cette action est irreversible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Non')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: PremiumTheme.accentRed),
            child: const Text('Oui, annuler', style: TextStyle(color: Colors.white))),
        ],
      ));
    if (ok != true) return;
    try {
      await _svc.cancelInvoice(_inv!.id!);
      _changed = true;
      _snack('Facture annulee', PremiumTheme.accentAmber);
      _load();
    } catch (e) { _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed); }
  }

  Future<void> _print() async {
    final pdf = await _genPdf();
    await Printing.layoutPdf(onLayout: (_) async => pdf.save());
  }

  Future<void> _share() async {
    try {
      final pdf = await _genPdf();
      final bytes = await pdf.save();
      final dir = await getTemporaryDirectory();
      final f = File('${dir.path}/${_inv!.invoiceNumber}.pdf');
      await f.writeAsBytes(bytes);
      await SharePlus.instance.share(ShareParams(files: [XFile(f.path)], text: 'Facture ${_inv!.invoiceNumber}'));
    } catch (e) { _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed); }
  }

  Future<void> _download() async {
    try {
      final pdf = await _genPdf();
      final bytes = await pdf.save();
      final dir = await getApplicationDocumentsDirectory();
      final f = File('${dir.path}/${_inv!.invoiceNumber}.pdf');
      await f.writeAsBytes(bytes);
      _snack('PDF enregistre : ${f.path}', PremiumTheme.accentGreen);
    } catch (e) { _snack(ErrorHelper.cleanError(e), PremiumTheme.accentRed); }
  }

  // ══════════════════════════════════════════════════════════════
  //  PDF GENERATION
  // ══════════════════════════════════════════════════════════════
  Future<pw.Document> _genPdf() async {
    final pdf = pw.Document();
    final co = CompanyInfo.defaultChecksFleet();
    final due = _inv!.dueDate ?? _inv!.invoiceDate.add(Duration(days: co.defaultPaymentDays));
    final client = _inv!.clientInfo ?? {};
    final (sLabel, _, _) = _si(_inv!.status);

    pdf.addPage(pw.Page(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(40),
      build: (ctx) => pw.Column(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          // ── Header ──
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Expanded(child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: pw.BoxDecoration(
                      color: PdfColor.fromHex('#14B8A6'),
                      borderRadius: pw.BorderRadius.circular(6)),
                    child: pw.Text(co.companyName.toUpperCase(),
                        style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                  ),
                  pw.SizedBox(height: 10),
                  pw.Text(co.legalForm, style: pw.TextStyle(fontSize: 9, color: PdfColor.fromHex('#6B7280'))),
                  pw.SizedBox(height: 6),
                  pw.Text(co.address, style: const pw.TextStyle(fontSize: 9)),
                  pw.Text('${co.postalCode} ${co.city}', style: const pw.TextStyle(fontSize: 9)),
                  pw.SizedBox(height: 6),
                  pw.Text('Tel: ${co.phone}', style: const pw.TextStyle(fontSize: 9)),
                  pw.Text('Email: ${co.email}', style: const pw.TextStyle(fontSize: 9)),
                  if (co.website != null)
                    pw.Text(co.website!, style: pw.TextStyle(fontSize: 9, color: PdfColor.fromHex('#14B8A6'))),
                ],
              )),
              pw.SizedBox(width: 30),
              pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.end, children: [
                pw.Text('FACTURE', style: pw.TextStyle(fontSize: 30, fontWeight: pw.FontWeight.bold, color: PdfColor.fromHex('#1E293B'))),
                pw.SizedBox(height: 6),
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: pw.BoxDecoration(color: _pdfStatusColor(_inv!.status), borderRadius: pw.BorderRadius.circular(4)),
                  child: pw.Text(sLabel.toUpperCase(),
                      style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white)),
                ),
                pw.SizedBox(height: 12),
                pw.Text('N\u00B0 ${_inv!.invoiceNumber}', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold)),
                pw.SizedBox(height: 6),
                pw.Text('Date: ${DateFormat('dd/MM/yyyy').format(_inv!.invoiceDate)}', style: const pw.TextStyle(fontSize: 10)),
                if (_inv!.dueDate != null)
                  pw.Text('Echeance: ${DateFormat('dd/MM/yyyy').format(_inv!.dueDate!)}',
                      style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold, color: PdfColor.fromHex('#EF4444'))),
              ]),
            ],
          ),
          pw.SizedBox(height: 24),
          pw.Divider(thickness: 2, color: PdfColor.fromHex('#E5E7EB')),
          pw.SizedBox(height: 16),

          // ── Client ──
          pw.Container(
            padding: const pw.EdgeInsets.all(14),
            decoration: pw.BoxDecoration(
              color: PdfColor.fromHex('#F9FAFB'),
              border: pw.Border.all(color: PdfColor.fromHex('#E5E7EB')),
              borderRadius: pw.BorderRadius.circular(6)),
            child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
              pw.Text('FACTURE A', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColor.fromHex('#6B7280'))),
              pw.SizedBox(height: 6),
              pw.Text(client['name'] ?? 'Client', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
              if (client['address'] != null) ...[pw.SizedBox(height: 3), pw.Text(client['address'], style: const pw.TextStyle(fontSize: 9))],
              if (client['email'] != null) ...[pw.SizedBox(height: 3), pw.Text(client['email'], style: const pw.TextStyle(fontSize: 9))],
              if (client['phone'] != null) ...[pw.SizedBox(height: 3), pw.Text(client['phone'], style: const pw.TextStyle(fontSize: 9))],
              if (client['siret'] != null && (client['siret'] as String).isNotEmpty) ...[
                pw.SizedBox(height: 3),
                pw.Text('SIRET: ${client['siret']}', style: pw.TextStyle(fontSize: 8, color: PdfColor.fromHex('#6B7280'))),
              ],
            ]),
          ),
          pw.SizedBox(height: 24),

          // ── Table ──
          pw.Table(border: pw.TableBorder.all(color: PdfColor.fromHex('#E5E7EB')), children: [
            pw.TableRow(
              decoration: pw.BoxDecoration(color: PdfColor.fromHex('#14B8A6')),
              children: [
                _th('DESCRIPTION'), _th('QTE'), _th('PRIX UNIT.'), _th('TOTAL HT'),
              ],
            ),
            ..._inv!.items.map((i) => pw.TableRow(children: [
              _td(i.description, left: true), _td('${i.quantity}'),
              _td('${i.unitPrice.toStringAsFixed(2)} \u20AC'),
              _td('${i.total.toStringAsFixed(2)} \u20AC', bold: true),
            ])),
          ]),
          pw.SizedBox(height: 16),

          // ── Totals ──
          pw.Row(mainAxisAlignment: pw.MainAxisAlignment.end, children: [
            pw.Container(width: 260, padding: const pw.EdgeInsets.all(14),
              decoration: pw.BoxDecoration(
                border: pw.Border.all(color: PdfColor.fromHex('#E5E7EB')),
                borderRadius: pw.BorderRadius.circular(6)),
              child: pw.Column(children: [
                _pdfTotal('TOTAL HT', _inv!.subtotal),
                pw.SizedBox(height: 6),
                _pdfTotal('TVA (${_inv!.taxRate.toStringAsFixed(1)}%)', _inv!.taxAmount),
                pw.Divider(color: PdfColor.fromHex('#E5E7EB')),
                pw.SizedBox(height: 4),
                _pdfTotal('TOTAL TTC', _inv!.total, bold: true, size: 14),
              ]),
            ),
          ]),
          pw.SizedBox(height: 24),

          // ── Payment conditions ──
          pw.Container(
            padding: const pw.EdgeInsets.all(14),
            decoration: pw.BoxDecoration(
              color: PdfColor.fromHex('#FEF3C7'),
              border: pw.Border.all(color: PdfColor.fromHex('#F59E0B')),
              borderRadius: pw.BorderRadius.circular(6)),
            child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
              pw.Text('CONDITIONS DE REGLEMENT', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColor.fromHex('#92400E'))),
              pw.SizedBox(height: 6),
              pw.Text('Paiement a ${co.defaultPaymentDays} jours - Limite: ${DateFormat('dd/MM/yyyy').format(due)}',
                  style: pw.TextStyle(fontSize: 8, color: PdfColor.fromHex('#78350F'))),
              pw.SizedBox(height: 3),
              pw.Text('Penalites de retard: ${co.latePaymentPenaltyRate.toStringAsFixed(2)}% par an (art. L441-6)',
                  style: pw.TextStyle(fontSize: 7, color: PdfColor.fromHex('#78350F'))),
              pw.Text('Indemnite forfaitaire de recouvrement: ${co.recoveryFee.toStringAsFixed(2)} \u20AC (art. D441-5)',
                  style: pw.TextStyle(fontSize: 7, color: PdfColor.fromHex('#78350F'))),
            ]),
          ),

          if (co.bankName != null) ...[
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.all(14),
              decoration: pw.BoxDecoration(
                color: PdfColor.fromHex('#F0F9FF'),
                border: pw.Border.all(color: PdfColor.fromHex('#3B82F6')),
                borderRadius: pw.BorderRadius.circular(6)),
              child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                pw.Text('COORDONNEES BANCAIRES', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColor.fromHex('#1E40AF'))),
                pw.SizedBox(height: 6),
                pw.Text('Banque: ${co.bankName}', style: const pw.TextStyle(fontSize: 9)),
                if (co.bankIban != null) ...[pw.SizedBox(height: 3),
                  pw.Text('IBAN: ${co.bankIban}', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold))],
                if (co.bankBic != null) ...[pw.SizedBox(height: 3),
                  pw.Text('BIC: ${co.bankBic}', style: const pw.TextStyle(fontSize: 9))],
              ]),
            ),
          ],

          if (_inv!.notes != null && _inv!.notes!.isNotEmpty) ...[
            pw.SizedBox(height: 12),
            pw.Container(
              padding: const pw.EdgeInsets.all(10),
              decoration: pw.BoxDecoration(color: PdfColor.fromHex('#F9FAFB'), borderRadius: pw.BorderRadius.circular(6)),
              child: pw.Column(crossAxisAlignment: pw.CrossAxisAlignment.start, children: [
                pw.Text('NOTES', style: pw.TextStyle(fontSize: 8, fontWeight: pw.FontWeight.bold, color: PdfColor.fromHex('#6B7280'))),
                pw.SizedBox(height: 4),
                pw.Text(_inv!.notes!, style: const pw.TextStyle(fontSize: 8)),
              ]),
            ),
          ],

          pw.Spacer(),
          pw.Divider(color: PdfColor.fromHex('#E5E7EB')),
          pw.SizedBox(height: 6),
          pw.Container(
            padding: const pw.EdgeInsets.all(10),
            color: PdfColor.fromHex('#F9FAFB'),
            child: pw.Column(children: [
              pw.Text(co.legalMentions, textAlign: pw.TextAlign.center,
                  style: pw.TextStyle(fontSize: 7, color: PdfColor.fromHex('#6B7280'))),
              if (co.capital != null) ...[pw.SizedBox(height: 3),
                pw.Text('Capital social: ${co.capital}', textAlign: pw.TextAlign.center,
                    style: pw.TextStyle(fontSize: 7, color: PdfColor.fromHex('#9CA3AF')))],
            ]),
          ),
          pw.SizedBox(height: 6),
          pw.Center(child: pw.Text('Document genere le ${DateFormat('dd/MM/yyyy a HH:mm').format(DateTime.now())}',
              style: pw.TextStyle(fontSize: 7, color: PdfColor.fromHex('#9CA3AF')))),
        ],
      ),
    ));
    return pdf;
  }

  pw.Widget _th(String t) => pw.Padding(padding: const pw.EdgeInsets.all(7),
      child: pw.Text(t, style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.white), textAlign: pw.TextAlign.center));

  pw.Widget _td(String t, {bool bold = false, bool left = false}) => pw.Padding(padding: const pw.EdgeInsets.all(7),
      child: pw.Text(t, style: pw.TextStyle(fontSize: 9, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal),
          textAlign: left ? pw.TextAlign.left : pw.TextAlign.center));

  pw.Widget _pdfTotal(String l, double v, {bool bold = false, double size = 10}) =>
      pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
        pw.Text(l, style: pw.TextStyle(fontSize: size, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
        pw.Text('${v.toStringAsFixed(2)} \u20AC',
            style: pw.TextStyle(fontSize: size, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
                color: bold ? PdfColor.fromHex('#14B8A6') : null)),
      ]);

  PdfColor _pdfStatusColor(String s) {
    switch (s) {
      case 'paid': return PdfColor.fromHex('#10B981');
      case 'pending': return PdfColor.fromHex('#F59E0B');
      case 'overdue': return PdfColor.fromHex('#EF4444');
      case 'cancelled': return PdfColor.fromHex('#6B7280');
      default: return PdfColor.fromHex('#9CA3AF');
    }
  }
}

// ── Payment method bottom sheet ────────────────────────────────
class _PaymentSheet extends StatelessWidget {
  const _PaymentSheet();

  static const _m = [
    ('Virement bancaire', Icons.account_balance_rounded,  'virement'),
    ('Carte bancaire',    Icons.credit_card_rounded,       'carte'),
    ('Cheque',            Icons.receipt_rounded,            'cheque'),
    ('Especes',           Icons.payments_rounded,           'especes'),
    ('Autre',             Icons.more_horiz_rounded,         'autre'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 12),
        Container(width: 40, height: 4,
          decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 20),
        const Text('Moyen de paiement', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        ..._m.map((m) => ListTile(
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryBlue.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(12)),
            child: Icon(m.$2, color: PremiumTheme.primaryBlue, size: 22)),
          title: Text(m.$1, style: const TextStyle(fontWeight: FontWeight.w600)),
          trailing: const Icon(Icons.chevron_right_rounded, color: PremiumTheme.textTertiary),
          onTap: () => Navigator.pop(context, m.$3),
        )),
        SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
      ]),
    );
  }
}
