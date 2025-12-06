import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'screens/splash_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'providers/locale_provider.dart';
import 'services/sync_service.dart';
import 'services/offline_service.dart';
import 'theme/premium_theme.dart';
import 'utils/logger.dart';
import 'l10n/app_localizations.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialiser le logger
  logger.init();
  logger.i('🚀 Starting CHECKSFLEET app...');

  // Charger les variables d'environnement (OBLIGATOIRE)
  try {
    await dotenv.load(fileName: ".env");
    logger.i('✅ Environment variables loaded');
  } catch (e) {
    logger.f('❌ FATAL: Could not load .env file. Please create .env with SUPABASE_URL and SUPABASE_ANON_KEY');
    throw Exception('Missing .env file with Supabase credentials');
  }

  // Vérifier que les credentials sont présents
  final supabaseUrl = dotenv.env['SUPABASE_URL'];
  final supabaseAnonKey = dotenv.env['SUPABASE_ANON_KEY'];
  
  if (supabaseUrl == null || supabaseUrl.isEmpty) {
    throw Exception('SUPABASE_URL is required in .env file');
  }
  if (supabaseAnonKey == null || supabaseAnonKey.isEmpty) {
    throw Exception('SUPABASE_ANON_KEY is required in .env file');
  }

  await Supabase.initialize(
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  );
  
  logger.i('✅ Supabase initialized');
  
  // Initialiser OfflineService
  final offlineService = OfflineService();
  await offlineService.initialize();
  logger.i('✅ OfflineService initialized');

  runApp(
    const ProviderScope(
      child: CHECKSFLEETApp(),
    ),
  );
}

/// Client Supabase global (pour compatibilité)
SupabaseClient get supabase => Supabase.instance.client;

class CHECKSFLEETApp extends ConsumerWidget {
  const CHECKSFLEETApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Écouter le provider de locale
    final locale = ref.watch(localeProvider);
    
    return SyncProvider(
      syncService: SyncService(),
      child: MaterialApp(
        title: 'CHECKSFLEET - Inspections',
        debugShowCheckedModeBanner: false,
        theme: PremiumTheme.darkTheme,
        darkTheme: PremiumTheme.darkTheme,
        themeMode: ThemeMode.light,
        
        // Localisation
        locale: locale,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        
        initialRoute: '/',
        routes: {
          '/': (context) => const SplashScreen(),
          '/onboarding': (context) => const OnboardingScreen(),
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const HomeScreen(),
        },
      ),
    );
  }
}
