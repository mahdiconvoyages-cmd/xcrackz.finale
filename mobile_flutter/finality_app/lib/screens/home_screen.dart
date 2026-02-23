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
import 'document_scanner/document_scanner_pro_screen.dart';

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

  final List<Widget> _screens = const [
    DashboardScreen(),
    MissionsScreen(),
  ];

  @override
  void initState() {
    super.initState();
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
      _showLocationPermissionIfNeeded();
    });
  }

  Future<void> _showLocationPermissionIfNeeded() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final alreadyAsked = prefs.getBool('location_permission_asked') ?? false;
      if (!alreadyAsked && mounted) {
        await Future.delayed(const Duration(milliseconds: 600));
        if (!mounted) return;
        await Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (_, __, ___) => const LocationPermissionScreen(),
            transitionsBuilder: (_, animation, __, child) =>
                FadeTransition(opacity: animation, child: child),
            transitionDuration: const Duration(milliseconds: 300),
          ),
        );
      }
    } catch (e) {
      logger.e('Erreur permission localisation: $e');
    }
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

  @override
  void dispose() {
    _linkSubscription?.cancel();
    _trackingMonitor.stopMonitoring();
    super.dispose();
  }

  void _openScanner() {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => const DocumentScannerProScreen(),
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
    return Scaffold(
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
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              elevation: 4,
            )
          : null,
      // Bottom bar compacte iOS-friendly
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) {
          if (i == 2) {
            // Scanner — push plein écran sans changer d'onglet
            _openScanner();
          } else if (i == 3) {
            // Menu — ouvre le drawer
            _scaffoldKey.currentState?.openDrawer();
          } else {
            setState(() => _currentIndex = i);
          }
        },
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFF8B5CF6).withOpacity(0.12),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.dashboard_outlined),
            selectedIcon: const Icon(Icons.dashboard, color: Color(0xFF8B5CF6)),
            label: l10n.dashboard,
          ),
          NavigationDestination(
            icon: const Icon(Icons.assignment_outlined),
            selectedIcon: const Icon(Icons.assignment, color: Color(0xFF8B5CF6)),
            label: l10n.missions,
          ),
          const NavigationDestination(
            icon: Icon(Icons.document_scanner_outlined),
            selectedIcon: Icon(Icons.document_scanner, color: Color(0xFF8B5CF6)),
            label: 'Scanner',
          ),
          const NavigationDestination(
            icon: Icon(Icons.menu_rounded),
            selectedIcon: Icon(Icons.menu_rounded, color: Color(0xFF8B5CF6)),
            label: 'Menu',
          ),
        ],
      ),
    );
  }
}
