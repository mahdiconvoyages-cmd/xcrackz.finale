import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../l10n/app_localizations.dart';
import '../../main.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';
import '../settings/settings_screen.dart';
import 'help_screen.dart';
import 'about_screen.dart';
import 'edit_profile_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _firstName = '';
  String _lastName = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId != null) {
        final response = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .maybeSingle();
        
        if (response != null) {
          if (!mounted) return;
          setState(() {
            _firstName = response['first_name'] ?? '';
            _lastName = response['last_name'] ?? '';
            _isLoading = false;
          });
        } else {
          if (!mounted) return;
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = supabase.auth.currentUser;
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: PremiumTheme.tealGradient,
            boxShadow: [
              BoxShadow(
                color: PremiumTheme.primaryTeal.withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Image.asset(
                'assets/images/logo.png',
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(width: 12),
            Text(
              l10n.profile,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                shadows: [
                  Shadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    offset: const Offset(0, 2),
                    blurRadius: 4,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ShimmerLoading(
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                  ),
                  const SizedBox(height: 24),
                  ShimmerLoading(
                    width: MediaQuery.of(context).size.width - 48,
                    height: 80,
                    borderRadius: PremiumTheme.radiusLG,
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Profile Card with Premium Design
                FadeInAnimation(
                  delay: Duration.zero,
                  child: Container(
                    decoration: PremiumTheme.glassCardWithGradient(PremiumTheme.tealGradient),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        // Avatar with gradient border
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: PremiumTheme.primaryGradient,
                            boxShadow: [
                              BoxShadow(
                                color: PremiumTheme.primaryTeal.withValues(alpha: 0.5),
                                blurRadius: 20,
                                spreadRadius: 5,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(4),
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              Icons.person,
                              size: 50,
                              color: PremiumTheme.primaryTeal,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _firstName.isNotEmpty || _lastName.isNotEmpty
                              ? '$_firstName $_lastName'
                              : l10n.user,
                          style: PremiumTheme.heading2.copyWith(
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          user?.email ?? l10n.emailNotAvailable,
                          style: PremiumTheme.body.copyWith(
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.verified,
                                color: Colors.white,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                l10n.professionalDriver,
                                style: PremiumTheme.bodySmall.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        // Edit Profile Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () async {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => const EditProfileScreen(),
                                ),
                              );
                              if (result == true) {
                                _loadProfile(); // Reload profile after edit
                              }
                            },
                            icon: const Icon(Icons.edit, size: 18),
                            label: Text(l10n.editProfile),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white.withValues(alpha: 0.2),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: BorderSide(
                                  color: Colors.white.withValues(alpha: 0.3),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                // Menu Items with Animations
                FadeInAnimation(
                  delay: const Duration(milliseconds: 100),
                  child: _buildMenuCard(
                    icon: Icons.settings,
                    title: l10n.settings,
                    subtitle: l10n.managePreferences,
                    gradientColors: [PremiumTheme.primaryBlue, PremiumTheme.primaryIndigo],
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const SettingsScreen(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                FadeInAnimation(
                  delay: const Duration(milliseconds: 200),
                  child: _buildMenuCard(
                    icon: Icons.credit_card,
                    title: l10n.subscriptions,
                    subtitle: l10n.manageSubscription,
                    gradientColors: [PremiumTheme.primaryTeal, PremiumTheme.accentGreen],
                    onTap: () {
                      Navigator.of(context).pushNamed('/subscription');
                    },
                  ),
                ),
                const SizedBox(height: 12),
                FadeInAnimation(
                  delay: const Duration(milliseconds: 300),
                  child: _buildMenuCard(
                    icon: Icons.help_outline,
                    title: l10n.help,
                    subtitle: l10n.helpCenter,
                    gradientColors: [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const HelpScreen(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                FadeInAnimation(
                  delay: const Duration(milliseconds: 400),
                  child: _buildMenuCard(
                    icon: Icons.info_outline,
                    title: l10n.about,
                    subtitle: l10n.versionInfo,
                    gradientColors: [PremiumTheme.primaryPurple, PremiumTheme.accentPink],
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const AboutScreen(),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                // Logout Button with Animation
                FadeInAnimation(
                  delay: const Duration(milliseconds: 500),
                  child: Container(
                    decoration: BoxDecoration(
                      color: PremiumTheme.cardBg.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
                      border: Border.all(
                        color: PremiumTheme.accentRed.withValues(alpha: 0.5),
                        width: 2,
                      ),
                    ),
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          gradient: PremiumTheme.redGradient,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.logout,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                      title: Text(
                        l10n.logout,
                        style: PremiumTheme.body.copyWith(
                          color: PremiumTheme.accentRed,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      trailing: Icon(
                        Icons.chevron_right,
                        color: PremiumTheme.accentRed,
                      ),
                      onTap: () => _showLogoutDialog(context),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildMenuCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required List<Color> gradientColors,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
        border: Border.all(
          color: gradientColors[0].withValues(alpha: 0.25),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: gradientColors[0].withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: gradientColors,
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: gradientColors[0].withValues(alpha: 0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: PremiumTheme.body.copyWith(
                          fontWeight: FontWeight.bold,
                          color: PremiumTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: PremiumTheme.bodySmall.copyWith(
                          color: PremiumTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: gradientColors[0].withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.chevron_right,
                    color: gradientColors[0],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () async {
              await supabase.auth.signOut();
              if (!context.mounted) return;
              Navigator.of(context).pushReplacementNamed('/login');
            },
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );
  }
}
