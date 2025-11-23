import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/invoice.dart';
import '../../services/invoice_service.dart';
import 'invoice_detail_screen.dart';
import 'invoice_form_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

class InvoiceListScreen extends StatefulWidget {
  const InvoiceListScreen({super.key});

  @override
  State<InvoiceListScreen> createState() => _InvoiceListScreenState();
}

class _InvoiceListScreenState extends State<InvoiceListScreen> 
    with SingleTickerProviderStateMixin {
  final InvoiceService _invoiceService = InvoiceService();
  late AnimationController _animationController;
  
  List<Invoice> _invoices = [];
  bool _isLoading = true;
  String _filter = 'all';
  Map<String, dynamic> _stats = {};

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _loadInvoices();
    _loadStats();
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadInvoices() async {
    setState(() => _isLoading = true);

    try {
      final invoices = await _invoiceService.getInvoices(
        status: _filter == 'all' ? null : _filter,
      );

      setState(() {
        _invoices = invoices;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $e'),
          backgroundColor: PremiumTheme.accentRed,
        ),
      );
    }
  }

  Future<void> _loadStats() async {
    try {
      final stats = await _invoiceService.getInvoiceStats();
      setState(() => _stats = stats);
    } catch (e) {
      print('Erreur chargement stats: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: Column(
        children: [
          // Stats Cards
          _buildStatsCards(),
          
          // Filter Chips
          _buildFilterChips(),
          
          const SizedBox(height: 8),
          
          // List
          Expanded(
            child: _isLoading
                ? _buildLoadingState()
                : _invoices.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: () async {
                          await _loadInvoices();
                          await _loadStats();
                        },
                        backgroundColor: PremiumTheme.cardBg,
                        color: PremiumTheme.primaryIndigo,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _invoices.length,
                          itemBuilder: (context, index) {
                            return FadeInAnimation(
                              delay: Duration(milliseconds: index * 50),
                              child: _buildInvoiceCard(_invoices[index]),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards() {
    if (_stats.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
            const SizedBox(width: 12),
            Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
            const SizedBox(width: 12),
            Expanded(child: ShimmerLoading(width: double.infinity, height: 100)),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: FadeInAnimation(
              delay: Duration.zero,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [PremiumTheme.accentGreen, PremiumTheme.primaryTeal],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: PremiumTheme.accentGreen.withOpacity(0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 8),
                      spreadRadius: 1,
                    ),
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: _buildStatCard(
                  title: 'Total',
                  value: '${_stats['totalRevenue']?.toStringAsFixed(2) ?? '0.00'} €',
                  icon: Icons.euro_rounded,
                  gradient: [PremiumTheme.accentGreen, PremiumTheme.primaryTeal],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FadeInAnimation(
              delay: const Duration(milliseconds: 100),
              child: _buildStatCard(
                title: 'Ce mois',
                value: '${_stats['monthlyRevenue']?.toStringAsFixed(2) ?? '0.00'} €',
                icon: Icons.calendar_month_rounded,
                gradient: [PremiumTheme.primaryBlue, PremiumTheme.primaryIndigo],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FadeInAnimation(
              delay: const Duration(milliseconds: 200),
              child: _buildStatCard(
                title: 'Semaine',
                value: '${_stats['weeklyRevenue']?.toStringAsFixed(2) ?? '0.00'} €',
                icon: Icons.calendar_today_rounded,
                gradient: [PremiumTheme.accentAmber, Colors.orange],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required List<Color> gradient,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: gradient),
        borderRadius: BorderRadius.circular(PremiumTheme.radiusMD),
        boxShadow: [
          BoxShadow(
            color: gradient[0].withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: PremiumTheme.body.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: PremiumTheme.bodySmall.copyWith(
              color: Colors.white.withOpacity(0.9),
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            _buildFilterChip(
              label: 'Toutes (${_stats['total'] ?? 0})',
              isSelected: _filter == 'all',
              onSelected: () {
                setState(() => _filter = 'all');
                _loadInvoices();
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label: 'En attente (${_stats['pending'] ?? 0})',
              isSelected: _filter == 'pending',
              color: PremiumTheme.accentAmber,
              onSelected: () {
                setState(() => _filter = 'pending');
                _loadInvoices();
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label: 'Payées (${_stats['paid'] ?? 0})',
              isSelected: _filter == 'paid',
              color: PremiumTheme.accentGreen,
              onSelected: () {
                setState(() => _filter = 'paid');
                _loadInvoices();
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label: 'En retard (${_stats['overdue'] ?? 0})',
              isSelected: _filter == 'overdue',
              color: PremiumTheme.accentRed,
              onSelected: () {
                setState(() => _filter = 'overdue');
                _loadInvoices();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onSelected,
    Color? color,
  }) {
    return InkWell(
      onTap: onSelected,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: color != null
                      ? [color, color.withOpacity(0.8)]
                      : [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
                )
              : null,
          color: isSelected ? null : PremiumTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? Colors.transparent
                : Colors.white.withOpacity(0.1),
          ),
        ),
        child: Text(
          label,
          style: PremiumTheme.bodySmall.copyWith(
            color: isSelected ? Colors.white : PremiumTheme.textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildInvoiceCard(Invoice invoice) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (invoice.status) {
      case 'paid':
        statusColor = PremiumTheme.accentGreen;
        statusIcon = Icons.check_circle_rounded;
        statusText = 'Payée';
        break;
      case 'overdue':
        statusColor = PremiumTheme.accentRed;
        statusIcon = Icons.error_rounded;
        statusText = 'En retard';
        break;
      case 'cancelled':
        statusColor = PremiumTheme.textTertiary;
        statusIcon = Icons.cancel_rounded;
        statusText = 'Annulée';
        break;
      default:
        statusColor = PremiumTheme.accentAmber;
        statusIcon = Icons.pending_rounded;
        statusText = 'En attente';
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: PremiumCard(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => InvoiceDetailScreen(invoiceId: invoice.id!),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Facture #${invoice.invoiceNumber}',
                        style: PremiumTheme.body.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        invoice.clientInfo?['name'] ?? 'Client',
                        style: PremiumTheme.bodySmall.copyWith(
                          color: PremiumTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, color: statusColor, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: PremiumTheme.bodySmall.copyWith(
                          color: statusColor,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Divider(color: Colors.white.withOpacity(0.1), height: 1),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Montant total',
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.textTertiary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${invoice.total.toStringAsFixed(2)} €',
                      style: PremiumTheme.heading4.copyWith(
                        color: PremiumTheme.primaryTeal,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Date d\'émission',
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.textTertiary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat('dd/MM/yyyy').format(invoice.invoiceDate),
                      style: PremiumTheme.body,
                    ),
                  ],
                ),
              ],
            ),
            if (invoice.status == 'pending' || invoice.status == 'overdue') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _markAsPaid(invoice),
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Marquer payée'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.accentGreen,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => _cancelInvoice(invoice),
                    icon: const Icon(Icons.cancel, color: PremiumTheme.accentRed),
                    style: IconButton.styleFrom(
                      backgroundColor: PremiumTheme.accentRed.withOpacity(0.2),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: ShimmerLoading(width: double.infinity, height: 150),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: PremiumTheme.cardBg,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.receipt_long_rounded,
              size: 64,
              color: PremiumTheme.textTertiary,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Aucune facture',
            style: PremiumTheme.heading3,
          ),
          const SizedBox(height: 8),
          Text(
            'Créez votre première facture',
            style: PremiumTheme.body.copyWith(
              color: PremiumTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _markAsPaid(Invoice invoice) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        title: Text('Marquer comme payée', style: PremiumTheme.heading4),
        content: Text(
          'Confirmer le paiement de la facture ${invoice.invoiceNumber} ?',
          style: PremiumTheme.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.accentGreen,
            ),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final updatedInvoice = Invoice(
          id: invoice.id,
          userId: invoice.userId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          status: 'paid',
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          paidAt: DateTime.now(),
          items: invoice.items,
          clientId: invoice.clientId,
          missionId: invoice.missionId,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          paymentMethod: invoice.paymentMethod,
          clientInfo: invoice.clientInfo,
          createdAt: invoice.createdAt,
          updatedAt: DateTime.now(),
        );
        await _invoiceService.updateInvoice(invoice.id!, updatedInvoice);
        await _loadInvoices();
        await _loadStats();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Facture marquée comme payée'),
            backgroundColor: PremiumTheme.accentGreen,
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: PremiumTheme.accentRed,
          ),
        );
      }
    }
  }

  Future<void> _cancelInvoice(Invoice invoice) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        title: Text('Annuler la facture', style: PremiumTheme.heading4),
        content: Text(
          'Voulez-vous vraiment annuler la facture ${invoice.invoiceNumber} ?',
          style: PremiumTheme.body,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Non'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: PremiumTheme.accentRed,
            ),
            child: const Text('Annuler la facture'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final updatedInvoice = Invoice(
          id: invoice.id,
          userId: invoice.userId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          status: 'cancelled',
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          items: invoice.items,
          clientId: invoice.clientId,
          missionId: invoice.missionId,
          dueDate: invoice.dueDate,
          notes: invoice.notes,
          paymentMethod: invoice.paymentMethod,
          paidAt: invoice.paidAt,
          clientInfo: invoice.clientInfo,
          createdAt: invoice.createdAt,
          updatedAt: DateTime.now(),
        );
        await _invoiceService.updateInvoice(invoice.id!, updatedInvoice);
        await _loadInvoices();
        await _loadStats();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Facture annulée'),
            backgroundColor: PremiumTheme.accentAmber,
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: PremiumTheme.accentRed,
          ),
        );
      }
    }
  }
}
