import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../invoices/invoice_list_screen.dart';
import '../invoices/invoice_form_screen.dart';
import '../quotes/quote_list_screen.dart';
import '../quotes/quote_form_screen.dart';
import 'client_list_screen.dart';
import 'client_detail_screen.dart';
import '../../theme/premium_theme.dart';

/// Écran CRM — Design propre sans chevauchement
class CRMScreen extends StatefulWidget {
  const CRMScreen({super.key});

  @override
  State<CRMScreen> createState() => _CRMScreenState();
}

class _CRMScreenState extends State<CRMScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // ───────── Create bottom-sheet ─────────
  void _showCreateMenu() {
    final l10n = AppLocalizations.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: EdgeInsets.fromLTRB(
          20, 12, 20, MediaQuery.of(ctx).padding.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              l10n.createDocument,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 16),
            _menuTile(
              icon: Icons.receipt_long_rounded,
              color: PremiumTheme.primaryBlue,
              title: l10n.newInvoice,
              subtitle: l10n.createClientInvoice,
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const InvoiceFormScreen()));
              },
            ),
            const SizedBox(height: 10),
            _menuTile(
              icon: Icons.description_rounded,
              color: PremiumTheme.primaryPurple,
              title: l10n.newQuote,
              subtitle: l10n.createClientQuote,
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => const QuoteFormScreen()));
              },
            ),
            const SizedBox(height: 10),
            _menuTile(
              icon: Icons.person_add_rounded,
              color: PremiumTheme.primaryTeal,
              title: l10n.newClient,
              subtitle: l10n.addNewClient,
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ClientDetailScreen()),
                ).then((_) => setState(() {}));
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuTile({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: color.withOpacity(0.06),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withOpacity(0.12)),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: PremiumTheme.textPrimary,
                        )),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: TextStyle(
                          fontSize: 13,
                          color: PremiumTheme.textSecondary,
                        )),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded,
                  color: PremiumTheme.textTertiary, size: 20),
            ],
          ),
        ),
      ),
    );
  }

  // ───────── Build ─────────
  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final top = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      body: Column(
        children: [
          // ── Header ──
          Container(
            padding: EdgeInsets.fromLTRB(20, top + 16, 20, 0),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: Color(0xFFE5E7EB), width: 0.5),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title row
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        gradient: PremiumTheme.tealGradient,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.business_center_rounded,
                          color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(l10n.crm,
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF1A1A1A),
                                letterSpacing: -0.3,
                              )),
                          Text(l10n.clientManagement,
                              style: TextStyle(
                                fontSize: 13,
                                color: PremiumTheme.textSecondary,
                              )),
                        ],
                      ),
                    ),
                    // Create button
                    Material(
                      color: PremiumTheme.primaryTeal,
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        onTap: _showCreateMenu,
                        borderRadius: BorderRadius.circular(12),
                        child: const Padding(
                          padding: EdgeInsets.all(10),
                          child: Icon(Icons.add_rounded,
                              color: Colors.white, size: 22),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // ── Tab bar ──
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.all(3),
                  child: TabBar(
                    controller: _tabController,
                    indicator: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelColor: PremiumTheme.textPrimary,
                    unselectedLabelColor: PremiumTheme.textTertiary,
                    labelStyle: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    unselectedLabelStyle: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                    dividerColor: Colors.transparent,
                    labelPadding: EdgeInsets.zero,
                    tabs: [
                      _tabItem(Icons.people_rounded, l10n.clients, 0),
                      _tabItem(Icons.receipt_long_rounded, l10n.invoices, 1),
                      _tabItem(Icons.description_rounded, l10n.quotes, 2),
                    ],
                  ),
                ),

                const SizedBox(height: 2), // small bottom breathing room
              ],
            ),
          ),

          // ── Tab content ──
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                ClientListScreen(onClientCreated: () => setState(() {})),
                const InvoiceListScreen(),
                const QuoteListScreen(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabItem(IconData icon, String label, int index) {
    final selected = _tabController.index == index;
    return Tab(
      height: 38,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16,
              color: selected
                  ? PremiumTheme.primaryTeal
                  : PremiumTheme.textTertiary),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }
}
