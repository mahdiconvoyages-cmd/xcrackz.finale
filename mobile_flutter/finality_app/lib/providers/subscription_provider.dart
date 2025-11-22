import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_subscription.dart';
import '../services/subscription_service.dart';

class SubscriptionProvider with ChangeNotifier {
  final SubscriptionService _subscriptionService = SubscriptionService();
  final SupabaseClient _supabase = Supabase.instance.client;

  UserSubscription? _subscription;
  Map<String, dynamic> _stats = {};
  Map<String, dynamic> _features = {};
  bool _isLoading = false;
  String? _error;

  // Getters
  UserSubscription? get subscription => _subscription;
  Map<String, dynamic> get stats => _stats;
  Map<String, dynamic> get features => _features;
  bool get isLoading => _isLoading;
  String? get error => _error;

  // Subscription status getters
  bool get hasActiveSubscription => _subscription?.isActive ?? false;
  bool get isExpired => _subscription?.isExpired ?? true;
  bool get isCancelled => _subscription?.isCancelled ?? false;
  bool get isTrialing => _subscription?.isTrialing ?? false;
  bool get isFree => _subscription?.isFree ?? true;
  bool get isPremium => _subscription?.isPremium ?? false;
  bool get isExpiringSoon => _subscription?.isExpiringSoon ?? false;
  bool get autoRenew => _subscription?.autoRenew ?? false;

  // Plan getters
  String get plan => _subscription?.plan ?? 'free';
  String get planDisplayName => _subscription?.displayName ?? 'Gratuit';
  String get status => _subscription?.status ?? 'expired';
  int get daysRemaining => _subscription?.daysRemaining ?? 0;
  DateTime? get expiresAt => _subscription?.expiresAt;
  int? get creditsPerMonth => _subscription?.creditsPerMonth;

  // Feature access getters
  int get creditsBalance => _stats['creditsPerMonth'] as int? ?? 0;
  int get missionsLimit => _stats['missionsLimit'] as int? ?? 5;
  bool get hasUnlimitedMissions => missionsLimit == -1;

  // Initialize and fetch subscription
  Future<void> initialize() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    await fetchSubscription(user.id);
    await fetchStats(user.id);
  }

  // Fetch user subscription
  Future<void> fetchSubscription(String userId) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _subscription = await _subscriptionService.getUserSubscription(userId);
      _features = _subscriptionService.getPlanFeatures(_subscription!.plan);
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch subscription statistics
  Future<void> fetchStats(String userId) async {
    try {
      _stats = await _subscriptionService.getSubscriptionStats(userId);
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

    await fetchSubscription(user.id);
    await fetchStats(user.id);
  }

  // Check if user has access to a feature
  Future<bool> hasFeatureAccess(String feature) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    return await _subscriptionService.hasFeatureAccess(user.id, feature);
  }

  // Check if user can perform an action
  Future<bool> canPerformAction(String action) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    return await _subscriptionService.canPerformAction(user.id, action);
  }

  // Cancel subscription
  Future<bool> cancelSubscription() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _subscription = await _subscriptionService.cancelSubscription(user.id);
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

  // Reactivate subscription
  Future<bool> reactivateSubscription() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      _subscription = await _subscriptionService.reactivateSubscription(user.id);
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

  // Get feature value
  dynamic getFeature(String featureName) {
    return _features[featureName];
  }

  // Check specific features
  bool get canUseGPSTracking => _features['gps_tracking'] == true;
  bool get canGenerateInvoices => _features['invoice_generation'] == true;
  bool get canGenerateQuotes => _features['quote_generation'] == true;
  bool get hasPrioritySupport => _features['priority_support'] == true;
  bool get hasAdvancedReports => _features['advanced_reports'] == true;

  // Get plan comparison for upgrade screen
  List<Map<String, dynamic>> getAllPlans() {
    return [
      _subscriptionService.getPlanFeatures('free'),
      _subscriptionService.getPlanFeatures('basic'),
      _subscriptionService.getPlanFeatures('premium'),
      _subscriptionService.getPlanFeatures('enterprise'),
    ];
  }

  // Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  // Reset provider
  void reset() {
    _subscription = null;
    _stats = {};
    _features = {};
    _isLoading = false;
    _error = null;
    notifyListeners();
  }
}
