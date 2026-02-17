import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/invoice.dart';
import '../../services/invoice_service.dart';
import '../../theme/premium_theme.dart';
import 'invoice_detail_screen.dart';
import 'invoice_form_screen.dart';

class InvoiceListScreen extends StatefulWidget {
  const InvoiceListScreen({super.key});

  @override
  State<InvoiceListScreen> createState() => _InvoiceListScreenState();
}

class _InvoiceListScreenState extends State<InvoiceListScreen> {
  final InvoiceService _invoiceService = InvoiceService();
  final _fmt = NumberFormat.currency(locale: 'fr_FR', symbol: '\u20AC');
  final _searchController = TextEditingController();

  List<Invoice> _invoices = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  static const int _pageSize = 30;
  String _filter = 'all';
  String _searchQuery = '';
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Invoice> get _filteredInvoices {
    if (_searchQuery.isEmpty) return _invoices;
    final q = _searchQuery.toLowerCase();
    return _invoices.where((inv) {
      return inv.invoiceNumber.toLowerCase().contains(q) ||
          (inv.clientInfo?['name'] ?? '').toString().toLowerCase().contains(q) ||
          (inv.clientInfo?['company'] ?? '').toString().toLowerCase().contains(q) ||
          (inv.notes ?? '').toLowerCase().contains(q);
    }).toList();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _hasMore = true;
    });
    try {
      final results = await Future.wait([
        _invoiceService.getInvoices(
          status: _filter == 'all' ? null : _filter,
          limit: _pageSize,
        ),
        _invoiceService.getInvoiceStats(),
      ]);
      if (!mounted) return;
      setState(() {
        _invoices = results[0] as List<Invoice>;
        _stats = results[1] as Map<String, dynamic>;
        _hasMore = _invoices.length >= _pageSize;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      _snack('Erreur de chargement', PremiumTheme.accentRed);
    }
  }

  Future<void> _loadMore() async {
    if (_isLoadingMore || !_hasMore) return;
    setState(() => _isLoadingMore = true);
    try {
      final more = await _invoiceService.getInvoices(
        status: _filter == 'all' ? null : _filter,
        limit: _pageSize,
        offset: _invoices.length,
      );
      if (!mounted) return;
      setState(() {
        _invoices.addAll(more);
        _hasMore = more.length >= _pageSize;
        _isLoadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingMore = false);
    }
  }

  void _snack(String msg, Color bg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: bg, behavior: SnackBarBehavior.floating),
    );
  }

  // ── Status helpers ───────────────────────────────────────────
  static const _cfg = {
    'draft':     ('Brouillon',  Icons.edit_note_rounded,           Color(0xFF6B7280)),
    'pending':   ('En attente', Icons.schedule_rounded,            Color(0xFFF59E0B)),
    'sent':      ('Envoyee',    Icons.send_rounded,                Color(0xFF3B82F6)),
    'paid':      ('Payee',      Icons.check_circle_rounded,        Color(0xFF10B981)),
    'overdue':   ('En retard',  Icons.warning_amber_rounded,       Color(0xFFEF4444)),
    'cancelled': ('Annulee',    Icons.cancel_rounded,              Color(0xFF9CA3AF)),
  };

  (String, IconData, Color) _si(String s) =>
      _cfg[s] ?? ('Inconnu', Icons.help_outline, const Color(0xFF9CA3AF));

  // ── Build ────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'invoice_fab',
        onPressed: () async {
          final ok = await Navigator.push<bool>(
            context, MaterialPageRoute(builder: (_) => const InvoiceFormScreen()));
          if (ok == true) _loadData();
        },
        backgroundColor: PremiumTheme.primaryBlue,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Nouvelle facture',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: PremiumTheme.primaryBlue,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildStats()),
            SliverToBoxAdapter(child: _buildSearchBar()),
            SliverToBoxAdapter(child: _buildFilters()),
            const SliverToBoxAdapter(child: SizedBox(height: 8)),
            if (_isLoading)
              SliverToBoxAdapter(child: _shimmer())
            else if (_invoices.isEmpty)
              SliverFillRemaining(child: _empty())
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                sliver: SliverList.separated(
                  itemCount: _filteredInvoices.length + (_hasMore && _searchQuery.isEmpty ? 1 : 0),
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    if (i == _filteredInvoices.length) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: _isLoadingMore
                              ? const CircularProgressIndicator()
                              : TextButton.icon(
                                  onPressed: _loadMore,
                                  icon: const Icon(Icons.expand_more_rounded),
                                  label: const Text('Charger plus'),
                                ),
                        ),
                      );
                    }
                    return _card(_filteredInvoices[i]);
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── Stats ────────────────────────────────────────────────────
  Widget _buildStats() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(children: [
        _stat('Total encaisse', _fmt.format(_stats['totalRevenue'] ?? 0),
            Icons.account_balance_wallet_rounded, PremiumTheme.accentGreen),
        const SizedBox(width: 10),
        _stat('Ce mois', _fmt.format(_stats['monthlyRevenue'] ?? 0),
            Icons.calendar_month_rounded, PremiumTheme.primaryBlue),
        const SizedBox(width: 10),
        _stat('Semaine', _fmt.format(_stats['weeklyRevenue'] ?? 0),
            Icons.trending_up_rounded, PremiumTheme.accentAmber),
      ]),
    );
  }

  Widget _stat(String label, String value, IconData icon, Color c) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: c.withValues(alpha: .12)),
          boxShadow: [BoxShadow(color: c.withValues(alpha: .06), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: c.withValues(alpha: .1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: c, size: 20),
          ),
          const SizedBox(height: 10),
          Text(value,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: PremiumTheme.textTertiary)),
        ]),
      ),
    );
  }

  // ── Search ───────────────────────────────────────────────────
  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE5E7EB)),
        ),
        child: TextField(
          controller: _searchController,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Rechercher (n° facture, client...)',
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
            prefixIcon: const Icon(Icons.search, size: 20, color: Colors.grey),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                  )
                : null,
            border: InputBorder.none,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(vertical: 12),
          ),
          onChanged: (val) => setState(() => _searchQuery = val),
        ),
      ),
    );
  }

  // ── Filters ──────────────────────────────────────────────────
  Widget _buildFilters() {
    final f = [
      ('all',       'Toutes',     _stats['total'] ?? 0,     PremiumTheme.primaryBlue),
      ('draft',     'Brouillon',  _stats['draft'] ?? 0,     const Color(0xFF6B7280)),
      ('pending',   'En attente', _stats['pending'] ?? 0,   PremiumTheme.accentAmber),
      ('paid',      'Payees',     _stats['paid'] ?? 0,      PremiumTheme.accentGreen),
      ('overdue',   'En retard',  _stats['overdue'] ?? 0,   PremiumTheme.accentRed),
    ];
    return SizedBox(
      height: 42,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: f.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final (key, label, count, color) = f[i];
          final sel = _filter == key;
          return GestureDetector(
            onTap: () { setState(() => _filter = key); _loadData(); },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: sel ? color : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: sel ? color : const Color(0xFFE5E7EB)),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Text(label,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                        color: sel ? Colors.white : PremiumTheme.textSecondary)),
                if ((count as int) > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: sel ? Colors.white.withValues(alpha: .25) : color.withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(10)),
                    child: Text('$count',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                            color: sel ? Colors.white : color)),
                  ),
                ],
              ]),
            ),
          );
        },
      ),
    );
  }

  // ── Card ─────────────────────────────────────────────────────
  Widget _card(Invoice inv) {
    final (sLabel, sIcon, sColor) = _si(inv.status);
    final client = inv.clientInfo?['name'] as String? ?? 'Client';
    final actionable = inv.status == 'pending' || inv.status == 'overdue' || inv.status == 'draft';

    return GestureDetector(
      onTap: () async {
        final ok = await Navigator.push<bool>(context,
          MaterialPageRoute(builder: (_) => InvoiceDetailScreen(invoiceId: inv.id!)));
        if (ok == true) _loadData();
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF0F0F0)),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: .04), blurRadius: 10, offset: const Offset(0, 2))],
        ),
        child: Column(children: [
          // ── header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: sColor.withValues(alpha: .1),
                  borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.receipt_long_rounded, color: sColor, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(inv.invoiceNumber,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: PremiumTheme.textPrimary)),
                  const SizedBox(height: 2),
                  Text(client,
                      style: const TextStyle(fontSize: 13, color: PremiumTheme.textSecondary),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                ],
              )),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: sColor.withValues(alpha: .1),
                  borderRadius: BorderRadius.circular(20)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(sIcon, color: sColor, size: 14),
                  const SizedBox(width: 4),
                  Text(sLabel, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: sColor)),
                ]),
              ),
            ]),
          ),
          Divider(height: 1, color: Colors.grey.shade100),
          // ── footer
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Row(children: [
              const Icon(Icons.calendar_today_rounded, size: 14, color: PremiumTheme.textTertiary),
              const SizedBox(width: 4),
              Text(DateFormat('dd/MM/yyyy').format(inv.invoiceDate),
                  style: const TextStyle(fontSize: 12, color: PremiumTheme.textSecondary)),
              const Spacer(),
              Text(_fmt.format(inv.total),
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800,
                      color: inv.status == 'paid' ? PremiumTheme.accentGreen : PremiumTheme.textPrimary)),
            ]),
          ),
          // ── actions
          if (actionable)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Row(children: [
                if (inv.status != 'paid')
                  Expanded(child: _actBtn('Marquer payee', Icons.check_circle_outline_rounded,
                      PremiumTheme.accentGreen, () => _markPaid(inv))),
                if (inv.status != 'paid' && inv.status != 'cancelled')
                  const SizedBox(width: 8),
                if (inv.status != 'cancelled')
                  SizedBox(width: 42, child: _actBtn(null, Icons.close_rounded,
                      PremiumTheme.accentRed, () => _cancel(inv))),
              ]),
            ),
        ]),
      ),
    );
  }

  Widget _actBtn(String? l, IconData ic, Color c, VoidCallback fn) {
    return Material(
      color: c.withValues(alpha: .08),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: fn,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(ic, color: c, size: 18),
            if (l != null) ...[const SizedBox(width: 6),
              Text(l, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c))],
          ]),
        ),
      ),
    );
  }

  // ── Empty / Shimmer ──────────────────────────────────────────
  Widget _empty() => Center(child: Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: PremiumTheme.primaryBlue.withValues(alpha: .06), shape: BoxShape.circle),
        child: Icon(Icons.receipt_long_rounded, size: 56, color: PremiumTheme.primaryBlue.withValues(alpha: .4)),
      ),
      const SizedBox(height: 20),
      const Text('Aucune facture', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      const Text('Creez votre premiere facture', style: TextStyle(fontSize: 14, color: PremiumTheme.textSecondary)),
    ],
  ));

  Widget _shimmer() => Padding(
    padding: const EdgeInsets.all(16),
    child: Column(children: List.generate(4, (_) => Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(height: 100, decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16)))))),
  );

  // ── Actions ──────────────────────────────────────────────────
  Future<void> _markPaid(Invoice inv) async {
    final method = await showModalBottomSheet<String>(
      context: context, backgroundColor: Colors.transparent,
      builder: (_) => const _PaymentMethodSheet());
    if (method == null) return;
    try {
      await _invoiceService.markAsPaid(inv.id!, paymentMethod: method);
      _snack('Facture marquee comme payee', PremiumTheme.accentGreen);
      _loadData();
    } catch (e) { _snack('Erreur: $e', PremiumTheme.accentRed); }
  }

  Future<void> _cancel(Invoice inv) async {
    final ok = await showDialog<bool>(context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Annuler la facture ?'),
        content: Text('Annuler ${inv.invoiceNumber} ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Non')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: PremiumTheme.accentRed),
            child: const Text('Oui, annuler', style: TextStyle(color: Colors.white))),
        ],
      ));
    if (ok != true) return;
    try {
      await _invoiceService.cancelInvoice(inv.id!);
      _snack('Facture annulee', PremiumTheme.accentAmber);
      _loadData();
    } catch (e) { _snack('Erreur: $e', PremiumTheme.accentRed); }
  }
}

// ── Payment method bottom sheet ────────────────────────────────
class _PaymentMethodSheet extends StatelessWidget {
  const _PaymentMethodSheet();

  static const _methods = [
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
        ..._methods.map((m) => ListTile(
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: PremiumTheme.primaryBlue.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(12)),
            child: Icon(m.$2, color: PremiumTheme.primaryBlue, size: 22),
          ),
          title: Text(m.$1, style: const TextStyle(fontWeight: FontWeight.w600)),
          trailing: const Icon(Icons.chevron_right_rounded, color: PremiumTheme.textTertiary),
          onTap: () => Navigator.pop(context, m.$3),
        )),
        SizedBox(height: MediaQuery.of(context).padding.bottom + 16),
      ]),
    );
  }
}
