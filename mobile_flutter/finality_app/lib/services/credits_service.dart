import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_credits.dart';
import '../utils/logger.dart';

class CreditsService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Get user credits FROM PROFILES (comme Expo useCredits.ts ligne 38-42)
  Future<UserCredits> getUserCredits(String userId) async {
    try {
      final response = await _supabase
          .from('profiles')
          .select('id, credits')
          .eq('id', userId)
          .maybeSingle();

      if (response == null) {
        throw Exception('Profile not found for user $userId');
      }

      // Convert profiles format to UserCredits format
      return UserCredits(
        id: response['id'] as String,
        userId: userId,
        credits: (response['credits'] ?? 0) as int,
        lastUpdated: DateTime.now(),
      );
    } catch (e) {
      logger.e('CREDITS_SERVICE: Error getting credits: $e');
      throw Exception('Erreur lors de la récupération des crédits: $e');
    }
  }

  // Add credits (atomic via RPC)
  Future<UserCredits> addCredits({
    required String userId,
    required int amount,
    required String type,
    String? description,
    String? referenceType,
    String? referenceId,
  }) async {
    try {
      final result = await _supabase.rpc('add_credits_atomic', params: {
        'p_user_id': userId,
        'p_amount': amount,
        'p_description': description ?? 'Ajout de crédits',
        'p_transaction_type': type,
        'p_reference_type': referenceType,
        'p_reference_id': referenceId,
      });

      if (result is Map && result['success'] == true) {
        logger.i('CREDITS_SERVICE: Added $amount credits, new balance = ${result['new_balance']}');
        return await getUserCredits(userId);
      } else {
        throw Exception(result?['error'] ?? 'Erreur inconnue');
      }
    } catch (e) {
      throw Exception('Erreur lors de l\'ajout de crédits: $e');
    }
  }

  // Spend credits (atomic via RPC - prevents race conditions)
  Future<UserCredits> spendCredits({
    required String userId,
    required int amount,
    required String description,
    String? referenceType,
    String? referenceId,
  }) async {
    try {
      final result = await _supabase.rpc('spend_credits_atomic', params: {
        'p_user_id': userId,
        'p_amount': amount,
        'p_description': description,
        'p_reference_type': referenceType,
        'p_reference_id': referenceId,
      });

      if (result is Map && result['success'] == true) {
        logger.i('CREDITS_SERVICE: Spent $amount credits, new balance = ${result['new_balance']}');
        return await getUserCredits(userId);
      } else {
        final errorMsg = result?['error'] ?? 'Erreur inconnue';
        if (errorMsg.toString().contains('insuffisants')) {
          logger.w('CREDITS_SERVICE: Insufficient credits');
        }
        throw Exception(errorMsg);
      }
    } catch (e) {
      throw Exception('Erreur lors de la dépense de crédits: $e');
    }
  }

  // Get transaction history
  Future<List<CreditTransaction>> getTransactionHistory({
    required String userId,
    int? limit,
  }) async {
    try {
      var query = _supabase
          .from('credit_transactions')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      if (limit != null) {
        query = query.limit(limit);
      }

      final response = await query;
      return (response as List)
          .map((json) => CreditTransaction.fromJson(json))
          .toList();
    } catch (e) {
      throw Exception('Erreur lors de la récupération de l\'historique: $e');
    }
  }

  // Get transaction statistics
  Future<Map<String, dynamic>> getTransactionStats(String userId) async {
    try {
      final transactions = await getTransactionHistory(userId: userId);
      
      final totalEarned = transactions
          .where((t) => t.isPositive)
          .fold<int>(0, (sum, t) => sum + t.amount);
      
      final totalSpent = transactions
          .where((t) => t.isNegative)
          .fold<int>(0, (sum, t) => sum + t.amount.abs());
      
      final thisMonthTransactions = transactions.where((t) {
        final now = DateTime.now();
        final transactionDate = t.createdAt ?? DateTime.now();
        return transactionDate.year == now.year && 
               transactionDate.month == now.month;
      }).toList();
      
      final thisMonthEarned = thisMonthTransactions
          .where((t) => t.isPositive)
          .fold<int>(0, (sum, t) => sum + t.amount);
      
      final thisMonthSpent = thisMonthTransactions
          .where((t) => t.isNegative)
          .fold<int>(0, (sum, t) => sum + t.amount.abs());

      return {
        'totalEarned': totalEarned,
        'totalSpent': totalSpent,
        'thisMonthEarned': thisMonthEarned,
        'thisMonthSpent': thisMonthSpent,
        'transactionCount': transactions.length,
      };
    } catch (e) {
      throw Exception('Erreur lors du calcul des statistiques: $e');
    }
  }

  // Check if user has enough credits
  Future<bool> hasEnoughCredits(String userId, int requiredAmount) async {
    try {
      final credits = await getUserCredits(userId);
      return credits.credits >= requiredAmount;
    } catch (e) {
      return false;
    }
  }

  // Purchase credits (to be integrated with payment system)
  Future<UserCredits> purchaseCredits({
    required String userId,
    required int amount,
    required String paymentId,
  }) async {
    return await addCredits(
      userId: userId,
      amount: amount,
      type: 'addition',
      description: 'Achat de $amount crédits',
      referenceType: 'payment',
      referenceId: paymentId,
    );
  }

  // Refund credits
  Future<UserCredits> refundCredits({
    required String userId,
    required int amount,
    required String reason,
    String? referenceId,
  }) async {
    return await addCredits(
      userId: userId,
      amount: amount,
      type: 'addition',
      description: reason,
      referenceType: 'refund',
      referenceId: referenceId,
    );
  }

  // Bonus credits (promotional, referral, etc.)
  Future<UserCredits> addBonusCredits({
    required String userId,
    required int amount,
    required String reason,
  }) async {
    return await addCredits(
      userId: userId,
      amount: amount,
      type: 'addition',
      description: reason,
      referenceType: 'bonus',
    );
  }
}
