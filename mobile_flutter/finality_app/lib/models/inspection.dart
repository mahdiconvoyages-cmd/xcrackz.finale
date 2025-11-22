// Alias pour compatibilité
typedef Inspection = VehicleInspection;

class VehicleInspection {
  final String id;
  final String missionId;
  final String? inspectorId;
  final String inspectionType; // 'departure' or 'arrival'
  final Map<String, dynamic>? vehicleInfo;
  final String? overallCondition;
  final int? fuelLevel;
  final int? mileageKm;
  final List<Map<String, dynamic>>? damages;
  final String? notes;
  final String? inspectorSignature;
  final String? clientSignature;
  final String? clientName;
  final double? latitude;
  final double? longitude;
  final String? locationAddress;
  final String? status;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  // Propriétés alias
  String get type => inspectionType;

  VehicleInspection({
    required this.id,
    required this.missionId,
    this.inspectorId,
    required this.inspectionType,
    this.vehicleInfo,
    this.overallCondition,
    this.fuelLevel,
    this.mileageKm,
    this.damages,
    this.notes,
    this.inspectorSignature,
    this.clientSignature,
    this.clientName,
    this.latitude,
    this.longitude,
    this.locationAddress,
    this.status,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VehicleInspection.fromJson(Map<String, dynamic> json) {
    return VehicleInspection(
      id: json['id'] as String,
      missionId: json['mission_id'] as String,
      inspectorId: json['inspector_id'] as String?,
      inspectionType: json['inspection_type'] as String,
      vehicleInfo: json['vehicle_info'] as Map<String, dynamic>?,
      overallCondition: json['overall_condition'] as String?,
      fuelLevel: json['fuel_level'] as int?,
      mileageKm: json['mileage_km'] as int?,
      damages: json['damages'] != null
          ? List<Map<String, dynamic>>.from(json['damages'] as List)
          : null,
      notes: json['notes'] as String?,
      inspectorSignature: json['inspector_signature'] as String?,
      clientSignature: json['client_signature'] as String?,
      clientName: json['client_name'] as String?,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      locationAddress: json['location_address'] as String?,
      status: json['status'] as String?,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mission_id': missionId,
      'inspector_id': inspectorId,
      'inspection_type': inspectionType,
      'vehicle_info': vehicleInfo,
      'overall_condition': overallCondition,
      'fuel_level': fuelLevel,
      'mileage_km': mileageKm,
      'damages': damages,
      'notes': notes,
      'inspector_signature': inspectorSignature,
      'client_signature': clientSignature,
      'client_name': clientName,
      'latitude': latitude,
      'longitude': longitude,
      'location_address': locationAddress,
      'status': status,
      'completed_at': completedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
