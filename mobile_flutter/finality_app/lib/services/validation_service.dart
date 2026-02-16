import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/logger.dart';

/// Service de validation des données d'inscription
/// Valide SIRET via API INSEE, format email, téléphone, etc.
class ValidationService {
  // ==========================================
  // VALIDATION EMAIL
  // ==========================================

  /// Vérifie si le format de l'email est valide
  static bool isValidEmail(String email) {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(email.trim());
  }

  /// Vérifie si l'email est un email jetable/temporaire
  static bool isDisposableEmail(String email) {
    final disposableProviders = [
      'tempmail',
      'throwaway',
      'guerrillamail',
      '10minutemail',
      'mailinator',
      'yopmail',
      'trashmail',
      'fakeinbox',
      'temp-mail',
      'disposable',
    ];

    final lowercase = email.toLowerCase();
    return disposableProviders.any((provider) => lowercase.contains(provider));
  }

  /// Validation complète d'un email
  static ValidationResult validateEmail(String email) {
    if (email.trim().isEmpty) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'L\'email est requis',
      );
    }

    if (!isValidEmail(email)) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Format d\'email invalide',
      );
    }

    if (isDisposableEmail(email)) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Les emails temporaires ne sont pas autorisés',
      );
    }

    return ValidationResult(isValid: true);
  }

  // ==========================================
  // VALIDATION TÉLÉPHONE
  // ==========================================

  /// Nettoie un numéro de téléphone (supprime espaces, tirets, parenthèses)
  static String cleanPhoneNumber(String phone) {
    return phone.replaceAll(RegExp(r'[\s\.\-\(\)]'), '');
  }

  /// Formate un numéro de téléphone français pour affichage
  /// Ex: 0612345678 → 06 12 34 56 78
  static String formatPhoneNumber(String phone) {
    final cleaned = cleanPhoneNumber(phone);
    if (cleaned.length == 10 && cleaned.startsWith('0')) {
      return '${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8, 10)}';
    }
    return phone;
  }

  /// Vérifie si le format du téléphone français est valide
  static bool isValidPhoneFormat(String phone) {
    final cleaned = cleanPhoneNumber(phone);
    // Format français: 10 chiffres commençant par 0, ou +33 suivi de 9 chiffres
    return RegExp(r'^(0[1-9]\d{8}|\+33[1-9]\d{8})$').hasMatch(cleaned);
  }

  /// Validation complète d'un téléphone
  static ValidationResult validatePhone(String phone) {
    if (phone.trim().isEmpty) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le téléphone est requis',
      );
    }

    if (!isValidPhoneFormat(phone)) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Format de téléphone invalide (ex: 06 12 34 56 78)',
      );
    }

    return ValidationResult(isValid: true);
  }

  // ==========================================
  // VALIDATION SIRET
  // ==========================================

  /// Nettoie un numéro SIRET (supprime espaces)
  static String cleanSiret(String siret) {
    return siret.replaceAll(RegExp(r'\s+'), '');
  }

  /// Formate un SIRET pour affichage
  /// Ex: 12345678901234 → 123 456 789 01234
  static String formatSiret(String siret) {
    final cleaned = cleanSiret(siret);
    if (cleaned.length == 14) {
      return '${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9, 14)}';
    }
    return siret;
  }

  /// Vérifie le format d'un SIRET (14 chiffres)
  static bool isValidSiretFormat(String siret) {
    final cleaned = cleanSiret(siret);
    return RegExp(r'^\d{14}$').hasMatch(cleaned);
  }

  /// Vérifie la clé de contrôle SIRET (algorithme de Luhn)
  static bool isValidSiretChecksum(String siret) {
    final cleaned = cleanSiret(siret);
    if (cleaned.length != 14) return false;

    int sum = 0;
    for (int i = 0; i < 14; i++) {
      int digit = int.parse(cleaned[i]);
      if (i % 2 == 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 == 0;
  }

  /// Valide un SIRET via l'API INSEE (vérification en temps réel)
  static Future<SiretValidationResult> validateSiretWithInsee(String siret) async {
    if (siret.trim().isEmpty) {
      return SiretValidationResult(
        isValid: false,
        errorMessage: 'Le SIRET est requis',
      );
    }

    final cleaned = cleanSiret(siret);

    if (!isValidSiretFormat(cleaned)) {
      return SiretValidationResult(
        isValid: false,
        errorMessage: 'Format SIRET invalide (14 chiffres requis)',
      );
    }

    if (!isValidSiretChecksum(cleaned)) {
      return SiretValidationResult(
        isValid: false,
        errorMessage: 'Numéro SIRET invalide (clé de contrôle incorrecte)',
      );
    }

    // Appel API INSEE (version simplifiée - sans token pour l'instant)
    try {
      final url = Uri.parse('https://api.insee.fr/entreprises/sirene/V3/siret/$cleaned');
      
      // NOTE: Pour production, il faut un token INSEE
      // Inscription gratuite sur https://api.insee.fr/
      final response = await http.get(
        url,
        headers: {
          'Accept': 'application/json',
          // 'Authorization': 'Bearer VOTRE_TOKEN_INSEE', // À ajouter en production
        },
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final etablissement = data['etablissement'];
        
        return SiretValidationResult(
          isValid: true,
          companyName: etablissement['uniteLegale']['denominationUniteLegale'] as String?,
          address: _formatInseeAddress(etablissement['adresseEtablissement']),
          isActive: etablissement['etatAdministratifEtablissement'] == 'A',
        );
      } else if (response.statusCode == 404) {
        return SiretValidationResult(
          isValid: false,
          errorMessage: 'SIRET non trouvé dans la base INSEE',
        );
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        // Token manquant ou invalide - on accepte quand même le SIRET pour l'instant
        logger.w('Token INSEE manquant - validation SIRET locale uniquement');
        return SiretValidationResult(
          isValid: true,
          warningMessage: 'Validation complète SIRET impossible (Token INSEE requis)',
        );
      } else {
        return SiretValidationResult(
          isValid: false,
          errorMessage: 'Erreur lors de la vérification SIRET (code ${response.statusCode})',
        );
      }
    } catch (e) {
      logger.e('Erreur validation SIRET: $e');
      // En cas d'erreur réseau, on accepte si le format et checksum sont OK
      return SiretValidationResult(
        isValid: true,
        warningMessage: 'Vérification INSEE impossible (hors ligne)',
      );
    }
  }

  /// Formate une adresse depuis les données INSEE
  static String _formatInseeAddress(Map<String, dynamic> address) {
    final parts = <String>[];
    
    if (address['numeroVoieEtablissement'] != null) {
      parts.add(address['numeroVoieEtablissement']);
    }
    if (address['typeVoieEtablissement'] != null) {
      parts.add(address['typeVoieEtablissement']);
    }
    if (address['libelleVoieEtablissement'] != null) {
      parts.add(address['libelleVoieEtablissement']);
    }
    if (address['codePostalEtablissement'] != null) {
      parts.add(address['codePostalEtablissement']);
    }
    if (address['libelleCommuneEtablissement'] != null) {
      parts.add(address['libelleCommuneEtablissement']);
    }

    return parts.join(' ');
  }

  // ==========================================
  // VALIDATION MOT DE PASSE
  // ==========================================

  /// Vérifie la force d'un mot de passe
  static PasswordStrength getPasswordStrength(String password) {
    if (password.isEmpty) return PasswordStrength.empty;
    if (password.length < 6) return PasswordStrength.weak;

    int strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (RegExp(r'[a-z]').hasMatch(password)) strength++;
    if (RegExp(r'[A-Z]').hasMatch(password)) strength++;
    if (RegExp(r'[0-9]').hasMatch(password)) strength++;
    if (RegExp(r'[!@#\$%^&*(),.?":{}|<>]').hasMatch(password)) strength++;

    if (strength <= 2) return PasswordStrength.weak;
    if (strength <= 4) return PasswordStrength.medium;
    return PasswordStrength.strong;
  }

  /// Validation complète d'un mot de passe
  static ValidationResult validatePassword(String password, {String? confirmPassword}) {
    if (password.isEmpty) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le mot de passe est requis',
      );
    }

    if (password.length < 8) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le mot de passe doit contenir au moins 8 caractères',
      );
    }

    final strength = getPasswordStrength(password);
    if (strength == PasswordStrength.weak) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Mot de passe trop faible. Ajoutez des majuscules, chiffres ou symboles.',
      );
    }

    if (confirmPassword != null && password != confirmPassword) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Les mots de passe ne correspondent pas',
      );
    }

    return ValidationResult(isValid: true);
  }

  // ==========================================
  // VALIDATION NOM COMPLET
  // ==========================================

  /// Validation d'un nom complet
  static ValidationResult validateFullName(String name) {
    if (name.trim().isEmpty) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le nom complet est requis',
      );
    }

    if (name.trim().length < 2) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le nom est trop court',
      );
    }

    if (!RegExp(r'^[a-zA-ZÀ-ÿ\s\-]+$').hasMatch(name)) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le nom contient des caractères invalides',
      );
    }

    return ValidationResult(isValid: true);
  }

  // ==========================================
  // VALIDATION NOM ENTREPRISE
  // ==========================================

  /// Validation d'un nom d'entreprise
  static ValidationResult validateCompanyName(String name) {
    if (name.trim().isEmpty) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le nom de l\'entreprise est requis',
      );
    }

    if (name.trim().length < 2) {
      return ValidationResult(
        isValid: false,
        errorMessage: 'Le nom de l\'entreprise est trop court',
      );
    }

    return ValidationResult(isValid: true);
  }
}

/// Résultat d'une validation générique
class ValidationResult {
  final bool isValid;
  final String? errorMessage;

  ValidationResult({
    required this.isValid,
    this.errorMessage,
  });
}

/// Résultat de validation SIRET avec données supplémentaires
class SiretValidationResult {
  final bool isValid;
  final String? errorMessage;
  final String? warningMessage;
  final String? companyName;
  final String? address;
  final bool? isActive;

  SiretValidationResult({
    required this.isValid,
    this.errorMessage,
    this.warningMessage,
    this.companyName,
    this.address,
    this.isActive,
  });
}

/// Force d'un mot de passe
enum PasswordStrength {
  empty,
  weak,
  medium,
  strong;

  String get label {
    switch (this) {
      case PasswordStrength.empty:
        return 'Vide';
      case PasswordStrength.weak:
        return 'Faible';
      case PasswordStrength.medium:
        return 'Moyen';
      case PasswordStrength.strong:
        return 'Fort';
    }
  }

  Color get color {
    switch (this) {
      case PasswordStrength.empty:
        return Colors.grey;
      case PasswordStrength.weak:
        return Colors.red;
      case PasswordStrength.medium:
        return Colors.orange;
      case PasswordStrength.strong:
        return Colors.green;
    }
  }
}
