/// Model Client pour l'application Flutter
/// Synchronisé avec la table clients de Supabase

class Client {
  final String id;
  final String userId;
  final String name;
  final String email;
  final String? phone;
  final String? companyName;
  final String? siret;
  final String? siren;
  final String? tvaNumber;
  final String? address;
  final String? postalCode;
  final String? city;
  final String? country;
  final String? website;
  final String? notes;
  final int paymentTerms;
  final bool isCompany;
  final bool isFavorite;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Client({
    required this.id,
    required this.userId,
    required this.name,
    required this.email,
    this.phone,
    this.companyName,
    this.siret,
    this.siren,
    this.tvaNumber,
    this.address,
    this.postalCode,
    this.city,
    this.country,
    this.website,
    this.notes,
    this.paymentTerms = 30,
    this.isCompany = false,
    this.isFavorite = false,
    required this.createdAt,
    this.updatedAt,
  });

  factory Client.fromJson(Map<String, dynamic> json) {
    return Client(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      companyName: json['company_name'] as String?,
      siret: json['siret'] as String?,
      siren: json['siren'] as String?,
      tvaNumber: json['tva_number'] as String?,
      address: json['address'] as String?,
      postalCode: json['postal_code'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String? ?? 'France',
      website: json['website'] as String?,
      notes: json['notes'] as String?,
      paymentTerms: json['payment_terms'] as int? ?? 30,
      isCompany: json['is_company'] as bool? ?? false,
      isFavorite: json['is_favorite'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'name': name,
      'email': email,
      'phone': phone,
      'company_name': companyName,
      'siret': siret,
      'siren': siren,
      'tva_number': tvaNumber,
      'address': address,
      'postal_code': postalCode,
      'city': city,
      'country': country,
      'website': website,
      'notes': notes,
      'payment_terms': paymentTerms,
      'is_company': isCompany,
      'is_favorite': isFavorite,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  Map<String, dynamic> toInsertJson() {
    final json = toJson();
    json.remove('id');
    json.remove('created_at');
    json.remove('updated_at');
    return json;
  }

  Client copyWith({
    String? id,
    String? userId,
    String? name,
    String? email,
    String? phone,
    String? companyName,
    String? siret,
    String? siren,
    String? tvaNumber,
    String? address,
    String? postalCode,
    String? city,
    String? country,
    String? website,
    String? notes,
    int? paymentTerms,
    bool? isCompany,
    bool? isFavorite,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Client(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      companyName: companyName ?? this.companyName,
      siret: siret ?? this.siret,
      siren: siren ?? this.siren,
      tvaNumber: tvaNumber ?? this.tvaNumber,
      address: address ?? this.address,
      postalCode: postalCode ?? this.postalCode,
      city: city ?? this.city,
      country: country ?? this.country,
      website: website ?? this.website,
      notes: notes ?? this.notes,
      paymentTerms: paymentTerms ?? this.paymentTerms,
      isCompany: isCompany ?? this.isCompany,
      isFavorite: isFavorite ?? this.isFavorite,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Adresse complète formatée
  String get fullAddress {
    final parts = <String>[];
    if (address != null && address!.isNotEmpty) parts.add(address!);
    if (postalCode != null && postalCode!.isNotEmpty) parts.add(postalCode!);
    if (city != null && city!.isNotEmpty) parts.add(city!);
    if (country != null && country!.isNotEmpty && country != 'France') {
      parts.add(country!);
    }
    return parts.join(', ');
  }

  /// Nom d'affichage (raison sociale ou nom)
  String get displayName {
    if (isCompany && companyName != null && companyName!.isNotEmpty) {
      return companyName!;
    }
    return name;
  }

  /// Initiales du client (2 caractères)
  String get initials {
    final parts = displayName.split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return displayName.substring(0, displayName.length >= 2 ? 2 : 1).toUpperCase();
  }

  /// SIRET formaté (XXX XXX XXX XXXXX)
  String get formattedSiret {
    if (siret == null || siret!.isEmpty) return '';
    final clean = siret!.replaceAll(RegExp(r'\s'), '');
    if (clean.length != 14) return siret!;
    return '${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 9)} ${clean.substring(9, 14)}';
  }

  @override
  String toString() => 'Client(id: $id, name: $name, email: $email)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Client && runtimeType == other.runtimeType && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

/// Statistiques d'un client
class ClientStats {
  final int totalInvoices;
  final int totalQuotes;
  final double totalRevenue;
  final double pendingAmount;
  final DateTime? lastInvoiceDate;

  ClientStats({
    this.totalInvoices = 0,
    this.totalQuotes = 0,
    this.totalRevenue = 0.0,
    this.pendingAmount = 0.0,
    this.lastInvoiceDate,
  });

  factory ClientStats.fromJson(Map<String, dynamic> json) {
    return ClientStats(
      totalInvoices: json['total_invoices'] as int? ?? 0,
      totalQuotes: json['total_quotes'] as int? ?? 0,
      totalRevenue: (json['total_revenue'] as num?)?.toDouble() ?? 0.0,
      pendingAmount: (json['pending_amount'] as num?)?.toDouble() ?? 0.0,
      lastInvoiceDate: json['last_invoice_date'] != null
          ? DateTime.parse(json['last_invoice_date'] as String)
          : null,
    );
  }
}
