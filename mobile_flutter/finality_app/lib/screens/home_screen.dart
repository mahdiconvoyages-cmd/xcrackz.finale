import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../providers/credits_provider.dart';
import '../providers/subscription_provider.dart';
import '../services/deep_link_service.dart';
import '../services/mission_tracking_monitor.dart';
import '../widgets/app_drawer.dart';
import '../widgets/offline_indicator.dart';
import 'dashboard/dashboard_screen.dart';
import 'missions/missions_screen.dart';
import 'missions/mission_create_screen_new.dart';
import 'crm/crm_screen.dart';
import 'scanned_documents/scanned_documents_screen_new.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  final DeepLinkService _deepLinkService = DeepLinkService();
  final MissionTrackingMonitor _trackingMonitor = MissionTrackingMonitor();
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    // Initialize providers
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CreditsProvider>().initialize();
      context.read<SubscriptionProvider>().initialize();
      
      // Initialize deep linking
      _deepLinkService.initialize();
      _linkSubscription = _deepLinkService.linkStream.listen((uri) {
        _deepLinkService.handleDeepLink(context, uri);
      });
      
      // Démarrer la surveillance automatique du tracking GPS
      _trackingMonitor.startMonitoring();
      _trackingMonitor.syncTrackingState();
      
      print('✅ Surveillance tracking GPS initialisée');
    });
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
    const CRMScreen(),
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
              label: const Text('Nouvelle mission'),
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
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Missions',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'CRM',
          ),
          NavigationDestination(
            icon: Icon(Icons.document_scanner_outlined),
            selectedIcon: Icon(Icons.document_scanner),
            label: 'Scanner',
          ),
        ],
      ),
    );
  }
}
