class UserSubscription {
  final String? id;
  final String userId;
  final String plan; // 'free', 'basic', 'premium', 'enterprise'
  final String status; // 'active', 'expired', 'cancelled', 'trialing'
  final DateTime? startDate;
  final DateTime? expiresAt;
  final DateTime? cancelledAt;
  final bool autoRenew;
  final int? creditsPerMonth;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Propriétés calculées
  String? get planName => plan.toUpperCase();
  DateTime? get endDate => expiresAt;

  UserSubscription({
    this.id,
    required this.userId,
    required this.plan,
    required this.status,
    this.startDate,
    this.expiresAt,
    this.cancelledAt,
    this.autoRenew = false,
    this.creditsPerMonth,
    this.createdAt,
    this.updatedAt,
  });

  factory UserSubscription.fromJson(Map<String, dynamic> json) {
    // Support both 'expires_at' and 'current_period_end' column names
    final expiresAtValue = json['expires_at'] ?? json['current_period_end'];
    final startDateValue = json['start_date'] ?? json['current_period_start'];
    final cancelledAtValue = json['cancelled_at'] ?? json['cancel_at_period_end'];
    
    return UserSubscription(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      plan: json['plan'] as String? ?? 'free',
      status: json['status'] as String? ?? 'expired',
      startDate: startDateValue != null
          ? DateTime.parse(startDateValue as String)
          : null,
      expiresAt: expiresAtValue != null
          ? DateTime.parse(expiresAtValue as String)
          : null,
      cancelledAt: cancelledAtValue != null && cancelledAtValue is String
          ? DateTime.parse(cancelledAtValue)
          : null,
      autoRenew: json['auto_renew'] as bool? ?? !(json['cancel_at_period_end'] as bool? ?? false),
      creditsPerMonth: json['credits_per_month'] as int?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'plan': plan,
      'status': status,
      if (startDate != null) 'start_date': startDate!.toIso8601String(),
      if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
      if (cancelledAt != null) 'cancelled_at': cancelledAt!.toIso8601String(),
      'auto_renew': autoRenew,
      if (creditsPerMonth != null) 'credits_per_month': creditsPerMonth,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }

  UserSubscription copyWith({
    String? id,
    String? userId,
    String? plan,
    String? status,
    DateTime? startDate,
    DateTime? expiresAt,
    DateTime? cancelledAt,
    bool? autoRenew,
    int? creditsPerMonth,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserSubscription(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      plan: plan ?? this.plan,
      status: status ?? this.status,
      startDate: startDate ?? this.startDate,
      expiresAt: expiresAt ?? this.expiresAt,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      autoRenew: autoRenew ?? this.autoRenew,
      creditsPerMonth: creditsPerMonth ?? this.creditsPerMonth,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Helper getters
  bool get isActive => status == 'active';
  bool get isExpired => status == 'expired';
  bool get isCancelled => status == 'cancelled';
  bool get isTrialing => status == 'trialing';
  bool get isFree => plan == 'free';
  bool get isPremium => plan == 'pro' || plan == 'premium' || plan == 'business' || plan == 'enterprise';

  int get daysRemaining {
    if (expiresAt == null) return 0;
    final now = DateTime.now();
    if (expiresAt!.isBefore(now)) return 0;
    return expiresAt!.difference(now).inDays;
  }

  bool get isExpiringSoon {
    return daysRemaining > 0 && daysRemaining <= 7;
  }

  String get displayName {
    switch (plan) {
      case 'free':
        return 'Gratuit';
      case 'essentiel':
      case 'basic':
      case 'starter':
        return 'Essentiel';
      case 'pro':
      case 'premium':
        return 'Pro';
      case 'business':
        return 'Business';
      case 'enterprise':
        return 'Enterprise';
      default:
        return plan;
    }
  }
}
