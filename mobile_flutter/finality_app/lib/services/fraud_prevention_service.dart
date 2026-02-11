import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io' show Platform;
import 'package:device_info_plus/device_info_plus.dart';
import '../main.dart';
import '../utils/logger.dart';

/// Service de prévention de fraude lors de l'inscription
/// Détecte les comptes multiples, SIRET dupliqués, emails jetables, etc.
class FraudPreventionService {
  final SupabaseClient _supabase = supabase;

  /// Génère une empreinte unique de l'appareil
  Future<String> getDeviceFingerprint() async {
    final deviceInfo = DeviceInfoPlugin();
    String fingerprint = '';

    try {
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        fingerprint = '${androidInfo.id}_${androidInfo.model}_${androidInfo.brand}';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        fingerprint = '${iosInfo.identifierForVendor}_${iosInfo.model}_${iosInfo.systemVersion}';
      }
    } catch (e) {
      logger.e('Erreur génération device fingerprint: $e');
      fingerprint = 'unknown_${DateTime.now().millisecondsSinceEpoch}';
    }

    return fingerprint;
  }

  /// Récupère l'adresse IP publique (approximation via geolocation ou API externe)
  /// NOTE: Pour une véritable IP publique, utiliser un service externe comme ipify.org
  Future<String> getPublicIP() async {
    try {
      // TODO: Intégrer un service comme https://api.ipify.org?format=json
      // Pour l'instant, on retourne un placeholder
      return 'unknown_ip';
    } catch (e) {
      logger.e('Erreur récupération IP: $e');
      return 'unknown_ip';
    }
  }

  /// Vérifie si un email est disponible (pas déjà utilisé)
  Future<bool> isEmailAvailable(String email) async {
    try {
      final response = await _supabase.rpc('check_email_available', params: {
        'p_email': email.trim().toLowerCase(),
      });

      return response as bool? ?? false;
    } catch (e) {
      logger.e('Erreur vérification email: $e');
      return false;
    }
  }

  /// Vérifie si un SIRET est disponible (pas déjà utilisé)
  Future<bool> isSiretAvailable(String siret) async {
    try {
      final response = await _supabase.rpc('check_siret_available', params: {
        'p_siret': siret.trim(),
      });

      return response as bool? ?? false;
    } catch (e) {
      logger.e('Erreur vérification SIRET: $e');
      return false;
    }
  }

  /// Compte combien de comptes utilisent ce numéro de téléphone
  Future<int> getPhoneUsageCount(String phone) async {
    try {
      final response = await _supabase.rpc('check_phone_usage_count', params: {
        'p_phone': phone.trim(),
      });

      return response as int? ?? 0;
    } catch (e) {
      logger.e('Erreur vérification téléphone: $e');
      return 0;
    }
  }

  /// Analyse complète de fraude avant inscription
  /// Retourne un objet contenant score, flags, et recommandation
  Future<FraudCheckResult> performFraudCheck({
    required String email,
    String? phone,
    String? siret,
  }) async {
    try {
      final deviceFingerprint = await getDeviceFingerprint();
      final ipAddress = await getPublicIP();

      final response = await _supabase.rpc('check_signup_fraud', params: {
        'p_email': email.trim().toLowerCase(),
        'p_phone': phone?.trim(),
        'p_siret': siret?.trim(),
        'p_device_fingerprint': deviceFingerprint,
        'p_ip_address': ipAddress,
      });

      return FraudCheckResult.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      logger.e('Erreur analyse fraude: $e');
      // En cas d'erreur, on permet l'inscription par défaut (fail-open)
      return FraudCheckResult(
        fraudScore: 0,
        isSuspicious: false,
        flags: [],
        recommendation: FraudRecommendation.allow,
      );
    }
  }

  /// Enregistre une tentative d'inscription (succès ou échec)
  Future<void> logSignupAttempt({
    required String email,
    String? phone,
    required int stepReached,
    required bool success,
    String? failureReason,
  }) async {
    try {
      final deviceFingerprint = await getDeviceFingerprint();
      final ipAddress = await getPublicIP();

      await _supabase.from('signup_attempts').insert({
        'email': email.trim().toLowerCase(),
        'phone': phone?.trim(),
        'device_fingerprint': deviceFingerprint,
        'ip_address': ipAddress,
        'user_agent': Platform.isAndroid ? 'Flutter Android' : 'Flutter iOS',
        'step_reached': stepReached,
        'success': success,
        'failure_reason': failureReason,
      });
    } catch (e) {
      logger.w('Erreur log tentative inscription: $e');
      // Non bloquant
    }
  }

  /// Vérifie des patterns d'email jetables/temporaires
  bool isDisposableEmail(String email) {
    final disposablePatterns = [
      'temp',
      'throw',
      'disposable',
      'trash',
      'fake',
      'test',
      'guerrillamail',
      '10minutemail',
      'mailinator',
      'yopmail',
      'tempmail',
      'trashmail',
    ];

    final lowercase = email.toLowerCase();
    return disposablePatterns.any((pattern) => lowercase.contains(pattern));
  }

  /// Validation format SIRET (14 chiffres)
  bool isValidSiretFormat(String siret) {
    final cleaned = siret.replaceAll(RegExp(r'\s+'), '');
    return RegExp(r'^\d{14}$').hasMatch(cleaned);
  }

  /// Validation format téléphone français (approximatif)
  bool isValidPhoneFormat(String phone) {
    final cleaned = phone.replaceAll(RegExp(r'[\s\.\-\(\)]'), '');
    // Format français: 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres
    return RegExp(r'^(0[1-9]\d{8}|\+33[1-9]\d{8})$').hasMatch(cleaned);
  }

  /// Affiche un message d'avertissement si fraude détectée
  void showFraudWarning(BuildContext context, FraudCheckResult result) {
    if (!result.isSuspicious) return;

    final severity = result.recommendation;
    final message = _getFraudMessage(result);

    showDialog(
      context: context,
      barrierDismissible: severity != FraudRecommendation.block,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              severity == FraudRecommendation.block
                  ? Icons.block
                  : Icons.warning_amber_rounded,
              color: severity == FraudRecommendation.block
                  ? Colors.red
                  : Colors.orange,
            ),
            const SizedBox(width: 12),
            Text(
              severity == FraudRecommendation.block
                  ? 'Inscription bloquée'
                  : 'Vérification requise',
            ),
          ],
        ),
        content: Text(message),
        actions: [
          if (severity != FraudRecommendation.block)
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Continuer quand même'),
            ),
          FilledButton(
            onPressed: () => Navigator.pop(context),
            child: Text(severity == FraudRecommendation.block ? 'OK' : 'Annuler'),
          ),
        ],
      ),
    );
  }

  String _getFraudMessage(FraudCheckResult result) {
    final flags = result.flags.map((f) => f.type).toList();

    if (flags.contains('blacklist_email') ||
        flags.contains('blacklist_phone') ||
        flags.contains('blacklist_siret')) {
      return 'Ces informations sont bloquées. Veuillez contacter le support.';
    }

    if (flags.contains('siret_duplicate')) {
      return 'Ce numéro SIRET est déjà associé à un compte existant.';
    }

    if (flags.contains('device_multiple_accounts')) {
      return 'Plusieurs comptes ont été créés depuis cet appareil. Ceci peut indiquer une activité suspecte.';
    }

    if (flags.contains('phone_multiple_accounts')) {
      return 'Ce numéro de téléphone est utilisé par plusieurs comptes.';
    }

    if (flags.contains('ip_rate_limit')) {
      return 'Trop de tentatives d\'inscription depuis cette connexion. Veuillez réessayer plus tard.';
    }

    if (flags.contains('disposable_email')) {
      return 'Les adresses email temporaires ne sont pas autorisées. Veuillez utiliser un email professionnel.';
    }

    return 'Votre inscription nécessite une vérification manuelle. Vous recevrez un email dans les 24-48h.';
  }
}

/// Résultat d'une vérification anti-fraude
class FraudCheckResult {
  final int fraudScore;
  final bool isSuspicious;
  final List<FraudFlag> flags;
  final FraudRecommendation recommendation;

  FraudCheckResult({
    required this.fraudScore,
    required this.isSuspicious,
    required this.flags,
    required this.recommendation,
  });

  factory FraudCheckResult.fromJson(Map<String, dynamic> json) {
    return FraudCheckResult(
      fraudScore: json['fraud_score'] as int? ?? 0,
      isSuspicious: json['is_suspicious'] as bool? ?? false,
      flags: (json['flags'] as List?)
              ?.map((f) => FraudFlag.fromJson(f as Map<String, dynamic>))
              .toList() ??
          [],
      recommendation: FraudRecommendation.fromString(
        json['recommendation'] as String? ?? 'allow',
      ),
    );
  }

  bool get shouldBlock => recommendation == FraudRecommendation.block;
  bool get needsManualReview => recommendation == FraudRecommendation.manualReview;
}

/// Flag de fraude détecté
class FraudFlag {
  final String type;
  final String severity;

  FraudFlag({required this.type, required this.severity});

  factory FraudFlag.fromJson(Map<String, dynamic> json) {
    return FraudFlag(
      type: json['type'] as String? ?? 'unknown',
      severity: json['severity'] as String? ?? 'low',
    );
  }
}

/// Recommandation suite à analyse de fraude
enum FraudRecommendation {
  allow, // Autoriser l'inscription
  manualReview, // Nécessite vérification manuelle
  block; // Bloquer l'inscription

  static FraudRecommendation fromString(String value) {
    switch (value) {
      case 'block':
        return FraudRecommendation.block;
      case 'manual_review':
        return FraudRecommendation.manualReview;
      default:
        return FraudRecommendation.allow;
    }
  }
}
