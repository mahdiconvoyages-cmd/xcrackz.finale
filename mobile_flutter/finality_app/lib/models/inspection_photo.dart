class InspectionPhoto {
  final String id;
  final String inspectionId;
  final String category; // vehicle_front, vehicle_back, vehicle_side, exterior, interior, arrival
  final String photoUrl;
  final DateTime createdAt;

  InspectionPhoto({
    required this.id,
    required this.inspectionId,
    required this.category,
    required this.photoUrl,
    required this.createdAt,
  });

  factory InspectionPhoto.fromJson(Map<String, dynamic> json) {
    return InspectionPhoto(
      id: json['id']?.toString() ?? '',
      inspectionId: json['inspection_id']?.toString() ?? '',
      category: json['category']?.toString() ?? 'exterior',
      photoUrl: json['photo_url']?.toString() ?? '',
      createdAt: DateTime.parse(json['created_at']?.toString() ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'inspection_id': inspectionId,
      'category': category,
      'photo_url': photoUrl,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Returns JSON without server-generated fields, for INSERT operations.
  Map<String, dynamic> toInsertJson() {
    final json = toJson();
    json.remove('id');
    json.remove('created_at');
    return json;
  }
}

// Catégories de photos disponibles
enum PhotoCategory {
  vehicleFront('vehicle_front', 'Avant du véhicule'),
  vehicleBack('vehicle_back', 'Arrière du véhicule'),
  vehicleSide('vehicle_side', 'Côté du véhicule'),
  exterior('exterior', 'Extérieur'),
  interior('interior', 'Intérieur'),
  arrival('arrival', 'Arrivée');

  final String value;
  final String label;

  const PhotoCategory(this.value, this.label);

  static PhotoCategory fromValue(String value) {
    return PhotoCategory.values.firstWhere(
      (category) => category.value == value,
      orElse: () => PhotoCategory.exterior,
    );
  }
}
