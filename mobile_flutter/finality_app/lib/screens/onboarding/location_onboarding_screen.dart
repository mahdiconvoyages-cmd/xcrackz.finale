import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Tutoriel d'activation de la localisation "Toujours autoriser"
/// Affiché avant la première utilisation du Réseau Planning
class LocationOnboardingScreen extends StatefulWidget {
  final VoidCallback onCompleted;

  const LocationOnboardingScreen({super.key, required this.onCompleted});

  static const _prefKey = 'location_onboarding_completed';

  /// Vérifie si l'onboarding a déjà été fait
  static Future<bool> isCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_prefKey) ?? false;
  }

  /// Marque l'onboarding comme complété
  static Future<void> markCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_prefKey, true);
  }

  @override
  State<LocationOnboardingScreen> createState() => _LocationOnboardingScreenState();
}

class _LocationOnboardingScreenState extends State<LocationOnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;
  bool _locationGranted = false;
  bool _alwaysGranted = false;
  bool _checking = false;

  final _pages = <_OnboardingStep>[
    _OnboardingStep(
      icon: Icons.location_on_rounded,
      color: Color(0xFF6366F1),
      title: 'Localisation en temps réel',
      description:
          'Pour que l\'Entraide Convoyeurs fonctionne parfaitement, nous avons besoin de votre position GPS.\n\n'
          'Cela permet de :\n'
          '• Calculer les ETA vers chaque ville\n'
          '• Matcher vos trajets avec d\'autres convoyeurs\n'
          '• Savoir quand vous avez quitté une ville',
      illustration: 'gps',
    ),
    _OnboardingStep(
      icon: Icons.settings_rounded,
      color: Color(0xFFF59E0B),
      title: 'Autoriser "Toujours"',
      description: Platform.isIOS
          ? 'Sur iPhone :\n\n'
            '1. Touchez "Autoriser" quand la popup apparaît\n'
            '2. Allez dans Réglages → ChecksFleet → Position\n'
            '3. Sélectionnez "Toujours"\n\n'
            'Cela permet le suivi même quand l\'app est en arrière-plan.'
          : 'Sur Android :\n\n'
            '1. Touchez "Autoriser" → "Lors de l\'utilisation"\n'
            '2. Une 2ème popup demandera "Toujours autoriser"\n'
            '3. Acceptez pour le suivi en arrière-plan\n\n'
            'Si la popup n\'apparaît pas: Paramètres → Applis → ChecksFleet → Autorisations → Position → Toujours.',
      illustration: 'settings',
    ),
    _OnboardingStep(
      icon: Icons.check_circle_rounded,
      color: Color(0xFF10B981),
      title: 'Tout est prêt !',
      description:
          'Votre position sera utilisée uniquement pour :\n\n'
          '✅ Calcul d\'ETA en temps réel\n'
          '✅ Matching IA entre convoyeurs\n'
          '✅ Expiration automatique des étapes\n\n'
          'Aucune donnée n\'est partagée avec des tiers.\n'
          'Vous pouvez désactiver à tout moment.',
      illustration: 'done',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _checkCurrentPermission();
  }

  Future<void> _checkCurrentPermission() async {
    final perm = await Geolocator.checkPermission();
    setState(() {
      _locationGranted = perm == LocationPermission.whileInUse || perm == LocationPermission.always;
      _alwaysGranted = perm == LocationPermission.always;
    });
  }

  Future<void> _requestPermission() async {
    setState(() => _checking = true);

    // Step 1: Demander "while in use" d'abord
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }

    if (perm == LocationPermission.deniedForever) {
      // Ouvrir les paramètres
      await openAppSettings();
      setState(() => _checking = false);
      return;
    }

    setState(() {
      _locationGranted = perm == LocationPermission.whileInUse || perm == LocationPermission.always;
    });

    // Step 2: Demander "always" (Android 10+)
    if (perm == LocationPermission.whileInUse) {
      if (Platform.isAndroid) {
        final bgStatus = await Permission.locationAlways.request();
        setState(() {
          _alwaysGranted = bgStatus.isGranted;
        });
      } else {
        // iOS: request always via Geolocator
        perm = await Geolocator.requestPermission();
        setState(() {
          _alwaysGranted = perm == LocationPermission.always;
        });
      }
    } else if (perm == LocationPermission.always) {
      setState(() => _alwaysGranted = true);
    }

    setState(() => _checking = false);
  }

  Future<void> _complete() async {
    await LocationOnboardingScreen.markCompleted();
    widget.onCompleted();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Progress dots
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  _pages.length,
                  (i) => AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == i ? 28 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentPage == i ? _pages[i].color : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),
            ),

            // Pages
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemCount: _pages.length,
                itemBuilder: (context, index) {
                  final page = _pages[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Icon circle
                        Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            color: page.color.withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(page.icon, size: 56, color: page.color),
                        ),
                        const SizedBox(height: 32),
                        Text(
                          page.title,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF1E293B)),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          page.description,
                          style: const TextStyle(fontSize: 15, color: Color(0xFF64748B), height: 1.5),
                          textAlign: TextAlign.center,
                        ),

                        // Permission status on page 2
                        if (index == 1) ...[
                          const SizedBox(height: 24),
                          _PermissionStatus(
                            label: 'Position basique',
                            granted: _locationGranted,
                          ),
                          const SizedBox(height: 8),
                          _PermissionStatus(
                            label: 'Toujours autoriser (arrière-plan)',
                            granted: _alwaysGranted,
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: _checking ? null : _requestPermission,
                            icon: _checking
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.location_on),
                            label: Text(_alwaysGranted ? 'Permission accordée ✓' : 'Activer la localisation'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _alwaysGranted ? const Color(0xFF10B981) : const Color(0xFF6366F1),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ),
                          if (!_alwaysGranted && _locationGranted) ...[
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: () => openAppSettings(),
                              child: const Text(
                                'Ouvrir les paramètres de l\'app',
                                style: TextStyle(color: Color(0xFF6366F1), fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ],

                        // Final page: status summary
                        if (index == 2) ...[
                          const SizedBox(height: 24),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: _alwaysGranted ? const Color(0xFFD1FAE5) : const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _alwaysGranted ? Icons.check_circle : Icons.info_outline,
                                  color: _alwaysGranted ? const Color(0xFF059669) : const Color(0xFFD97706),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _alwaysGranted
                                        ? 'Localisation "Toujours" activée. Parfait !'
                                        : 'La localisation en arrière-plan n\'est pas activée. Certaines fonctions seront limitées.',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: _alwaysGranted ? const Color(0xFF059669) : const Color(0xFFD97706),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),

            // Bottom buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 0, 32, 24),
              child: Row(
                children: [
                  if (_currentPage > 0)
                    TextButton(
                      onPressed: () {
                        _pageController.previousPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      },
                      child: const Text('Précédent', style: TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  const Spacer(),
                  if (_currentPage < _pages.length - 1)
                    ElevatedButton(
                      onPressed: () {
                        _pageController.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Suivant', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  if (_currentPage == _pages.length - 1)
                    ElevatedButton.icon(
                      onPressed: _complete,
                      icon: const Icon(Icons.rocket_launch_rounded, size: 18),
                      label: const Text('C\'est parti !'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OnboardingStep {
  final IconData icon;
  final Color color;
  final String title;
  final String description;
  final String illustration;

  const _OnboardingStep({
    required this.icon,
    required this.color,
    required this.title,
    required this.description,
    required this.illustration,
  });
}

class _PermissionStatus extends StatelessWidget {
  final String label;
  final bool granted;

  const _PermissionStatus({required this.label, required this.granted});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: granted ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            granted ? Icons.check_circle : Icons.cancel,
            size: 20,
            color: granted ? const Color(0xFF059669) : const Color(0xFFDC2626),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: granted ? const Color(0xFF059669) : const Color(0xFFDC2626),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
