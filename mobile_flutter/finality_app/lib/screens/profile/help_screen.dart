import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../theme/premium_theme.dart';
import '../../widgets/premium/premium_widgets.dart';
import 'support_chat_screen.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: PremiumTheme.lightBg,
      appBar: AppBar(
        title: Text(
          'Centre d\'aide',
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
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Header
          FadeInAnimation(
            delay: Duration.zero,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    PremiumTheme.primaryIndigo.withValues(alpha: 0.2),
                    PremiumTheme.primaryPurple.withValues(alpha: 0.2),
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
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      gradient: PremiumTheme.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.help_outline,
                      size: 40,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Comment pouvons-nous vous aider ?',
                    style: PremiumTheme.heading3,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Trouvez rapidement des réponses à vos questions',
                    style: PremiumTheme.bodySmall.copyWith(
                      color: PremiumTheme.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Section FAQ
          Text(
            'Questions Fréquentes',
            style: PremiumTheme.heading4,
          ),
          const SizedBox(height: 16),

          FadeInAnimation(
            delay: const Duration(milliseconds: 100),
            child: _buildFAQItem(
              question: 'Comment créer une nouvelle mission ?',
              answer: 'Allez dans l\'onglet Missions, puis cliquez sur le bouton + en bas à droite. Remplissez les informations de départ et d\'arrivée, puis validez.',
              icon: Icons.add_task,
              gradientColors: [PremiumTheme.primaryTeal, PremiumTheme.accentGreen],
            ),
          ),

          const SizedBox(height: 12),

          FadeInAnimation(
            delay: const Duration(milliseconds: 200),
            child: _buildFAQItem(
              question: 'Comment fonctionne le tracking GPS ?',
              answer: 'Le tracking GPS démarre automatiquement quand vous passez une mission en "En cours". Il s\'arrête automatiquement quand vous terminez la mission.',
              icon: Icons.location_on,
              gradientColors: [PremiumTheme.primaryBlue, PremiumTheme.primaryIndigo],
            ),
          ),

          const SizedBox(height: 12),

          FadeInAnimation(
            delay: const Duration(milliseconds: 300),
            child: _buildFAQItem(
              question: 'Comment faire une inspection de véhicule ?',
              answer: 'Depuis une mission, cliquez sur "Inspection Départ" ou "Inspection Arrivée". Suivez les étapes pour photographier le véhicule et noter les dommages éventuels.',
              icon: Icons.camera_alt,
              gradientColors: [PremiumTheme.primaryPurple, PremiumTheme.accentPink],
            ),
          ),

          const SizedBox(height: 12),

          FadeInAnimation(
            delay: const Duration(milliseconds: 400),
            child: _buildFAQItem(
              question: 'Comment scanner des documents ?',
              answer: 'Allez dans l\'onglet Scanner, prenez une photo du document. L\'app détectera automatiquement les bords et optimisera l\'image.',
              icon: Icons.document_scanner,
              gradientColors: [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
            ),
          ),

          const SizedBox(height: 12),

          FadeInAnimation(
            delay: const Duration(milliseconds: 500),
            child: _buildFAQItem(
              question: 'Comment gérer mes crédits ?',
              answer: 'Vos crédits sont affichés dans le Dashboard. Chaque inspection consomme 1 crédit. Vous pouvez acheter des crédits dans la section Abonnements.',
              icon: Icons.account_balance_wallet,
              gradientColors: [PremiumTheme.accentAmber, PremiumTheme.accentGreen],
            ),
          ),

          const SizedBox(height: 32),

          // Chat support
          FadeInAnimation(
            delay: const Duration(milliseconds: 550),
            child: PremiumCard(
              child: ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                leading: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: PremiumTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 24),
                ),
                title: Text('Chat avec le support',
                    style: PremiumTheme.body.copyWith(fontWeight: FontWeight.w600)),
                subtitle: Text('Discutez directement avec notre equipe',
                    style: PremiumTheme.bodySmall.copyWith(color: PremiumTheme.textSecondary)),
                trailing: const Icon(Icons.arrow_forward_ios_rounded,
                    color: PremiumTheme.primaryBlue, size: 16),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                ),
              ),
            ),
          ),

          const SizedBox(height: 32),

          // Section Contact
          Text(
            'Besoin d\'aide supplémentaire ?',
            style: PremiumTheme.heading4,
          ),
          const SizedBox(height: 16),

          FadeInAnimation(
            delay: const Duration(milliseconds: 600),
            child: _buildContactCard(
              icon: Icons.email,
              title: 'Email',
              subtitle: 'support@finality-convoyage.fr',
              gradientColors: [PremiumTheme.primaryBlue, PremiumTheme.primaryTeal],
              onTap: () => _launchEmail('support@finality-convoyage.fr'),
            ),
          ),

          const SizedBox(height: 12),

          FadeInAnimation(
            delay: const Duration(milliseconds: 700),
            child: _buildContactCard(
              icon: Icons.phone,
              title: 'Téléphone',
              subtitle: '+33 1 23 45 67 89',
              gradientColors: [PremiumTheme.primaryIndigo, PremiumTheme.primaryPurple],
              onTap: () => _launchPhone('+33123456789'),
            ),
          ),

          const SizedBox(height: 12),

          FadeInAnimation(
            delay: const Duration(milliseconds: 800),
            child: _buildContactCard(
              icon: Icons.language,
              title: 'Site Web',
              subtitle: 'www.finality-convoyage.fr',
              gradientColors: [PremiumTheme.primaryPurple, PremiumTheme.accentPink],
              onTap: () => _launchWebsite('https://www.finality-convoyage.fr'),
            ),
          ),

          const SizedBox(height: 32),

          // Tutoriels vidéo
          FadeInAnimation(
            delay: const Duration(milliseconds: 900),
            child: PremiumCard(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        gradient: PremiumTheme.redGradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.play_circle_outline,
                        size: 32,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Tutoriels Vidéo',
                      style: PremiumTheme.heading4,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Regardez nos tutoriels pour maîtriser l\'application',
                      style: PremiumTheme.bodySmall.copyWith(
                        color: PremiumTheme.textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    PremiumButton(
                      text: 'Voir les tutoriels',
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Les tutoriels vidéo arrivent bientôt. En attendant, contactez le support pour toute question.'),
                            backgroundColor: PremiumTheme.primaryTeal,
                            behavior: SnackBarBehavior.floating,
                            duration: Duration(seconds: 4),
                          ),
                        );
                      },
                      gradient: PremiumTheme.redGradient,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFAQItem({
    required String question,
    required String answer,
    required IconData icon,
    required List<Color> gradientColors,
  }) {
    return PremiumCard(
      useGlass: true,
      child: Theme(
        data: ThemeData(
          dividerColor: Colors.transparent,
        ),
        child: ExpansionTile(
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: gradientColors),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          title: Text(
            question,
            style: PremiumTheme.body.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          iconColor: PremiumTheme.textPrimary,
          collapsedIconColor: PremiumTheme.textSecondary,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Text(
                answer,
                style: PremiumTheme.bodySmall.copyWith(
                  color: PremiumTheme.textSecondary,
                  height: 1.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required List<Color> gradientColors,
    required VoidCallback onTap,
  }) {
    return PremiumCard(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: gradientColors),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
        title: Text(
          title,
          style: PremiumTheme.body.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: PremiumTheme.bodySmall.copyWith(
            color: PremiumTheme.primaryTeal,
          ),
        ),
        trailing: Icon(
          Icons.arrow_forward_ios,
          color: PremiumTheme.textSecondary,
          size: 16,
        ),
        onTap: onTap,
      ),
    );
  }

  Future<void> _launchEmail(String email) async {
    final Uri emailUri = Uri(
      scheme: 'mailto',
      path: email,
      query: 'subject=Demande d\'aide - Finality',
    );
    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
    }
  }

  Future<void> _launchPhone(String phone) async {
    final Uri phoneUri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(phoneUri)) {
      await launchUrl(phoneUri);
    }
  }

  Future<void> _launchWebsite(String url) async {
    final Uri uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
