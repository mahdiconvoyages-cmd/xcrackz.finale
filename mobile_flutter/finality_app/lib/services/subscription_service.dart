import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_subscription.dart';
import '../utils/logger.dart';

class SubscriptionService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Vérifie l'état de l'abonnement et reset les crédits si expiré
  /// Appeler cette méthode au démarrage de l'app ou lors de la connexion
  Future<void> checkAndResetExpiredCredits(String userId) async {
    try {
      final subscription = await getUserSubscription(userId);
      
      // Vérifier si l'abonnement est expiré
      if (subscription.expiresAt != null) {
        final now = DateTime.now();
        if (subscription.expiresAt!.isBefore(now) && subscription.status != 'expired') {
          // Marquer comme expiré et reset les crédits
          await _updateSubscriptionStatus(userId, 'expired');
          logger.i('Abonnement expiré - Crédits remis à 0 pour user: $userId');
        } else if (subscription.status == 'expired') {
          // Déjà expiré, s'assurer que les crédits sont à 0
          await _ensureCreditsAreZero(userId);
        }
      }
      
      // Si le statut est déjà expired, vérifier que les crédits sont bien à 0
      if (subscription.status == 'expired') {
        await _ensureCreditsAreZero(userId);
      }
    } catch (e) {
      logger.e('Erreur checkAndResetExpiredCredits: $e');
    }
  }

  /// S'assure que les crédits sont à 0 pour un abonnement expiré
  Future<void> _ensureCreditsAreZero(String userId) async {
    try {
      final profile = await _supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .maybeSingle();
      
      final currentCredits = profile?['credits'] ?? 0;
      
      if (currentCredits > 0) {
        await _resetCreditsOnExpiration(userId);
        logger.i('Crédits forcés à 0 pour abonnement expiré: $userId');
      }
    } catch (e) {
      logger.e('Erreur _ensureCreditsAreZero: $e');
    }
  }

  // Get user subscription
  Future<UserSubscription> getUserSubscription(String userId) async {
    try {
      final response = await _supabase
          .from('subscriptions')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) {
        // Create default free subscription if not exists
        return await _createDefaultSubscription(userId);
      }

      return UserSubscription.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la récupération de l\'abonnement: $e');
    }
  }

  // Alias pour subscription_screen
  Future<UserSubscription> getActiveSubscription(String userId) async {
    return getUserSubscription(userId);
  }

  // Create default free subscription
  Future<UserSubscription> _createDefaultSubscription(String userId) async {
    try {
      final response = await _supabase
          .from('subscriptions')
          .insert({
            'user_id': userId,
            'plan': 'free',
            'status': 'active',
            'auto_renew': false,
          })
          .select()
          .single();

      return UserSubscription.fromJson(response);
    } catch (e) {
      throw Exception('Erreur lors de la création de l\'abonnement: $e');
    }
  }

  // Check if subscription is active
  Future<bool> hasActiveSubscription(String userId) async {
    try {
      final subscription = await getUserSubscription(userId);
      
      if (subscription.status != 'active' && subscription.status != 'trialing') {
        return false;
      }

      // Check expiration date
      if (subscription.expiresAt != null) {
        final now = DateTime.now();
        if (subscription.expiresAt!.isBefore(now)) {
          // Update status to expired
          await _updateSubscriptionStatus(userId, 'expired');
          return false;
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // Update subscription status
  Future<void> _updateSubscriptionStatus(String userId, String status) async {
    try {
      await _supabase
          .from('subscriptions')
          .update({
            'status': status,
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('user_id', userId);
      
      // Si l'abonnement expire, remettre les crédits à 0
      if (status == 'expired') {
        await _resetCreditsOnExpiration(userId);
      }
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour du statut: $e');
    }
  }

  // Remettre les crédits à 0 quand l'abonnement expire
  Future<void> _resetCreditsOnExpiration(String userId) async {
    try {
      // Récupérer les crédits actuels
      final profile = await _supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .maybeSingle();
      
      final currentCredits = profile?['credits'] ?? 0;
      
      // Mettre les crédits à 0
      await _supabase
          .from('profiles')
          .update({
            'credits': 0,
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('id', userId);
      
      // Enregistrer la transaction de reset
      if (currentCredits > 0) {
        await _supabase.from('credit_transactions').insert({
          'user_id': userId,
          'amount': -currentCredits,
          'transaction_type': 'deduction',
          'description': 'Crédits expirés - Abonnement terminé',
          'balance_after': 0,
        });
      }
    } catch (e) {
      // Log mais ne pas bloquer
      logger.e('Erreur lors de la remise à zéro des crédits: $e');
    }
  }

  // Get subscription features based on plan
  Map<String, dynamic> getPlanFeatures(String plan) {
    switch (plan) {
      case 'free':
        return {
          'name': 'Gratuit',
          'price': 0,
          'missions_limit': 5,
          'credits_per_month': 0,
          'gps_tracking': false,
          'invoice_generation': false,
          'quote_generation': false,
          'priority_support': false,
          'advanced_reports': false,
        };
      case 'basic':
        return {
          'name': 'Basique',
          'price': 9.99,
          'missions_limit': 50,
          'credits_per_month': 10,
          'gps_tracking': true,
          'invoice_generation': true,
          'quote_generation': true,
          'priority_support': false,
          'advanced_reports': false,
        };
      case 'premium':
        return {
          'name': 'Premium',
          'price': 29.99,
          'missions_limit': -1, // unlimited
          'credits_per_month': 50,
          'gps_tracking': true,
          'invoice_generation': true,
          'quote_generation': true,
          'priority_support': true,
          'advanced_reports': true,
        };
      case 'enterprise':
        return {
          'name': 'Enterprise',
          'price': 99.99,
          'missions_limit': -1, // unlimited
          'credits_per_month': 200,
          'gps_tracking': true,
          'invoice_generation': true,
          'quote_generation': true,
          'priority_support': true,
          'advanced_reports': true,
          'custom_branding': true,
          'api_access': true,
        };
      default:
        return getPlanFeatures('free');
    }
  }

  // Check if user has access to a feature
  Future<bool> hasFeatureAccess(String userId, String feature) async {
    try {
      final subscription = await getUserSubscription(userId);
      final features = getPlanFeatures(subscription.plan);
      
      return features[feature] == true;
    } catch (e) {
      return false;
    }
  }

  // Get subscription statistics
  Future<Map<String, dynamic>> getSubscriptionStats(String userId) async {
    try {
      final subscription = await getUserSubscription(userId);
      final features = getPlanFeatures(subscription.plan);
      
      return {
        'plan': subscription.plan,
        'displayName': subscription.displayName,
        'status': subscription.status,
        'isActive': subscription.isActive,
        'daysRemaining': subscription.daysRemaining,
        'isExpiringSoon': subscription.isExpiringSoon,
        'autoRenew': subscription.autoRenew,
        'creditsPerMonth': features['credits_per_month'],
        'missionsLimit': features['missions_limit'],
        'features': features,
      };
    } catch (e) {
      throw Exception('Erreur lors du calcul des statistiques: $e');
    }
  }

  // Cancel subscription (marks for cancellation at period end)
  Future<UserSubscription> cancelSubscription(String userId) async {
    try {
      await _supabase
          .from('subscriptions')
          .update({
            'auto_renew': false,
            'cancelled_at': DateTime.now().toUtc().toIso8601String(),
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('user_id', userId);

      return await getUserSubscription(userId);
    } catch (e) {
      throw Exception('Erreur lors de l\'annulation: $e');
    }
  }

  // Reactivate subscription
  Future<UserSubscription> reactivateSubscription(String userId) async {
    try {
      await _supabase
          .from('subscriptions')
          .update({
            'auto_renew': true,
            'cancelled_at': null,
            'status': 'active',
            'updated_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('user_id', userId);

      return await getUserSubscription(userId);
    } catch (e) {
      throw Exception('Erreur lors de la réactivation: $e');
    }
  }

  // Check subscription limits
  Future<bool> canPerformAction(String userId, String action) async {
    try {
      final subscription = await getUserSubscription(userId);
      
      if (!subscription.isActive) {
        return false;
      }

      final features = getPlanFeatures(subscription.plan);
      
      switch (action) {
        case 'create_mission':
          final limit = features['missions_limit'] as int;
          if (limit == -1) return true; // unlimited
          
          // Check current mission count (would need to implement)
          return true; // Simplified for now
          
        case 'gps_tracking':
          return features['gps_tracking'] == true;
          
        case 'invoice_generation':
          return features['invoice_generation'] == true;
          
        case 'quote_generation':
          return features['quote_generation'] == true;
          
        default:
          return false;
      }
    } catch (e) {
      return false;
    }
  }
}
