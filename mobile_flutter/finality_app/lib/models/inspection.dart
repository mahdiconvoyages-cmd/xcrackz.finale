// Alias pour compatibilité
typedef Inspection = VehicleInspection;

class VehicleInspection {
  final String id;
  final String missionId;
  final String? inspectorId;
  final String inspectionType; // 'departure' or 'arrival'
  final Map<String, dynamic>? vehicleInfo;
  final String? overallCondition;
  final int? fuelLevel; // Legacy: numeric fuel level (liters)
  final int? fuelLevelPercentage; // New: fuel level as percentage (0-100)
  final int? mileageKm; // Legacy: current odometer
  final int? odometerKm; // New: same as mileageKm, preferred
  final int? mileageKmStart; // New: odometer at start
  final int? mileageKmEnd; // New: odometer at end
  final List<Map<String, dynamic>>? damages;
  final String? notes;
  final String? inspectorSignature; // Legacy
  final String? driverSignature; // New: driver signature URL
  final String? clientSignature; // Legacy
  final String? clientSignatureUrl; // New: client signature URL
  final String? clientName;
  final String? driverName; // New: driver name
  final double? latitude;
  final double? longitude;
  final String? locationAddress;
  final String? status;
  final DateTime? completedAt;
  final DateTime? startedAt; // New: when inspection started
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
    this.fuelLevelPercentage,
    this.mileageKm,
    this.odometerKm,
    this.mileageKmStart,
    this.mileageKmEnd,
    this.damages,
    this.notes,
    this.inspectorSignature,
    this.driverSignature,
    this.clientSignature,
    this.clientSignatureUrl,
    this.clientName,
    this.driverName,
    this.latitude,
    this.longitude,
    this.locationAddress,
    this.status,
    this.completedAt,
    this.startedAt,
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
      fuelLevelPercentage: json['fuel_level_percentage'] as int?,
      mileageKm: json['mileage_km'] as int?,
      odometerKm: json['odometer_km'] as int? ?? (json['mileage_km'] as int?),
      mileageKmStart: json['mileage_km_start'] as int?,
      mileageKmEnd: json['mileage_km_end'] as int?,
      damages: json['damages'] != null
          ? List<Map<String, dynamic>>.from(json['damages'] as List)
          : null,
      notes: json['notes'] as String?,
      inspectorSignature: json['inspector_signature'] as String?,
      driverSignature: json['signature_driver_url'] as String?,
      clientSignature: json['client_signature'] as String?,
      clientSignatureUrl: json['signature_client_url'] as String?,
      clientName: json['client_name'] as String?,
      driverName: json['driver_name'] as String?,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      locationAddress: json['location_address'] as String?,
      status: json['status'] as String?,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
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
      'fuel_level_percentage': fuelLevelPercentage,
      'mileage_km': mileageKm ?? odometerKm,
      'odometer_km': odometerKm,
      'mileage_km_start': mileageKmStart,
      'mileage_km_end': mileageKmEnd,
      'damages': damages,
      'notes': notes,
      'inspector_signature': inspectorSignature,
      'signature_driver_url': driverSignature,
      'client_signature': clientSignature,
      'signature_client_url': clientSignatureUrl,
      'client_name': clientName,
      'driver_name': driverName,
      'latitude': latitude,
      'longitude': longitude,
      'location_address': locationAddress,
      'status': status,
      'completed_at': completedAt?.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}
