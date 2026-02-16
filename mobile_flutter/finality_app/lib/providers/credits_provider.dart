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
  CreditsState build() {
    // Schedule initialization after build() returns the initial state
    final user = _supabase.auth.currentUser;
    if (user != null) {
      Future.microtask(() => _initialize(user.id));
    }
    return const CreditsState();
  }

  Future<void> _initialize(String userId) async {
    state = state.copyWith(isLoading: true);
    
    try {
      final userCredits = await _service.getUserCredits(userId);
      final transactions = await _service.getTransactionHistory(userId: userId);
      final stats = await _service.getTransactionStats(userId);
      
      state = CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
        isLoading: false,
      );
      
      logger.i('✅ Credits initialized: ${state.credits} credits');
    } catch (e, stack) {
      logger.e('❌ Failed to initialize credits', e, stack);
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Initialiser les crédits
  Future<void> initialize() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;
    await _initialize(user.id);
  }

  /// Rafraîchir les données
  Future<void> refresh() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;
    
    state = state.copyWith(isLoading: true);
    
    try {
      final userCredits = await _service.getUserCredits(user.id);
      final transactions = await _service.getTransactionHistory(userId: user.id);
      final stats = await _service.getTransactionStats(user.id);
      
      state = CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
        isLoading: false,
      );
    } catch (e, stack) {
      logger.e('❌ Failed to refresh credits', e, stack);
      state = state.copyWith(isLoading: false, error: e.toString());
    }
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

    state = state.copyWith(isLoading: true, error: null);

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

      state = CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
        isLoading: false,
      );
      
      logger.i('✅ Added $amount credits');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to add credits', e, stack);
      state = state.copyWith(isLoading: false, error: e.toString());
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

    state = state.copyWith(isLoading: true, error: null);

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

      state = CreditsState(
        userCredits: userCredits,
        transactions: transactions,
        stats: stats,
        isLoading: false,
      );
      
      logger.i('✅ Spent $amount credits');
      return true;
    } catch (e, stack) {
      logger.e('❌ Failed to spend credits', e, stack);
      state = state.copyWith(isLoading: false, error: e.toString());
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

    state = state.copyWith(isLoading: true, error: null);

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
      state = state.copyWith(isLoading: false, error: e.toString());
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
      state = state.copyWith(error: e.toString());
      return false;
    }
  }

  /// Effacer l'erreur
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Réinitialiser le provider
  void reset() {
    state = const CreditsState();
  }
}

// ==============================================
// COMPATIBILITÉ AVEC L'ANCIEN CODE
// ==============================================

/// Wrapper pour compatibilité avec Provider (context.read/watch)
/// À utiliser temporairement pendant la migration
class CreditsProvider {
  final WidgetRef _ref;
  
  CreditsProvider(this._ref);
  
  CreditsState get state => _ref.watch(creditsProvider);
  int get credits => state.credits;
  bool get isLoading => state.isLoading;
  String? get error => state.error;
  bool get hasCredits => state.hasCredits;
  UserCredits? get userCredits => state.userCredits;
  List<CreditTransaction> get transactions => state.transactions;
  Map<String, dynamic> get stats => state.stats;
  
  Future<void> initialize() => _ref.read(creditsProvider.notifier).initialize();
  Future<void> refresh() => _ref.read(creditsProvider.notifier).refresh();
  void clearError() => _ref.read(creditsProvider.notifier).clearError();
  void reset() => _ref.read(creditsProvider.notifier).reset();
}
