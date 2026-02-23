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

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final DeepLinkService _deepLinkService = DeepLinkService();
  final MissionTrackingMonitor _trackingMonitor = MissionTrackingMonitor();
  StreamSubscription<Uri>? _linkSubscription;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: const AppDrawer(),
      body: Column(
        children: [
          const OfflineIndicator(),
          const Expanded(child: DashboardScreen()),
        ],
      ),
    );
  }
}
