import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../screens/scanned_documents/scanned_documents_screen_new.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/sharing/public_sharing_screen.dart';
import '../screens/debug/debug_tools_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/login_screen.dart';

/// Sidebar moderne avec design amélioré et icônes colorées
class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;

    return Drawer(
      backgroundColor: Colors.white,
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Modern User Header
          Container(
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF0066FF).withValues(alpha: 0.1), Colors.white],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          user?.email?.substring(0, 1).toUpperCase() ?? 'U',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0066FF),
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.settings, color: Color(0xFF0066FF), size: 24),
                      onPressed: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const ProfileScreen()),
                        );
                      },
                      style: IconButton.styleFrom(
                        backgroundColor: Color(0xFF0066FF).withValues(alpha: 0.1),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  user?.userMetadata?['full_name'] ?? 'Utilisateur',
                  style: const TextStyle(
                    color: Color(0xFF1A1A1A),
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? 'No email',
                  style: const TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Outils
          _buildSection(
            context,
            title: '🔧 OUTILS',
            children: [
              _buildModernDrawerItem(
                context,
                icon: Icons.document_scanner_rounded,
                iconColor: const Color(0xFF14B8A6),
                title: 'Scanner documents',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const ScannedDocumentsScreenNew()),
                  );
                },
              ),
              _buildModernDrawerItem(
                context,
                icon: Icons.share_rounded,
                iconColor: const Color(0xFF3B82F6),
                title: 'Partage public',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const PublicSharingScreen(
                        itemType: 'trip',
                        itemId: 'demo-trip-id',
                      ),
                    ),
                  );
                },
              ),
              _buildModernDrawerItem(
                context,
                icon: Icons.video_library_rounded,
                iconColor: const Color(0xFFF59E0B),
                title: 'Tutoriel',
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const OnboardingScreen()),
                  );
                },
              ),
              if (kDebugMode)
                _buildModernDrawerItem(
                  context,
                  icon: Icons.bug_report_rounded,
                  iconColor: const Color(0xFFEF4444),
                  title: 'Debug',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const DebugToolsScreen()),
                    );
                  },
                ),
            ],
          ),

          const SizedBox(height: 8),

          // Profil et déconnexion
          _buildModernDrawerItem(
            context,
            icon: Icons.person_rounded,
            iconColor: const Color(0xFF8B5CF6),
            title: 'Mon profil',
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ProfileScreen()),
              );
            },
          ),
          _buildModernDrawerItem(
            context,
            icon: Icons.logout_rounded,
            iconColor: const Color(0xFFEF4444),
            title: 'Déconnexion',
            onTap: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  backgroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  title: const Row(
                    children: [
                      Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
                      SizedBox(width: 12),
                      Text('Déconnexion', style: TextStyle(color: Color(0xFF1A1A1A))),
                    ],
                  ),
                  content: const Text(
                    'Êtes-vous sûr de vouloir vous déconnecter ?',
                    style: TextStyle(color: Color(0xFF6B7280)),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Annuler', style: TextStyle(color: Color(0xFF6B7280))),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(context, true),
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                      ),
                      child: const Text('Déconnexion'),
                    ),
                  ],
                ),
              );

              if (confirm == true && context.mounted) {
                await Supabase.instance.client.auth.signOut();
                if (context.mounted) {
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (context) => LoginScreen()),
                    (route) => false,
                  );
                }
              }
            },
          ),

          const SizedBox(height: 24),

          // App Version
          FutureBuilder<PackageInfo>(
            future: PackageInfo.fromPlatform(),
            builder: (context, snapshot) {
              final version = snapshot.data?.version ?? '...';
              return Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'CHECKSFLEET v$version',
                    style: const TextStyle(
                      color: Color(0xFF9CA3AF),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
          child: Text(
            title,
            style: const TextStyle(
              color: Color(0xFF64748B),
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
        ),
        ...children,
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildModernDrawerItem(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: iconColor, size: 22),
        ),
        title: Text(
          title,
          style: const TextStyle(
            color: Color(0xFF1A1A1A),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        trailing: const Icon(
          Icons.arrow_forward_ios_rounded,
          color: Color(0xFF9CA3AF),
          size: 14,
        ),
        dense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      ),
    );
  }
}
