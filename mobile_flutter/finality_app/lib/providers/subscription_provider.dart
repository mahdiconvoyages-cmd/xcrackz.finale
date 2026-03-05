import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_subscription.dart';
import '../services/subscription_service.dart';
import '../utils/logger.dart';
import 'service_providers.dart';

part 'subscription_provider.g.dart';

/// Provider pour le service d'abonnement
@riverpod
SubscriptionService subscriptionService(Ref ref) {
  return SubscriptionService(client: ref.read(supabaseClientProvider));
}

/// État de l'abonnement utilisateur
class SubscriptionState {
  final UserSubscription? subscription;
  final Map<String, dynamic> stats;
  final Map<String, dynamic> features;
  final bool isLoading;
  final String? error;

  const SubscriptionState({
    this.subscription,
    this.stats = const {},
    this.features = const {},
    this.isLoading = false,
    this.error,
  });

  // Subscription status getters
  bool get hasActiveSubscription => subscription?.isActive ?? false;
  bool get isExpired => subscription?.isExpired ?? true;
  bool get isCancelled => subscription?.isCancelled ?? false;
  bool get isTrialing => subscription?.isTrialing ?? false;
  bool get isFree => subscription?.isFree ?? true;
  bool get isPremium => subscription?.isPremium ?? false;
  bool get isExpiringSoon => subscription?.isExpiringSoon ?? false;
  bool get autoRenew => subscription?.autoRenew ?? false;

  // Plan getters
  String get plan => subscription?.plan ?? 'free';
  String get planDisplayName => subscription?.displayName ?? 'Gratuit';
  String get status => subscription?.status ?? 'expired';
  int get daysRemaining => subscription?.daysRemaining ?? 0;
  DateTime? get expiresAt => subscription?.expiresAt;
  int? get creditsPerMonth => subscription?.creditsPerMonth;

  // Feature access getters
  int get creditsBalance => stats['creditsPerMonth'] as int? ?? 0;
  int get missionsLimit => stats['missionsLimit'] as int? ?? 5;
  bool get hasUnlimitedMissions => missionsLimit == -1;

  SubscriptionState copyWith({
    UserSubscription? subscription,
    Map<String, dynamic>? stats,
    Map<String, dynamic>? features,
    bool? isLoading,
    String? error,
  }) {
    return SubscriptionState(
      subscription: subscription ?? this.subscription,
      stats: stats ?? this.stats,
      features: features ?? this.features,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Provider Riverpod pour l'abonnement
@riverpod
class Subscription extends _$Subscription {
  SubscriptionService get _service => ref.read(subscriptionServiceProvider);
  SupabaseClient get _supabase => Supabase.instance.client;

  @override
  Future<SubscriptionState> build() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return const SubscriptionState();

    try {
      final subscription = await _service.getUserSubscription(user.id);
      final features = _service.getPlanFeatures(subscription.plan);
      final stats = await _service.getSubscriptionStats(user.id);

      return SubscriptionState(
        subscription: subscription,
        stats: stats,
        features: features,
      );
    } catch (e, stack) {
      logger.e('❌ Failed to initialize subscription', e, stack);
      return SubscriptionState(error: e.toString());
    }
  }

  /// Initialiser l'abonnement (alias for invalidate — kept for compat)
  Future<void> initialize() async {
    ref.invalidateSelf();
  }

  /// Rafraîchir les données
  Future<void> refresh() async {
    ref.invalidateSelf();
  }

  /// Vérifier si l'utilisateur a accès à une fonctionnalité
  Future<bool> hasFeatureAccess(String feature) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;
    return await _service.hasFeatureAccess(user.id, feature);
  }

  /// Vérifier si l'utilisateur peut effectuer une action
  Future<bool> canPerformAction(String action) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;
    return await _service.canPerformAction(user.id, action);
  }

  /// Annuler l'abonnement
  Future<bool> cancelSubscription() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final prev = state.valueOrNull ?? const SubscriptionState();
    state = AsyncData(prev.copyWith(isLoading: true, error: null));

    try {
      final subscription = await _service.cancelSubscription(user.id);
      final stats = await _service.getSubscriptionStats(user.id);

      state = AsyncData(prev.copyWith(
        subscription: subscription,
        stats: stats,
        isLoading: false,
      ));
      
      logger.i('✅ Subscription cancelled');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to cancel subscription', e, stack);
      state = AsyncData(prev.copyWith(isLoading: false, error: e.toString()));
      return false;
    }
  }

  /// Réactiver l'abonnement
  Future<bool> reactivateSubscription() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final prev = state.valueOrNull ?? const SubscriptionState();
    state = AsyncData(prev.copyWith(isLoading: true, error: null));

    try {
      final subscription = await _service.reactivateSubscription(user.id);
      final stats = await _service.getSubscriptionStats(user.id);

      state = AsyncData(prev.copyWith(
        subscription: subscription,
        stats: stats,
        isLoading: false,
      ));
      
      logger.i('✅ Subscription reactivated');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to reactivate subscription', e, stack);
      state = AsyncData(prev.copyWith(isLoading: false, error: e.toString()));
      return false;
    }
  }

  /// Obtenir la valeur d'une fonctionnalité
  dynamic getFeature(String featureName) {
    final current = state.valueOrNull ?? const SubscriptionState();
    return current.features[featureName];
  }

  /// Obtenir tous les plans pour l'écran de comparaison
  List<Map<String, dynamic>> getAllPlans() {
    return [
      _service.getPlanFeatures('free'),
      _service.getPlanFeatures('basic'),
      _service.getPlanFeatures('premium'),
      _service.getPlanFeatures('enterprise'),
    ];
  }

  /// Effacer l'erreur
  void clearError() {
    final prev = state.valueOrNull ?? const SubscriptionState();
    state = AsyncData(prev.copyWith(error: null));
  }

  /// Réinitialiser le provider
  void reset() {
    state = const AsyncData(SubscriptionState());
  }
}
