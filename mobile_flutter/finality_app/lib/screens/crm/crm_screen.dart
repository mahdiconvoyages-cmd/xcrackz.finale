import 'package:flutter/material.dart';
import '../invoices/invoice_list_screen.dart';
import '../invoices/invoice_form_screen.dart';
import '../quotes/quote_list_screen.dart';
import '../quotes/quote_form_screen.dart';
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
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showCreateMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              PremiumTheme.cardBg,
              PremiumTheme.cardBgLight,
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
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
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: PremiumTheme.spaceLG),
            
            Text(
              'Créer un document',
              style: PremiumTheme.heading3,
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
                title: 'Nouvelle Facture',
                subtitle: 'Créer une facture client',
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
                title: 'Nouveau Devis',
                subtitle: 'Créer un devis client',
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
    return Scaffold(
      backgroundColor: PremiumTheme.darkBg,
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
                          color: Colors.white.withOpacity(0.1),
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
                          color: Colors.white.withOpacity(0.05),
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
                                    color: Colors.white.withOpacity(0.2),
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
                                        'CRM',
                                        style: PremiumTheme.heading2.copyWith(
                                          color: Colors.white,
                                        ),
                                      ),
                                      Text(
                                        'Gestion clients',
                                        style: PremiumTheme.bodySmall.copyWith(
                                          color: Colors.white.withOpacity(0.9),
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
                color: PremiumTheme.darkBg,
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: PremiumTheme.primaryIndigo,
                  indicatorWeight: 3,
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: Colors.white,
                  unselectedLabelColor: PremiumTheme.textTertiary,
                  labelStyle: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                  tabs: const [
                    Tab(
                      icon: Icon(Icons.receipt_long_rounded),
                      text: 'Factures',
                    ),
                    Tab(
                      icon: Icon(Icons.description_rounded),
                      text: 'Devis',
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
              children: const [
                InvoiceListScreen(),
                QuoteListScreen(),
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
            label: const Text('Créer'),
          ),
        ),
      ),
    );
  }
}
