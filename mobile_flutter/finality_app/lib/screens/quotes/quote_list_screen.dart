import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/quote.dart';
import '../../services/quote_service.dart';
import 'quote_detail_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

class QuoteListScreen extends StatefulWidget {
  const QuoteListScreen({super.key});

  @override
  State<QuoteListScreen> createState() => _QuoteListScreenState();
}

class _QuoteListScreenState extends State<QuoteListScreen>
    with SingleTickerProviderStateMixin {
  final QuoteService _quoteService = QuoteService();
  late AnimationController _animationController;

  List<Quote> _quotes = [];
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
    _loadQuotes();
    _loadStats();
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadQuotes() async {
    setState(() => _isLoading = true);

    try {
      final quotes = await _quoteService.getQuotes(
        status: _filter == 'all' ? null : _filter,
      );

      if (!mounted) return;
      setState(() {
        _quotes = quotes;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
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
      final stats = await _quoteService.getQuoteStats();
      if (!mounted) return;
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
                : _quotes.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: () async {
                          await _loadQuotes();
                          await _loadStats();
                        },
                        backgroundColor: PremiumTheme.cardBg,
                        color: PremiumTheme.primaryPurple,
                        child: ListView.builder(
                          key: const ValueKey('quotes-list'),
                          padding: const EdgeInsets.all(16),
                          cacheExtent: 500.0,
                          addAutomaticKeepAlives: true,
                          itemCount: _quotes.length,
                          itemBuilder: (context, index) {
                            final quote = _quotes[index];
                            return FadeInAnimation(
                              key: ValueKey('quote-fade-${quote.id}'),
                              delay: Duration(milliseconds: index * 50),
                              child: _buildQuoteCard(quote),
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
              child: _buildStatCard(
                title: 'Total',
                value: '${_stats['totalValue']?.toStringAsFixed(2) ?? '0.00'} €',
                icon: Icons.euro_rounded,
                gradient: [PremiumTheme.primaryPurple, PremiumTheme.primaryIndigo],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FadeInAnimation(
              delay: const Duration(milliseconds: 100),
              child: _buildStatCard(
                title: 'Acceptés',
                value: '${_stats['accepted'] ?? 0}',
                icon: Icons.check_circle_rounded,
                gradient: [PremiumTheme.accentGreen, PremiumTheme.primaryTeal],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: FadeInAnimation(
              delay: const Duration(milliseconds: 200),
              child: _buildStatCard(
                title: 'En attente',
                value: '${_stats['pending'] ?? 0}',
                icon: Icons.pending_rounded,
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
            color: gradient[0].withValues(alpha: 0.3),
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
              color: Colors.white.withValues(alpha: 0.9),
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
              label: 'Tous (${_stats['total'] ?? 0})',
              isSelected: _filter == 'all',
              onSelected: () {
                setState(() => _filter = 'all');
                _loadQuotes();
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label: 'En attente (${_stats['pending'] ?? 0})',
              isSelected: _filter == 'pending',
              color: PremiumTheme.accentAmber,
              onSelected: () {
                setState(() => _filter = 'pending');
                _loadQuotes();
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label: 'Acceptés (${_stats['accepted'] ?? 0})',
              isSelected: _filter == 'accepted',
              color: PremiumTheme.accentGreen,
              onSelected: () {
                setState(() => _filter = 'accepted');
                _loadQuotes();
              },
            ),
            const SizedBox(width: 8),
            _buildFilterChip(
              label: 'Refusés (${_stats['rejected'] ?? 0})',
              isSelected: _filter == 'rejected',
              color: PremiumTheme.accentRed,
              onSelected: () {
                setState(() => _filter = 'rejected');
                _loadQuotes();
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
                      ? [color, color.withValues(alpha: 0.8)]
                      : [PremiumTheme.primaryPurple, PremiumTheme.primaryIndigo],
                )
              : null,
          color: isSelected ? null : PremiumTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Colors.transparent : Colors.white.withValues(alpha: 0.1),
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

  Widget _buildQuoteCard(Quote quote) {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (quote.status) {
      case 'accepted':
        statusColor = PremiumTheme.accentGreen;
        statusIcon = Icons.check_circle_rounded;
        statusText = 'Accepté';
        break;
      case 'rejected':
        statusColor = PremiumTheme.accentRed;
        statusIcon = Icons.cancel_rounded;
        statusText = 'Refusé';
        break;
      case 'expired':
        statusColor = PremiumTheme.textTertiary;
        statusIcon = Icons.access_time_rounded;
        statusText = 'Expiré';
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
              builder: (context) => QuoteDetailScreen(quoteId: quote.id!),
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
                        'Devis #${quote.quoteNumber}',
                        style: PremiumTheme.body.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        quote.clientName ?? 'Client',
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
                    color: statusColor.withValues(alpha: 0.2),
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
            Divider(color: Colors.white.withValues(alpha: 0.1), height: 1),
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
                      '${quote.total.toStringAsFixed(2)} €',
                      style: PremiumTheme.heading4.copyWith(
                        color: PremiumTheme.primaryPurple,
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
                      DateFormat('dd/MM/yyyy').format(quote.quoteDate),
                      style: PremiumTheme.body,
                    ),
                  ],
                ),
              ],
            ),
            if (quote.validUntil != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.access_time_rounded,
                    size: 16,
                    color: PremiumTheme.textTertiary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Valide jusqu\'au ${DateFormat('dd/MM/yyyy').format(quote.validUntil!)}',
                    style: PremiumTheme.bodySmall.copyWith(
                      color: PremiumTheme.textTertiary,
                    ),
                  ),
                ],
              ),
            ],
            if (quote.status == 'pending') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _acceptQuote(quote),
                      icon: const Icon(Icons.check, size: 18),
                      label: const Text('Accepter'),
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
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _rejectQuote(quote),
                      icon: const Icon(Icons.close, size: 18),
                      label: const Text('Refuser'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: PremiumTheme.accentRed,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
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
              Icons.description_rounded,
              size: 64,
              color: PremiumTheme.textTertiary,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Aucun devis',
            style: PremiumTheme.heading3,
          ),
          const SizedBox(height: 8),
          Text(
            'Créez votre premier devis',
            style: PremiumTheme.body.copyWith(
              color: PremiumTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _acceptQuote(Quote quote) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        title: Text('Accepter le devis', style: PremiumTheme.heading4),
        content: Text(
          'Confirmer l\'acceptation du devis ${quote.quoteNumber} ?',
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
            child: const Text('Accepter'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final updatedQuote = Quote(
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          userId: quote.userId,
          quoteDate: quote.quoteDate,
          items: quote.items,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          total: quote.total,
          status: 'accepted',
          acceptedAt: DateTime.now(),
          missionId: quote.missionId,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          clientPhone: quote.clientPhone,
          clientAddress: quote.clientAddress,
          validUntil: quote.validUntil,
          notes: quote.notes,
          terms: quote.terms,
          sentAt: quote.sentAt,
          rejectedAt: quote.rejectedAt,
          convertedAt: quote.convertedAt,
          convertedInvoiceId: quote.convertedInvoiceId,
          createdAt: quote.createdAt,
          updatedAt: DateTime.now(),
        );
        await _quoteService.updateQuote(updatedQuote);
        await _loadQuotes();
        await _loadStats();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Devis accepté'),
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

  Future<void> _rejectQuote(Quote quote) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: PremiumTheme.cardBg,
        title: Text('Refuser le devis', style: PremiumTheme.heading4),
        content: Text(
          'Voulez-vous vraiment refuser le devis ${quote.quoteNumber} ?',
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
              backgroundColor: PremiumTheme.accentRed,
            ),
            child: const Text('Refuser'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final updatedQuote = Quote(
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          userId: quote.userId,
          quoteDate: quote.quoteDate,
          items: quote.items,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          total: quote.total,
          status: 'rejected',
          rejectedAt: DateTime.now(),
          missionId: quote.missionId,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          clientPhone: quote.clientPhone,
          clientAddress: quote.clientAddress,
          validUntil: quote.validUntil,
          notes: quote.notes,
          terms: quote.terms,
          sentAt: quote.sentAt,
          acceptedAt: quote.acceptedAt,
          convertedAt: quote.convertedAt,
          convertedInvoiceId: quote.convertedInvoiceId,
          createdAt: quote.createdAt,
          updatedAt: DateTime.now(),
        );
        await _quoteService.updateQuote(updatedQuote);
        await _loadQuotes();
        await _loadStats();
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Devis refusé'),
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
