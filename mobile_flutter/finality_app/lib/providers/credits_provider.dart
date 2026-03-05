import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_credits.dart';
import '../services/credits_service.dart';
import '../utils/logger.dart';

part 'credits_provider.g.dart';

/// Provider pour le service de crédits
@riverpod
CreditsService creditsService(Ref ref) {
  return CreditsService();
}

/// État des crédits utilisateur
class CreditsState {
  final UserCredits? userCredits;
  final List<CreditTransaction> transactions;
  final Map<String, dynamic> stats;
  final bool isLoading;
  final String? error;

  const CreditsState({
    this.userCredits,
    this.transactions = const [],
    this.stats = const {},
    this.isLoading = false,
    this.error,
  });

  int get credits => userCredits?.credits ?? 0;
  bool get hasCredits => credits > 0;

  CreditsState copyWith({
    UserCredits? userCredits,
    List<CreditTransaction>? transactions,
    Map<String, dynamic>? stats,
    bool? isLoading,
    String? error,
  }) {
    return CreditsState(
      userCredits: userCredits ?? this.userCredits,
      transactions: transactions ?? this.transactions,
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Provider Riverpod pour les crédits
@riverpod
class Credits extends _$Credits {
  CreditsService get _service => ref.read(creditsServiceProvider);
  SupabaseClient get _supabase => Supabase.instance.client;

  @override
  Future<CreditsState> build() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return const CreditsState();

    try {
      final userCredits = await _service.getUserCredits(user.id);
      final transactions = await _service.getTransactionHistory(userId: user.id);
      final stats = await _service.getTransactionStats(user.id);

      return CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
      );
    } catch (e, stack) {
      logger.e('❌ Failed to initialize credits', e, stack);
      return CreditsState(error: e.toString());
    }
  }

  /// Initialiser les crédits (alias for invalidate — kept for compat)
  Future<void> initialize() async {
    ref.invalidateSelf();
  }

  /// Rafraîchir les données
  Future<void> refresh() async {
    ref.invalidateSelf();
  }

  /// Ajouter des crédits
  Future<bool> addCredits({
    required int amount,
    required String type,
    String? description,
    String? referenceType,
    String? referenceId,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final prev = state.valueOrNull ?? const CreditsState();
    state = AsyncData(prev.copyWith(isLoading: true, error: null));

    try {
      final userCredits = await _service.addCredits(
        userId: user.id,
        amount: amount,
        type: type,
        description: description,
        referenceType: referenceType,
        referenceId: referenceId,
      );

      final transactions = await _service.getTransactionHistory(
        userId: user.id,
        limit: 20,
      );
      final stats = await _service.getTransactionStats(user.id);

      state = AsyncData(CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
      ));
      
      logger.i('✅ Added $amount credits');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to add credits', e, stack);
      state = AsyncData(prev.copyWith(isLoading: false, error: e.toString()));
      return false;
    }
  }

  /// Dépenser des crédits
  Future<bool> spendCredits({
    required int amount,
    required String description,
    String? referenceType,
    String? referenceId,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final prev = state.valueOrNull ?? const CreditsState();
    state = AsyncData(prev.copyWith(isLoading: true, error: null));

    try {
      final userCredits = await _service.spendCredits(
        userId: user.id,
        amount: amount,
        description: description,
        referenceType: referenceType,
        referenceId: referenceId,
      );

      final transactions = await _service.getTransactionHistory(
        userId: user.id,
        limit: 20,
      );
      final stats = await _service.getTransactionStats(user.id);

      state = AsyncData(CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
      ));
      
      logger.i('✅ Spent $amount credits');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to spend credits', e, stack);
      state = AsyncData(prev.copyWith(isLoading: false, error: e.toString()));
      return false;
    }
  }

  /// Vérifier si l'utilisateur a assez de crédits
  Future<bool> hasEnoughCredits(int requiredAmount) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;
    return await _service.hasEnoughCredits(user.id, requiredAmount);
  }

  /// Acheter des crédits
  Future<bool> purchaseCredits({
    required int amount,
    required String paymentId,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    final prev = state.valueOrNull ?? const CreditsState();
    state = AsyncData(prev.copyWith(isLoading: true, error: null));

    try {
      await _service.purchaseCredits(
        userId: user.id,
        amount: amount,
        paymentId: paymentId,
      );

      await refresh();
      
      logger.i('✅ Purchased $amount credits');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to purchase credits', e, stack);
      state = AsyncData(prev.copyWith(isLoading: false, error: e.toString()));
      return false;
    }
  }

  /// Ajouter des crédits bonus
  Future<bool> addBonusCredits({
    required int amount,
    required String reason,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      await _service.addBonusCredits(
        userId: user.id,
        amount: amount,
        reason: reason,
      );
      await refresh();
      
      logger.i('✅ Added $amount bonus credits');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to add bonus credits', e, stack);
      final prev = state.valueOrNull ?? const CreditsState();
      state = AsyncData(prev.copyWith(error: e.toString()));
      return false;
    }
  }

  /// Effacer l'erreur
  void clearError() {
    final prev = state.valueOrNull ?? const CreditsState();
    state = AsyncData(prev.copyWith(error: null));
  }

  /// Réinitialiser le provider
  void reset() {
    state = const AsyncData(CreditsState());
  }
}
