import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
  //  PDF GENERATION — Facture professionnelle française
  // ══════════════════════════════════════════════════════════════

  // ── Color palette ──
  static const _navy = PdfColor(0.11, 0.13, 0.18);         // #1B2130
  static const _darkSlate = PdfColor(0.20, 0.24, 0.32);    // #333D52
  static const _accent = PdfColor(0.08, 0.52, 0.65);       // #1485A6
  static const _accentLight = PdfColor(0.91, 0.97, 0.99);  // #E8F8FC
  static const _lightGray = PdfColor(0.96, 0.96, 0.97);    // #F5F5F8
  static const _medGray = PdfColor(0.80, 0.82, 0.84);      // #CCD1D7
  static const _textMuted = PdfColor(0.45, 0.49, 0.55);    // #737D8C
  static const _rowAlt = PdfColor(0.98, 0.98, 0.99);       // #FAFAFC

  Future<pw.Document> _genPdf() async {
    final pdf = pw.Document(
      title: 'Facture ${_inv!.invoiceNumber}',
      author: 'ChecksFleet',
    );

    // Load TTF fonts from Google Fonts for full Unicode support (€, accents, etc.)
    pw.Font fontRegular;
    pw.Font fontBold;
    try {
      fontRegular = await PdfGoogleFonts.robotoRegular();
      fontBold = await PdfGoogleFonts.robotoBold();
    } catch (_) {
      // Fallback to built-in Helvetica if offline
      fontRegular = pw.Font.helvetica();
      fontBold = pw.Font.helveticaBold();
    }

    // Load user's company info from profile
    CompanyInfo co;
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId != null) {
        final profile = await Supabase.instance.client
            .from('profiles')
            .select('company_name, company_address, company_siret, email, phone, full_name')
            .eq('id', userId)
            .maybeSingle();
        if (profile != null &&
            profile['company_name'] != null &&
            (profile['company_name'] as String).isNotEmpty) {
          co = CompanyInfo(
            companyName: profile['company_name'] ?? '',
            address: profile['company_address'] ?? '',
            postalCode: '',
            city: '',
            siret: profile['company_siret'] ?? '',
            email: profile['email'] ?? '',
            phone: profile['phone'] ?? '',
          );
        } else {
          co = CompanyInfo.defaultChecksFleet();
        }
      } else {
        co = CompanyInfo.defaultChecksFleet();
      }
    } catch (_) {
      co = CompanyInfo.defaultChecksFleet();
    }

    final due = _inv!.dueDate ??
        _inv!.invoiceDate.add(Duration(days: co.defaultPaymentDays));
    final client = _inv!.clientInfo ?? {};
    final (sLabel, _, _) = _si(_inv!.status);

    final boldStyle = pw.TextStyle(font: fontBold, fontSize: 10);
    final regularStyle = pw.TextStyle(font: fontRegular, fontSize: 10);
    final smallStyle = pw.TextStyle(font: fontRegular, fontSize: 8.5, color: _textMuted);
    final smallBold = pw.TextStyle(font: fontBold, fontSize: 8.5, color: _textMuted);

    pdf.addPage(pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.symmetric(horizontal: 40, vertical: 30),
      footer: (ctx) => _buildFooter(ctx, co, fontRegular),
      build: (ctx) => [
        // ════════════════════════════════════════════════════════
        //  TOP BAND — Company logo area + FACTURE title
        // ════════════════════════════════════════════════════════
        pw.Container(
          padding: const pw.EdgeInsets.all(20),
          decoration: pw.BoxDecoration(
            color: _navy,
            borderRadius: pw.BorderRadius.circular(8),
          ),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Company name block
              pw.Expanded(
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      co.companyName.toUpperCase(),
                      style: pw.TextStyle(
                        font: fontBold,
                        fontSize: 24,
                        color: PdfColors.white,
                        letterSpacing: 2,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      co.legalForm,
                      style: pw.TextStyle(
                        font: fontRegular,
                        fontSize: 10,
                        color: PdfColor(0.65, 0.70, 0.78),
                      ),
                    ),
                  ],
                ),
              ),
              // FACTURE label
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.end,
                children: [
                  pw.Text(
                    'FACTURE',
                    style: pw.TextStyle(
                      font: fontBold,
                      fontSize: 28,
                      color: PdfColors.white,
                      letterSpacing: 3,
                    ),
                  ),
                  pw.SizedBox(height: 6),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    decoration: pw.BoxDecoration(
                      color: _pdfStatusColor(_inv!.status),
                      borderRadius: pw.BorderRadius.circular(4),
                    ),
                    child: pw.Text(
                      sLabel.toUpperCase(),
                      style: pw.TextStyle(
                        font: fontBold,
                        fontSize: 8,
                        color: PdfColors.white,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        pw.SizedBox(height: 20),

        // ════════════════════════════════════════════════════════
        //  INVOICE META — Number, Date, Due date
        // ════════════════════════════════════════════════════════
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            // Emetteur
            pw.Expanded(
              child: pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  color: _lightGray,
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('EMETTEUR',
                        style: pw.TextStyle(
                            font: fontBold,
                            fontSize: 8,
                            color: _accent,
                            letterSpacing: 1.5)),
                    pw.SizedBox(height: 8),
                    pw.Text(co.companyName,
                        style: pw.TextStyle(
                            font: fontBold, fontSize: 11, color: _navy)),
                    pw.SizedBox(height: 4),
                    if (co.address.isNotEmpty)
                      pw.Text(co.address, style: regularStyle.copyWith(fontSize: 9)),
                    if (co.postalCode.isNotEmpty || co.city.isNotEmpty)
                      pw.Text('${co.postalCode} ${co.city}',
                          style: regularStyle.copyWith(fontSize: 9)),
                    pw.SizedBox(height: 6),
                    if (co.phone.isNotEmpty)
                      pw.Text('Tel : ${co.phone}', style: smallStyle),
                    if (co.email.isNotEmpty)
                      pw.Text(co.email, style: smallStyle),
                    if (co.siret.isNotEmpty) ...[
                      pw.SizedBox(height: 4),
                      pw.Text('SIRET : ${co.siret}', style: smallStyle),
                    ],
                    if (co.tvaNumber != null) ...[
                      pw.Text('TVA : ${co.tvaNumber}', style: smallStyle),
                    ],
                  ],
                ),
              ),
            ),
            pw.SizedBox(width: 16),
            // Destinataire
            pw.Expanded(
              child: pw.Container(
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: _medGray, width: 0.8),
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('DESTINATAIRE',
                        style: pw.TextStyle(
                            font: fontBold,
                            fontSize: 8,
                            color: _accent,
                            letterSpacing: 1.5)),
                    pw.SizedBox(height: 8),
                    pw.Text(client['name'] ?? 'Client',
                        style: pw.TextStyle(
                            font: fontBold, fontSize: 11, color: _navy)),
                    pw.SizedBox(height: 4),
                    if (client['address'] != null)
                      pw.Text(client['address'] as String,
                          style: regularStyle.copyWith(fontSize: 9)),
                    pw.SizedBox(height: 6),
                    if (client['phone'] != null)
                      pw.Text('Tel : ${client['phone']}', style: smallStyle),
                    if (client['email'] != null)
                      pw.Text(client['email'] as String, style: smallStyle),
                    if (client['siret'] != null &&
                        (client['siret'] as String).isNotEmpty) ...[
                      pw.SizedBox(height: 4),
                      pw.Text('SIRET : ${client['siret']}', style: smallStyle),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 16),

        // ── Invoice reference strip ──
        pw.Container(
          padding: const pw.EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: pw.BoxDecoration(
            color: _accentLight,
            borderRadius: pw.BorderRadius.circular(6),
          ),
          child: pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.RichText(
                text: pw.TextSpan(children: [
                  pw.TextSpan(
                      text: 'Facture N\u00B0 ',
                      style: smallStyle.copyWith(color: _darkSlate)),
                  pw.TextSpan(
                      text: _inv!.invoiceNumber,
                      style: pw.TextStyle(
                          font: fontBold, fontSize: 11, color: _navy)),
                ]),
              ),
              pw.RichText(
                text: pw.TextSpan(children: [
                  pw.TextSpan(
                      text: 'Date : ',
                      style: smallStyle.copyWith(color: _darkSlate)),
                  pw.TextSpan(
                      text: DateFormat('dd/MM/yyyy').format(_inv!.invoiceDate),
                      style: pw.TextStyle(
                          font: fontBold, fontSize: 9, color: _navy)),
                ]),
              ),
              pw.RichText(
                text: pw.TextSpan(children: [
                  pw.TextSpan(
                      text: 'Echeance : ',
                      style: smallStyle.copyWith(color: _darkSlate)),
                  pw.TextSpan(
                      text: DateFormat('dd/MM/yyyy').format(due),
                      style: pw.TextStyle(
                          font: fontBold,
                          fontSize: 9,
                          color: PdfColor.fromHex('#C0392B'))),
                ]),
              ),
            ],
          ),
        ),
        pw.SizedBox(height: 24),

        // ════════════════════════════════════════════════════════
        //  ITEMS TABLE
        // ════════════════════════════════════════════════════════
        _buildItemsTable(fontBold, fontRegular),
        pw.SizedBox(height: 6),

        // ════════════════════════════════════════════════════════
        //  TOTALS — right-aligned summary
        // ════════════════════════════════════════════════════════
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            // Notes on the left
            pw.Expanded(
              child: (_inv!.notes != null && _inv!.notes!.isNotEmpty)
                  ? pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: _lightGray,
                        borderRadius: pw.BorderRadius.circular(6),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('NOTES',
                              style: pw.TextStyle(
                                  font: fontBold,
                                  fontSize: 8,
                                  color: _textMuted,
                                  letterSpacing: 1)),
                          pw.SizedBox(height: 6),
                          pw.Text(_inv!.notes!,
                              style: pw.TextStyle(
                                  font: fontRegular,
                                  fontSize: 8.5,
                                  color: _darkSlate,
                                  lineSpacing: 3)),
                        ],
                      ),
                    )
                  : pw.SizedBox(),
            ),
            pw.SizedBox(width: 20),
            // Totals on the right
            pw.Container(
              width: 220,
              child: pw.Column(
                children: [
                  _totalRow('Sous-total HT', _inv!.subtotal, fontRegular),
                  pw.SizedBox(height: 4),
                  _totalRow(
                      'TVA (${_inv!.taxRate.toStringAsFixed(1)} %)',
                      _inv!.taxAmount,
                      fontRegular),
                  pw.SizedBox(height: 6),
                  pw.Container(
                    padding: const pw.EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    decoration: pw.BoxDecoration(
                      color: _navy,
                      borderRadius: pw.BorderRadius.circular(6),
                    ),
                    child: pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('TOTAL TTC',
                            style: pw.TextStyle(
                                font: fontBold,
                                fontSize: 12,
                                color: PdfColors.white,
                                letterSpacing: 1)),
                        pw.Text(
                            '${_inv!.total.toStringAsFixed(2)} \u20AC',
                            style: pw.TextStyle(
                                font: fontBold,
                                fontSize: 14,
                                color: PdfColors.white)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        pw.SizedBox(height: 24),

        // ════════════════════════════════════════════════════════
        //  PAYMENT CONDITIONS + BANK INFO
        // ════════════════════════════════════════════════════════
        pw.Row(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            // Conditions de règlement
            pw.Expanded(
              child: pw.Container(
                padding: const pw.EdgeInsets.all(14),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: _medGray, width: 0.5),
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('CONDITIONS DE REGLEMENT',
                        style: pw.TextStyle(
                            font: fontBold,
                            fontSize: 8,
                            color: _accent,
                            letterSpacing: 1)),
                    pw.SizedBox(height: 8),
                    pw.Text(
                        'Paiement a ${co.defaultPaymentDays} jours',
                        style: pw.TextStyle(
                            font: fontRegular,
                            fontSize: 8.5,
                            color: _darkSlate)),
                    pw.SizedBox(height: 3),
                    pw.Text(
                        'Date limite : ${DateFormat('dd/MM/yyyy').format(due)}',
                        style: pw.TextStyle(
                            font: fontBold,
                            fontSize: 8.5,
                            color: _darkSlate)),
                    pw.SizedBox(height: 6),
                    pw.Text(
                        'Penalites de retard : ${co.latePaymentPenaltyRate.toStringAsFixed(2)} % par an (art. L441-6 C. com.)',
                        style: pw.TextStyle(
                            font: fontRegular,
                            fontSize: 7,
                            color: _textMuted)),
                    pw.Text(
                        'Indemnite forfaitaire de recouvrement : ${co.recoveryFee.toStringAsFixed(2)} \u20AC (art. D441-5 C. com.)',
                        style: pw.TextStyle(
                            font: fontRegular,
                            fontSize: 7,
                            color: _textMuted)),
                  ],
                ),
              ),
            ),
            if (co.bankName != null) ...[
              pw.SizedBox(width: 16),
              // Coordonnées bancaires
              pw.Expanded(
                child: pw.Container(
                  padding: const pw.EdgeInsets.all(14),
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: _medGray, width: 0.5),
                    borderRadius: pw.BorderRadius.circular(6),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('COORDONNEES BANCAIRES',
                          style: pw.TextStyle(
                              font: fontBold,
                              fontSize: 8,
                              color: _accent,
                              letterSpacing: 1)),
                      pw.SizedBox(height: 8),
                      pw.Text('Banque : ${co.bankName}',
                          style: pw.TextStyle(
                              font: fontRegular,
                              fontSize: 8.5,
                              color: _darkSlate)),
                      if (co.bankIban != null) ...[
                        pw.SizedBox(height: 3),
                        pw.Text('IBAN : ${co.bankIban}',
                            style: pw.TextStyle(
                                font: fontBold,
                                fontSize: 9,
                                color: _navy)),
                      ],
                      if (co.bankBic != null) ...[
                        pw.SizedBox(height: 3),
                        pw.Text('BIC : ${co.bankBic}',
                            style: pw.TextStyle(
                                font: fontRegular,
                                fontSize: 8.5,
                                color: _darkSlate)),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    ));
    return pdf;
  }

  // ── Items table ──
  pw.Widget _buildItemsTable(pw.Font fontBold, pw.Font fontRegular) {
    return pw.Table(
      columnWidths: {
        0: const pw.FlexColumnWidth(5),
        1: const pw.FlexColumnWidth(1.2),
        2: const pw.FlexColumnWidth(2),
        3: const pw.FlexColumnWidth(2),
      },
      children: [
        // Header row
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: _navy),
          children: [
            _tableHeader('DESIGNATION', fontBold, left: true),
            _tableHeader('QTE', fontBold),
            _tableHeader('P.U. HT', fontBold),
            _tableHeader('TOTAL HT', fontBold),
          ],
        ),
        // Data rows
        ..._inv!.items.asMap().entries.map((entry) {
          final idx = entry.key;
          final item = entry.value;
          final bg = idx.isEven ? PdfColors.white : _rowAlt;
          return pw.TableRow(
            decoration: pw.BoxDecoration(color: bg),
            children: [
              _tableCell(item.description, fontRegular, left: true),
              _tableCell('${item.quantity}', fontRegular),
              _tableCell(
                  '${item.unitPrice.toStringAsFixed(2)} \u20AC', fontRegular),
              _tableCell(
                  '${item.total.toStringAsFixed(2)} \u20AC', fontBold),
            ],
          );
        }),
      ],
    );
  }

  pw.Widget _tableHeader(String text, pw.Font font, {bool left = false}) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          font: font,
          fontSize: 8,
          color: PdfColors.white,
          letterSpacing: 0.5,
        ),
        textAlign: left ? pw.TextAlign.left : pw.TextAlign.right,
      ),
    );
  }

  pw.Widget _tableCell(String text, pw.Font font, {bool left = false}) {
    return pw.Container(
      padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: pw.Text(
        text,
        style: pw.TextStyle(font: font, fontSize: 9, color: _darkSlate),
        textAlign: left ? pw.TextAlign.left : pw.TextAlign.right,
      ),
    );
  }

  pw.Widget _totalRow(String label, double value, pw.Font font) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 3),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
        children: [
          pw.Text(label,
              style: pw.TextStyle(font: font, fontSize: 9, color: _textMuted)),
          pw.Text('${value.toStringAsFixed(2)} \u20AC',
              style: pw.TextStyle(font: font, fontSize: 9.5, color: _navy)),
        ],
      ),
    );
  }

  // ── Footer (appears on every page) ──
  pw.Widget _buildFooter(pw.Context ctx, CompanyInfo co, pw.Font font) {
    return pw.Column(
      children: [
        pw.Divider(color: _medGray, thickness: 0.5),
        pw.SizedBox(height: 6),
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text(
              co.legalMentions,
              style: pw.TextStyle(font: font, fontSize: 6.5, color: _textMuted),
            ),
            pw.Text(
              'Page ${ctx.pageNumber} / ${ctx.pagesCount}',
              style: pw.TextStyle(font: font, fontSize: 7, color: _textMuted),
            ),
          ],
        ),
        if (co.isMicroEntrepreneur)
          pw.Padding(
            padding: const pw.EdgeInsets.only(top: 2),
            child: pw.Text(
              'TVA non applicable - Art. 293 B du CGI',
              style: pw.TextStyle(font: font, fontSize: 6.5, color: _textMuted),
            ),
          ),
      ],
    );
  }

  PdfColor _pdfStatusColor(String s) {
    switch (s) {
      case 'paid':
        return PdfColor.fromHex('#27AE60');
      case 'pending':
        return PdfColor.fromHex('#E67E22');
      case 'overdue':
        return PdfColor.fromHex('#C0392B');
      case 'cancelled':
        return PdfColor.fromHex('#7F8C8D');
      default:
        return PdfColor.fromHex('#95A5A6');
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
