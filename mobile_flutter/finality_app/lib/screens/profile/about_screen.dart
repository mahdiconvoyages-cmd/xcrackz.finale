import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';

class AboutScreen extends StatefulWidget {
  const AboutScreen({Key? key}) : super(key: key);

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  String _version = '';
  String _buildNumber = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAppInfo();
  }

  Future<void> _loadAppInfo() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() {
        _version = packageInfo.version;
        _buildNumber = packageInfo.buildNumber;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _version = '3.1.1';
        _buildNumber = '27';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        title: Text(
          'À propos',
          style: PremiumTheme.heading3,
        ),
        centerTitle: true,
        elevation: 0,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: PremiumTheme.primaryGradient,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(24),
              children: [
                // App Logo & Name
                FadeInAnimation(
                  delay: Duration.zero,
                  child: Container(
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          PremiumTheme.primaryTeal.withValues(alpha: 0.2),
                          PremiumTheme.primaryBlue.withValues(alpha: 0.2),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(PremiumTheme.radiusLG),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            gradient: PremiumTheme.tealGradient,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: PremiumTheme.primaryTeal.withValues(alpha: 0.5),
                                blurRadius: 30,
                                spreadRadius: 10,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.local_shipping,
                            size: 60,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'CHECKSFLEET',
                          style: PremiumTheme.heading1.copyWith(
                            fontSize: 32,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Inspection Professionnelle',
                          style: PremiumTheme.body.copyWith(
                            color: PremiumTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: PremiumTheme.primaryTeal.withValues(alpha: 0.5),
                            ),
                          ),
                          child: Text(
                            'Version $_version (Build $_buildNumber)',
                            style: PremiumTheme.bodySmall.copyWith(
                              color: PremiumTheme.primaryTeal,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Description
                FadeInAnimation(
                  delay: const Duration(milliseconds: 100),
                  child: PremiumCard(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      PremiumTheme.primaryBlue,
                                      PremiumTheme.primaryIndigo,
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.info_outline,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Text(
                                'À propos de l\'application',
                                style: PremiumTheme.heading4,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Finality est votre solution complète pour la gestion professionnelle de convoyages de véhicules. Suivez vos missions en temps réel, gérez vos inspections, scannez vos documents et bien plus encore.',
                            style: PremiumTheme.bodySmall.copyWith(
                              color: PremiumTheme.textSecondary,
                              height: 1.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Features
                FadeInAnimation(
                  delay: const Duration(milliseconds: 200),
                  child: PremiumCard(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      PremiumTheme.primaryTeal,
                                      PremiumTheme.accentGreen,
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Icon(
                                  Icons.star,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Text(
                                'Fonctionnalités',
                                style: PremiumTheme.heading4,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          _buildFeatureItem(
                            icon: Icons.location_on,
                            title: 'Tracking GPS en temps réel',
                            color: PremiumTheme.primaryTeal,
                          ),
                          _buildFeatureItem(
                            icon: Icons.camera_alt,
                            title: 'Inspections de véhicules',
                            color: PremiumTheme.primaryBlue,
                          ),
                          _buildFeatureItem(
                            icon: Icons.document_scanner,
                            title: 'Scanner de documents',
                            color: PremiumTheme.primaryIndigo,
                          ),
                          _buildFeatureItem(
                            icon: Icons.people,
                            title: 'Gestion de clients CRM',
                            color: PremiumTheme.primaryPurple,
                          ),
                          _buildFeatureItem(
                            icon: Icons.receipt,
                            title: 'Facturation & Devis',
                            color: PremiumTheme.accentAmber,
                          ),
                          _buildFeatureItem(
                            icon: Icons.share,
                            title: 'Partage de missions',
                            color: PremiumTheme.accentPink,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Legal Links
                FadeInAnimation(
                  delay: const Duration(milliseconds: 300),
                  child: PremiumCard(
                    child: Column(
                      children: [
                        ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  PremiumTheme.primaryPurple,
                                  PremiumTheme.accentPink,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.policy,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            'Conditions d\'utilisation',
                            style: PremiumTheme.body,
                          ),
                          trailing: Icon(
                            Icons.arrow_forward_ios,
                            size: 16,
                            color: PremiumTheme.textSecondary,
                          ),
                          onTap: () => _launchUrl('https://www.finality-convoyage.fr/terms'),
                        ),
                        Divider(
                          color: const Color(0xFFE5E7EB),
                          height: 1,
                        ),
                        ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  PremiumTheme.primaryIndigo,
                                  PremiumTheme.primaryPurple,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.privacy_tip,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            'Politique de confidentialité',
                            style: PremiumTheme.body,
                          ),
                          trailing: Icon(
                            Icons.arrow_forward_ios,
                            size: 16,
                            color: PremiumTheme.textSecondary,
                          ),
                          onTap: () => _launchUrl('https://www.finality-convoyage.fr/privacy'),
                        ),
                        Divider(
                          color: const Color(0xFFE5E7EB),
                          height: 1,
                        ),
                        ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  PremiumTheme.primaryBlue,
                                  PremiumTheme.primaryTeal,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                              Icons.gavel,
                              color: Colors.white,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            'Mentions légales',
                            style: PremiumTheme.body,
                          ),
                          trailing: Icon(
                            Icons.arrow_forward_ios,
                            size: 16,
                            color: PremiumTheme.textSecondary,
                          ),
                          onTap: () => _launchUrl('https://www.finality-convoyage.fr/legal'),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Contact & Social
                FadeInAnimation(
                  delay: const Duration(milliseconds: 400),
                  child: PremiumCard(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Text(
                            'Suivez-nous',
                            style: PremiumTheme.heading4,
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildSocialButton(
                                icon: Icons.language,
                                label: 'Web',
                                gradientColors: [
                                  PremiumTheme.primaryBlue,
                                  PremiumTheme.primaryTeal,
                                ],
                                onTap: () => _launchUrl('https://www.finality-convoyage.fr'),
                              ),
                              _buildSocialButton(
                                icon: Icons.facebook,
                                label: 'Facebook',
                                gradientColors: [
                                  PremiumTheme.primaryIndigo,
                                  PremiumTheme.primaryPurple,
                                ],
                                onTap: () => _launchUrl('https://facebook.com/finality'),
                              ),
                              _buildSocialButton(
                                icon: Icons.mail,
                                label: 'Email',
                                gradientColors: [
                                  PremiumTheme.primaryPurple,
                                  PremiumTheme.accentRed,
                                ],
                                onTap: () => _launchEmail('contact@finality-convoyage.fr'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Copyright
                Center(
                  child: Text(
                    '© 2025 Finality. Tous droits réservés.',
                    style: PremiumTheme.caption.copyWith(
                      color: PremiumTheme.textTertiary,
                    ),
                  ),
                ),

                const SizedBox(height: 8),

                Center(
                  child: Text(
                    'Fait avec ❤️ en France',
                    style: PremiumTheme.caption.copyWith(
                      color: PremiumTheme.textTertiary,
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: color,
              size: 16,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: PremiumTheme.bodySmall.copyWith(
                color: PremiumTheme.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required String label,
    required List<Color> gradientColors,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: gradientColors),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: PremiumTheme.bodySmall.copyWith(
                color: Colors.white,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _launchUrl(String url) async {
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _launchEmail(String email) async {
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: email,
      query: 'subject=Contact - Finality',
    );
    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    }
  }
}
