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
import '../services/update_service.dart';
import '../widgets/app_drawer.dart';
import '../widgets/offline_indicator.dart';
import '../widgets/update_dialog.dart';
import '../utils/logger.dart';
import '../theme/premium_theme.dart';
import 'dashboard/dashboard_screen.dart';
import 'missions/missions_screen.dart';
import 'missions/mission_create_screen_new.dart';
import 'scanned_documents/scanned_documents_screen_new.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  final DeepLinkService _deepLinkService = DeepLinkService();
  final MissionTrackingMonitor _trackingMonitor = MissionTrackingMonitor();
  StreamSubscription<Uri>? _linkSubscription;

  late final List<Widget> _screens;

  void _navigateToMissions() {
    setState(() => _currentIndex = 1);
  }

  @override
  void initState() {
    super.initState();
    _screens = [
      DashboardScreen(onNavigateToMissions: _navigateToMissions),
      const MissionsScreen(),
    ];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(creditsProvider.notifier).initialize();
      ref.read(subscriptionProvider.notifier).initialize();
      _checkExpiredSubscription();
      _deepLinkService.initialize();
      _linkSubscription = _deepLinkService.linkStream.listen((uri) {
        _deepLinkService.handleDeepLink(context, uri);
      });
      _trackingMonitor.startMonitoring();
      _trackingMonitor.syncTrackingState();
      logger.i('✅ Surveillance tracking GPS initialisée');
      // Vérification de mise à jour OTA
      _checkForAppUpdate();
    });
  }

  Future<void> _checkExpiredSubscription() async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) return;
      final subscriptionService = SubscriptionService();
      await subscriptionService.checkAndResetExpiredCredits(userId);
      ref.read(creditsProvider.notifier).refresh();
      ref.read(subscriptionProvider.notifier).refresh();
      logger.i('✅ Vérification abonnement/crédits effectuée');
    } catch (e) {
      logger.e('❌ Erreur vérification abonnement: $e');
    }
  }

  /// Vérifie si une mise à jour est disponible et affiche le dialog
  Future<void> _checkForAppUpdate() async {
    try {
      // Petit délai pour laisser l'UI se charger
      await Future.delayed(const Duration(seconds: 2));

      final update = await UpdateService.instance.checkForUpdate();
      if (update != null && mounted) {
        // Vérifier si l'utilisateur a déjà ignoré cette version aujourd'hui
        final prefs = await SharedPreferences.getInstance();
        final skippedKey = 'update_skipped_${update.buildNumber}';
        final skippedAt = prefs.getString(skippedKey);

        if (!update.isMandatory && skippedAt != null) {
          final skippedDate = DateTime.tryParse(skippedAt);
          if (skippedDate != null && DateTime.now().difference(skippedDate).inHours < 24) {
            logger.i('⏭️ MAJ ${update.version} ignorée il y a moins de 24h');
            return;
          }
        }

        if (!mounted) return;
        final accepted = await UpdateDialog.show(context, update);

        // Sauvegarder si l'utilisateur a ignoré
        if (!accepted && !update.isMandatory) {
          await prefs.setString(skippedKey, DateTime.now().toIso8601String());
        }
      }
    } catch (e) {
      logger.e('❌ Erreur vérification MAJ: $e');
    }
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _trackingMonitor.stopMonitoring();
    super.dispose();
  }

  void _openDocuments() {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => const ScannedDocumentsScreenNew(),
    ));
  }

  void _openNewMission() {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => const MissionCreateScreenNew(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          setState(() => _currentIndex = 0);
        }
      },
      child: Scaffold(
      key: _scaffoldKey,
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
      // FAB : Nouvelle mission (visible onglet Missions)
      floatingActionButton: _currentIndex == 1
          ? FloatingActionButton.extended(
              onPressed: _openNewMission,
              icon: const Icon(Icons.add_road),
              label: Text(l10n.newMission),
              backgroundColor: PremiumTheme.brandViolet,
              foregroundColor: Colors.white,
              elevation: 4,
            )
          : null,
      // Bottom bar compacte iOS-friendly
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) {
          if (i == 2) {
            // Documents scannés
            _openDocuments();
          } else if (i == 3) {
            // Menu — ouvre le drawer
            _scaffoldKey.currentState?.openDrawer();
          } else {
            setState(() => _currentIndex = i);
          }
        },
        backgroundColor: Colors.white,
        indicatorColor: PremiumTheme.brandViolet.withOpacity(0.12),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: PremiumTheme.brandViolet),
            label: l10n.dashboard,
          ),
          NavigationDestination(
            icon: const Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment, color: PremiumTheme.brandViolet),
            label: l10n.missions,
          ),
          NavigationDestination(
            icon: const Icon(Icons.folder_copy_outlined),
            selectedIcon: Icon(Icons.folder_copy, color: PremiumTheme.brandViolet),
            label: 'Documents',
          ),
          NavigationDestination(
            icon: const Icon(Icons.menu_rounded),
            selectedIcon: Icon(Icons.menu_rounded, color: PremiumTheme.brandViolet),
            label: 'Menu',
          ),
        ],
      ),
      ),
    );
  }
}
