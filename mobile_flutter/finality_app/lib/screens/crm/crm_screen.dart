import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../invoices/invoice_list_screen.dart';
import '../invoices/invoice_form_screen.dart';
import '../quotes/quote_list_screen.dart';
import '../quotes/quote_form_screen.dart';
import 'client_list_screen.dart';
import 'client_detail_screen.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

/// Écran CRM avec onglets Factures et Devis
/// Design moderne avec TabBar et FAB pour créer
class CRMScreen extends StatefulWidget {
  const CRMScreen({super.key});

  @override
  State<CRMScreen> createState() => _CRMScreenState();
}

class _CRMScreenState extends State<CRMScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showCreateMenu() {
    final l10n = AppLocalizations.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        padding: const EdgeInsets.all(PremiumTheme.spaceLG),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: PremiumTheme.textTertiary,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: PremiumTheme.spaceLG),
            
            Text(
              l10n.createDocument,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF1A1A1A),
                shadows: [
                  Shadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    offset: const Offset(0, 1),
                    blurRadius: 2,
                  ),
                ],
              ),
            ),
            const SizedBox(height: PremiumTheme.spaceLG),
            
            // Facture Option
            FadeInAnimation(
              delay: const Duration(milliseconds: 100),
              child: _buildMenuOption(
                context,
                icon: Icons.receipt_long_rounded,
                gradient: PremiumTheme.customGradient([
                  PremiumTheme.primaryIndigo,
                  PremiumTheme.primaryPurple,
                ]),
                title: l10n.newInvoice,
                subtitle: l10n.createClientInvoice,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const InvoiceFormScreen(),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: PremiumTheme.spaceMD),
            
            // Devis Option
            FadeInAnimation(
              delay: const Duration(milliseconds: 200),
              child: _buildMenuOption(
                context,
                icon: Icons.description_rounded,
                gradient: PremiumTheme.purpleGradient,
                title: l10n.newQuote,
                subtitle: l10n.createClientQuote,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const QuoteFormScreen(),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: PremiumTheme.spaceMD),
            
            // Client Option
            FadeInAnimation(
              delay: const Duration(milliseconds: 300),
              child: _buildMenuOption(
                context,
                icon: Icons.person_add_rounded,
                gradient: PremiumTheme.customGradient([
                  const Color(0xFF06B6D4),
                  const Color(0xFF0EA5E9),
                ]),
                title: l10n.newClient,
                subtitle: l10n.addNewClient,
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const ClientDetailScreen(),
                    ),
                  ).then((_) => setState(() {}));
                },
              ),
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + PremiumTheme.spaceMD),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuOption(
    BuildContext context, {
    required IconData icon,
    required Gradient gradient,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return PremiumCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(12),
              boxShadow: PremiumTheme.glowShadow(
                gradient.colors.first,
              ),
            ),
            child: Icon(icon, color: Colors.white, size: 28),
          ),
          const SizedBox(width: PremiumTheme.spaceMD),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: PremiumTheme.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: PremiumTheme.bodySmall,
                ),
              ],
            ),
          ),
          Icon(
            Icons.arrow_forward_ios_rounded,
            color: PremiumTheme.textTertiary,
            size: 16,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: CustomScrollView(
        slivers: [
          // Animated AppBar
          SliverAppBar(
            expandedHeight: 180,
            floating: false,
            pinned: true,
            backgroundColor: Colors.transparent,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: BoxDecoration(
                  gradient: PremiumTheme.primaryGradient,
                  borderRadius: const BorderRadius.only(
                    bottomLeft: Radius.circular(30),
                    bottomRight: Radius.circular(30),
                  ),
                ),
                child: Stack(
                  children: [
                    // Motif décoratif
                    Positioned(
                      top: -50,
                      right: -50,
                      child: Container(
                        width: 200,
                        height: 200,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: -30,
                      left: -30,
                      child: Container(
                        width: 150,
                        height: 150,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.05),
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                    // Contenu
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.all(PremiumTheme.spaceLG),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.business_center_rounded,
                                    color: Colors.white,
                                    size: 32,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        l10n.crm,
                                        style: PremiumTheme.heading2.copyWith(
                                          color: Colors.white,
                                        ),
                                      ),
                                      Text(
                                        l10n.clientManagement,
                                        style: PremiumTheme.bodySmall.copyWith(
                                          color: Colors.white.withValues(alpha: 0.9),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(50),
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: PremiumTheme.primaryIndigo.withValues(alpha: 0.15),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: PremiumTheme.primaryGradient,
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: Colors.white,
                  unselectedLabelColor: PremiumTheme.textSecondary,
                  labelStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                  dividerColor: Colors.transparent,
                  tabs: [
                    Tab(
                      icon: const Icon(Icons.people_rounded, size: 20),
                      text: l10n.clients,
                    ),
                    Tab(
                      icon: const Icon(Icons.receipt_long_rounded, size: 20),
                      text: l10n.invoices,
                    ),
                    Tab(
                      icon: const Icon(Icons.description_rounded, size: 20),
                      text: l10n.quotes,
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Content
          SliverFillRemaining(
            child: TabBarView(
              controller: _tabController,
              children: [
                ClientListScreen(
                  onClientCreated: () => setState(() {}),
                ),
                const InvoiceListScreen(),
                const QuoteListScreen(),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: AnimatedScale(
        scale: 1.0,
        duration: PremiumTheme.normalAnimation,
        child: Container(
          decoration: BoxDecoration(
            gradient: PremiumTheme.purpleGradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: PremiumTheme.glowShadow(PremiumTheme.primaryPurple),
          ),
          child: FloatingActionButton.extended(
            onPressed: _showCreateMenu,
            backgroundColor: Colors.transparent,
            elevation: 0,
            icon: const Icon(Icons.add),
            label: Text(l10n.create),
          ),
        ),
      ),
    );
  }
}
