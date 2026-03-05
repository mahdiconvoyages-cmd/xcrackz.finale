import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../main.dart';
import '../screens/splash_screen.dart';
import '../screens/onboarding/onboarding_screen.dart';
import '../screens/login_screen.dart';
import '../screens/home_screen.dart';
import '../screens/subscription/subscription_screen.dart';

/// Global navigator key for services that need navigator access
final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Application router using go_router
final GoRouter appRouter = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/',
  debugLogDiagnostics: false,
  routes: [
    GoRoute(
      path: '/',
      name: 'splash',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      name: 'onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      name: 'login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/home',
      name: 'home',
      redirect: (context, state) {
        // Auth guard — redirect to login if no session
        if (supabaseInitialized) {
          final user = Supabase.instance.client.auth.currentUser;
          if (user == null) return '/login';
        } else {
          return '/login';
        }
        return null; // No redirect, allow access
      },
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/subscription',
      name: 'subscription',
      builder: (context, state) => const SubscriptionScreen(),
    ),
  ],
);
