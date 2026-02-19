import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:firebase_core/firebase_core.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'providers/locale_provider.dart';
import 'services/sync_service.dart';
import 'services/offline_service.dart';
import 'services/background_tracking_service.dart';
import 'services/connectivity_service.dart';
import 'services/fcm_service.dart';
import 'widgets/offline_sync_manager.dart';
import 'theme/premium_theme.dart';
import 'utils/logger.dart';
import 'l10n/app_localizations.dart';

/// Whether Supabase has been initialized successfully
bool supabaseInitialized = false;

/// Startup error for display
String? startupError;

/// Global connectivity service (singleton)
final connectivityService = ConnectivityService();

void main() {
  // Wrap absolutely everything in try-catch
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Logger
    try { logger.init(); } catch (_) {}

    // dotenv
    try {
      await dotenv.load(fileName: ".env");
    } catch (e) {
      startupError = '.env: $e';
    }

    // Supabase
    final url = dotenv.env['SUPABASE_URL'] ?? '';
    final key = dotenv.env['SUPABASE_ANON_KEY'] ?? '';

    if (url.isNotEmpty && key.isNotEmpty) {
      try {
        await Supabase.initialize(url: url, anonKey: key);
        supabaseInitialized = true;
      } catch (e) {
        startupError = 'Supabase: $e';
      }
    } else {
      startupError = 'Credentials manquants dans .env';
    }

    // Firebase & FCM
    try {
      await Firebase.initializeApp();
      await FCMService().initialize();
    } catch (e) {
      logger.e('Firebase init error: $e');
    }

    // OfflineService
    try {
      await OfflineService().initialize();
    } catch (_) {}

    // Background GPS Service
    try {
      await BackgroundTrackingService.initializeService();
    } catch (_) {}

    // Error handler
    FlutterError.onError = (d) => FlutterError.presentError(d);

    runApp(const ProviderScope(child: CHECKSFLEETApp()));
  }, (error, stack) {
    // Fatal crash — show red error screen
    runApp(MaterialApp(
      home: Scaffold(
        backgroundColor: const Color(0xFF1a1a2e),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Icon(Icons.error, color: Colors.red, size: 48),
                const SizedBox(height: 16),
                const Text('Erreur fatale', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Text('$error', style: const TextStyle(color: Colors.orange, fontSize: 13)),
                const SizedBox(height: 12),
                Text('$stack', style: const TextStyle(color: Colors.white38, fontSize: 10)),
              ],
            ),
          ),
        ),
      ),
    ));
  });
}

/// Client Supabase global
SupabaseClient get supabase => Supabase.instance.client;

class CHECKSFLEETApp extends ConsumerWidget {
  const CHECKSFLEETApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Erreur de démarrage
    if (startupError != null && !supabaseInitialized) {
      return MaterialApp(
        home: Scaffold(
          backgroundColor: const Color(0xFF0F172A),
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 64),
                  const SizedBox(height: 24),
                  const Text('Erreur de configuration', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Text(startupError!, style: const TextStyle(color: Colors.white70, fontSize: 14), textAlign: TextAlign.center),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // Locale
    Locale locale;
    try {
      locale = ref.watch(localeProvider);
    } catch (_) {
      locale = const Locale('fr');
    }

    // Build the app with OfflineSyncManager wrapping all screens
    return MaterialApp(
      title: 'CHECKSFLEET',
      debugShowCheckedModeBanner: false,
      theme: PremiumTheme.lightTheme,
      darkTheme: PremiumTheme.darkTheme,
      themeMode: ThemeMode.light,
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      builder: (context, child) {
        return OfflineSyncManager(
          offlineService: OfflineService(),
          connectivityService: connectivityService,
          child: child ?? const SizedBox.shrink(),
        );
      },
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/onboarding': (context) => const OnboardingScreen(),
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/subscription': (context) => const HomeScreen(),
      },
    );
  }
}
