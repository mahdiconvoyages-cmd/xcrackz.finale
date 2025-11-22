import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_credits.dart';
import '../services/credits_service.dart';

class CreditsProvider with ChangeNotifier {
  final CreditsService _creditsService = CreditsService();
  final SupabaseClient _supabase = Supabase.instance.client;

  UserCredits? _userCredits;
  List<CreditTransaction> _transactions = [];
  Map<String, dynamic> _stats = {};
  bool _isLoading = false;
  String? _error;

  // Getters
  UserCredits? get userCredits => _userCredits;
  int get credits => _userCredits?.credits ?? 0;
  List<CreditTransaction> get transactions => _transactions;
  Map<String, dynamic> get stats => _stats;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasCredits => credits > 0;

  // Initialize and fetch credits
  Future<void> initialize() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    await fetchCredits(user.id);
    await fetchTransactionHistory(user.id);
    await fetchStats(user.id);
  }

  // Fetch user credits
  Future<void> fetchCredits(String userId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _userCredits = await _creditsService.getUserCredits(userId);
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch transaction history
  Future<void> fetchTransactionHistory(String userId, {int? limit}) async {
    try {
      _transactions = await _creditsService.getTransactionHistory(
        userId: userId,
        limit: limit,
      );
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  // Fetch statistics
  Future<void> fetchStats(String userId) async {
    try {
      _stats = await _creditsService.getTransactionStats(userId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  // Refresh all data
  Future<void> refresh() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    await fetchCredits(user.id);
    await fetchTransactionHistory(user.id);
    await fetchStats(user.id);
  }

  // Add credits
  Future<bool> addCredits({
    required int amount,
    required String type,
    String? description,
    String? referenceType,
    String? referenceId,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _userCredits = await _creditsService.addCredits(
        userId: user.id,
        amount: amount,
        type: type,
        description: description,
        referenceType: referenceType,
        referenceId: referenceId,
      );

      await fetchTransactionHistory(user.id, limit: 20);
      await fetchStats(user.id);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Spend credits
  Future<bool> spendCredits({
    required int amount,
    required String description,
    String? referenceType,
    String? referenceId,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _userCredits = await _creditsService.spendCredits(
        userId: user.id,
        amount: amount,
        description: description,
        referenceType: referenceType,
        referenceId: referenceId,
      );

      await fetchTransactionHistory(user.id, limit: 20);
      await fetchStats(user.id);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Check if user has enough credits
  Future<bool> hasEnoughCredits(int requiredAmount) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    return await _creditsService.hasEnoughCredits(user.id, requiredAmount);
  }

  // Purchase credits
  Future<bool> purchaseCredits({
    required int amount,
    required String paymentId,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _userCredits = await _creditsService.purchaseCredits(
        userId: user.id,
        amount: amount,
        paymentId: paymentId,
      );

      await fetchTransactionHistory(user.id, limit: 20);
      await fetchStats(user.id);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Add bonus credits
  Future<bool> addBonusCredits({
    required int amount,
    required String reason,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      _userCredits = await _creditsService.addBonusCredits(
        userId: user.id,
        amount: amount,
        reason: reason,
      );

      await fetchTransactionHistory(user.id, limit: 20);
      await fetchStats(user.id);

      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Reset provider
  void reset() {
    _userCredits = null;
    _transactions = [];
    _stats = {};
    _isLoading = false;
    _error = null;
    notifyListeners();
  }
}
