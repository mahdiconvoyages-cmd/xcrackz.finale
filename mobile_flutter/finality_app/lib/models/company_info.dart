/// Informations légales de l'entreprise pour facturation française
class CompanyInfo {
  final String companyName;
  final String legalForm; // SARL, SAS, SASU, Auto-entrepreneur, etc.
  final String address;
  final String postalCode;
  final String city;
  final String country;
  final String siret;
  final String? siren;
  final String? rcs; // RCS Paris B 123 456 789
  final String? tvaNumber; // FR12345678901
  final String email;
  final String phone;
  final String? website;
  final String? capital; // Capital social
  final bool isMicroEntrepreneur;
  final String? bankName;
  final String? bankIban;
  final String? bankBic;
  
  // Conditions de paiement par défaut
  final int defaultPaymentDays;
  final double latePaymentPenaltyRate; // Taux de pénalité de retard (%)
  final double recoveryFee; // Indemnité forfaitaire de recouvrement (40€)
  
  CompanyInfo({
    required this.companyName,
    this.legalForm = 'Auto-entrepreneur',
    required this.address,
    required this.postalCode,
    required this.city,
    this.country = 'France',
    required this.siret,
    this.siren,
    this.rcs,
    this.tvaNumber,
    required this.email,
    required this.phone,
    this.website,
    this.capital,
    this.isMicroEntrepreneur = false,
    this.bankName,
    this.bankIban,
    this.bankBic,
    this.defaultPaymentDays = 30,
    this.latePaymentPenaltyRate = 12.0, // Taux directeur BCE + 10 points (approx)
    this.recoveryFee = 40.0,
  });

  factory CompanyInfo.fromJson(Map<String, dynamic> json) {
    return CompanyInfo(
      companyName: json['company_name']?.toString() ?? '',
      legalForm: json['legal_form']?.toString() ?? 'Auto-entrepreneur',
      address: json['address']?.toString() ?? '',
      postalCode: json['postal_code']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      country: json['country']?.toString() ?? 'France',
      siret: json['siret']?.toString() ?? '',
      siren: json['siren']?.toString(),
      rcs: json['rcs']?.toString(),
      tvaNumber: json['tva_number']?.toString(),
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      website: json['website']?.toString(),
      capital: json['capital']?.toString(),
      isMicroEntrepreneur: json['is_micro_entrepreneur'] ?? false,
      bankName: json['bank_name']?.toString(),
      bankIban: json['bank_iban']?.toString(),
      bankBic: json['bank_bic']?.toString(),
      defaultPaymentDays: json['default_payment_days'] ?? 30,
      latePaymentPenaltyRate: (json['late_payment_penalty_rate'] ?? 12.0).toDouble(),
      recoveryFee: (json['recovery_fee'] ?? 40.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'company_name': companyName,
      'legal_form': legalForm,
      'address': address,
      'postal_code': postalCode,
      'city': city,
      'country': country,
      'siret': siret,
      if (siren != null) 'siren': siren,
      if (rcs != null) 'rcs': rcs,
      if (tvaNumber != null) 'tva_number': tvaNumber,
      'email': email,
      'phone': phone,
      if (website != null) 'website': website,
      if (capital != null) 'capital': capital,
      'is_micro_entrepreneur': isMicroEntrepreneur,
      if (bankName != null) 'bank_name': bankName,
      if (bankIban != null) 'bank_iban': bankIban,
      if (bankBic != null) 'bank_bic': bankBic,
      'default_payment_days': defaultPaymentDays,
      'late_payment_penalty_rate': latePaymentPenaltyRate,
      'recovery_fee': recoveryFee,
    };
  }

  String get fullAddress => '$address\n$postalCode $city${country != 'France' ? '\n$country' : ''}';
  
  String get legalMentions {
    final mentions = <String>[];
    
    if (rcs != null) {
      mentions.add('RCS $rcs');
    }
    
    mentions.add('SIRET: $siret');
    
    if (tvaNumber != null) {
      mentions.add('TVA: $tvaNumber');
    } else if (isMicroEntrepreneur) {
      mentions.add('TVA non applicable - Art. 293 B du CGI');
    }
    
    if (capital != null) {
      mentions.add('Capital: $capital');
    }
    
    return mentions.join(' • ');
  }

  /// Informations de l'entreprise par défaut (ChecksFleet)
  static CompanyInfo defaultChecksFleet() {
    return CompanyInfo(
      companyName: 'ChecksFleet',
      legalForm: 'Entreprise Individuelle',
      address: '76 Résidence Mas de Pérols',
      postalCode: '34470',
      city: 'Pérols',
      siret: '84822434900017',
      siren: '848224349',
      rcs: '',
      tvaNumber: '',
      email: 'contact@checksfleet.com',
      phone: '+33 6 83 39 74 61',
      website: 'www.checksfleet.com',
      capital: '',
      isMicroEntrepreneur: true,
      bankName: '',
      bankIban: '',
      bankBic: '',
    );
  }
}
