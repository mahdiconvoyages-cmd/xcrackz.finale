import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import '../l10n/app_localizations.dart';
import '../providers/credits_provider.dart';
import '../providers/subscription_provider.dart';
import '../services/deep_link_service.dart';
import '../services/mission_tracking_monitor.dart';
import '../services/subscription_service.dart';
import '../widgets/app_drawer.dart';
import '../widgets/offline_indicator.dart';
import '../utils/logger.dart';
import 'location_permission_screen.dart';
import 'dashboard/dashboard_screen.dart';
import 'missions/missions_screen.dart';
import 'missions/mission_create_screen_new.dart';
import 'crm/crm_screen.dart';
import 'scanned_documents/scanned_documents_screen_new.dart';
import '../widgets/billing_gate.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;
  final DeepLinkService _deepLinkService = DeepLinkService();
  final MissionTrackingMonitor _trackingMonitor = MissionTrackingMonitor();
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    // Initialize providers
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Initialiser les providers Riverpod
      ref.read(creditsProvider.notifier).initialize();
      ref.read(subscriptionProvider.notifier).initialize();
      
      // Vérifier et reset les crédits si abonnement expiré
      _checkExpiredSubscription();
      
      // Initialize deep linking
      _deepLinkService.initialize();
      _linkSubscription = _deepLinkService.linkStream.listen((uri) {
        _deepLinkService.handleDeepLink(context, uri);
      });
      
      // Démarrer la surveillance automatique du tracking GPS
      _trackingMonitor.startMonitoring();
      _trackingMonitor.syncTrackingState();
      
      logger.i('✅ Surveillance tracking GPS initialisée');
      
      // Afficher l'écran de permission localisation si pas encore demandé
      _showLocationPermissionIfNeeded();
    });
  }

  /// Affiche l'écran de permission GPS si pas encore demandé
  Future<void> _showLocationPermissionIfNeeded() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final alreadyAsked = prefs.getBool('location_permission_asked') ?? false;
      if (!alreadyAsked && mounted) {
        // Petit délai pour que l'interface soit chargée
        await Future.delayed(const Duration(milliseconds: 600));
        if (!mounted) return;
        await Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => const LocationPermissionScreen(),
            transitionsBuilder: (_, animation, __, child) {
              return FadeTransition(opacity: animation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 300),
          ),
        );
      }
    } catch (e) {
      logger.e('Erreur permission localisation: $e');
    }
  }

  /// Vérifie si l'abonnement est expiré et reset les crédits à 0
  Future<void> _checkExpiredSubscription() async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) return;
      
      final subscriptionService = SubscriptionService();
      await subscriptionService.checkAndResetExpiredCredits(userId);
      
      // Rafraîchir les providers après la vérification
      ref.read(creditsProvider.notifier).refresh();
      ref.read(subscriptionProvider.notifier).refresh();
      
      logger.i('✅ Vérification abonnement/crédits effectuée');
    } catch (e) {
      logger.e('❌ Erreur vérification abonnement: $e');
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _trackingMonitor.stopMonitoring();
    super.dispose();
  }

  final List<Widget> _screens = [
    const DashboardScreen(),
    const MissionsScreen(),
    const BillingGate(child: CRMScreen()),
    const ScannedDocumentsScreenNew(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      body: Column(
        children: [
          const OfflineIndicator(),
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: _screens,
            ),
          ),
        ],
      ),
      floatingActionButton: _currentIndex == 1 // Missions tab
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const MissionCreateScreenNew(),
                  ),
                );
              },
              icon: const Icon(Icons.add_road),
              label: Text(AppLocalizations.of(context).newMission),
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              elevation: 4,
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.dashboard_outlined),
            selectedIcon: const Icon(Icons.dashboard),
            label: AppLocalizations.of(context).dashboard,
          ),
          NavigationDestination(
            icon: const Icon(Icons.assignment_outlined),
            selectedIcon: const Icon(Icons.assignment),
            label: AppLocalizations.of(context).missions,
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long),
            label: AppLocalizations.of(context).crm,
          ),
          NavigationDestination(
            icon: const Icon(Icons.document_scanner_outlined),
            selectedIcon: const Icon(Icons.document_scanner),
            label: AppLocalizations.of(context).scanner,
          ),
        ],
      ),
    );
  }
}
