import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// Service pour interroger l'API Sirene de l'INSEE
/// API gratuite sans clé requise pour obtenir les informations d'entreprise via SIRET/SIREN
class InseeService {
  static const String _baseUrl = ApiConfig.inseeBase;
  static const String _siretEndpoint = '/siret';
  static const String _sirenEndpoint = '/siren';
  
  /// Recherche une entreprise par son numéro SIRET
  /// Returns les informations complètes de l'établissement
  Future<InseeCompanyInfo?> getCompanyBySiret(String siret) async {
    try {
      // Nettoyer le SIRET (enlever espaces et caractères spéciaux)
      final cleanSiret = siret.replaceAll(RegExp(r'[^0-9]'), '');
      
      if (cleanSiret.length != 14) {
        throw Exception('Le SIRET doit contenir 14 chiffres');
      }

      final url = Uri.parse('$_baseUrl$_siretEndpoint/$cleanSiret');
      
      final response = await http.get(
        url,
        headers: {
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return InseeCompanyInfo.fromInseeJson(data['etablissement']);
      } else if (response.statusCode == 404) {
        return null; // SIRET non trouvé
      } else {
        throw Exception('Erreur API INSEE: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur lors de la recherche SIRET: $e');
    }
  }

  /// Recherche une entreprise par son numéro SIREN
  /// Returns les informations du siège social
  Future<InseeCompanyInfo?> getCompanyBySiren(String siren) async {
    try {
      // Nettoyer le SIREN
      final cleanSiren = siren.replaceAll(RegExp(r'[^0-9]'), '');
      
      if (cleanSiren.length != 9) {
        throw Exception('Le SIREN doit contenir 9 chiffres');
      }

      final url = Uri.parse('$_baseUrl$_sirenEndpoint/$cleanSiren');
      
      final response = await http.get(
        url,
        headers: {
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return InseeCompanyInfo.fromInseeJson(data['uniteLegale']);
      } else if (response.statusCode == 404) {
        return null;
      } else {
        throw Exception('Erreur API INSEE: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Erreur lors de la recherche SIREN: $e');
    }
  }

  /// Recherche des entreprises par nom (approximatif)
  /// Limite à 20 résultats
  Future<List<InseeCompanyInfo>> searchCompaniesByName(String name) async {
    try {
      if (name.length < 3) {
        return [];
      }

      final url = Uri.parse('$_baseUrl/siret').replace(queryParameters: {
        'q': 'denominationUniteLegale:"$name*"',
        'nombre': '20',
      });

      final response = await http.get(
        url,
        headers: {
          'Accept': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final etablissements = data['etablissements'] as List? ?? [];
        
        return etablissements
            .map((e) => InseeCompanyInfo.fromInseeJson(e))
            .toList();
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  /// Valide le format d'un SIRET (14 chiffres + algorithme de Luhn)
  static bool validateSiret(String siret) {
    final clean = siret.replaceAll(RegExp(r'[^0-9]'), '');
    
    if (clean.length != 14) return false;
    
    // Algorithme de Luhn
    int sum = 0;
    for (int i = 0; i < 14; i++) {
      int digit = int.parse(clean[i]);
      
      if (i % 2 == 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
    }
    
    return sum % 10 == 0;
  }

  /// Valide le format d'un SIREN (9 chiffres + algorithme de Luhn)
  static bool validateSiren(String siren) {
    final clean = siren.replaceAll(RegExp(r'[^0-9]'), '');
    
    if (clean.length != 9) return false;
    
    // Algorithme de Luhn
    int sum = 0;
    for (int i = 0; i < 9; i++) {
      int digit = int.parse(clean[i]);
      
      if (i % 2 == 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
    }
    
    return sum % 10 == 0;
  }

  /// Formate un SIRET avec des espaces (XXX XXX XXX XXXXX)
  static String formatSiret(String siret) {
    final clean = siret.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.length != 14) return siret;
    
    return '${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)} ${clean.substring(9, 14)}';
  }

  /// Formate un SIREN avec des espaces (XXX XXX XXX)
  static String formatSiren(String siren) {
    final clean = siren.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.length != 9) return siren;
    
    return '${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)}';
  }
}

/// Modèle pour les informations d'entreprise depuis l'API INSEE
class InseeCompanyInfo {
  final String siret;
  final String siren;
  final String? companyName;
  final String? legalForm;
  final String? address;
  final String? postalCode;
  final String? city;
  final String? country;
  final String? activityCode; // Code NAF/APE
  final String? activityLabel;
  final String? vatNumber; // Numéro de TVA intracommunautaire
  final bool isHeadquarters;
  final String? status; // Actif, Fermé, etc.
  final DateTime? creationDate;

  InseeCompanyInfo({
    required this.siret,
    required this.siren,
    this.companyName,
    this.legalForm,
    this.address,
    this.postalCode,
    this.city,
    this.country,
    this.activityCode,
    this.activityLabel,
    this.vatNumber,
    this.isHeadquarters = false,
    this.status,
    this.creationDate,
  });

  /// Parse les données de l'API INSEE
  factory InseeCompanyInfo.fromInseeJson(Map<String, dynamic> json) {
    // Extraire les informations d'adresse
    final adresse = json['adresseEtablissement'] ?? json['adresse'] ?? {};
    final uniteLegale = json['uniteLegale'] ?? {};
    
    // Construire l'adresse complète
    final List<String> addressParts = [];
    if (adresse['numeroVoieEtablissement'] != null) {
      addressParts.add(adresse['numeroVoieEtablissement'].toString());
    }
    if (adresse['typeVoieEtablissement'] != null) {
      addressParts.add(adresse['typeVoieEtablissement']);
    }
    if (adresse['libelleVoieEtablissement'] != null) {
      addressParts.add(adresse['libelleVoieEtablissement']);
    }
    if (adresse['complementAdresseEtablissement'] != null) {
      addressParts.add(adresse['complementAdresseEtablissement']);
    }
    
    final fullAddress = addressParts.join(' ');
    
    // Nom de l'entreprise
    String? companyName = uniteLegale['denominationUniteLegale'] ??
        json['periodesEtablissement']?[0]?['denominationUsuelleEtablissement'] ??
        uniteLegale['prenomUsuelUniteLegale'];
    
    // SIRET et SIREN
    final siret = json['siret'] ?? '';
    final siren = json['siren'] ?? siret.substring(0, 9);
    
    // Numéro de TVA intracommunautaire (calculé)
    final vatNumber = _calculateVatNumber(siren);
    
    // Date de création
    DateTime? creationDate;
    if (json['dateCreationEtablissement'] != null) {
      try {
        creationDate = DateTime.parse(json['dateCreationEtablissement']);
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    return InseeCompanyInfo(
      siret: siret,
      siren: siren,
      companyName: companyName,
      legalForm: uniteLegale['categorieJuridiqueUniteLegale'],
      address: fullAddress.isNotEmpty ? fullAddress : null,
      postalCode: adresse['codePostalEtablissement'],
      city: adresse['libelleCommuneEtablissement'],
      country: 'France',
      activityCode: json['activitePrincipaleEtablissement'] ?? uniteLegale['activitePrincipaleUniteLegale'],
      activityLabel: json['nomenclatureActivitePrincipaleEtablissement'],
      vatNumber: vatNumber,
      isHeadquarters: json['etablissementSiege'] == true,
      status: json['etatAdministratifEtablissement'],
      creationDate: creationDate,
    );
  }

  /// Calcule le numéro de TVA intracommunautaire français
  static String _calculateVatNumber(String siren) {
    if (siren.length != 9) return '';
    
    final sirenInt = int.parse(siren);
    final key = (12 + 3 * (sirenInt % 97)) % 97;
    
    return 'FR${key.toString().padLeft(2, '0')}$siren';
  }

  /// Vérifie si l'entreprise est active
  bool get isActive => status == 'A' || status == 'Actif';

  /// Adresse complète formatée
  String get fullAddress {
    final parts = <String>[];
    if (address != null) parts.add(address!);
    if (postalCode != null && city != null) {
      parts.add('$postalCode $city');
    }
    if (country != null) parts.add(country!);
    return parts.join('\n');
  }

  Map<String, dynamic> toJson() {
    return {
      'siret': siret,
      'siren': siren,
      'company_name': companyName,
      'legal_form': legalForm,
      'address': address,
      'postal_code': postalCode,
      'city': city,
      'country': country,
      'activity_code': activityCode,
      'activity_label': activityLabel,
      'vat_number': vatNumber,
      'is_headquarters': isHeadquarters,
      'status': status,
      'creation_date': creationDate?.toIso8601String(),
    };
  }
}
