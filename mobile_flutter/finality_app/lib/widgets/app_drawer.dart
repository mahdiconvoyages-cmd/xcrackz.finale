import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../theme/premium_theme.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/missions/missions_screen.dart';
import '../screens/missions/mission_create_screen_new.dart';
import '../screens/crm/crm_screen.dart';
import '../screens/scanned_documents/scanned_documents_screen_new.dart';
import '../screens/planning/planning_network_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/profile/billing_profile_screen.dart';
import '../screens/debug/debug_tools_screen.dart';
import '../screens/login_screen.dart';
import '../screens/permissions/permissions_screen.dart';
import '../widgets/billing_gate.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final userName = user?.userMetadata?['full_name'] as String? ??
        user?.email?.split('@').first ??
        'Utilisateur';
    final userInitial = userName.substring(0, 1).toUpperCase();
    final userEmail = user?.email ?? '';

    return Drawer(
      backgroundColor: const Color(0xFFFAFAFC),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
      ),
      child: SafeArea(
        child: Column(
          children: [
            _Header(
              userInitial: userInitial,
              userName: userName,
              userEmail: userEmail,
              onSettingsTap: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
              },
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _SectionLabel('PRINCIPAL'),
                  _NavItem(
                    icon: Icons.dashboard_rounded,
                    color: PremiumTheme.indigo500,
                    label: 'Tableau de bord',
                    onTap: () => _navigate(context, const DashboardScreen()),
                  ),
                  _NavItem(
                    icon: Icons.assignment_rounded,
                    color: PremiumTheme.accentGreen,
                    label: 'Missions',
                    onTap: () => _navigate(context, const MissionsScreen()),
                    trailing: GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const MissionCreateScreenNew()));
                      },
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: PremiumTheme.accentGreen.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.add_rounded, size: 16, color: PremiumTheme.accentGreen),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _SectionLabel('GESTION'),
                  _NavItem(
                    icon: Icons.receipt_long_rounded,
                    color: PremiumTheme.accentBlue,
                    label: 'CRM & Facturation',
                    onTap: () => _navigate(context, const BillingGate(child: CRMScreen())),
                  ),
                  _NavItem(
                    icon: Icons.document_scanner_rounded,
                    color: PremiumTheme.primaryTeal,
                    label: 'Documents scannés',
                    onTap: () => _navigate(context, const ScannedDocumentsScreenNew()),
                  ),
                  const SizedBox(height: 8),
                  _SectionLabel('ENTRAIDE'),
                  _NavItem(
                    icon: Icons.people_alt_rounded,
                    color: PremiumTheme.accentPink,
                    label: 'Entraide Convoyeurs',
                    onTap: () => _navigate(context, const PlanningNetworkScreen()),
                  ),
                  const SizedBox(height: 8),
                  _SectionLabel('COMPTE'),
                  _NavItem(
                    icon: Icons.person_rounded,
                    color: PremiumTheme.brandViolet,
                    label: 'Mon profil',
                    onTap: () => _navigate(context, const ProfileScreen()),
                  ),
                  _NavItem(
                    icon: Icons.business_center_rounded,
                    color: PremiumTheme.primaryBlue,
                    label: 'Profil Facturation',
                    onTap: () => _navigate(context, const BillingProfileScreen()),
                  ),
                  _NavItem(
                    icon: Icons.security_rounded,
                    color: PremiumTheme.accentGreen,
                    label: 'Autorisations',
                    onTap: () => _navigate(context, const PermissionsScreen()),
                  ),
                  if (kDebugMode) ...[
                    const SizedBox(height: 8),
                    _SectionLabel('DEBUG'),
                    _NavItem(
                      icon: Icons.bug_report_rounded,
                      color: PremiumTheme.accentRed,
                      label: 'Outils Debug',
                      onTap: () => _navigate(context, const DebugToolsScreen()),
                    ),
                  ],
                  const SizedBox(height: 16),
                  const Divider(height: 1, indent: 24, endIndent: 24),
                  const SizedBox(height: 8),
                  _LogoutItem(),
                ],
              ),
            ),
            _Footer(),
          ],
        ),
      ),
    );
  }

  void _navigate(BuildContext context, Widget screen) {
    Navigator.pop(context);
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => screen,
        transitionsBuilder: (_, animation, __, child) => SlideTransition(
          position: Tween<Offset>(begin: const Offset(1, 0), end: Offset.zero)
              .animate(CurvedAnimation(parent: animation, curve: Curves.easeOut)),
          child: child,
        ),
        transitionDuration: const Duration(milliseconds: 250),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String userInitial;
  final String userName;
  final String userEmail;
  final VoidCallback onSettingsTap;
  const _Header({required this.userInitial, required this.userName, required this.userEmail, required this.onSettingsTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 20, 12, 20),
      decoration: const BoxDecoration(
        gradient: LinearGradient(colors: [PremiumTheme.indigo500, PremiumTheme.brandViolet], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.only(topRight: Radius.circular(24)),
      ),
      child: Row(
        children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
            ),
            child: Center(child: Text(userInitial, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold))),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(userName, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(userEmail, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          IconButton(icon: const Icon(Icons.settings_rounded, color: Colors.white, size: 22), onPressed: onSettingsTap),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
      child: Text(text, style: const TextStyle(color: PremiumTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.6)),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;
  final Widget? trailing;
  const _NavItem({required this.icon, required this.color, required this.label, required this.onTap, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 1),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(child: Text(label, style: const TextStyle(color: PremiumTheme.darkSlate, fontSize: 14, fontWeight: FontWeight.w500))),
              if (trailing != null) trailing!
              else const Icon(Icons.chevron_right_rounded, color: PremiumTheme.slate300, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _LogoutItem extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 1),
      child: InkWell(
        onTap: () async {
          final confirm = await showDialog<bool>(
            context: context,
            builder: (_) => AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Déconnexion'),
              content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Annuler')),
                FilledButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: FilledButton.styleFrom(backgroundColor: PremiumTheme.accentRed),
                  child: const Text('Déconnexion'),
                ),
              ],
            ),
          );
          if (confirm == true && context.mounted) {
            await Supabase.instance.client.auth.signOut();
            if (context.mounted) {
              Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => LoginScreen()), (route) => false);
            }
          }
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          child: Row(
            children: [
              Container(
                width: 38, height: 38,
                decoration: BoxDecoration(color: PremiumTheme.accentRed.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.logout_rounded, color: PremiumTheme.accentRed, size: 20),
              ),
              const SizedBox(width: 14),
              const Text('Déconnexion', style: TextStyle(color: PremiumTheme.accentRed, fontSize: 14, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ),
    );
  }
}

class _Footer extends StatefulWidget {
  @override
  State<_Footer> createState() => _FooterState();
}

class _FooterState extends State<_Footer> {
  static String? _cachedVersion;

  @override
  void initState() {
    super.initState();
    if (_cachedVersion == null) {
      PackageInfo.fromPlatform().then((info) {
        if (mounted) setState(() => _cachedVersion = info.version);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final version = _cachedVersion ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Text(version.isNotEmpty ? 'ChecksFleet v$version' : 'ChecksFleet', style: const TextStyle(color: PremiumTheme.slate300, fontSize: 11, fontWeight: FontWeight.w500)),
    );
  }
}
