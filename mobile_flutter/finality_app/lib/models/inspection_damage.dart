class InspectionDamage {
  final String id;
  final String inspectionId;
  final String? damageLocation;
  final String? damageSeverity; // minor, moderate, severe
  final String? description;
  final String? photoUrl;
  final DateTime createdAt;

  InspectionDamage({
    required this.id,
    required this.inspectionId,
    this.damageLocation,
    this.damageSeverity,
    this.description,
    this.photoUrl,
    required this.createdAt,
  });

  factory InspectionDamage.fromJson(Map<String, dynamic> json) {
    return InspectionDamage(
      id: json['id'] as String,
      inspectionId: json['inspection_id'] as String,
      damageLocation: json['damage_location'] as String?,
      damageSeverity: json['damage_severity'] as String?,
      description: json['description'] as String?,
      photoUrl: json['photo_url'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inspection_id': inspectionId,
      'damage_location': damageLocation,
      'damage_severity': damageSeverity,
      'description': description,
      'photo_url': photoUrl,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

// Niveaux de sévérité des dommages
enum DamageSeverity {
  minor('minor', 'Mineur'),
  moderate('moderate', 'Modéré'),
  severe('severe', 'Sévère');

  final String value;
  final String label;

  const DamageSeverity(this.value, this.label);

  static DamageSeverity fromValue(String value) {
    return DamageSeverity.values.firstWhere(
      (severity) => severity.value == value,
      orElse: () => DamageSeverity.minor,
    );
  }
}
