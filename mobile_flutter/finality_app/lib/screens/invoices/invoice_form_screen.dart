import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';
import '../../utils/error_helper.dart';
import '../../models/invoice.dart';
import '../../models/client.dart';
import '../../models/mission.dart';
import '../../services/invoice_service.dart';
import '../../services/insee_service.dart';
import '../../widgets/siret_autocomplete_field.dart';
import '../../widgets/client_selector.dart';
import '../../theme/premium_theme.dart';

class InvoiceFormScreen extends StatefulWidget {
  final Invoice? invoice;
  final Mission? mission;
  const InvoiceFormScreen({super.key, this.invoice, this.mission});

  @override
  State<InvoiceFormScreen> createState() => _InvoiceFormScreenState();
}

class _InvoiceFormScreenState extends State<InvoiceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final InvoiceService _invoiceService = InvoiceService();
  final InseeService _inseeService = InseeService();

  // Controllers
  final _clientName = TextEditingController();
  final _clientEmail = TextEditingController();
  final _clientPhone = TextEditingController();
  final _clientAddress = TextEditingController();
  final _clientSiret = TextEditingController();
  final _clientVat = TextEditingController();
  final _notes = TextEditingController();
  final _paymentTerms = TextEditingController();

  // State
  InseeCompanyInfo? _selectedCompany;
  Client? _selectedClient;
  bool _useExisting = true;
  DateTime _invoiceDate = DateTime.now();
  DateTime? _dueDate;
  double _taxRate = 20.0;
  List<_ItemForm> _items = [];
  bool _saving = false;
  bool _siretLoading = false;
  String? _siretError;
  Timer? _siretDebounce;
  AutovalidateMode _autovalidate = AutovalidateMode.disabled;

  bool get _isEdit => widget.invoice?.id != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      _loadExisting();
    } else {
      _dueDate = DateTime.now().add(const Duration(days: 30));
      _paymentTerms.text = 'Paiement a 30 jours';
      if (widget.mission != null) {
        _prefillFromMission(widget.mission!);
      } else {
        _items.add(_ItemForm());
      }
    }
    _clientSiret.addListener(_onSiretChanged);
  }

  void _prefillFromMission(Mission m) {
    final dateFormat = DateFormat('dd/MM/yyyy');
    final vehicleName = [m.vehicleBrand, m.vehicleModel]
        .where((s) => s != null && s.isNotEmpty)
        .join(' ');
    final plate = m.vehiclePlate ?? '';

    final parts = <String>[];
    parts.add('Convoyage: ${vehicleName.isEmpty ? "Vehicule" : vehicleName}${plate.isNotEmpty ? " - $plate" : ""}');
    if (m.pickupAddress != null && m.pickupAddress!.isNotEmpty) {
      parts.add('Enlevement: ${m.pickupAddress}${m.pickupDate != null ? " le ${dateFormat.format(m.pickupDate!)}" : ""}');
    }
    if (m.deliveryAddress != null && m.deliveryAddress!.isNotEmpty) {
      parts.add('Livraison: ${m.deliveryAddress}${m.deliveryDate != null ? " le ${dateFormat.format(m.deliveryDate!)}" : ""}');
    }
    _items.add(_ItemForm(desc: parts.join('\n'), qty: 1, price: 0));
    _useExisting = true;
  }

  void _loadExisting() {
    final ci = widget.invoice!.clientInfo ?? {};
    _clientName.text = ci['name'] ?? '';
    _clientEmail.text = ci['email'] ?? '';
    _clientPhone.text = ci['phone'] ?? '';
    _clientAddress.text = ci['address'] ?? '';
    _clientSiret.text = ci['siret'] ?? '';
    _clientVat.text = ci['vat_number'] ?? '';
    _notes.text = widget.invoice!.notes ?? '';
    _paymentTerms.text = ci['payment_terms'] ?? 'Paiement a 30 jours';
    _invoiceDate = widget.invoice!.invoiceDate;
    _dueDate = widget.invoice!.dueDate;
    _taxRate = widget.invoice!.taxRate;
    _items = widget.invoice!.items
        .map((i) => _ItemForm(desc: i.description, qty: i.quantity.toDouble(), price: i.unitPrice))
        .toList();
  }

  void _onSiretChanged() {
    _siretDebounce?.cancel();
    if (_clientSiret.text.isEmpty) {
      setState(() { _siretError = null; _selectedCompany = null; });
      return;
    }
    _siretDebounce = Timer(const Duration(milliseconds: 800), () => _lookupSiret(_clientSiret.text));
  }

  Future<void> _lookupSiret(String siret) async {
    if (siret.length < 14) {
      setState(() { _siretError = 'SIRET = 14 chiffres'; _siretLoading = false; });
      return;
    }
    setState(() { _siretLoading = true; _siretError = null; });
    try {
      final co = await _inseeService.getCompanyBySiret(siret);
      if (!mounted) return;
      if (co != null) {
        setState(() {
          _selectedCompany = co;
          _clientName.text = co.companyName ?? '';
          _clientAddress.text = co.fullAddress;
          _clientVat.text = co.vatNumber ?? '';
          _siretLoading = false;
        });
        _snack('Entreprise trouvee : ${co.companyName}', PremiumTheme.accentGreen);
      } else {
        setState(() { _siretError = 'Aucune entreprise trouvee'; _siretLoading = false; });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() { _siretError = 'Erreur de recherche'; _siretLoading = false; });
    }
  }

  @override
  void dispose() {
    _siretDebounce?.cancel();
    _clientName.dispose(); _clientEmail.dispose(); _clientPhone.dispose();
    _clientAddress.dispose(); _clientSiret.dispose(); _clientVat.dispose();
    _notes.dispose(); _paymentTerms.dispose();
    super.dispose();
  }

  void _addItem() => setState(() => _items.add(_ItemForm()));

  void _removeItem(int i) {
    if (_items.length <= 1) { _snack('Au moins un article requis', PremiumTheme.accentAmber); return; }
    setState(() => _items.removeAt(i));
  }

  double get _subtotal => _items.fold(0, (s, i) => s + i.qty * i.price);
  double get _tax => _subtotal * (_taxRate / 100);
  double get _total => _subtotal + _tax;

  void _snack(String msg, Color bg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: bg, behavior: SnackBarBehavior.floating));
  }

  // ── Save ─────────────────────────────────────────────────────
  Future<void> _save() async {
    setState(() => _autovalidate = AutovalidateMode.always);
    if (!_formKey.currentState!.validate()) {
      _snack('Corrigez les erreurs', PremiumTheme.accentRed);
      return;
    }
    if (_items.isEmpty || _items.any((i) => i.desc.trim().isEmpty)) {
      _snack('Ajoutez au moins un article valide', PremiumTheme.accentRed);
      return;
    }
    if (!_useExisting && _clientName.text.trim().isEmpty) {
      _snack('Nom du client requis', PremiumTheme.accentRed);
      return;
    }

    setState(() => _saving = true);
    try {
      final uid = Supabase.instance.client.auth.currentUser?.id;
      if (uid == null) throw Exception('Non connecte');

      final invoice = Invoice(
        id: widget.invoice?.id,
        invoiceNumber: widget.invoice?.invoiceNumber ?? await _invoiceService.generateInvoiceNumber(),
        userId: uid,
        missionId: widget.invoice?.missionId ?? widget.mission?.id,
        invoiceDate: _invoiceDate,
        dueDate: _dueDate,
        items: _items.map((i) => InvoiceItem(
          description: i.desc.trim(), quantity: i.qty.toInt(),
          unitPrice: i.price, total: i.qty * i.price)).toList(),
        subtotal: _subtotal,
        taxRate: _taxRate,
        taxAmount: _tax,
        total: _total,
        status: widget.invoice?.status ?? 'draft',
        notes: _notes.text.trim(),
        clientInfo: {
          'name': _clientName.text.trim(),
          'email': _clientEmail.text.trim(),
          'phone': _clientPhone.text.trim(),
          'address': _clientAddress.text.trim(),
          'siret': _clientSiret.text.trim(),
          'vat_number': _clientVat.text.trim(),
          'payment_terms': _paymentTerms.text.trim(),
          if (_selectedCompany != null) ...{
            'company_name': _selectedCompany!.companyName,
            'legal_form': _selectedCompany!.legalForm,
            'activity_code': _selectedCompany!.activityCode,
            'activity_label': _selectedCompany!.activityLabel,
          },
        },
      );

      if (_isEdit) {
        await _invoiceService.updateInvoice(widget.invoice!.id!, invoice);
      } else {
        await _invoiceService.createInvoice(invoice);
      }

      if (!mounted) return;
      _snack(_isEdit ? 'Facture mise a jour' : 'Facture creee', PremiumTheme.accentGreen);
      await Future.delayed(const Duration(milliseconds: 400));
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      _snack('Erreur : ${ErrorHelper.cleanError(e)}', PremiumTheme.accentRed);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  BUILD
  // ══════════════════════════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: SafeArea(
        child: Column(children: [
          _header(),
          Expanded(
            child: Form(
              key: _formKey,
              autovalidateMode: _autovalidate,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
                children: [
                  _sectionClient(),
                  const SizedBox(height: 16),
                  _sectionDates(),
                  const SizedBox(height: 16),
                  _sectionItems(),
                  const SizedBox(height: 16),
                  _sectionTotals(),
                  const SizedBox(height: 16),
                  _sectionNotes(),
                ],
              ),
            ),
          ),
        ]),
      ),
      bottomSheet: _saveBar(),
    );
  }

  // ── Header ───────────────────────────────────────────────────
  Widget _header() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .04), blurRadius: 8)],
      ),
      child: Row(children: [
        IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_isEdit ? 'Modifier la facture' : 'Nouvelle facture',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary)),
            if (widget.invoice?.invoiceNumber != null)
              Text('N\u00B0 ${widget.invoice!.invoiceNumber}',
                  style: const TextStyle(fontSize: 13, color: PremiumTheme.textSecondary)),
          ]),
        ),
        if (_saving)
          const SizedBox(width: 24, height: 24,
            child: CircularProgressIndicator(strokeWidth: 2, color: PremiumTheme.primaryBlue)),
      ]),
    );
  }

  // ── Save bar ─────────────────────────────────────────────────
  Widget _saveBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).padding.bottom + 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .06), blurRadius: 12, offset: const Offset(0, -2))],
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton.icon(
          onPressed: _saving ? null : _save,
          icon: _saving
              ? const SizedBox(width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.check_rounded, color: Colors.white),
          label: Text(_saving ? 'Enregistrement...' : (_isEdit ? 'Enregistrer' : 'Creer la facture'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
          style: ElevatedButton.styleFrom(
            backgroundColor: PremiumTheme.primaryBlue,
            disabledBackgroundColor: PremiumTheme.primaryBlue.withValues(alpha: .5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 0,
          ),
        ),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  SECTIONS
  // ══════════════════════════════════════════════════════════════

  // ── Client ───────────────────────────────────────────────────
  Widget _sectionClient() {
    return _card(
      icon: Icons.person_rounded,
      color: PremiumTheme.primaryPurple,
      title: 'Client',
      children: [
        // Toggle
        Container(
          decoration: BoxDecoration(
            color: PremiumTheme.lightBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(children: [
            _toggle('Client existant', Icons.person_search_rounded, _useExisting,
                () => setState(() => _useExisting = true)),
            _toggle('Saisie manuelle', Icons.edit_rounded, !_useExisting,
                () => setState(() => _useExisting = false)),
          ]),
        ),
        const SizedBox(height: 16),

        if (_useExisting) ...[
          ClientSelector(
            selectedClient: _selectedClient,
            onClientSelected: (c) {
              setState(() {
                _selectedClient = c;
                _clientName.text = c.displayName;
                _clientEmail.text = c.email;
                _clientPhone.text = c.phone ?? '';
                _clientAddress.text = c.fullAddress;
                _clientSiret.text = c.siret ?? '';
                _clientVat.text = c.tvaNumber ?? '';
              });
            },
          ),
          if (_selectedClient != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: PremiumTheme.accentGreen.withValues(alpha: .06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: PremiumTheme.accentGreen.withValues(alpha: .2)),
              ),
              child: Row(children: [
                Icon(Icons.check_circle_rounded, color: PremiumTheme.accentGreen, size: 20),
                const SizedBox(width: 10),
                Expanded(child: Text(_selectedClient!.displayName,
                    style: const TextStyle(fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary))),
              ]),
            ),
          ],
        ] else ...[
          _field(_clientSiret, 'SIRET (optionnel)', Icons.business_rounded,
            keyboard: TextInputType.number,
            formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(14)],
            suffix: _siretLoading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : _selectedCompany != null
                    ? const Icon(Icons.check_circle, color: PremiumTheme.accentGreen, size: 20)
                    : null,
            error: _siretError),
          const SizedBox(height: 12),
          _field(_clientName, 'Nom / Raison sociale *', Icons.person_rounded,
            validator: (v) => !_useExisting && (v == null || v.trim().isEmpty) ? 'Requis' : null),
          const SizedBox(height: 12),
          _field(_clientEmail, 'Email', Icons.email_rounded, keyboard: TextInputType.emailAddress),
          const SizedBox(height: 12),
          _field(_clientPhone, 'Telephone', Icons.phone_rounded, keyboard: TextInputType.phone),
          const SizedBox(height: 12),
          _field(_clientAddress, 'Adresse', Icons.location_on_rounded, lines: 2),
          if (_clientVat.text.isNotEmpty) ...[
            const SizedBox(height: 12),
            _field(_clientVat, 'TVA Intracom.', Icons.receipt_long_rounded, enabled: false),
          ],
        ],
      ],
    );
  }

  Widget _toggle(String label, IconData icon, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? PremiumTheme.primaryBlue : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(icon, size: 16, color: active ? Colors.white : PremiumTheme.textTertiary),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                color: active ? Colors.white : PremiumTheme.textSecondary)),
          ]),
        ),
      ),
    );
  }

  // ── Dates ────────────────────────────────────────────────────
  Widget _sectionDates() {
    return _card(
      icon: Icons.calendar_month_rounded,
      color: PremiumTheme.accentAmber,
      title: 'Dates & Conditions',
      children: [
        _dateTile('Date de facturation', _invoiceDate, Icons.calendar_today_rounded, () async {
          final d = await _pickDate(_invoiceDate);
          if (d != null) setState(() => _invoiceDate = d);
        }),
        const SizedBox(height: 10),
        _dateTile('Date d\'echeance', _dueDate, Icons.event_rounded, () async {
          final d = await _pickDate(_dueDate ?? _invoiceDate.add(const Duration(days: 30)), first: _invoiceDate);
          if (d != null) setState(() => _dueDate = d);
        }),
        const SizedBox(height: 10),
        _taxTile(),
        const SizedBox(height: 10),
        _field(_paymentTerms, 'Conditions de paiement', Icons.payment_rounded),
      ],
    );
  }

  Future<DateTime?> _pickDate(DateTime init, {DateTime? first}) {
    return showDatePicker(
      context: context, initialDate: init,
      firstDate: first ?? DateTime(2020), lastDate: DateTime(2035),
      builder: (ctx, child) => Theme(
        data: Theme.of(ctx).copyWith(colorScheme: const ColorScheme.light(primary: PremiumTheme.primaryBlue)),
        child: child!),
    );
  }

  Widget _dateTile(String label, DateTime? date, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: PremiumTheme.lightBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(children: [
          Icon(icon, color: PremiumTheme.accentAmber, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 12, color: PremiumTheme.textTertiary)),
            const SizedBox(height: 2),
            Text(date != null ? DateFormat('dd/MM/yyyy').format(date) : 'Non definie',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
          ])),
          const Icon(Icons.chevron_right_rounded, color: PremiumTheme.textTertiary),
        ]),
      ),
    );
  }

  Widget _taxTile() {
    return InkWell(
      onTap: () async {
        final r = await showDialog<double>(context: context,
          builder: (_) => _TaxDialog(rate: _taxRate));
        if (r != null) setState(() => _taxRate = r);
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: PremiumTheme.lightBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: Row(children: [
          const Icon(Icons.percent_rounded, color: PremiumTheme.primaryBlue, size: 20),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Taux de TVA', style: TextStyle(fontSize: 12, color: PremiumTheme.textTertiary)),
            const SizedBox(height: 2),
            Text('${_taxRate.toStringAsFixed(1)} %',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: PremiumTheme.textPrimary)),
          ])),
          const Icon(Icons.chevron_right_rounded, color: PremiumTheme.textTertiary),
        ]),
      ),
    );
  }

  // ── Items ────────────────────────────────────────────────────
  Widget _sectionItems() {
    return _card(
      icon: Icons.shopping_bag_rounded,
      color: PremiumTheme.accentGreen,
      title: 'Articles / Prestations',
      trailing: IconButton(
        icon: const Icon(Icons.add_circle_rounded),
        color: PremiumTheme.accentGreen,
        onPressed: _addItem,
      ),
      children: [
        if (_items.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: PremiumTheme.lightBg, borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB)),
            ),
            child: const Column(children: [
              Icon(Icons.inbox_rounded, size: 40, color: PremiumTheme.textTertiary),
              SizedBox(height: 8),
              Text('Aucun article', style: TextStyle(color: PremiumTheme.textSecondary)),
            ]),
          )
        else
          ...List.generate(_items.length, (i) => _itemTile(i)),
      ],
    );
  }

  Widget _itemTile(int index) {
    final item = _items[index];
    return Container(
      margin: EdgeInsets.only(bottom: index < _items.length - 1 ? 12 : 0),
      decoration: BoxDecoration(
        color: PremiumTheme.lightBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: PremiumTheme.accentGreen.withValues(alpha: .06),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
          ),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: PremiumTheme.accentGreen.withValues(alpha: .12),
                borderRadius: BorderRadius.circular(8)),
              child: Text('# ${index + 1}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: PremiumTheme.accentGreen)),
            ),
            const Spacer(),
            GestureDetector(
              onTap: () => _removeItem(index),
              child: Icon(Icons.delete_outline_rounded, size: 20, color: PremiumTheme.accentRed.withValues(alpha: .7)),
            ),
          ]),
        ),
        // Fields
        Padding(
          padding: const EdgeInsets.all(14),
          child: Column(children: [
            TextFormField(
              initialValue: item.desc,
              decoration: _inputDeco('Description *', Icons.description_rounded),
              onChanged: (v) => item.desc = v,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Requis' : null,
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(flex: 2, child: TextFormField(
                initialValue: item.qty.toStringAsFixed(0),
                decoration: _inputDeco('Qte', Icons.tag_rounded),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
                onChanged: (v) => setState(() => item.qty = double.tryParse(v) ?? 1),
                validator: (v) => (double.tryParse(v ?? '0') ?? 0) <= 0 ? '> 0' : null,
              )),
              const SizedBox(width: 10),
              Expanded(flex: 3, child: TextFormField(
                initialValue: item.price.toStringAsFixed(2),
                decoration: _inputDeco('Prix HT (\u20AC)', Icons.euro_rounded),
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
                onChanged: (v) => setState(() => item.price = double.tryParse(v) ?? 0),
                validator: (v) => (double.tryParse(v ?? '0') ?? -1) < 0 ? '>= 0' : null,
              )),
            ]),
            const SizedBox(height: 12),
            // Line total
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: PremiumTheme.accentGreen.withValues(alpha: .06),
                borderRadius: BorderRadius.circular(10)),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Total HT', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: PremiumTheme.textSecondary)),
                Text('${(item.qty * item.price).toStringAsFixed(2)} \u20AC',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: PremiumTheme.accentGreen)),
              ]),
            ),
          ]),
        ),
      ]),
    );
  }

  // ── Totals ───────────────────────────────────────────────────
  Widget _sectionTotals() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .12), blurRadius: 16, offset: const Offset(0, 4))],
      ),
      child: Column(children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .08), borderRadius: BorderRadius.circular(10)),
            child: const Icon(Icons.calculate_rounded, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 12),
          const Text('Recapitulatif', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
        ]),
        const SizedBox(height: 20),
        _totalRow('Sous-total HT', _subtotal, Colors.white70),
        const SizedBox(height: 8),
        _totalRow('TVA (${_taxRate.toStringAsFixed(1)}%)', _tax, Colors.white70),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: PremiumTheme.primaryBlue.withValues(alpha: .15),
            borderRadius: BorderRadius.circular(12)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('TOTAL TTC', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white, letterSpacing: 1)),
            Text('${_total.toStringAsFixed(2)} \u20AC',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
          ]),
        ),
      ]),
    );
  }

  Widget _totalRow(String label, double val, Color c) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: TextStyle(fontSize: 15, color: c)),
      Text('${val.toStringAsFixed(2)} \u20AC', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c)),
    ]);
  }

  // ── Notes ────────────────────────────────────────────────────
  Widget _sectionNotes() {
    return _card(
      icon: Icons.note_rounded,
      color: PremiumTheme.textSecondary,
      title: 'Notes',
      children: [
        _field(_notes, 'Notes (optionnel)', Icons.edit_note_rounded, lines: 3),
      ],
    );
  }

  // ══════════════════════════════════════════════════════════════
  //  SHARED WIDGETS
  // ══════════════════════════════════════════════════════════════

  Widget _card({
    required IconData icon,
    required Color color,
    required String title,
    Widget? trailing,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .04), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Column(children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 8, 0),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: color.withValues(alpha: .1), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(child: Text(title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary))),
            if (trailing != null) trailing,
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      ]),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon, {
    TextInputType? keyboard, List<TextInputFormatter>? formatters,
    String? Function(String?)? validator, int lines = 1,
    bool enabled = true, Widget? suffix, String? error,
  }) {
    return TextFormField(
      controller: ctrl,
      decoration: _inputDeco(label, icon, suffix: suffix, error: error),
      keyboardType: keyboard,
      inputFormatters: formatters,
      validator: validator,
      maxLines: lines,
      enabled: enabled,
    );
  }

  InputDecoration _inputDeco(String label, IconData icon, {Widget? suffix, String? error}) {
    return InputDecoration(
      labelText: label,
      errorText: error,
      prefixIcon: Icon(icon, color: PremiumTheme.primaryBlue, size: 20),
      suffixIcon: suffix,
      filled: true,
      fillColor: PremiumTheme.lightBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB))),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: PremiumTheme.primaryBlue, width: 2)),
      errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: PremiumTheme.accentRed)),
    );
  }
}

// ── Item form model ────────────────────────────────────────────
class _ItemForm {
  String desc;
  double qty;
  double price;
  _ItemForm({this.desc = '', this.qty = 1, this.price = 0});
}

// ── Tax rate dialog ────────────────────────────────────────────
class _TaxDialog extends StatefulWidget {
  final double rate;
  const _TaxDialog({required this.rate});
  @override
  State<_TaxDialog> createState() => _TaxDialogState();
}

class _TaxDialogState extends State<_TaxDialog> {
  late double _sel;
  @override
  void initState() { super.initState(); _sel = widget.rate; }

  static const _rates = [
    (0.0, '0 % (Exonere)'),
    (5.5, '5,5 % (Reduit)'),
    (10.0, '10 % (Intermediaire)'),
    (20.0, '20 % (Normal)'),
  ];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: PremiumTheme.primaryBlue.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.percent_rounded, color: PremiumTheme.primaryBlue),
        ),
        const SizedBox(width: 10),
        const Text('Taux de TVA', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ]),
      content: Column(mainAxisSize: MainAxisSize.min,
          children: _rates.map((r) => RadioListTile<double>(
            title: Text(r.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
            value: r.$1, groupValue: _sel,
            activeColor: PremiumTheme.primaryBlue,
            onChanged: (v) => setState(() => _sel = v!),
          )).toList()),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Annuler')),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _sel),
          style: ElevatedButton.styleFrom(backgroundColor: PremiumTheme.primaryBlue,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          child: const Text('Valider', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }
}
