class UserCredits {
  final String? id;
  final String userId;
  final int credits;
  final DateTime? lastUpdated;
  final DateTime? createdAt;

  UserCredits({
    this.id,
    required this.userId,
    required this.credits,
    this.lastUpdated,
    this.createdAt,
  });

  factory UserCredits.fromJson(Map<String, dynamic> json) {
    return UserCredits(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      credits: json['credits'] as int? ?? 0,
      lastUpdated: json['last_updated'] != null
          ? DateTime.parse(json['last_updated'] as String)
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'credits': credits,
      if (lastUpdated != null) 'last_updated': lastUpdated!.toIso8601String(),
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }

  UserCredits copyWith({
    String? id,
    String? userId,
    int? credits,
    DateTime? lastUpdated,
    DateTime? createdAt,
  }) {
    return UserCredits(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      credits: credits ?? this.credits,
      lastUpdated: lastUpdated ?? this.lastUpdated,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is UserCredits && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

class CreditTransaction {
  final String? id;
  final String userId;
  final int amount;
  final String type; // 'earn', 'spend', 'purchase', 'refund', 'bonus'
  final String? description;
  final String? referenceType; // 'mission', 'subscription', 'manual', etc.
  final String? referenceId;
  final int balanceAfter;
  final DateTime? createdAt;

  CreditTransaction({
    this.id,
    required this.userId,
    required this.amount,
    required this.type,
    this.description,
    this.referenceType,
    this.referenceId,
    required this.balanceAfter,
    this.createdAt,
  });

  factory CreditTransaction.fromJson(Map<String, dynamic> json) {
    return CreditTransaction(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      amount: json['amount'] as int,
      type: json['transaction_type'] as String? ?? json['type'] as String? ?? 'unknown',
      description: json['description'] as String?,
      referenceType: json['reference_type'] as String?,
      referenceId: json['reference_id'] as String?,
      balanceAfter: json['balance_after'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'amount': amount,
      'transaction_type': type,
      if (description != null) 'description': description,
      if (referenceType != null) 'reference_type': referenceType,
      if (referenceId != null) 'reference_id': referenceId,
      'balance_after': balanceAfter,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }

  bool get isPositive => amount > 0;
  bool get isNegative => amount < 0;
}
