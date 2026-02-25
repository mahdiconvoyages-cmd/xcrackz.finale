import 'package:flutter/material.dart';
import '../utils/logger.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Écran d'onboarding pour la permission de localisation GPS.
/// Explique clairement pourquoi la localisation est nécessaire et rassure
/// le chauffeur que le suivi est limité aux missions en cours.
class LocationPermissionScreen extends StatefulWidget {
  const LocationPermissionScreen({super.key});

  @override
  State<LocationPermissionScreen> createState() =>
      _LocationPermissionScreenState();
}

class _LocationPermissionScreenState extends State<LocationPermissionScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideUp;
  bool _requesting = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeIn = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slideUp = Tween<Offset>(
      begin: const Offset(0, 0.15),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _requestPermission() async {
    setState(() => _requesting = true);

    try {
      // 1. Vérifier si le service de localisation est activé
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        await Geolocator.openLocationSettings();
        if (mounted) setState(() => _requesting = false);
        return;
      }

      // 2. Demander la permission
      LocationPermission permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      // 3. Si "While in use", demander "Always" pour le background
      if (permission == LocationPermission.whileInUse) {
        final result = await Geolocator.requestPermission();
        if (result == LocationPermission.whileInUse) {
          // Montrer un dialogue explicatif avant d'ouvrir les paramètres
          if (mounted) {
            final openSettings = await showDialog<bool>(
              context: context,
              builder: (ctx) => AlertDialog(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20)),
                title: const Row(
                  children: [
                    Icon(Icons.settings, color: Color(0xFF14B8A6)),
                    SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'Localisation "Toujours"',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                content: const Text(
                  'Pour que le suivi GPS fonctionne même quand l\'application '
                  'est en arrière-plan, veuillez sélectionner "Toujours autoriser" '
                  'dans les paramètres de l\'application.\n\n'
                  'Cela permet de vous localiser UNIQUEMENT pendant vos missions actives.',
                  style: TextStyle(fontSize: 14, height: 1.5),
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: const Text('Plus tard',
                        style: TextStyle(color: Colors.grey)),
                  ),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF14B8A6),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Ouvrir les paramètres',
                        style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            );

            if (openSettings == true) {
              await Geolocator.openAppSettings();
            }
          }
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          await showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              title: const Text('Permission refusée',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              content: const Text(
                'Vous avez refusé la localisation définitivement. '
                'Vous pouvez la réactiver dans les paramètres de votre téléphone '
                'à tout moment.',
                style: TextStyle(height: 1.5),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Compris'),
                ),
                ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    Geolocator.openAppSettings();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14B8A6),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Paramètres',
                      style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          );
        }
      }

      // Marquer comme demandé
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('location_permission_asked', true);

      if (mounted) Navigator.pop(context);
    } catch (e) {
      logger.e('Erreur permission localisation: $e');
      if (mounted) setState(() => _requesting = false);
    }
  }

  Future<void> _skipForNow() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('location_permission_asked', true);
    if (mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeIn,
            child: SlideTransition(
              position: _slideUp,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  children: [
                    const SizedBox(height: 40),

                    // Icône GPS animée
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const RadialGradient(
                          colors: [
                            Color(0xFF14B8A6),
                            Color(0xFF0D9488),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF14B8A6).withOpacity(0.4),
                            blurRadius: 30,
                            spreadRadius: 5,
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.my_location,
                        size: 56,
                        color: Colors.white,
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Titre
                    const Text(
                      'Localisation GPS',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.5,
                      ),
                    ),

                    const SizedBox(height: 12),

                    Text(
                      'Pour assurer le suivi de vos missions en temps réel',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 16,
                        height: 1.4,
                      ),
                    ),

                    const SizedBox(height: 40),

                    // Points de rassurance
                    _buildFeatureItem(
                      Icons.shield_outlined,
                      'Uniquement pendant vos missions',
                      'Votre position est partagée SEULEMENT quand '
                          'vous avez une mission active en cours.',
                      const Color(0xFF10B981),
                    ),

                    const SizedBox(height: 20),

                    _buildFeatureItem(
                      Icons.stop_circle_outlined,
                      'Arrêt automatique',
                      'Le suivi GPS s\'arrête automatiquement dès que '
                          'la mission est terminée. Aucun tracking en dehors.',
                      const Color(0xFF3B82F6),
                    ),

                    const SizedBox(height: 20),

                    _buildFeatureItem(
                      Icons.lock_outline,
                      'Données sécurisées',
                      'Votre position n\'est visible que par le créateur '
                          'de la mission et le client destinataire.',
                      const Color(0xFFF59E0B),
                    ),

                    const SizedBox(height: 20),

                    _buildFeatureItem(
                      Icons.speed,
                      'Suivi en arrière-plan',
                      'La localisation fonctionne même si l\'application est '
                          'fermée, pour un suivi précis et continu.',
                      const Color(0xFF8B5CF6),
                    ),

                    const Spacer(),

                    // Bouton principal
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _requesting ? null : _requestPermission,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF14B8A6),
                          disabledBackgroundColor:
                              const Color(0xFF14B8A6).withOpacity(0.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          elevation: 4,
                          shadowColor:
                              const Color(0xFF14B8A6).withOpacity(0.4),
                        ),
                        child: _requesting
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2.5,
                                ),
                              )
                            : const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.location_on,
                                      color: Colors.white, size: 22),
                                  SizedBox(width: 10),
                                  Text(
                                    'Autoriser la localisation',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Bouton secondaire
                    TextButton(
                      onPressed: _skipForNow,
                      child: Text(
                        'Plus tard',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem(
      IconData icon, String title, String description, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.55),
                  fontSize: 13,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
